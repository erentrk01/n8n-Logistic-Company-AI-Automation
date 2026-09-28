// Mode: Run Once for All Items
// Accepts Twenty webhook events (both payload formats) and keeps opportunity events only.
const out = [];
for (const item of $input.all()) {
  const body = item.json.body ?? {};
  const event = String(body.event ?? body.eventName ?? body.operation ?? '');
  const raw = body.data ?? body.record ?? {};
  const record = raw.after ?? raw;
  if (!/^opportunity\.(created|updated)$/.test(event) || !record.id) continue;
  out.push({ json: { opportunityId: record.id, source: 'webhook', event } });
}
return out;
