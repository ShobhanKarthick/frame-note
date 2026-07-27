import { Router } from 'express';
import { directusConfigured, uploadToDirectus, DirectusUploadError } from '../services/directus.js';

const router = Router();

// Upload an attachment to Directus and return an Attachment-shaped object.
// The browser sends the file as a base64 data URL (only at comment-submit time,
// so images that are pasted-then-removed never reach Directus). The Directus
// static token stays server-side; the browser only ever sees the asset URL.
//
// The Directus call itself lives in services/directus.ts so the attachment
// backfill script uses the same upload path. This route only maps errors to
// status codes.
router.post('/', async (req, res) => {
  try {
    if (!directusConfigured()) {
      return res.status(500).json({
        error: 'Directus is not configured. Set DIRECTUS_URL, DIRECTUS_TOKEN and DIRECTUS_UPLOAD_FOLDER.',
      });
    }

    const { dataUrl, name } = req.body as { dataUrl?: string; name?: string };
    if (!dataUrl) {
      return res.status(400).json({ error: 'No file provided (expected a base64 "dataUrl")' });
    }

    const attachment = await uploadToDirectus(dataUrl, name);
    res.status(201).json(attachment);
  } catch (error: any) {
    if (error instanceof DirectusUploadError) {
      console.error('❌ Directus upload failed:', error.status, error.message);
      switch (error.status) {
        case 400:
          return res.status(400).json({ error: 'Invalid data URL (expected base64-encoded data)' });
        case 504:
          return res.status(504).json({ error: 'Upload to storage timed out. Please try again.' });
        case 502:
          return res.status(502).json({ error: 'Directus upload failed' });
        default:
          return res.status(500).json({ error: error.message });
      }
    }

    console.error('❌ Error uploading attachment:', error);
    res.status(500).json({
      error: 'Failed to upload attachment',
      details: error?.message || String(error),
    });
  }
});

export default router;
