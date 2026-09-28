// Mode: Run Once for Each Item
// Builds the Claude API request (Messages API + structured outputs). The AI only EXTRACTS data - it never calculates prices.
const cfg = $('Config').first().json.cfg;
const mail = $('Normalize Email').item.json;

// Separate what the sender NEWLY wrote from the quoted conversation below it
// (Gmail "Am ... schrieb", Outlook/Hotmail "Von:/From:" blocks, "> " lines).
// Without this, a reply like "passt, wir beauftragen Sie" would be read together with
// our quoted offer and could be mistaken for a new transport request.
const QUOTE_START = [
  /^\s*>/,
  /^\s*(am|on)\b.*(schrieb|wrote)/i,
  /(schrieb|wrote)\s*.*:\s*$/i,
  /^\s*-{2,}\s*(original|ursprüngliche|forwarded|weitergeleitete)/i,
  /^\s*_{5,}\s*$/,
];
// "Von:/From:" only counts as a mail header if it contains an address or is followed by
// "Gesendet:/Sent:/Datum:/Date:" - so "Von: 80331 München" in a request is NOT cut off.
const isHeaderBlock = (lines, i) => /^\s*(von|from)\s*:/i.test(lines[i])
  && (/@/.test(lines[i]) || lines.slice(i + 1, i + 4).some((l) => /^\s*(gesendet|sent|datum|date)\s*:/i.test(l)));
const bodyLines = String(mail.bodyText ?? '').split(/\r?\n/);
const cut = bodyLines.findIndex((line, i) => QUOTE_START.some((re) => re.test(line)) || isHeaderBlock(bodyLines, i));
const newText = (cut === -1 ? bodyLines : bodyLines.slice(0, cut)).join('\n').trim();
const quotedHistory = cut === -1 ? '' : bodyLines.slice(cut).join('\n').trim().slice(0, 4000);

// Input is either the PDF extraction result or (no PDF) the normalised email itself.
const pdfText = typeof $json.text === 'string' ? $json.text.trim().slice(0, 12000) : '';
const pdfError = $json.error ? String($json.error.message ?? $json.error) : null;

// Claude structured outputs limit union types ("string|null"), so the schema uses
// plain types: missing text = "" and missing numbers = 0. The validation step treats both as "missing".
const str = (description) => (description ? { type: 'string', description } : { type: 'string' });
const numb = (description) => (description ? { type: 'number', description } : { type: 'number' });
const place = {
  type: 'object',
  additionalProperties: false,
  properties: {
    country_code: str('ISO 3166-1 alpha-2, e.g. DE, AT, IT. Empty string if unknown'),
    postal_code: str('Empty string if unknown'),
    city: str('Empty string if unknown'),
  },
  required: ['country_code', 'postal_code', 'city'],
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email_type: {
      type: 'string',
      enum: ['transport_inquiry', 'order_confirmation', 'other'],
      description: 'Based ONLY on the NEW MESSAGE part',
    },
    confirmation_quote: str('For order_confirmation: the confirming sentence, copied word for word. Otherwise empty string'),
    language: { type: 'string', enum: ['de', 'en', 'other'] },
    customer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        first_name: str(), last_name: str(), company_name: str(), phone: str(),
      },
      required: ['first_name', 'last_name', 'company_name', 'phone'],
    },
    origin: place,
    destination: place,
    total_weight_kg: numb('Total gross weight in kg, only if stated, otherwise 0'),
    total_volume_m3: numb('Total volume in m3, only if stated, otherwise 0'),
    packages: {
      type: 'array',
      description: 'One entry per package type, exactly as stated in the email',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'integer' },
          type: str('e.g. EUR pallet, one-way pallet, box, crate'),
          length_cm: numb(), width_cm: numb(), height_cm: numb(), weight_kg_each: numb(),
        },
        required: ['count', 'type', 'length_cm', 'width_cm', 'height_cm', 'weight_kg_each'],
      },
    },
    cargo_description: str(),
    dangerous_goods: { type: 'boolean', description: 'true only if ADR / hazardous goods are mentioned' },
    pickup_date: str('YYYY-MM-DD or as written (e.g. KW 42)'),
    delivery_deadline: str(),
    special_requirements: str('e.g. tail lift, appointment, temperature'),
  },
  required: [
    'email_type', 'confirmation_quote', 'language', 'customer', 'origin', 'destination',
    'total_weight_kg', 'total_volume_m3', 'packages', 'cargo_description',
    'dangerous_goods', 'pickup_date', 'delivery_deadline', 'special_requirements',
  ],
};

const systemPrompt = [
  'You extract transport request data for a German freight forwarder.',
  'Rules:',
  '- Extract ONLY information that is explicitly written in the email or attachment. Never guess or invent values.',
  '- If a value is missing, use an empty string for text and 0 for numbers.',
  '- Convert units only: tonnes to kg (1,2 t = 1200), metres to cm. Decimal commas are decimals (1,5 = 1.5).',
  '- Do NOT calculate totals, volumes or prices. List packages exactly as described.',
  '- Countries as ISO-2 codes (Deutschland = DE, Österreich = AT, Italien = IT).',
  '- Classify email_type using ONLY the NEW MESSAGE. The QUOTED HISTORY is earlier conversation (often our own offer) and is context only.',
  '- transport_inquiry: the sender asks for a price/offer for a transport.',
  "- order_confirmation: the sender accepts our offer or places the order (e.g. 'wir beauftragen Sie', 'Auftrag erteilt', 'passt, bitte durchführen', 'we accept your offer').",
  '- Questions, price negotiations, rejections, invoices, newsletters, spam and notifications are other.',
  "- Examples: 'passt, wir beauftragen Sie hiermit' = order_confirmation. 'Ja, bitte so durchführen' = order_confirmation. 'Geht es auch für 190 Euro?' = other. 'Können Sie 2 Paletten von Köln nach Paris anbieten?' = transport_inquiry.",
  '- For order_confirmation and other: fill transport fields only if they are newly written in the NEW MESSAGE, otherwise leave them empty / 0.',
].join('\n');

const userPrompt = [
  `SUBJECT: ${mail.subject}`,
  `FROM: ${mail.fromName} <${mail.fromEmail}>`,
  '',
  'NEW MESSAGE (written by the sender):',
  newText || '(empty)',
  '',
  'QUOTED HISTORY (context only, do not extract from it):',
  quotedHistory || '(none)',
  '',
  'ATTACHMENT TEXT:',
  pdfText || '(no attachment)',
].join('\n');

const llmRequest = {
  model: cfg.anthropicModel,
  max_tokens: 2048,
  temperature: 0,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
  output_config: { format: { type: 'json_schema', schema } },
};

return { json: { ...mail, newText, hasQuotedHistory: quotedHistory.length > 0, pdfTextLength: pdfText.length, pdfError, llmRequest } };
