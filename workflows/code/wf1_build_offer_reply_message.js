// Mode: Run Once for Each Item
// Team message for customer replies. The AI only SUGGESTS; an employee sets the
// opportunity to "won" in the CRM (human in the loop).
const cfg = $('Config').first().json.cfg;
const r = $json;
const opp = r.threadOpportunity;

const eur = (micros) => (micros ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(micros / 1e6) : '-');
const sender = `${r.fromName || r.fromEmail} <${r.fromEmail}>`;
const excerpt = String(r.newText ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
const said = r.confirmationQuote || excerpt;
const crm = opp ? `:link: CRM: ${cfg.twentyPublicUrl}/object/opportunity/${opp.id}` : null;

let outcome;
let lines;
if (!opp) {
  outcome = 'no_match';
  lines = [
    ':handshake: *Auftragsbestätigung erkannt* – keine passende Verkaufschance gefunden',
    `*Von:* ${sender}`,
    `*Betreff:* ${r.subject || '-'}`,
    said ? `_„${said}“_` : null,
    ':point_right: Bitte die Verkaufschance im CRM manuell zuordnen und auf *gewonnen* setzen.',
  ];
} else if (r.isConfirmation && opp.stage === cfg.twentyStageWon) {
  outcome = 'already_won';
  lines = [':information_source: *Auftragsbestätigung erkannt* – Verkaufschance ist bereits gewonnen', `*Auftrag:* ${opp.name}`, crm];
} else if (r.isConfirmation) {
  outcome = 'suggest_won';
  lines = [
    ':handshake: *Kunde hat bestätigt* – Vorschlag: Verkaufschance auf *gewonnen* setzen',
    `*Auftrag:* ${opp.name}  |  *Angebot:* ${eur(opp.amount?.amountMicros)}`,
    `*Von:* ${sender}`,
    said ? `_„${said}“_` : null,
    `:point_right: Bitte prüfen und im CRM auf *${cfg.twentyStageWon}* ziehen – danach geht der Auftrag automatisch ans TMS.`,
    crm,
  ];
} else {
  outcome = 'reply_needs_review';
  lines = [
    ':speech_balloon: *Kunde hat auf ein Angebot geantwortet* – keine eindeutige Bestätigung, bitte lesen',
    `*Auftrag:* ${opp.name}  |  *Angebot:* ${eur(opp.amount?.amountMicros)}`,
    `*Von:* ${sender}`,
    excerpt ? `_„${excerpt}“_` : null,
    crm,
  ];
}

return { json: { messageId: r.messageId, outcome, confirmationSignal: r.confirmationSignal, slackText: lines.filter(Boolean).join('\n') } };
