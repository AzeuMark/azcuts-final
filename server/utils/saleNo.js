const { Counter } = require('./receiptNo');
const { dayStamp, DEFAULT_TZ } = require('./datetime');

// Sale numbers reuse the atomic per-day `counters` collection so concurrent
// sales never collide (same pattern as receiptNo.js). Separate day-key
// namespace ("SL-…") from appointment receipts ("AZ-…").
async function nextSaleNo(tz = DEFAULT_TZ) {
  const day = dayStamp(tz);
  const doc = await Counter.findByIdAndUpdate(
    `SL-${day}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(doc.seq).padStart(4, '0');
  return `SL-${day}-${seq}`;
}

module.exports = { nextSaleNo };
