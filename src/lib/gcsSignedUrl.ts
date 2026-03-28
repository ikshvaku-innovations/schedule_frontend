/**
 * Generate GCS Signed URLs directly from the browser using Web Crypto API.
 * No Supabase edge functions needed.
 */

const GCS_BASE_URL = 'https://storage.googleapis.com';

interface GCSCredentials {
  client_email: string;
  private_key: string;
}

function getBucketName(): string {
  return import.meta.env.VITE_GCS_BUCKET_NAME as string || 'yudha-vivas';
}

function getCredentials(): GCSCredentials | null {
  const client_email = import.meta.env.VITE_GCS_CLIENT_EMAIL as string;
  const private_key = import.meta.env.VITE_GCS_PRIVATE_KEY as string;

  if (!client_email || !private_key) {
    console.warn('VITE_GCS_CLIENT_EMAIL or VITE_GCS_PRIVATE_KEY not set');
    return null;
  }

  return { client_email, private_key };
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Normalize newlines and extract the base64 content
  const keyData = pem.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = keyData
    .substring(
      keyData.indexOf(pemHeader) + pemHeader.length,
      keyData.indexOf(pemFooter)
    )
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

async function generateSignedUrl(
  filename: string,
  expirationMinutes: number = 60
): Promise<string> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error('GCS credentials not available');
  }

  const expiration = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
  const objectPath = `/${getBucketName()}/${filename}`;

  // Create the string to sign (V2 signing)
  const stringToSign = [
    'GET',
    '', // Content-MD5
    '', // Content-Type
    expiration.toString(),
    objectPath,
  ].join('\n');

  // Import the private key
  const cryptoKey = await importPrivateKey(credentials.private_key);

  // Sign the string
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    data
  );

  // Convert signature to base64
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  // Construct the signed URL
  const signedUrl = `${GCS_BASE_URL}${objectPath}?GoogleAccessId=${encodeURIComponent(
    credentials.client_email
  )}&Expires=${expiration}&Signature=${encodeURIComponent(signatureBase64)}`;

  return signedUrl;
}

/**
 * Get a signed video URL for a given job_id and user_id.
 * Tries .webm first, then .mp4 formats.
 * Returns null if video is not found or credentials are unavailable.
 */
export async function getVideoSignedUrl(
  jobId: string,
  userId: string
): Promise<string | null> {
  const credentials = getCredentials();
  if (!credentials) {
    console.warn('GCS credentials not available, skipping video');
    return null;
  }

  const extensions = ['webm', 'mp4'];

  for (const ext of extensions) {
    try {
      const filename = `interview-videos/${jobId}_${userId}.${ext}`;
      const signedUrl = await generateSignedUrl(filename, 60);

      // Verify the video actually exists with a range request
      const checkResponse = await fetch(signedUrl, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
        },
      });

      if (checkResponse.ok || checkResponse.status === 206) {
        console.log(`Found video: ${filename}`);
        return signedUrl;
      }
    } catch (err) {
      console.warn(`Error checking video with .${ext} extension:`, err);
    }
  }

  console.warn('No video found for job/user combination');
  return null;
}
