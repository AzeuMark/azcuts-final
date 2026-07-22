const mongoose = require('mongoose');
const { dayStamp, DEFAULT_TZ } = require('./datetime');

// Tiny per-day counter living in its own `counters` collection. The atomic
// findOneAndUpdate($inc) guarantees each concurrent booking gets a distinct
// sequence number, so receipt numbers never collide.
const counterSchema = new mongoose.Schema(
  {
    _id: String, // e.g. "20260722"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Generate the next receipt number, e.g. AZ-20260722-0007.
async function nextReceiptNo(tz = DEFAULT_TZ) {
  const day = dayStamp(tz);
  const doc = await Counter.findByIdAndUpdate(
    day,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(doc.seq).padStart(4, '0');
  return `AZ-${day}-${seq}`;
}

module.exports = { nextReceiptNo, Counter };
