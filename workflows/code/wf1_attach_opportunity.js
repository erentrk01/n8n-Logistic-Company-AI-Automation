// Mode: Run Once for Each Item
// Adds the CRM record ID and prepares the team notification.
const cfg = $('Config').first().json.cfg;
const q = $('Build Quote').item.json;
const idOf = (response) => {
  if (!response) return null;
  if (response.id) return response.id;
  const inner = response.data && typeof response.data === 'object' ? Object.values(response.data)[0] : null;
  return inner?.id ?? null;
};
const opportunityId = idOf($json);
const eur = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const crmLink = opportunityId ? `${cfg.twentyPublicUrl}/object/opportunity/${opportunityId}` : null;

const slackText = [
  `:package: *Neues Angebot bereit* (${q.customerStatus === 'NEW' ? 'Neukunde' : 'Bestandskunde'})`,
  `*Kunde:* ${q.companyName} <${q.fromEmail}>`,
  `*Strecke:* ${q.route}`,
  `*Sendung:* ${q.weightKg} kg / ${q.volumeM3} m³ → frachtpfl. ${q.chargeableKg} kg`,
  `*EK:* ${eur(q.bestOffer.cost)} (${q.bestOffer.carrier})  |  *VK:* ${eur(q.priceEur)}  |  *Marge:* ${q.marginPct}% (${eur(q.marginEur)})`,
  ...q.warnings,
  ':email: Entwurf liegt im Postfach – bitte prüfen und senden.',
  crmLink ? `:link: CRM: ${crmLink}` : null,
].filter(Boolean).join('\n');

return { json: { ...q, opportunityId, crmLink, slackText } };
