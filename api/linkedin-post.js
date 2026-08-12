// Auto-post to LinkedIn using a stored member access token (w_member_social).
// Posts a text share with an optional link card via the ugcPosts API.
// Token + person URN live in Vercel env (never in the client):
//   LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN (e.g. urn:li:person:XXXX)
// Response: { ok, url, urn } on success, or { ok:false, error } on failure.

const UGC_URL = 'https://api.linkedin.com/v2/ugcPosts';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_PERSON_URN;
  if (!token || !author) {
    return res.status(500).json({ ok: false, error: 'LinkedIn not configured (missing token or person URN)' });
  }

  const body = req.body || {};
  const text = (body.text || '').toString().trim();
  const link = (body.link || '').toString().trim();
  if (!text) return res.status(400).json({ ok: false, error: 'text is required' });

  // Build the share. If a link is provided, attach it as an ARTICLE media so
  // LinkedIn renders a link preview card; otherwise a plain text share.
  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: link ? 'ARTICLE' : 'NONE'
  };
  if (link) {
    shareContent.media = [{ status: 'READY', originalUrl: link }];
  }

  const payload = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  };

  try {
    const response = await fetch(UGC_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 200 || response.status === 201) {
      const urn = response.headers.get('x-restli-id') || '';
      const url = urn ? `https://www.linkedin.com/feed/update/${urn}` : 'https://www.linkedin.com/feed/';
      return res.status(200).json({ ok: true, urn, url });
    }

    const detail = await response.text();
    // 401 = token expired/revoked; surface clearly so the client can fall back.
    return res.status(response.status).json({
      ok: false,
      error: `LinkedIn API ${response.status}`,
      detail: detail.slice(0, 400)
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
