export default async function handler(req, res) {
  const { q, pageSize = '10' } = req.query;
  const API_KEY = process.env.NEWSAPI_KEY;

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q || 'artificial intelligence')}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
