export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const { name, phone } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ ok: false, error: 'name_required' });
    return;
  }
  if (!phone || typeof phone !== 'string' || !/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
    res.status(400).json({ ok: false, error: 'phone_invalid' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    res.status(500).json({ ok: false, error: 'server_not_configured' });
    return;
  }

  const cleanName = name.trim();
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  const text = `Yangi ro'yxatdan o'tish — AI Seminar\nIsm: ${cleanName}\nTelefon: ${cleanPhone}`;

  let telegramOk = false;
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const tgData = await tgRes.json();
    telegramOk = !!tgData.ok;
  } catch (err) {
    telegramOk = false;
  }

  await appendToSheet(cleanName, cleanPhone).catch(() => {});

  if (!telegramOk) {
    res.status(502).json({ ok: false, error: 'telegram_failed' });
    return;
  }
  res.status(200).json({ ok: true });
}

async function appendToSheet(name, phone) {
  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!ghToken || !repo) return;

  const path = 'data/registrations.csv';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const getRes = await fetch(apiUrl, { headers });
  let sha, existing;
  if (getRes.status === 200) {
    const data = await getRes.json();
    sha = data.sha;
    existing = Buffer.from(data.content, 'base64').toString('utf8');
  } else {
    existing = 'timestamp,name,phone\n';
  }

  const row = `${new Date().toISOString()},"${name.replace(/"/g, '""')}","${phone}"\n`;
  const updated = existing.endsWith('\n') ? existing + row : existing + '\n' + row;

  const body = {
    message: `Yangi ro'yxat: ${name}`,
    content: Buffer.from(updated, 'utf8').toString('base64'),
    ...(sha ? { sha } : {}),
  };

  await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
}
