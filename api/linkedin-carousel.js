// Post a REAL slide-deck carousel to LinkedIn.
// 1) Render the generated slides into a branded navy/gold PDF (pdf-lib).
// 2) initializeUpload -> PUT the PDF bytes -> create a /rest/posts document post.
// Uses Vercel env LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN (w_member_social).
// Body: { slides:[{title,content}], title?, commentary? }
// Response: { ok, url, urn } or { ok:false, error, detail }.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const REST_BASE = 'https://api.linkedin.com/rest';
const LINKEDIN_VERSION = '202503';

// Brand palette (Global Gauntlet navy/gold).
const NAVY = rgb(11 / 255, 15 / 255, 26 / 255);
const NAVY_CARD = rgb(20 / 255, 27 / 255, 45 / 255);
const GOLD = rgb(201 / 255, 162 / 255, 39 / 255);
const WHITE = rgb(0.96, 0.97, 0.99);
const MUTED = rgb(0.72, 0.75, 0.82);

const SIZE = 1080; // square carousel page

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_PERSON_URN;
  if (!token || !author) return res.status(500).json({ ok: false, error: 'LinkedIn not configured' });

  const body = req.body || {};
  const slides = Array.isArray(body.slides) ? body.slides.filter(s => s && (s.title || s.content)) : [];
  if (slides.length === 0) return res.status(400).json({ ok: false, error: 'slides are required' });
  const deckTitle = (body.title || 'AI Pulse').toString().slice(0, 100);
  const commentary = (body.commentary || deckTitle).toString().slice(0, 2900);

  try {
    const pdfBytes = await buildPdf(slides);

    // Step 1: initialize the document upload.
    const initResp = await fetch(`${REST_BASE}/documents?action=initializeUpload`, {
      method: 'POST',
      headers: authHeaders(token, { json: true }),
      body: JSON.stringify({ initializeUploadRequest: { owner: author } })
    });
    if (!initResp.ok) {
      return res.status(initResp.status).json({ ok: false, error: 'initializeUpload failed', detail: (await initResp.text()).slice(0, 400) });
    }
    const initData = await initResp.json();
    const uploadUrl = initData?.value?.uploadUrl;
    const documentUrn = initData?.value?.document;
    if (!uploadUrl || !documentUrn) {
      return res.status(502).json({ ok: false, error: 'initializeUpload missing uploadUrl/document' });
    }

    // Step 2: PUT the PDF bytes.
    const putResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: pdfBytes
    });
    if (!(putResp.status === 200 || putResp.status === 201)) {
      return res.status(putResp.status).json({ ok: false, error: 'PDF upload failed', detail: (await putResp.text()).slice(0, 400) });
    }

    // Step 3: create the document (carousel) post.
    const postPayload = {
      author,
      commentary,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { title: deckTitle, id: documentUrn } },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };
    const postResp = await fetch(`${REST_BASE}/posts`, {
      method: 'POST',
      headers: authHeaders(token, { json: true }),
      body: JSON.stringify(postPayload)
    });
    if (postResp.status === 200 || postResp.status === 201) {
      const urn = postResp.headers.get('x-restli-id') || '';
      const url = urn ? `https://www.linkedin.com/feed/update/${urn}` : 'https://www.linkedin.com/feed/';
      return res.status(200).json({ ok: true, urn, url });
    }
    return res.status(postResp.status).json({ ok: false, error: `posts ${postResp.status}`, detail: (await postResp.text()).slice(0, 400) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

function authHeaders(token, { json } = {}) {
  const h = {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LINKEDIN_VERSION
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function buildPdf(slides) {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const margin = 90;
  const maxWidth = SIZE - margin * 2;

  slides.forEach((s, i) => {
    const page = doc.addPage([SIZE, SIZE]);
    // Background + inset card.
    page.drawRectangle({ x: 0, y: 0, width: SIZE, height: SIZE, color: NAVY });
    page.drawRectangle({ x: 40, y: 40, width: SIZE - 80, height: SIZE - 80, color: NAVY_CARD });
    // Gold accent bar top.
    page.drawRectangle({ x: margin, y: SIZE - 150, width: 120, height: 8, color: GOLD });
    // Slide counter.
    page.drawText(`${i + 1} / ${slides.length}`, { x: SIZE - margin - 90, y: SIZE - 140, size: 24, font: bold, color: MUTED });

    const title = (s.title || `Slide ${i + 1}`).toString();
    const contentTxt = (s.content || s.body || s.text || '').toString();

    // Title (gold, wrapped) starting below the accent bar.
    let y = SIZE - 260;
    const titleSize = title.length > 40 ? 52 : 62;
    for (const line of wrap(title, bold, titleSize, maxWidth)) {
      page.drawText(line, { x: margin, y, size: titleSize, font: bold, color: GOLD });
      y -= titleSize + 12;
    }

    // Body (white, wrapped) below the title.
    y -= 30;
    const bodySize = 36;
    for (const line of wrap(contentTxt, regular, bodySize, maxWidth)) {
      if (y < 150) break;
      page.drawText(line, { x: margin, y, size: bodySize, font: regular, color: WHITE });
      y -= bodySize + 14;
    }

    // Footer brand.
    page.drawText('AI PULSE  ·  Intelligence Engine', { x: margin, y: 80, size: 22, font: bold, color: GOLD });
  });

  return await doc.save();
}

// Greedy word-wrap: return lines that fit maxWidth for the given font/size.
function wrap(text, font, size, maxWidth) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}
