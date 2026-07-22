import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { DEFAULT_TIMEZONE } from './constants';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

// All times render in the shop timezone (from /settings/public). The DB stores UTC.
let activeTimezone = DEFAULT_TIMEZONE;

export function setTimezone(tz) {
  if (tz) activeTimezone = tz;
}
export function getTimezone() {
  return activeTimezone;
}

export function inZone(value, tz = activeTimezone) {
  return dayjs(value).tz(tz);
}

export function formatDateTime(value, tz = activeTimezone) {
  return inZone(value, tz).format('MMM D, YYYY · h:mm A');
}
export function formatDate(value, tz = activeTimezone) {
  return inZone(value, tz).format('MMM D, YYYY');
}
export function formatTime(value, tz = activeTimezone) {
  return inZone(value, tz).format('h:mm A');
}
export function formatDayLabel(value, tz = activeTimezone) {
  return inZone(value, tz).format('ddd, MMM D');
}
export function fromNow(value) {
  return dayjs(value).fromNow();
}

// yyyy-mm-dd in the shop timezone — handy for slot queries and date inputs.
export function isoDate(value = new Date(), tz = activeTimezone) {
  return inZone(value, tz).format('YYYY-MM-DD');
}

export default dayjs;
