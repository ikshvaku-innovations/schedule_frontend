import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';
import { getVideoSignedUrl } from './gcsSignedUrl';
import { analyzeVideo } from './videoAnalysis';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

export interface QuestionAnalysis {
  question: string;
  answer: string;
  evaluation: string;
}

export interface EvaluationResult {
  summary: string;
  questions: QuestionAnalysis[];
  totalMarks: number;
  maxMarks: number;
  videoLink: string | null;
  videoInsights: Record<string, unknown>;
  studentName: string;
  studentEmail: string;
}


async function fetchTranscript(jobId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('transcript')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('Transcript fetch error:', error);
    return null;
  }

  // The transcript could be stored in various fields
  return data.transcript || data.content || data.text || JSON.stringify(data);
}

function parseGeminiResponse(responseText: string): { summary: string; questions: QuestionAnalysis[]; totalMarks: number } | null {
  try {
    // Try to extract JSON object from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const questions = (parsed.questions || []).map((item: Record<string, unknown>) => ({
        question: item.question as string || '',
        answer: item.answer as string || '',
        evaluation: item.evaluation as string || '',
      }));
      return {
        summary: parsed.summary as string || '',
        questions,
        totalMarks: Number(parsed.totalMarks) || 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse Gemini response:', e);
  }

  return null;
}

export async function evaluateStudent(
  jobId: string,
  userId: string
): Promise<EvaluationResult | null> {
  // 1. Fetch user info
  const { data: userData } = await supabase
    .from('users_login')
    .select('name, email_id')
    .eq('id', userId)
    .single();

  if (!userData) {
    console.error('User not found');
    return null;
  }

  // 2. Fetch transcript
  const transcript = await fetchTranscript(jobId, userId);
  if (!transcript) {
    console.error('No transcript found');
    return null;
  }

  // 3. Fetch video URL (skip if unavailable)
  const videoLink = await getVideoSignedUrl(jobId, userId);

  // 4. Call Gemini API for evaluation
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an academic viva voce evaluator. Evaluate the following interview/viva transcript.

IMPORTANT RULES:
1. Total marks for the entire viva are 20.
2. Extract each question and the student's actual answer from the transcript.
3. DO NOT modify or paraphrase the student's answer - use their EXACT words.
4. For each question, provide a 2-sentence evaluation explanation assessing the quality and correctness of the answer.
5. Do NOT assign individual marks per question.
6. After analyzing all questions, write a 3-4 sentence overall performance summary covering strengths, weaknesses, and overall impression.
7. Based on the holistic performance, assign a single overall score out of 20.
8. If there are more than 8 questions, consider only the best 8 answers when deciding the overall score, but still list ALL questions in the analysis.
9. Use MEDIUM difficulty for evaluation - not too strict, not too lenient.
10. Be fair and balanced in your assessment.

TRANSCRIPT:
${transcript}

Respond ONLY with a JSON object in this exact format (no other text, no markdown):
{
  "summary": "A 3-4 sentence overall performance summary of the student.",
  "totalMarks": <overall_marks_out_of_20_as_number>,
  "questions": [
    {
      "question": "The exact question asked",
      "answer": "The student's exact answer without any modification",
      "evaluation": "A 2-sentence evaluation of the answer quality and correctness."
    }
  ]
}`;

  try {
    const resultPromise = model.generateContent(prompt);
    
    // Start video analysis concurrently if video exists
    const videoAnalysisPromise = videoLink 
      ? analyzeVideo(videoLink, jobId, userId, 'SSOM CCA4 Viva') 
      : Promise.resolve(null);

    // Wait for both text evaluation and video analysis to complete
    const [result, videoInsightsResult] = await Promise.all([
      resultPromise,
      videoAnalysisPromise
    ]);

    const responseText = result.response.text();
    const parsed = parseGeminiResponse(responseText);

    if (!parsed || parsed.questions.length === 0) {
      console.error('No questions parsed from Gemini response');
      return null;
    }

    const videoInsights = videoInsightsResult ? (videoInsightsResult as unknown as Record<string, unknown>) : {};

    const evaluationResult: EvaluationResult = {
      summary: parsed.summary,
      questions: parsed.questions,
      totalMarks: Math.round(parsed.totalMarks * 100) / 100,
      maxMarks: 20,
      videoLink,
      videoInsights,
      studentName: userData.name,
      studentEmail: userData.email_id,
    };

    // 5. Store in viva_evaluations table
    const evaluationData = {
      summary: parsed.summary,
      questions: evaluationResult.questions,
      totalQuestions: parsed.questions.length,
      studentName: userData.name,
      studentEmail: userData.email_id,
    };

    const { error: upsertError } = await supabase
      .from('viva_evaluations')
      .upsert(
        {
          job_id: jobId,
          user_id: userId,
          ai_marks: evaluationResult.totalMarks,
          evaluation_data: evaluationData,
          video_link: videoLink,
          video_insights: videoInsights,
          is_published: false,
        },
        { onConflict: 'job_id,user_id' }
      );

    if (upsertError) {
      console.error('Failed to store evaluation:', upsertError);
    }

    return evaluationResult;
  } catch (err) {
    console.error('Gemini API error:', err);
    return null;
  }
}

export async function getStoredEvaluation(
  jobId: string,
  userId: string
): Promise<{
  evaluation: EvaluationResult;
  finalMarks: number | null;
  professorFeedback: string | null;
} | null> {
  const { data } = await supabase
    .from('viva_evaluations')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single();

  if (!data || !data.evaluation_data?.questions) return null;

  // Fetch user data
  const { data: userData } = await supabase
    .from('users_login')
    .select('name, email_id')
    .eq('id', userId)
    .single();

  // Always generate a fresh signed URL instead of using the stored (potentially expired) one
  const freshVideoLink = await getVideoSignedUrl(jobId, userId);

  return {
    evaluation: {
      summary: data.evaluation_data.summary || '',
      questions: data.evaluation_data.questions,
      totalMarks: data.ai_marks || 0,
      maxMarks: 20,
      videoLink: freshVideoLink,
      videoInsights: data.video_insights || {},
      studentName: userData?.name || data.evaluation_data.studentName || '',
      studentEmail: userData?.email_id || data.evaluation_data.studentEmail || '',
    },
    finalMarks: data.final_marks,
    professorFeedback: data.professor_feedback,
  };
}

export async function updateProfessorMarks(
  jobId: string,
  userId: string,
  finalMarks: number | null,
  feedback?: string
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};
  if (finalMarks !== null && finalMarks !== undefined) {
    updateData.final_marks = finalMarks;
  }
  if (feedback !== undefined) {
    updateData.professor_feedback = feedback;
  }

  const { error } = await supabase
    .from('viva_evaluations')
    .update(updateData)
    .eq('job_id', jobId)
    .eq('user_id', userId);

  return !error;
}
