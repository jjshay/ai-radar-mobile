export default async function handler(req, res) {
  const SHEET_ID = '11a-_IWhljPJHeKV8vdke-JiLmm_KCq-bedSceKB0kZI';
  const GID = req.query.gid || '5770604';

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const response = await fetch(url, { redirect: 'follow' });
    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(text);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: err.message });
  }
}
