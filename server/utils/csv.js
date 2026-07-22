// Tiny CSV serializer (no external dependency). Quotes cells that contain
// commas, quotes, or newlines and escapes embedded quotes per RFC 4180.
function escapeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(records, columns) {
  const cols = columns && columns.length ? columns : records[0] ? Object.keys(records[0]) : [];
  const header = cols.map(escapeCell).join(',');
  const lines = records.map((r) => cols.map((c) => escapeCell(r[c])).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCSV };
