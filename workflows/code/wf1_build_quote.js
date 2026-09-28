// Mode: Run Once for Each Item
// Adds the margin, writes the offer email and prepares the CRM record.
const cfg = $('Config').first().json.cfg;
const r = $json;
const best = r.bestOffer;

const marginPct = r.marginPct ?? Number(cfg.defaultMarginPct);
const priceEur = Math.round(best.cost * (1 + marginPct / 100) * 100) / 100;
const marginEur = Math.round((priceEur - best.cost) * 100) / 100;

const validUntil = new Date(Date.now() + Number(cfg.offerValidityDays) * 86400000);
const locale = r.language === 'en' ? 'en-GB' : 'de-DE';
const eur = (n) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n);
const dec = (n, d = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(n);
const date = (d) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(d);

const place = (p) => `${p.postalCode} ${p.city ?? ''} (${p.countryCode})`.replace(/\s+/g, ' ');
const name = [r.customer.firstName, r.customer.lastName].filter(Boolean).join(' ');
const goods = r.language === 'en'
  ? `${r.palletCount ? `${r.palletCount} pallet(s), ` : ''}${dec(r.weightKg, 1)} kg, ${dec(r.volumeM3)} m³`
  : `${r.palletCount ? `${r.palletCount} Palette(n), ` : ''}${dec(r.weightKg, 1)} kg, ${dec(r.volumeM3)} m³`;

const de = [
  name ? `Guten Tag ${name},` : 'Sehr geehrte Damen und Herren,',
  '',
  'vielen Dank für Ihre Transportanfrage. Gerne bieten wir Ihnen folgenden Transport an:',
  '',
  `Abholung:              ${place(r.origin)}`,
  `Zustellung:            ${place(r.destination)}`,
  `Sendung:               ${goods}`,
  `Frachtpflichtiges Gew.: ${dec(r.chargeableKg, 0)} kg`,
  r.pickupDate ? `Abholtermin:           ${r.pickupDate}` : null,
  best.transitDays ? `Laufzeit:              ca. ${best.transitDays} Werktag(e)` : null,
  `Preis:                 ${eur(priceEur)} zzgl. gesetzl. MwSt., inkl. Dieselzuschlag`,
  '',
  r.dangerousGoods ? 'Hinweis: Da es sich um Gefahrgut handelt, benötigen wir vorab UN-Nummer und Sicherheitsdatenblatt.' : null,
  r.volumeSource === 'estimated_from_pallets' ? 'Hinweis: Das Volumen wurde auf Basis von Standard-Europaletten angenommen. Bitte bestätigen Sie die Maße.' : null,
  `Dieses Angebot ist gültig bis zum ${date(validUntil)}. ${cfg.termsLineDe}`,
  '',
  'Wir freuen uns auf Ihren Auftrag.',
  '',
  'Mit freundlichen Grüßen',
  cfg.senderName,
  cfg.companyName,
];

const en = [
  name ? `Dear ${name},` : 'Dear Sir or Madam,',
  '',
  'thank you for your transport request. We are pleased to offer the following transport:',
  '',
  `Pickup:            ${place(r.origin)}`,
  `Delivery:          ${place(r.destination)}`,
  `Shipment:          ${goods}`,
  `Chargeable weight: ${dec(r.chargeableKg, 0)} kg`,
  r.pickupDate ? `Pickup date:       ${r.pickupDate}` : null,
  best.transitDays ? `Transit time:      approx. ${best.transitDays} working day(s)` : null,
  `Price:             ${eur(priceEur)} plus VAT, incl. fuel surcharge`,
  '',
  r.dangerousGoods ? 'Note: as these are dangerous goods, we need the UN number and safety data sheet in advance.' : null,
  r.volumeSource === 'estimated_from_pallets' ? 'Note: the volume was estimated based on standard euro pallets. Please confirm the dimensions.' : null,
  `This offer is valid until ${date(validUntil)}. ${cfg.termsLineEn}`,
  '',
  'We look forward to your order.',
  '',
  'Kind regards',
  cfg.senderName,
  cfg.companyName,
];

const twentyOpportunityPayload = {
  name: `${r.companyName} | ${r.origin.postalCode} → ${r.destination.postalCode}`,
  amount: { amountMicros: Math.round(priceEur * 1e6), currencyCode: 'EUR' },
  stage: cfg.twentyStageNew,
};
if (r.companyId) twentyOpportunityPayload.companyId = r.companyId;
if (r.personId) twentyOpportunityPayload.pointOfContactId = r.personId;
if (cfg.twentyUseCustomFields) {
  twentyOpportunityPayload.route = r.route;
  twentyOpportunityPayload.chargeableKg = r.chargeableKg;
}
// The Gmail thread links a later customer reply ("wir beauftragen Sie") to this opportunity.
if (cfg.twentyThreadField) twentyOpportunityPayload[cfg.twentyThreadField] = r.threadId;

const warnings = [
  ...(r.crmWarnings ?? []),
  r.dangerousGoods ? ':biohazard_sign: Gefahrgut (ADR) – bitte prüfen' : null,
  r.volumeSource === 'estimated_from_pallets' ? ':straight_ruler: Volumen aus Palettenanzahl geschätzt' : null,
  r.pdfError ? `:page_facing_up: PDF konnte nicht gelesen werden (${r.pdfError})` : null,
].filter(Boolean);

return {
  json: {
    ...r,
    marginPct,
    marginEur,
    priceEur,
    validUntil: validUntil.toISOString().slice(0, 10),
    replySubject: /^(re|aw):/i.test(r.subject) ? r.subject : `Re: ${r.subject}`,
    replyBody: (r.language === 'en' ? en : de).filter((line) => line !== null).join('\n'),
    twentyOpportunityPayload,
    warnings,
  },
};
