import type { Attachment } from '../types.js';

// Directus file upload, extracted from routes/upload.ts so the HTTP route and
// the attachment backfill script provably share one implementation.

export class DirectusUploadError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'DirectusUploadError';
  }
}

export function directusConfigured(): boolean {
  return Boolean(
    process.env.DIRECTUS_URL &&
    process.env.DIRECTUS_TOKEN &&
    process.env.DIRECTUS_UPLOAD_FOLDER
  );
}

// data:<mimetype>;base64,<data>
export function parseDataUrl(dataUrl: string): { mimetype: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { mimetype: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/**
 * Upload one base64 data URL to Directus and return an Attachment pointing at
 * the hosted asset. Throws DirectusUploadError with a `status` hint on failure.
 */
export async function uploadToDirectus(dataUrl: string, name?: string): Promise<Attachment> {
  if (!directusConfigured()) {
    throw new DirectusUploadError(
      'Directus is not configured. Set DIRECTUS_URL, DIRECTUS_TOKEN and DIRECTUS_UPLOAD_FOLDER.',
      500
    );
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new DirectusUploadError('Invalid data URL (expected base64-encoded data)', 400);
  }

  const { mimetype, buffer } = parsed;
  const filename = name || `upload.${mimetype.split('/')[1] || 'bin'}`;
  const directusUrl = process.env.DIRECTUS_URL!.replace(/\/+$/, '');

  // Directus expects multipart/form-data at POST /files, with non-file fields
  // (like `folder`) appearing BEFORE the file part.
  const form = new FormData();
  form.append('folder', process.env.DIRECTUS_UPLOAD_FOLDER!);
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimetype }), filename);

  let directusRes: Response;
  try {
    directusRes = await fetch(`${directusUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.DIRECTUS_TOKEN}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new DirectusUploadError('Upload to storage timed out. Please try again.', 504);
    }
    throw err;
  }

  if (!directusRes.ok) {
    const body = await directusRes.text();
    throw new DirectusUploadError(`Directus upload failed: ${directusRes.status} ${body}`, 502);
  }

  const { data } = await directusRes.json() as { data: { id: string } };

  return {
    id: data.id,
    type: mimetype.startsWith('image/') ? 'image' : 'file',
    url: `${directusUrl}/assets/${data.id}`,
    name: filename,
  };
}
