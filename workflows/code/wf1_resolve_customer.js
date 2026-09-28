// Mode: Run Once for Each Item
// Decides "new or existing customer" from the Twenty search result.
const r = $('Calculate Freight Cost').item.json;
const response = $json;

const list = Array.isArray(response.data)
  ? response.data
  : Object.values(response.data ?? {}).find(Array.isArray) ?? [];
const hostOf = (url) => String(url ?? '').toLowerCase()
  .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

let match = null;
if (r.isFreemail) {
  match = list.find((p) => String(p.emails?.primaryEmail ?? '').toLowerCase() === r.fromEmail) ?? null;
} else {
  match = list.find((c) => hostOf(c.domainName?.primaryLinkUrl) === r.domain) ?? null;
}

const customerStatus = match ? 'EXISTING' : 'NEW';
const companyName = r.customer.companyName
  ?? (r.isFreemail ? `Privatkunde ${[r.customer.firstName, r.customer.lastName].filter(Boolean).join(' ') || r.fromEmail}` : r.domain);

const twentyCompanyPayload = { name: companyName };
if (!r.isFreemail) twentyCompanyPayload.domainName = { primaryLinkUrl: `https://${r.domain}` };

const twentyPersonPayload = {
  name: { firstName: r.customer.firstName ?? '', lastName: r.customer.lastName ?? '' },
  emails: { primaryEmail: r.fromEmail },
};

return {
  json: {
    ...r,
    customerStatus,
    companyId: r.isFreemail ? (match?.companyId ?? null) : (match?.id ?? null),
    personId: r.isFreemail ? (match?.id ?? null) : null,
    companyName: r.isFreemail ? companyName : (match?.name ?? companyName),
    marginPct: r.isFreemail ? null : num(match?.marginPct),
    twentyCompanyPayload,
    twentyPersonPayload,
  },
};
