import test from 'node:test';
import assert from 'node:assert/strict';
import { trueSolarTime, equationOfTime, utcOffsetMinutes } from './index.js';

const near = (actual, expected, tolerance, label) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: got ${actual}, expected ${expected} within ${tolerance}`
  );

test('equation of time matches known values', () => {
  near(equationOfTime(new Date('2024-02-11T12:00:00Z')), -14.23, 0.1, 'February low');
  near(equationOfTime(new Date('2024-11-03T12:00:00Z')), 16.49, 0.1, 'November high');
  near(equationOfTime(new Date('2024-04-15T12:00:00Z')), 0.09, 0.1, 'April zero');
  near(equationOfTime(new Date('2024-07-26T12:00:00Z')), -6.56, 0.1, 'July low');
});

test('Seoul 1990, no daylight saving', () => {
  const r = trueSolarTime({
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    longitude: 126.978, timeZone: 'Asia/Seoul',
  });
  assert.equal(r.iso, '1990-05-15T14:01:36');
  assert.equal(r.utcOffsetMinutes, 540);
  assert.equal(r.corrections.dstMinutes, 0);
  near(r.corrections.longitudeMinutes, -32.088, 0.001, 'longitude');
  near(r.corrections.equationOfTimeMinutes, 3.69, 0.05, 'equation of time');
});

test('Seoul 1988, daylight saving in effect', () => {
  const r = trueSolarTime({
    year: 1988, month: 7, day: 1, hour: 12,
    longitude: 126.978, timeZone: 'Asia/Seoul',
  });
  assert.equal(r.utcOffsetMinutes, 600);
  assert.equal(r.corrections.dstMinutes, 60);
  assert.equal(r.iso, '1988-07-01T10:24:08');
});

test('Seoul 1958 used UTC+8:30', () => {
  const r = trueSolarTime({
    year: 1958, month: 3, day: 1, hour: 12,
    longitude: 126.978, timeZone: 'Asia/Seoul',
  });
  assert.equal(r.utcOffsetMinutes, 510);
  near(r.corrections.longitudeMinutes, -2.088, 0.001, 'longitude');
});

test('Beijing 1988, daylight saving in effect', () => {
  const r = trueSolarTime({
    year: 1988, month: 7, day: 1, hour: 12,
    longitude: 116.4, timeZone: 'Asia/Shanghai',
  });
  assert.equal(r.corrections.dstMinutes, 60);
  assert.equal(r.iso, '1988-07-01T10:41:49');
});

test('New York summer, west longitude', () => {
  const r = trueSolarTime({
    year: 2000, month: 7, day: 4, hour: 12,
    longitude: -74.006, timeZone: 'America/New_York',
  });
  assert.equal(r.utcOffsetMinutes, -240);
  assert.equal(r.corrections.dstMinutes, 60);
  assert.equal(r.iso, '2000-07-04T10:59:30');
});

test('southern hemisphere daylight saving', () => {
  const r = trueSolarTime({
    year: 2010, month: 1, day: 10, hour: 9,
    longitude: 151.21, timeZone: 'Australia/Sydney',
  });
  assert.equal(r.utcOffsetMinutes, 660);
  assert.equal(r.corrections.dstMinutes, 60);
});

test('the date can roll back past midnight', () => {
  const r = trueSolarTime({
    year: 2001, month: 11, day: 3, hour: 0, minute: 20,
    longitude: 87.6, timeZone: 'Asia/Shanghai',
  });
  assert.equal(r.iso, '2001-11-02T22:26:52');
});

test('a fixed offset gives the same answer as the time zone', () => {
  const a = trueSolarTime({
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    longitude: 126.978, timeZone: 'Asia/Seoul',
  });
  const b = trueSolarTime({
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    longitude: 126.978, utcOffsetMinutes: 540,
  });
  assert.equal(a.iso, b.iso);
});

test('local mean time when the equation of time is off', () => {
  const r = trueSolarTime({
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    longitude: 126.978, timeZone: 'Asia/Seoul', equationOfTime: false,
  });
  assert.equal(r.iso, '1990-05-15T13:57:55');
  assert.equal(r.corrections.equationOfTimeMinutes, 0);
});

test('solar noon lands on 12:00', () => {
  // On the zone meridian, clock noon differs from solar noon by the equation of time only.
  const r = trueSolarTime({
    year: 2024, month: 4, day: 15, hour: 12,
    longitude: 135, utcOffsetMinutes: 540,
  });
  near(r.corrections.totalMinutes, 0.09, 0.1, 'total');
});

test('utcOffsetMinutes reads the zone database', () => {
  assert.equal(utcOffsetMinutes('Asia/Seoul', new Date('2024-01-01T00:00:00Z')), 540);
  assert.equal(utcOffsetMinutes('America/New_York', new Date('2024-07-01T00:00:00Z')), -240);
  assert.equal(utcOffsetMinutes('Asia/Kolkata', new Date('2024-01-01T00:00:00Z')), 330);
});

test('year round war time counts as daylight saving', () => {
  const r = trueSolarTime({
    year: 1945, month: 1, day: 11, hour: 9, minute: 6,
    longitude: -79.38, timeZone: 'America/Toronto',
  });
  assert.equal(r.utcOffsetMinutes, -240);
  assert.equal(r.corrections.dstMinutes, 60);
});

test('daylight saving is never negative', () => {
  const r = trueSolarTime({
    year: 1945, month: 12, day: 18, hour: 11, minute: 29,
    longitude: 77.2, timeZone: 'Asia/Kolkata',
  });
  assert.equal(r.corrections.dstMinutes, 0);
});

test('bad input is rejected', () => {
  const base = { year: 1990, month: 5, day: 15, longitude: 127, timeZone: 'Asia/Seoul' };
  assert.throws(() => trueSolarTime({ ...base, month: 13 }), RangeError);
  assert.throws(() => trueSolarTime({ ...base, month: 2, day: 30 }), RangeError);
  assert.throws(() => trueSolarTime({ ...base, longitude: 200 }), RangeError);
  assert.throws(() => trueSolarTime({ ...base, timeZone: 'Mars/Olympus' }), RangeError);
  assert.throws(() => trueSolarTime({ year: 1990, month: 5, day: 15, longitude: 127 }), TypeError);
});
