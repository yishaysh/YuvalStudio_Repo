import crypto from 'node:crypto';

export type UploadFolder = 'service-images' | 'gallery-images' | 'avatars' | 'anatomy-images';

export type ServerImageUploader = (options: {
  dataUrl: string;
  folder: UploadFolder;
}) => Promise<string>;

const ALLOWED_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/i;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB limit cleanly within serverless payload bounds

export function validateImageDataUrl(dataUrl: string): { mimeSubType: string; bytes: number } {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('לא סופק קובץ תמונה תקין');
  }
  const match = dataUrl.trim().match(ALLOWED_DATA_URL_RE);
  if (!match) {
    throw new Error('פורמט התמונה אינו נתמך (מותרים PNG, JPG, WEBP, GIF בלבד)');
  }
  const base64Clean = match[2].replace(/\s+/g, '');
  const estimatedBytes = Math.floor((base64Clean.length * 3) / 4);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_UPLOAD_BYTES) {
    throw new Error('גודל התמונה חורג מהמותר (מקסימום 4MB)');
  }
  return { mimeSubType: match[1].toLowerCase(), bytes: estimatedBytes };
}

export function createCloudinaryConfigFromEnv() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  return { cloudName, apiKey, apiSecret };
}

export const defaultServerImageUploader: ServerImageUploader = async ({ dataUrl, folder }) => {
  validateImageDataUrl(dataUrl);

  const cfg = createCloudinaryConfigFromEnv();
  if (!cfg) {
    throw new Error('שרת העלאת התמונות אינו מוגדר (חסרים משתני Cloudinary בצד השרת)');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const fullFolder = `yuval_studio/${folder}`;
  const signaturePayload = `folder=${fullFolder}&timestamp=${timestamp}${cfg.apiSecret}`;
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

  const body = new URLSearchParams({
    file: dataUrl.trim(),
    folder: fullFolder,
    timestamp: String(timestamp),
    api_key: cfg.apiKey,
    signature,
  });

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await resp.json().catch(() => ({}))) as any;
  if (!resp.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || 'העלאת התמונה ל-Cloudinary נכשלה');
  }
  return String(json.secure_url);
};
