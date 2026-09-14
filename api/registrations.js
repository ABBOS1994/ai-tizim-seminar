export default async function handler(req, res) {
  const secret = process.env.REGISTRATIONS_SECRET;
  const provided = req.headers['x-registrations-key'];

  if (!secret || provided !== secret) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!ghToken || !repo) {
    res.status(500).json({ ok: false, error: 'server_not_configured' });
    return;
  }

  try {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/data/registrations.csv`;
    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!ghRes.ok) {
      res.status(502).json({ ok: false, error: 'fetch_failed' });
      return;
    }
    const data = await ghRes.json();
    const csv = Buffer.from(data.content, 'base64').toString('utf8');
    res.status(200).setHeader('Content-Type', 'text/csv; charset=utf-8').send(csv);
  } catch (err) {
    res.status(502).json({ ok: false, error: 'fetch_unreachable' });
  }
}
