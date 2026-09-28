// Mode: Run Once for Each Item
// Turns one raw Gmail message into a clean, predictable structure.
const cfg = $('Config').first().json.cfg;
const mail = $input.item.json;
const binary = $input.item.binary ?? {};

const sender = mail.from?.value?.[0] ?? {};
const fromEmail = String(sender.address ?? '').trim().toLowerCase();
const fromName = String(sender.name ?? '').trim();
const domain = fromEmail.includes('@') ? fromEmail.split('@')[1] : '';
const freemailDomains = String(cfg.freemailDomains ?? '')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

// Prefer the plain-text part; fall back to stripped HTML.
const htmlAsText = String(mail.html ?? '')
  .replace(/<(br|\/p|\/div|\/tr)\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/[ \t]+/g, ' ');
const bodyText = (String(mail.text ?? '').trim() || htmlAsText.trim()).slice(0, 12000);

// First PDF attachment (if any) is passed on for text extraction.
const pdfKey = Object.keys(binary).find((key) => {
  const file = binary[key] ?? {};
  return String(file.mimeType ?? '').toLowerCase() === 'application/pdf'
    || /\.pdf$/i.test(String(file.fileName ?? ''));
}) ?? null;

return {
  json: {
    messageId: mail.id,
    threadId: mail.threadId,
    receivedAt: mail.date ?? new Date().toISOString(),
    subject: String(mail.subject ?? '').trim(),
    fromEmail,
    fromName,
    domain,
    isFreemail: freemailDomains.includes(domain),
    bodyText,
    pdfKey,
    attachmentCount: Object.keys(binary).length,
  },
  binary,
};
