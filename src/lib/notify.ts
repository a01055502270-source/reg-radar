/**
 * 알림 서비스 — Telegram / Email
 * 긴급 규제 감지 시 즉시 발송
 */

// ── Telegram ──
export async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });
}

// ── Email (Resend) ──
export async function sendEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: '규제레이더 <noreply@reg-radar.com>',
      to,
      subject,
      html,
    }),
  });
}

// ── 긴급 규제 알림 ──
export async function notifyCriticalRegulation(reg: {
  title: string;
  source: string;
  url: string;
  context: string;
}) {
  const telegramMsg = [
    `🔴 <b>[긴급] 신규 규제 감지</b>`,
    ``,
    `<b>${reg.title}</b>`,
    `출처: ${reg.source}`,
    ``,
    reg.context.slice(0, 200),
    ``,
    `<a href="${reg.url}">원문 보기</a>`,
  ].join('\n');

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;">
      <div style="background:#C93B3B;color:white;padding:12px 20px;font-weight:bold;">
        [긴급] 신규 규제 감지
      </div>
      <div style="padding:20px;border:1px solid #eee;">
        <h2 style="margin:0 0 12px;font-size:16px;">${reg.title}</h2>
        <p style="color:#666;font-size:14px;">출처: ${reg.source}</p>
        <p style="font-size:14px;line-height:1.6;">${reg.context}</p>
        <a href="${reg.url}" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#1A56DB;color:white;text-decoration:none;border-radius:4px;">원문 보기</a>
      </div>
    </div>
  `;

  await Promise.allSettled([
    sendTelegram(telegramMsg),
    sendEmail(`[긴급] ${reg.title}`, emailHtml),
  ]);
}
