// LinkedIn-carousel slide generator — ChatGPT writes, Claude edits.
// Step 1: gpt-5 drafts the carousel slides from the AI-news article.
// Step 2: claude-opus-4-8 edits/polishes them for hook strength + accuracy.
// Runs synchronously on Vercel (no Railway, no polling).
// Response shape matches populateSlides(): { slides: [{ title, content }] }.

const DEFAULT_COUNT = 8;
const MIN_COUNT = 3;
const MAX_COUNT = 12;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const WRITER_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const EDITOR_MODEL = process.env.CLAUDE_SLIDES_MODEL || 'claude-opus-4-8';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_KEY = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  const CLAUDE_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_KEY not configured' });

  const body = req.body || {};
  const title = (body.title || '').toString().trim();
  const summary = (body.summary || body.description || '').toString().trim();
  const source = (body.source || '').toString().trim();
  const avgScore = body.avg_score || body.avgScore || 85;

  if (!title && !summary) {
    return res.status(400).json({ error: 'title or summary is required' });
  }

  const count = clamp(parseInt(body.count, 10) || DEFAULT_COUNT, MIN_COUNT, MAX_COUNT);

  const writerPrompt = [
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
    // ---------- Step 1: ChatGPT (gpt-5) writes the draft ----------
    const draftSlides = await writeWithOpenAI(OPENAI_KEY, writerPrompt, count);
    if (!draftSlides.length) {
      return res.status(502).json({ error: 'Writer produced no slides' });
    }

    // ---------- Step 2: Claude edits/polishes (best-effort) ----------
    let slides = draftSlides;
    let editedBy = 'gpt-5';
    if (CLAUDE_KEY) {
      const edited = await editWithClaude(CLAUDE_KEY, draftSlides, { title, source, avgScore, count });
      if (edited && edited.length) {
        slides = edited;
        editedBy = 'gpt-5 + claude-opus-4-8';
      }
    }

    slides = normalizeSlides(slides);
    if (slides.length === 0) return res.status(502).json({ error: 'No slides produced' });

    return res.status(200).json({
      status: 'ready_for_review',
      percent: 100,
      count: slides.length,
      generated_by: editedBy,
      slides
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// gpt-5 is a reasoning model: max_completion_tokens (not max_tokens), no custom
// temperature, and a generous budget so reasoning doesn't starve the JSON answer.
async function writeWithOpenAI(key, prompt, count) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: WRITER_MODEL,
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: 'You output only valid JSON matching the requested schema.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '{}';
  return parseSlides(raw);
}

// Claude editor: tighten hooks, fix accuracy, keep the exact JSON shape + count.
async function editWithClaude(key, draftSlides, meta) {
  const editorPrompt = [
    `You are a senior LinkedIn editor. Below is a ${meta.count}-slide carousel draft (JSON) about an AI-news story.`,
    `Improve it: sharpen the slide-1 hook, tighten every line, remove hype/filler, keep claims accurate to the source, keep a strong CTA on the final slide.`,
    `Keep EXACTLY ${meta.count} slides. Titles max 8 words. Body max ~30 words. No markdown, no emojis.`,
    ``,
    `ARTICLE TITLE: ${meta.title || '(none)'}`,
    `SOURCE: ${meta.source || '(unknown)'}`,
    ``,
    `DRAFT JSON:`,
    JSON.stringify({ slides: draftSlides }),
    ``,
    `Return ONLY the improved JSON in the same shape: {"slides":[{"title":"...","content":"..."}]}.`
  ].join('\n');

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EDITOR_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: editorPrompt }]
      })
    });
    if (!response.ok) return null; // fall back to the gpt-5 draft
    const data = await response.json();
    const raw = (data?.content || []).find(b => b.type === 'text')?.text || '';
    return parseSlides(raw);
  } catch {
    return null; // never let the editor step break generation
  }
}

function parseSlides(raw) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed) ? parsed : (parsed.slides || []);
  return Array.isArray(arr) ? arr : [];
}

function normalizeSlides(slides) {
  return slides
    .filter((s) => s && (s.title || s.content))
    .map((s, i) => ({
      title: String(s.title || `Slide ${i + 1}`).trim(),
      content: String(s.content || s.body || s.text || '').trim()
    }));
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
