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

  const cleanPhone = phone.replace(/[\s()-]/g, '');
  const text = `Yangi ro'yxatdan o'tish — AI Seminar\nIsm: ${name.trim()}\nTelefon: ${cleanPhone}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      res.status(502).json({ ok: false, error: 'telegram_failed' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: 'telegram_unreachable' });
  }
}
