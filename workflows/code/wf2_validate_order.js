// Mode: Run Once for All Items
// Mock TMS: validates the order and makes the endpoint idempotent
// (the same externalRef never creates a second order).
const request = $('Config').first().json.body ?? {};
const existing = $input.all()
  .map((item) => item.json)
  .find((row) => row && row.orderNo && String(row.externalRef) === String(request.externalRef));

if (existing) {
  return [{ json: { action: 'duplicate', response: { status: 'duplicate', orderNo: existing.orderNo, externalRef: existing.externalRef } } }];
}

const required = ['externalRef', 'customerName', 'route', 'chargeableKg', 'priceEur'];
const errors = required
  .filter((field) => request[field] === undefined || request[field] === null || request[field] === '')
  .map((field) => `${field} is required`);
if (request.chargeableKg !== undefined && !(Number(request.chargeableKg) > 0)) errors.push('chargeableKg must be > 0');

if (errors.length) {
  return [{ json: { action: 'reject', response: { status: 'rejected', errors } } }];
}

const now = new Date();
const orderNo = `TA-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;
const order = {
  orderNo,
  externalRef: String(request.externalRef),
  customerName: String(request.customerName),
  route: String(request.route),
  chargeableKg: Number(request.chargeableKg),
  priceEur: Number(request.priceEur),
  receivedAt: now.toISOString(),
  status: 'NEW',
};
return [{ json: { action: 'create', ...order, response: { status: 'accepted', orderNo, externalRef: order.externalRef } } }];
