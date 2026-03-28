/**
 * Video analysis utility using Gemini Files API.
 * Uploads video from GCS signed URL to Gemini, waits for processing,
 * then uses Gemini to analyze body language, facial expressions, etc.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export interface VideoCategory {
  score: number;
  observations: string[];
}

export interface VideoInsights {
  overall_summary: string;
  confidence_score: number;
  body_language: VideoCategory;
  facial_analysis: VideoCategory;
  vocal_delivery: VideoCategory;
  communication_quality: VideoCategory;
  professional_presence: VideoCategory;
  engagement_level: VideoCategory;
  stress_indicators: VideoCategory;
  authenticity_indicators: VideoCategory;
}

/**
 * Upload a video blob to Gemini Files API using multipart upload.
 */
async function uploadToGemini(
  videoBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<string> {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  // Build multipart body manually
  const headerPart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    `Content-Type: ${mimeType}`,
    '',
    '',
  ].join('\r\n');

  const footerPart = `\r\n--${boundary}--\r\n`;

  const headerBytes = new TextEncoder().encode(headerPart);
  const footerBytes = new TextEncoder().encode(footerPart);
  const videoBytes = new Uint8Array(await videoBlob.arrayBuffer());

  // Combine into single body
  const body = new Uint8Array(headerBytes.length + videoBytes.length + footerBytes.length);
  body.set(headerBytes, 0);
  body.set(videoBytes, headerBytes.length);
  body.set(footerBytes, headerBytes.length + videoBytes.length);

  console.log(`Uploading video to Gemini (${(videoBlob.size / 1024 / 1024).toFixed(1)} MB)...`);

  const response = await fetch(
    `${GEMINI_BASE}/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini upload error:', errorText);
    throw new Error(`Video upload failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const fileUri = data.file?.uri;
  if (!fileUri) {
    throw new Error('No file URI returned from Gemini upload');
  }

  console.log('Video uploaded to Gemini:', fileUri);
  return fileUri;
}

/**
 * Poll Gemini until the uploaded file is ready for use.
 */
async function waitForProcessing(fileUri: string, maxWaitMs: number = 120000): Promise<void> {
  const filePath = fileUri.split('/').slice(-2).join('/');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${GEMINI_BASE}/v1beta/${filePath}?key=${GEMINI_API_KEY}`
    );

    if (!response.ok) {
      console.warn('Gemini status check failed:', response.status);
      await sleep(3000);
      continue;
    }

    const data = await response.json();
    console.log(`Gemini file status: ${data.state}`);

    if (data.state === 'ACTIVE') {
      return; // Ready!
    }

    if (data.state === 'FAILED') {
      throw new Error(`Video processing failed: ${data.error?.message || 'Unknown error'}`);
    }

    // Still processing, wait and retry
    await sleep(3000);
  }

  throw new Error('Video processing timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Gemini with the processed video to get insights.
 */
async function analyzeWithGemini(
  fileUri: string,
  mimeType: string,
  positionName: string
): Promise<VideoInsights> {
  const prompt = `You are an expert Anti-Cheating Detector AI for online academic vivas. Analyze this interview video to strictly monitor for suspicious activities while also evaluating standard interview performance.

Position: ${positionName}

Provide a comprehensive analysis covering:

1. **Body Language**: Posture, gestures, hand movements, overall body positioning, and unexplained shifting out of frame.
2. **Facial Analysis**: Eye contact (especially looking repeatedly off-screen/reading), facial expressions, micro-expressions.
3. **Vocal Delivery**: Tone, pace, clarity, confidence.
4. **Communication Quality**: Coherence, articulation, engagement.
5. **Professional Presence**: Dress, background, overall presentation.
6. **Engagement Level**: Attentiveness, enthusiasm, active listening.
7. **Stress Indicators**: Nervous habits, fidgeting, signs of discomfort.
8. **Authenticity Indicators**: Genuine expressions, consistency between verbal and non-verbal cues. Strictly check for evidence of reading from a script, listening to earpieces, or receiving off-camera verbal/visual cues.

For each category, provide:
- A score (0-100), where lower scores in Authenticity/Body Language mean higher suspicion of cheating.
- Key observations (2-3 bullet points). Explicitly highlight ANY red flags for cheating or suspicious behavior.

Also provide:
- An overall summary (2-3 sentences), explicitly concluding whether the candidate exhibited suspicious behavior or maintained integrity.
- Overall confidence score (0-100)

Return ONLY valid JSON with this exact structure:
{
  "overall_summary": "...",
  "confidence_score": 85,
  "body_language": { "score": 78, "observations": ["Observation 1", "Observation 2"] },
  "facial_analysis": { "score": 82, "observations": ["Observation 1", "Observation 2"] },
  "vocal_delivery": { "score": 75, "observations": ["Observation 1", "Observation 2"] },
  "communication_quality": { "score": 88, "observations": ["Observation 1", "Observation 2"] },
  "professional_presence": { "score": 90, "observations": ["Observation 1", "Observation 2"] },
  "engagement_level": { "score": 85, "observations": ["Observation 1", "Observation 2"] },
  "stress_indicators": { "score": 70, "observations": ["Observation 1", "Observation 2"] },
  "authenticity_indicators": { "score": 83, "observations": ["Observation 1", "Observation 2"] }
}`;

  const response = await fetch(
    `${GEMINI_BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                file_data: {
                  mime_type: mimeType,
                  file_uri: fileUri,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.4,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini analysis error:', errorText);
    throw new Error(`Gemini analysis failed: ${response.status}`);
  }

  const data = await response.json();
  let jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Clean markdown fences if present
  jsonText = jsonText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }

  return JSON.parse(jsonText) as VideoInsights;
}

/**
 * Cleanup the uploaded file from Gemini.
 */
async function cleanupGeminiFile(fileUri: string): Promise<void> {
  try {
    const filePath = fileUri.split('/').slice(-2).join('/');
    await fetch(
      `${GEMINI_BASE}/v1beta/${filePath}?key=${GEMINI_API_KEY}`,
      { method: 'DELETE' }
    );
    console.log('Cleaned up Gemini file');
  } catch (err) {
    console.warn('Failed to cleanup Gemini file:', err);
  }
}

/**
 * Full video analysis pipeline:
 * 1. Download video from GCS signed URL
 * 2. Upload to Gemini Files API
 * 3. Wait for processing
 * 4. Analyze with Gemini
 * 5. Cleanup and return insights
 *
 * Returns null if any step fails (video analysis is non-critical).
 */
export async function analyzeVideo(
  videoSignedUrl: string,
  jobId: string,
  userId: string,
  positionName: string = 'SSOM CCA4 Viva'
): Promise<VideoInsights | null> {
  let fileUri: string | null = null;

  try {
    // 1. Download the video
    console.log('Downloading video from GCS...');
    const videoResponse = await fetch(videoSignedUrl);
    if (!videoResponse.ok) {
      console.warn('Failed to download video:', videoResponse.status);
      return null;
    }

    const videoBlob = await videoResponse.blob();
    const contentType = videoResponse.headers.get('Content-Type') || 'video/webm';

    // Determine mime type and extension
    let mimeType = contentType;
    let ext = 'webm';
    if (contentType.includes('mp4')) {
      mimeType = 'video/mp4';
      ext = 'mp4';
    } else if (contentType.includes('quicktime') || contentType.includes('mov')) {
      mimeType = 'video/quicktime';
      ext = 'mov';
    } else {
      mimeType = 'video/webm';
    }

    const fileName = `${jobId}_${userId}.${ext}`;

    // 2. Upload to Gemini
    fileUri = await uploadToGemini(videoBlob, fileName, mimeType);

    // 3. Wait for processing
    console.log('Waiting for Gemini to process video...');
    await waitForProcessing(fileUri);

    // 4. Analyze
    console.log('Analyzing video with Gemini...');
    const insights = await analyzeWithGemini(fileUri, mimeType, positionName);

    console.log('Video analysis complete!');
    return insights;
  } catch (err) {
    console.error('Video analysis failed (skipping):', err);
    return null;
  } finally {
    // 5. Cleanup
    if (fileUri) {
      await cleanupGeminiFile(fileUri);
    }
  }
}
