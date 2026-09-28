// Mode: Run Once for All Items
// Hands over only won opportunities that (1) were not handed over yet and
// (2) carry the transport data the TMS needs. Won cards without transport data
// (e.g. Twenty's sample records or manually created cards) are skipped instead of
// failing every minute during polling.
const cfg = $('Config').first().json.cfg;
const seen = new Set();
const out = [];
const skipped = [];

$input.all().forEach((item, index) => {
  const response = item.json;
  const opp = response.id ? response : (response.data && typeof response.data === 'object'
    ? Object.values(response.data)[0] : null);
  if (!opp?.id || seen.has(opp.id)) return;
  seen.add(opp.id);

  if (opp.stage !== cfg.twentyStageWon) return;   // not confirmed yet
  if (opp.tmsOrderNo) return;                      // already handed over -> stops webhook loops

  const route = String(opp.route ?? '').trim();
  const chargeableKg = Number(opp.chargeableKg ?? 0);
  const priceEur = opp.amount?.amountMicros ? Math.round(opp.amount.amountMicros / 10000) / 100 : 0;
  if (!route || !(chargeableKg > 0) || !(priceEur > 0)) {
    skipped.push({ id: opp.id, name: opp.name, reason: 'missing route / chargeableKg / amount' });
    return;
  }

  out.push({
    json: {
      opportunityId: opp.id,
      opportunityName: opp.name,
      tmsOrder: {
        externalRef: opp.id,
        customerName: String(opp.company?.name ?? '').trim() || opp.name,
        route,
        chargeableKg,
        priceEur,
      },
    },
    pairedItem: { item: index },
  });
});

if (skipped.length) console.log('Skipped won opportunities without transport data:', JSON.stringify(skipped));
return out;
