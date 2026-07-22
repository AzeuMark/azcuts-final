// Server-authoritative pricing engine (SERVER_PLAN 2.4).
// The browser never computes money — this is the single source of truth.

// Round to 2 decimals at each boundary (currency = PHP).
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Build the frozen price breakdown for an appointment.
 * @param {Object} service  live Service doc (uses .price)
 * @param {Array}  extras   live Extra docs (uses ._id, .name, .price)
 * @param {number} discountPercent  per-booking %, admin-set (default 0)
 * @param {number} taxRate  fraction, e.g. 0.12 (default 0)
 * @param {string} currency default 'PHP'
 */
function computePricing({ service, extras = [], discountPercent = 0, taxRate = 0, currency = 'PHP' }) {
  const base = round2(service.price);

  const extrasList = extras.map((e) => ({ id: e._id, name: e.name, price: round2(e.price) }));
  const extrasTotal = extrasList.reduce((sum, e) => sum + e.price, 0);

  const subtotal = round2(base + extrasTotal);
  const discountAmount = round2(subtotal * (Number(discountPercent) / 100));
  const taxAmount = round2((subtotal - discountAmount) * Number(taxRate));
  const total = round2(subtotal - discountAmount + taxAmount);

  return {
    base,
    extras: extrasList,
    subtotal,
    discountPercent: Number(discountPercent) || 0,
    discountAmount,
    taxRate: Number(taxRate) || 0,
    taxAmount,
    total,
    currency,
  };
}

module.exports = { computePricing, round2 };
