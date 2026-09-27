const {
  validateContactPayload,
  buildEventPayload,
  submitEventToFub,
} = require('../lib/fub-contact');

const DEFAULT_SOURCE_URL = 'https://www.waterfallhomesnorthlasvegas.com/contact';

/**
 * Vercel serverless handler for contact / lead submissions to Follow Up Boss.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.FOLLOW_UP_BOSS_API_KEY;
  if (!apiKey) {
    console.error(
      'FOLLOW_UP_BOSS_API_KEY is not set; cannot submit leads to Follow Up Boss',
    );
    return res.status(503).json({ error: 'Lead capture is temporarily unavailable' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  if (body === undefined || body === null) {
    body = {};
  }

  const validation = validateContactPayload(body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const sourceUrl =
    String(body.sourceUrl ?? '').trim() ||
    (typeof req.headers.referer === 'string' ? req.headers.referer : '') ||
    DEFAULT_SOURCE_URL;

  const payload = buildEventPayload(body, validation.data, sourceUrl);

  try {
    const fubResponse = await submitEventToFub(payload, apiKey);
    if (!fubResponse.ok) {
      console.error(
        `Follow Up Boss events API returned status ${fubResponse.status}`,
      );
      return res.status(502).json({ error: 'Failed to send your message' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Follow Up Boss request failed:', err instanceof Error ? err.message : 'unknown');
    return res.status(502).json({ error: 'Failed to send your message' });
  }
};
