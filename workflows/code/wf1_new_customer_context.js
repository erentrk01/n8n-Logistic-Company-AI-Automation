// Mode: Run Once for Each Item
// Collects the IDs of the newly created company and person.
// Both CRM calls continue on error (e.g. "duplicate entry" when a record is still in
// Twenty's trash). The offer is still prepared and the team is warned instead of the run failing.
const base = $('Resolve Customer').item.json;
const idOf = (response) => {
  if (!response || response.error) return null;
  if (response.id) return response.id;
  const inner = response.data && typeof response.data === 'object' ? Object.values(response.data)[0] : null;
  return inner?.id ?? null;
};
const reason = (response) => {
  const text = JSON.stringify(response?.error ?? response ?? {});
  return /duplicate|unique/i.test(text) ? 'existiert bereits – evtl. im CRM-Papierkorb' : 'konnte nicht angelegt werden';
};

const companyResponse = $('Twenty: Create Company').item.json;
const companyId = idOf(companyResponse);
const personId = idOf($json);

const crmWarnings = [];
if (!companyId) crmWarnings.push(`:warning: CRM: Firma „${base.companyName}" ${reason(companyResponse)} – bitte im CRM prüfen`);
if (!personId) crmWarnings.push(`:warning: CRM: Kontakt ${base.fromEmail} ${reason($json)} – bitte im CRM prüfen`);

return { json: { ...base, customerStatus: 'NEW', companyId, personId, crmWarnings } };
