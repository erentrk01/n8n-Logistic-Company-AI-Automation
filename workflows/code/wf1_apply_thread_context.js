// Mode: Run Once for Each Item
// Deterministic routing BEFORE trusting the AI classification:
// a reply inside a Gmail thread where we already sent an offer is never ignored.
// AI + keywords only decide whether that reply is a confirmation (the employee decides anyway).
const r = $('Parse & Validate').item.json;
const res = $json;

const list = res.error ? [] : (Array.isArray(res.data)
  ? res.data
  : Object.values(res.data ?? {}).find(Array.isArray) ?? []);
const threadOpportunity = [...list]
  .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0] ?? null;

// Backup signal for clear confirmations, in case the AI answers "other".
const text = String(r.newText ?? '');
const CONFIRM = /(beauftrag|auftrag\s+(ist\s+)?erteilt|angebot\s+(wird\s+)?angenommen|nehmen\s+(das|ihr)\s+angebot\s+an|wir\s+bestätigen|hiermit\s+bestätig|bitte\s+(durchführen|ausführen|buchen)|we\s+accept|accept(ed)?\s+your\s+(offer|quote)|please\s+proceed|go\s+ahead)/i;
const NEGATION = /\b(nicht|kein|keine|keinen|leider|zu\s+teuer|absage|abgesagt|storn\w*|cancel\w*|declin\w*|reject\w*|not)\b/i;
const keywordConfirm = CONFIRM.test(text) && !NEGATION.test(text);
const aiConfirm = r.emailType === 'order_confirmation';
const isConfirmation = aiConfirm || keywordConfirm;

let status = r.status;
if (threadOpportunity) status = 'offer_reply';            // known offer thread -> always to the team
else if (isConfirmation) status = 'order_confirmation';   // confirmation, but thread unknown

return {
  json: {
    ...r,
    status,
    threadOpportunity,
    isConfirmation,
    confirmationSignal: aiConfirm && keywordConfirm ? 'ai+keywords' : aiConfirm ? 'ai' : keywordConfirm ? 'keywords' : 'none',
    threadLookupFailed: Boolean(res.error),
  },
};
