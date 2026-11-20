# saju-solar-time

True solar time calculator for Saju, BaZi and Four Pillars charts.

진태양시 · 真太阳时 · 真太陽時

It converts the clock time at a birthplace into true solar time. It works for any time zone in the world. It handles daylight saving time and past time zone changes. It has zero dependencies and runs in Node and in the browser.

Live calculator: https://saju.bazilucky.com/solar-time

## Why true solar time matters for saju

A saju chart has four pillars: year, month, day and hour. The hour pillar follows the sun, not the clock on the wall.

Clock time follows a time zone. Solar time follows the sun at the place of birth. The two can differ by more than an hour.

Each hour pillar covers a two hour block. When a birth falls near the edge of a block, that gap can change the hour pillar. Near midnight it can move the birth to a different day.

## The three corrections

1. **Daylight saving time.** If clocks were moved forward at the time of birth, the extra hour is removed. Korea used daylight saving time in 1987 and 1988. China used it from 1986 to 1991.
2. **Longitude.** The sun moves 1 degree every 4 minutes. Seoul sits at 126.98 degrees east, but Korean clocks are set to 135 degrees east. Solar time in Seoul runs about 32 minutes behind the clock.
3. **Equation of time.** The real sun runs ahead of or behind the average sun through the year. The gap ranges from about 14 minutes behind in February to about 16 minutes ahead in November.

## Install

```
npm install saju-solar-time
```

Or copy `index.js` into your project. It is one file.

## Use

```js
import { trueSolarTime } from 'saju-solar-time';

const result = trueSolarTime({
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  longitude: 126.978,      // east is positive, west is negative
  timeZone: 'Asia/Seoul',  // IANA time zone of the birthplace
});

console.log(result.iso);
// 1990-05-15T14:01:36

console.log(result.corrections);
// {
//   dstMinutes: 0,
//   longitudeMinutes: -32.088,
//   equationOfTimeMinutes: 3.69,
//   totalMinutes: -28.398
// }
```

A birth during daylight saving time:

```js
trueSolarTime({
  year: 1988, month: 7, day: 1, hour: 12,
  longitude: 126.978, timeZone: 'Asia/Seoul',
}).iso;
// 1988-07-01T10:24:08
```

In the browser:

```html
<script type="module">
  import { trueSolarTime } from './index.js';
  const r = trueSolarTime({
    year: 2000, month: 7, day: 4, hour: 12,
    longitude: -74.006, timeZone: 'America/New_York',
  });
  console.log(r.iso); // 2000-07-04T10:59:30
</script>
```

## API

### trueSolarTime(input)

| Field | Required | Meaning |
| --- | --- | --- |
| `year`, `month`, `day` | yes | Birth date on the clock at the birthplace. Month is 1 to 12. |
| `hour`, `minute`, `second` | no | Birth time on the clock at the birthplace. Default 0. |
| `longitude` | yes | Degrees. East is positive, west is negative. |
| `timeZone` | one of the two | IANA name such as `Asia/Seoul` or `America/New_York`. |
| `utcOffsetMinutes` | one of the two | The offset from UTC the clock used, in minutes. Use it when you already know the offset. |
| `equationOfTime` | no | Set `false` to get local mean time. Default `true`. |

It returns:

| Field | Meaning |
| --- | --- |
| `year`, `month`, `day`, `hour`, `minute`, `second` | True solar date and time. |
| `iso` | The same as text, `YYYY-MM-DDTHH:mm:ss`. |
| `utc` | The moment of birth as a UTC `Date`. |
| `utcOffsetMinutes` | The offset the clock used at that moment. |
| `corrections.dstMinutes` | Daylight saving time in effect. Subtracted from the clock. |
| `corrections.longitudeMinutes` | Distance from the time zone meridian, 4 minutes per degree. |
| `corrections.equationOfTimeMinutes` | Equation of time at that moment. |
| `corrections.totalMinutes` | Solar time minus clock time. |

### equationOfTime(date)

Returns the equation of time in minutes for a `Date`. Positive means the sundial is ahead of the clock.

### utcOffsetMinutes(timeZone, instant)

Returns the offset from UTC, in minutes, that a time zone used at a given moment. Seoul today is 540.

## Accuracy

The equation of time uses the formula in Jean Meeus, *Astronomical Algorithms*. It was checked against solar transit times from an independent ephemeris (PyEphem) on 72 dates from 1900 to 2090. The largest difference was 3.2 seconds.

Time zone history comes from the IANA time zone database through the built in `Intl` API. Results for old dates depend on the database that ships with your Node or browser.

## Notes and limits

- Enter the time as the clock showed it at the birthplace.
- A clock time inside the hour skipped when daylight saving starts never existed. The library still returns a result for it.
- Daylight saving is counted only when the clock ran exactly one hour ahead of the lowest offset the zone used within a year on either side. Any other shift is folded into the longitude correction. The final solar time is the same either way.
- For dates before standard time zones, the database uses the local mean time of the reference city of the zone.
- This library converts time. It does not build or interpret a chart.

## Run the tests

```
npm test
```

## About

Made by Saju Lucky, a free saju reading in English.

- Free saju reading: https://saju.bazilucky.com
- True solar time calculator with birthplace search: https://saju.bazilucky.com/solar-time

The library uses the same method as that calculator. The calculator shows minutes. The library also returns seconds.

## License

MIT
