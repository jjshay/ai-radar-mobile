// Synchronous LinkedIn-carousel slide generator.
// Replaces the stale Railway /generate-from-newsout route. Runs on Vercel,
// calls OpenAI once, and returns real slide content the flipbook can render.
// Response shape matches what populateSlides() expects: { slides: [{ title, content }] }.

const DEFAULT_COUNT = 8;
const MIN_COUNT = 3;
const MAX_COUNT = 12;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'OPENAI_KEY not configured' });

  const body = req.body || {};
  const title = (body.title || '').toString().trim();
  const summary = (body.summary || body.description || '').toString().trim();
  const source = (body.source || '').toString().trim();
  const avgScore = body.avg_score || body.avgScore || 85;

  if (!title && !summary) {
    return res.status(400).json({ error: 'title or summary is required' });
  }

  const count = clamp(parseInt(body.count, 10) || DEFAULT_COUNT, MIN_COUNT, MAX_COUNT);

  const prompt = [
    `You are a LinkedIn carousel writer. Turn the AI-news article below into exactly ${count} punchy slides.`,
    `Slide 1 is a bold hook/title card. The final slide is a call-to-action to follow for more AI insights.`,
    `Each slide: a short title (max 8 words) and 1-2 tight sentences of body copy (max ~30 words). No markdown, no emojis in JSON values.`,
    ``,
    `ARTICLE TITLE: ${title || '(none)'}`,
    `SOURCE: ${source || '(unknown)'}`,
    `AI SCORE: ${avgScore}`,
    `SUMMARY: ${summary || '(none)'}`,
    ``,
    `Return ONLY JSON in this exact shape: {"slides":[{"title":"...","content":"..."}]} with ${count} items.`
  ].join('\n');

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You output only valid JSON matching the requested schema.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'OpenAI error', detail: errText.slice(0, 500) });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';

    let slides = [];
    try {
      const parsed = JSON.parse(raw);
      slides = Array.isArray(parsed) ? parsed : (parsed.slides || []);
    } catch (parseErr) {
      return res.status(502).json({ error: 'Model returned non-JSON', detail: raw.slice(0, 300) });
    }

    slides = slides
      .filter((s) => s && (s.title || s.content))
      .map((s, i) => ({
        title: String(s.title || `Slide ${i + 1}`).trim(),
        content: String(s.content || s.body || s.text || '').trim()
      }));

    if (slides.length === 0) {
      return res.status(502).json({ error: 'No slides produced' });
    }

    return res.status(200).json({
      status: 'ready_for_review',
      percent: 100,
      count: slides.length,
      slides
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
