export interface TrueSolarTimeInput {
  year: number;
  /** 1 to 12 */
  month: number;
  /** 1 to 31 */
  day: number;
  /** 0 to 23, clock time at the birthplace. Default 0. */
  hour?: number;
  minute?: number;
  second?: number;
  /** Degrees. East is positive, west is negative. */
  longitude: number;
  /** IANA time zone name such as "Asia/Seoul". */
  timeZone?: string;
  /** Use in place of timeZone. The offset from UTC the clock used, in minutes. */
  utcOffsetMinutes?: number;
  /** Set false to get local mean time. Default true. */
  equationOfTime?: boolean;
}

export interface TrueSolarTimeResult {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** True solar date and time as YYYY-MM-DDTHH:mm:ss, with no zone. */
  iso: string;
  /** The same moment as a UTC instant. */
  utc: Date;
  /** Offset from UTC the clock used at that moment, in minutes. */
  utcOffsetMinutes: number;
  corrections: {
    /** Daylight saving time in effect. Subtracted from the clock time. */
    dstMinutes: number;
    /** Distance from the time zone meridian, 4 minutes per degree. */
    longitudeMinutes: number;
    /** Equation of time. 0 when turned off. */
    equationOfTimeMinutes: number;
    /** Solar time minus clock time. */
    totalMinutes: number;
  };
}

export function trueSolarTime(input: TrueSolarTimeInput): TrueSolarTimeResult;
export function equationOfTime(date: Date): number;
export function utcOffsetMinutes(timeZone: string, instant: Date | number): number;
export default trueSolarTime;
