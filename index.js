/**
 * saju-solar-time
 * True solar time for Saju, BaZi and Four Pillars charts.
 * Zero dependencies. Works in Node 18+ and modern browsers.
 * MIT License. https://saju.bazilucky.com/solar-time
 */

const RAD = Math.PI / 180;
const MS_PER_MIN = 60000;
const MS_PER_DAY = 86400000;

function norm360(deg) {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Equation of time in minutes for a given instant.
 * Positive means the sundial is ahead of the clock.
 * Formula from Jean Meeus, Astronomical Algorithms, chapter 28.
 * @param {Date} date
 * @returns {number} minutes
 */
export function equationOfTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('equationOfTime needs a valid Date');
  }
  const jd = date.getTime() / MS_PER_DAY + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + T * (36000.76983 + 0.0003032 * T)) * RAD;
  const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const eps0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * RAD)) * RAD;
  const y = Math.tan(eps / 2) ** 2;
  const eot =
    y * Math.sin(2 * L0) -
    2 * e * Math.sin(M) +
    4 * e * y * Math.sin(M) * Math.cos(2 * L0) -
    0.5 * y * y * Math.sin(4 * L0) -
    1.25 * e * e * Math.sin(2 * M);
  return (4 * eot) / RAD;
}

const formatters = new Map();

function formatterFor(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        era: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      });
    } catch (err) {
      throw new RangeError(`Unknown time zone: ${timeZone}`);
    }
    formatters.set(timeZone, f);
  }
  return f;
}

function utcMillis(year, month, day, hour, minute, second) {
  const d = new Date(Date.UTC(2000, month - 1, day, hour, minute, second));
  d.setUTCFullYear(year);
  return d.getTime();
}

/**
 * Offset from UTC, in minutes, that a time zone used at a given instant.
 * East of Greenwich is positive. Seoul is 540.
 * @param {string} timeZone IANA name such as "Asia/Seoul"
 * @param {Date|number} instant
 * @returns {number} minutes
 */
export function utcOffsetMinutes(timeZone, instant) {
  const ms = instant instanceof Date ? instant.getTime() : instant;
  const parts = {};
  for (const p of formatterFor(timeZone).formatToParts(new Date(ms))) {
    parts[p.type] = p.value;
  }
  let year = Number(parts.year);
  if (parts.era === 'BC' || parts.era === 'B') year = 1 - year;
  const wall = utcMillis(
    year,
    Number(parts.month),
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return (wall - Math.floor(ms / 1000) * 1000) / MS_PER_MIN;
}

function wallToUtc(wall, timeZone) {
  const first = utcOffsetMinutes(timeZone, wall);
  let utc = wall - first * MS_PER_MIN;
  const second = utcOffsetMinutes(timeZone, utc);
  if (second !== first) utc = wall - second * MS_PER_MIN;
  return utc;
}

// Daylight saving minutes in effect at an instant. The lowest offset the zone
// used within a year on either side is taken as standard time. Only a gap of
// exactly one hour counts as daylight saving. Any other shift stays in the
// longitude correction, so the final solar time is the same either way.
function dstMinutesAt(timeZone, utc, offset) {
  let lowest = offset;
  for (let k = 1; k <= 12; k++) {
    const step = k * 30 * MS_PER_DAY;
    lowest = Math.min(
      lowest,
      utcOffsetMinutes(timeZone, utc - step),
      utcOffsetMinutes(timeZone, utc + step)
    );
  }
  return offset - lowest === 60 ? 60 : 0;
}

function requireInt(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a whole number from ${min} to ${max}`);
  }
}

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

/**
 * Convert a clock time at a birthplace to true solar time.
 *
 * @param {object} input
 * @param {number} input.year
 * @param {number} input.month 1 to 12
 * @param {number} input.day 1 to 31
 * @param {number} [input.hour=0] 0 to 23, clock time at the birthplace
 * @param {number} [input.minute=0]
 * @param {number} [input.second=0]
 * @param {number} input.longitude degrees, east positive, west negative
 * @param {string} [input.timeZone] IANA name such as "Asia/Seoul"
 * @param {number} [input.utcOffsetMinutes] use in place of timeZone, the offset the clock used
 * @param {boolean} [input.equationOfTime=true] set false for local mean time
 * @returns {object} true solar date and time with the corrections applied
 */
export function trueSolarTime(input) {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('trueSolarTime needs an input object');
  }
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    longitude,
    timeZone,
    utcOffsetMinutes: fixedOffset,
    equationOfTime: useEot = true,
  } = input;

  requireInt('year', year, 1, 9999);
  requireInt('month', month, 1, 12);
  requireInt('day', day, 1, 31);
  requireInt('hour', hour, 0, 23);
  requireInt('minute', minute, 0, 59);
  requireInt('second', second, 0, 59);
  if (typeof longitude !== 'number' || !(longitude >= -180 && longitude <= 180)) {
    throw new RangeError('longitude must be a number from -180 to 180');
  }

  const wall = utcMillis(year, month, day, hour, minute, second);
  const check = new Date(wall);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError('That date does not exist');
  }

  let offset;
  let dstMinutes = 0;
  if (typeof timeZone === 'string' && timeZone !== '') {
    const utcGuess = wallToUtc(wall, timeZone);
    offset = utcOffsetMinutes(timeZone, utcGuess);
    dstMinutes = dstMinutesAt(timeZone, utcGuess, offset);
  } else if (typeof fixedOffset === 'number' && Number.isFinite(fixedOffset)) {
    if (fixedOffset < -900 || fixedOffset > 900) {
      throw new RangeError('utcOffsetMinutes must be from -900 to 900');
    }
    offset = fixedOffset;
  } else {
    throw new TypeError('Give either timeZone or utcOffsetMinutes');
  }

  const utc = wall - offset * MS_PER_MIN;
  const longitudeMinutes = longitude * 4 - (offset - dstMinutes);
  const eotMinutes = useEot ? equationOfTime(new Date(utc)) : 0;
  const totalMinutes = longitudeMinutes + eotMinutes - dstMinutes;

  const solar = new Date(Math.round((wall + totalMinutes * MS_PER_MIN) / 1000) * 1000);
  const out = {
    year: solar.getUTCFullYear(),
    month: solar.getUTCMonth() + 1,
    day: solar.getUTCDate(),
    hour: solar.getUTCHours(),
    minute: solar.getUTCMinutes(),
    second: solar.getUTCSeconds(),
  };

  return {
    ...out,
    iso:
      `${pad(out.year, 4)}-${pad(out.month)}-${pad(out.day)}` +
      `T${pad(out.hour)}:${pad(out.minute)}:${pad(out.second)}`,
    utc: new Date(utc),
    utcOffsetMinutes: offset,
    corrections: {
      dstMinutes,
      longitudeMinutes,
      equationOfTimeMinutes: eotMinutes,
      totalMinutes,
    },
  };
}

export default trueSolarTime;
