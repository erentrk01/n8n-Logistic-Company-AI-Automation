// Mode: Run Once for All Items
// Packs all price list rows into ONE item, so every request gets the full list.
const rates = $input.all()
  .map((item) => item.json)
  .filter((row) => row && Object.keys(row).length > 0 && row.carrier);
return [{ json: { rates } }];
