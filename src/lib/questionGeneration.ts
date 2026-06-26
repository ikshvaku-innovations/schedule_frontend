import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

interface GeneratedQuestion {
  question_number: string;
  question: string;
}

function parseQuestionsResponse(responseText: string): GeneratedQuestion[] | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: any) => ({
          question_number: String(q.question_number || '').trim(),
          question: String(q.question || '').trim()
        }));
      }
    }
  } catch (e) {
    console.error('Failed to parse Gemini response for questions:', e);
  }
  return null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if questions already exist for a job, and if not, generates them
 * using Gemini API based on the job syllabus (jd_summary) and no_of_questions.
 * Provides granular stage updates to trigger professional UI state transitions.
 *
 * @param jobId The UUID of the job
 * @param jdSummary The syllabus / job description summary
 * @param noOfQuestions The number of main questions to generate (can be string or number)
 * @param positionName Optional fallback job title / position name
 * @param onStageChange Callback triggered when a stage status changes
 */
export async function generateAndStoreQuestions(
  jobId: string,
  jdSummary: string | null,
  noOfQuestions: string | number | null,
  positionName: string | undefined,
  onStageChange: (stageId: number, status: 'incomplete' | 'in_progress' | 'completed' | 'failed') => void
): Promise<boolean> {
  try {
    // -------------------------------------------------------------
    // Stage 0: Setting the foundation (Checking existing questions)
    // -------------------------------------------------------------
    onStageChange(0, 'in_progress');
    const { count, error: countErr } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);

    await delay(1000); // UI pacing delay

    if (countErr) {
      console.error('Error checking existing questions count:', countErr);
      onStageChange(0, 'failed');
      return false;
    }

    if (count !== null && count > 0) {
      console.log(`Questions already exist for job ${jobId} (${count} found). Skipping generation.`);
      onStageChange(0, 'completed');
      onStageChange(1, 'completed');
      onStageChange(2, 'completed');
      onStageChange(3, 'completed');
      onStageChange(4, 'completed');
      return true;
    }
    onStageChange(0, 'completed');

    // -------------------------------------------------------------
    // Stage 1: Gathering key inputs (Reading configuration & syllabus)
    // -------------------------------------------------------------
    onStageChange(1, 'in_progress');
    
    // Parse no_of_questions robustly since it is stored as TEXT in the database
    let n = 10;
    if (noOfQuestions !== null && noOfQuestions !== undefined) {
      const parsed = parseInt(String(noOfQuestions), 10);
      if (!isNaN(parsed) && parsed > 0) {
        n = parsed;
      }
    }
    
    const syllabus = jdSummary && jdSummary.trim().length > 0 
      ? jdSummary 
      : `Position: ${positionName || 'Software Engineer'}. Focus on standard industry standards and core engineering principles relevant to this role.`;

    await delay(1000); // UI pacing delay
    onStageChange(1, 'completed');

    // -------------------------------------------------------------
    // Stage 2: Shaping the narrative (Calling Gemini AI Model)
    // -------------------------------------------------------------
    onStageChange(2, 'in_progress');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert viva voce/interview examiner. Your goal is to generate technical viva questions based on the following syllabus/job description summary:
---
${syllabus}
---

Generate exactly ${n} main questions covering the syllabus.
For each main question (from 1 to ${n}), you MUST generate exactly 1 main question and 2 follow-up questions.
The numbering must be strictly formatted as:
- For question 1: "1.1" (main question), "1.2" (first follow-up), "1.3" (second follow-up)
- For question 2: "2.1" (main question), "2.2" (first follow-up), "2.3" (second follow-up)
...and so on, up to "${n}.3".

Format the response as a strict JSON object with a single key "questions" containing an array of objects. Each object must have "question_number" and "question" keys.
Do not include any other text, markdown formatting, or explanations. Only return the JSON.

Example format:
{
  "questions": [
    {
      "question_number": "1.1",
      "question": "What is the primary difference between a class and an object?"
    },
    {
      "question_number": "1.2",
      "question": "Can you explain how memory is allocated for each of them?"
    },
    {
      "question_number": "1.3",
      "question": "How does garbage collection handle objects that are no longer referenced?"
    }
  ]
}`;

    let responseText = '';
    try {
      console.log(`Calling Gemini to generate ${n} questions for job ${jobId}...`);
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      onStageChange(2, 'completed');
    } catch (apiErr) {
      console.error('Gemini API call failed:', apiErr);
      onStageChange(2, 'failed');
      return false;
    }

    // -------------------------------------------------------------
    // Stage 3: Fine-tuning the focus (Parsing and validating results)
    // -------------------------------------------------------------
    onStageChange(3, 'in_progress');
    const parsedQuestions = parseQuestionsResponse(responseText);

    await delay(1000); // UI pacing delay

    if (!parsedQuestions || parsedQuestions.length === 0) {
      console.error('Failed to parse questions from Gemini response');
      onStageChange(3, 'failed');
      return false;
    }
    onStageChange(3, 'completed');

    // -------------------------------------------------------------
    // Stage 4: Adding the finishing touches (Bulk saving to database)
    // -------------------------------------------------------------
    onStageChange(4, 'in_progress');
    
    // Clear any existing questions for this job first to avoid duplicates
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('job_id', jobId);

    if (delErr) {
      console.warn('Warning: Failed to clear old questions:', delErr);
    }

    const questionsToInsert = parsedQuestions.map(q => ({
      job_id: jobId,
      question_number: q.question_number,
      question: q.question
    }));

    const { error: insertErr } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    await delay(800); // UI pacing delay

    if (insertErr) {
      console.error('Error bulk inserting questions:', insertErr);
      onStageChange(4, 'failed');
      return false;
    }

    onStageChange(4, 'completed');
    console.log('Successfully saved questions to the questions table.');
    return true;
  } catch (err) {
    console.error('Error in generateAndStoreQuestions:', err);
    // Mark any remaining active/incomplete stages as failed
    return false;
  }
}
