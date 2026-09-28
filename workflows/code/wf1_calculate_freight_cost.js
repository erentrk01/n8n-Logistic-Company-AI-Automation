// Mode: Run Once for Each Item
// Deterministic freight cost calculation from the price list (no AI involved).
const cfg = $('Config').first().json.cfg;
const { rates = [], ...r } = $json;

const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s|€/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;
// First two digits of the postcode. Pads, because Google Sheets turns "01" into 1.
const zip2 = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(0, 2) : digits.padStart(2, '0');
};
const cc = (value) => String(value ?? '').trim().toUpperCase();
const today = new Date().toISOString().slice(0, 10);
const isValid = (row) => {
  const until = String(row.valid_until ?? '').trim();
  if (!until) return true;
  const iso = /^\d{2}\.\d{2}\.\d{4}$/.test(until) ? until.split('.').reverse().join('-') : until;
  return iso >= today;
};

const lane = {
  originCc: cc(r.origin.countryCode),
  originZip2: zip2(r.origin.postalCode),
  destCc: cc(r.destination.countryCode),
  destZip2: zip2(r.destination.postalCode),
};

const volumeFactor = Number(cfg.volumeFactorKgPerM3);
const volumeWeightKg = Math.round(r.volumeM3 * volumeFactor);
const chargeableKg = Math.max(Math.round(r.weightKg), volumeWeightKg);

const offers = rates
  .filter((row) => cc(row.origin_cc) === lane.originCc
    && zip2(row.origin_zip2) === lane.originZip2
    && cc(row.dest_cc) === lane.destCc
    && zip2(row.dest_zip2) === lane.destZip2
    && isValid(row))
  .map((row) => {
    const ratePer100 = num(row.rate_per_100kg);
    const minCharge = num(row.min_charge) ?? 0;
    const fuelPct = num(row.fuel_pct) ?? 0;
    if (ratePer100 === null) return null;
    const base = Math.max(minCharge, (chargeableKg / 100) * ratePer100);
    const cost = round2(base * (1 + fuelPct / 100));
    return {
      carrier: String(row.carrier),
      ratePer100kg: ratePer100,
      minCharge,
      fuelPct,
      transitDays: num(row.transit_days),
      baseCost: round2(base),
      cost,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.cost - b.cost);

const best = offers[0] ?? null;
const route = `${r.origin.postalCode} ${r.origin.city ?? ''} (${lane.originCc}) → ${r.destination.postalCode} ${r.destination.city ?? ''} (${lane.destCc})`.replace(/\s+/g, ' ');

const slackManualText = [
  ':red_circle: *Keine Rate gefunden* – bitte manuell kalkulieren',
  `*Kunde:* ${r.customer.companyName ?? r.fromName ?? r.fromEmail} <${r.fromEmail}>`,
  `*Strecke:* ${route}`,
  `*Sendung:* ${r.weightKg} kg, ${r.volumeM3} m³ → frachtpfl. ${chargeableKg} kg`,
  `*Lane-Schlüssel:* ${lane.originCc}-${lane.originZip2} → ${lane.destCc}-${lane.destZip2}`,
].join('\n');

return {
  json: {
    ...r,
    lane,
    route,
    volumeFactorKgPerM3: volumeFactor,
    volumeWeightKg,
    chargeableKg,
    rateFound: best !== null,
    bestOffer: best,
    alternativeOffers: offers.slice(1, 4),
    ratesChecked: rates.length,
    slackManualText,
  },
};
