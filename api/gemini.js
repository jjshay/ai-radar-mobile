export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  // Model is overridable so switching to Pro is a one-line/env change.
  // NOTE: gemini-2.0-flash was retired by Google (404). gemini-2.5-flash works
  // on the free tier. gemini-3.1-pro-preview requires billing enabled (free
  // tier quota = 0), so set GEMINI_MODEL=gemini-3.1-pro-preview after enabling billing.
  const MODEL = req.query.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
