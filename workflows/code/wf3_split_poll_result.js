// Mode: Run Once for All Items
// Turns the polling result into one item per opportunity.
const out = [];
for (const item of $input.all()) {
  const data = item.json.data;
  const list = Array.isArray(data) ? data : Object.values(data ?? {}).find(Array.isArray) ?? [];
  for (const opp of list) {
    if (opp?.id) out.push({ json: { opportunityId: opp.id, source: 'polling', event: 'poll' } });
  }
}
return out;
