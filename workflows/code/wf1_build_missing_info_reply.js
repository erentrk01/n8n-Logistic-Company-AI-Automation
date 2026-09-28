// Mode: Run Once for Each Item
// Prepares a polite "please send the missing data" draft plus a team message.
const cfg = $('Config').first().json.cfg;
const r = $json;
const name = [r.customer.firstName, r.customer.lastName].filter(Boolean).join(' ');
const list = r.missingLabels.map((label) => `- ${label}`).join('\n');

const text = r.language === 'en'
  ? [
      name ? `Dear ${name},` : 'Dear Sir or Madam,',
      '',
      'thank you for your transport request. To give you an accurate price, we still need the following information:',
      '',
      list,
      '',
      'As soon as we have these details, you will receive our offer promptly.',
      '',
      'Kind regards',
      cfg.senderName,
      cfg.companyName,
    ]
  : [
      name ? `Guten Tag ${name},` : 'Sehr geehrte Damen und Herren,',
      '',
      'vielen Dank für Ihre Transportanfrage. Für ein genaues Angebot benötigen wir noch folgende Angaben:',
      '',
      list,
      '',
      'Sobald uns diese Informationen vorliegen, erhalten Sie umgehend unser Angebot.',
      '',
      'Mit freundlichen Grüßen',
      cfg.senderName,
      cfg.companyName,
    ];

const slackText = [
  ':warning: *Anfrage unvollständig* – Rückfrage-Entwurf liegt im Postfach',
  `*Von:* ${r.fromName || '-'} <${r.fromEmail}>`,
  `*Betreff:* ${r.subject || '-'}`,
  `*Es fehlt:* ${r.missingLabels.join(', ')}`,
].join('\n');

return {
  json: {
    ...r,
    replySubject: /^(re|aw):/i.test(r.subject) ? r.subject : `Re: ${r.subject}`,
    replyBody: text.join('\n'),
    slackText,
  },
};
