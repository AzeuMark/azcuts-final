// Timezone-aware date helpers. All slot math is done in the shop's timezone
// (default Asia/Manila) while values are stored as UTC Dates in MongoDB.
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const env = require('../config/env');

const DEFAULT_TZ = env.DEFAULT_TZ || 'Asia/Manila';

// Sunday-indexed to match dayjs .day() (0 = Sunday).
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// The storeHours key ('mon'...'sun') for a given YYYY-MM-DD in a timezone.
function weekdayKey(dateStr, tz = DEFAULT_TZ) {
  return WEEKDAY_KEYS[dayjs.tz(dateStr, tz).day()];
}

// Build a UTC Date from a date (YYYY-MM-DD) + time (HH:mm) interpreted in tz.
function zonedDateTime(dateStr, timeStr, tz = DEFAULT_TZ) {
  return dayjs.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', tz).toDate();
}

// A dayjs object for an instant, expressed in tz.
function inZone(date, tz = DEFAULT_TZ) {
  return dayjs(date).tz(tz);
}

// Compact day string (e.g. 20260722) in tz — used for receipt numbering.
function dayStamp(tz = DEFAULT_TZ, date = new Date()) {
  return dayjs(date).tz(tz).format('YYYYMMDD');
}

module.exports = {
  dayjs,
  DEFAULT_TZ,
  WEEKDAY_KEYS,
  weekdayKey,
  zonedDateTime,
  inZone,
  dayStamp,
};
