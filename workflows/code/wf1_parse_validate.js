// Mode: Run Once for Each Item
// Parses the AI answer and validates it with plain code (not with AI).
const cfg = $('Config').first().json.cfg;
const { llmRequest, ...ctx } = $('Build AI Request').item.json;

// Claude Messages API response: the JSON is in the first text block.
if ($json.stop_reason === 'refusal') throw new Error('AI refused the request');
if ($json.stop_reason === 'max_tokens') throw new Error('AI answer was cut off (max_tokens) - increase max_tokens');
const textBlock = ($json.content ?? []).find((block) => block.type === 'text');
if (!textBlock) throw new Error(`AI response has no text: ${JSON.stringify($json).slice(0, 300)}`);

let ai;
try {
  ai = JSON.parse(textBlock.text);
} catch (error) {
  throw new Error(`AI returned invalid JSON: ${String(textBlock.text).slice(0, 300)}`);
}

// ---------- helpers ----------
const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const clean = (value) => {
  const s = value === null || value === undefined ? '' : String(value).trim();
  return s.length ? s : null;
};
const round = (n, d = 2) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);
const normPlace = (p = {}) => ({
  countryCode: clean(p.country_code)?.toUpperCase().slice(0, 2) ?? null,
  postalCode: clean(p.postal_code)?.replace(/\s+/g, '').toUpperCase() ?? null,
  city: clean(p.city),
});

const origin = normPlace(ai.origin);
const destination = normPlace(ai.destination);

// ---------- quantities (calculated here, not by the AI) ----------
const packages = (ai.packages ?? [])
  .map((p) => ({
    count: Number.isInteger(Number(p.count)) && Number(p.count) > 0 ? Number(p.count) : null,
    type: clean(p.type),
    lengthCm: num(p.length_cm),
    widthCm: num(p.width_cm),
    heightCm: num(p.height_cm),
    weightKgEach: num(p.weight_kg_each),
  }))
  .filter((p) => p.count !== null);

const allHaveDims = packages.length > 0 && packages.every((p) => p.lengthCm && p.widthCm && p.heightCm);
const allHaveWeight = packages.length > 0 && packages.every((p) => p.weightKgEach);
const palletCount = packages
  .filter((p) => /pal/i.test(p.type ?? ''))
  .reduce((sum, p) => sum + p.count, 0) || null;

let weightKg = num(ai.total_weight_kg);
let weightSource = weightKg ? 'stated' : null;
if (!weightKg && allHaveWeight) {
  weightKg = packages.reduce((sum, p) => sum + p.count * p.weightKgEach, 0);
  weightSource = 'calculated_from_packages';
}

let volumeM3 = num(ai.total_volume_m3);
let volumeSource = volumeM3 ? 'stated' : null;
if (!volumeM3 && allHaveDims) {
  volumeM3 = packages.reduce((sum, p) => sum + (p.count * p.lengthCm * p.widthCm * p.heightCm) / 1e6, 0);
  volumeSource = 'calculated_from_dimensions';
}
if (!volumeM3 && palletCount) {
  volumeM3 = palletCount * Number(cfg.palletVolumeM3);
  volumeSource = 'estimated_from_pallets';
}

// ---------- completeness check ----------
const LABELS = {
  origin: { de: 'Postleitzahl und Ort der Abholung', en: 'pickup postcode and city' },
  destination: { de: 'Postleitzahl und Ort der Zustellung', en: 'delivery postcode and city' },
  weight: { de: 'Gesamtgewicht in kg', en: 'total weight in kg' },
  volume: { de: 'Maße (L x B x H in cm) oder Anzahl der Paletten', en: 'dimensions (L x W x H in cm) or number of pallets' },
};
const missing = [];
if (!origin.countryCode || !origin.postalCode) missing.push('origin');
if (!destination.countryCode || !destination.postalCode) missing.push('destination');
if (!weightKg) missing.push('weight');
if (!volumeM3) missing.push('volume');

const language = String(ai.language ?? '').toLowerCase() === 'en' ? 'en' : 'de';
// Claude may vary the casing of enum values, so compare in lower case.
const emailType = String(ai.email_type ?? '').toLowerCase();
let status = 'complete';
if (emailType === 'order_confirmation') status = 'order_confirmation';
else if (emailType !== 'transport_inquiry') status = 'not_rfq';
else if (missing.length) status = 'incomplete';

const nameParts = ctx.fromName.split(/\s+/).filter(Boolean);

return {
  json: {
    ...ctx,
    status,
    emailType,
    confirmationQuote: clean(ai.confirmation_quote),
    language,
    customer: {
      firstName: clean(ai.customer?.first_name) ?? nameParts[0] ?? null,
      lastName: clean(ai.customer?.last_name) ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : null),
      companyName: clean(ai.customer?.company_name),
      phone: clean(ai.customer?.phone),
    },
    origin,
    destination,
    packages,
    palletCount,
    weightKg: round(weightKg, 1),
    weightSource,
    volumeM3: round(volumeM3, 2),
    volumeSource,
    cargoDescription: clean(ai.cargo_description),
    dangerousGoods: ai.dangerous_goods === true,
    pickupDate: clean(ai.pickup_date),
    deliveryDeadline: clean(ai.delivery_deadline),
    specialRequirements: clean(ai.special_requirements),
    missing,
    missingLabels: missing.map((key) => LABELS[key][language]),
    ai: { model: $json.model ?? cfg.anthropicModel, inputTokens: $json.usage?.input_tokens ?? null, outputTokens: $json.usage?.output_tokens ?? null },
  },
};
