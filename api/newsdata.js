export default async function handler(req, res) {
  const { q, language = 'en' } = req.query;
  const API_KEY = process.env.NEWSDATA_KEY;

  try {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&q=${encodeURIComponent(q || 'artificial intelligence')}&language=${language}`;
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
