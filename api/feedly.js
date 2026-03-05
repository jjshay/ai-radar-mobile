export default async function handler(req, res) {
  const { q } = req.query;
  const ACCESS_TOKEN = process.env.FEEDLY_TOKEN;

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Search for articles matching the query
    const searchUrl = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(q || 'artificial intelligence')}&count=10`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      return res.status(searchResp.status).json({ error: errText });
    }

    const searchData = await searchResp.json();

    // Get stream contents from top feed results
    if (searchData.results && searchData.results.length > 0) {
      const feedId = searchData.results[0].id;
      const streamUrl = `https://cloud.feedly.com/v3/streams/contents?streamId=${encodeURIComponent(feedId)}&count=10`;
      const streamResp = await fetch(streamUrl, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });

      if (streamResp.ok) {
        const streamData = await streamResp.json();
        return res.status(200).json(streamData);
      }
    }

    // Fallback: return search results as-is
    res.status(200).json(searchData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
