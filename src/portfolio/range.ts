import type { PortfolioRange, PortfolioRangeConfig } from "../types";
export const hourIncrement = 60 * 60 * 1000;
export const dayIncrement = 24 * hourIncrement;
export const weekIncrement = 7 * dayIncrement;
export function startOfHour(t: Date) {
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours());
}
export function startOfMonth(t: Date) {
  return new Date(t.getFullYear(), t.getMonth(), 1);
}
export function startOfDay(t: Date) {
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
export function startOfWeek(t: Date) {
  const d = startOfDay(t);
  return new Date(d.getTime() - d.getDay() * dayIncrement);
}
const ranges: Record<PortfolioRange, PortfolioRangeConfig> = {
  year: {
    count: 52,
    increment: weekIncrement,
    startOf: startOfWeek,
    granularityId: "WEEK",
  },
  month: {
    count: 30,
    increment: dayIncrement,
    startOf: startOfDay,
    granularityId: "DAY",
  },
  week: {
    count: 7 * 24,
    increment: hourIncrement,
    startOf: startOfHour,
    granularityId: "HOUR",
  },
  day: {
    count: 24,
    increment: hourIncrement,
    startOf: startOfHour,
    granularityId: "HOUR",
  },
};

const getPerPortfolioRanges = (): Record<
  PortfolioRange,
  PortfolioRangeConfig
> => {
  return ranges;
};

export function getPortfolioRangeConfig(
  r: PortfolioRange
): PortfolioRangeConfig {
  return getPerPortfolioRanges()[r];
}
export const getRanges = (): PortfolioRange[] =>
  Object.keys(getPerPortfolioRanges()) as PortfolioRange[];
export function getDates(r: PortfolioRange): Date[] {
  const conf = getPortfolioRangeConfig(r);
  let t = new Date();
  const array = [t];
  t = new Date(conf.startOf(t).valueOf() - 1); // end of yesterday

  for (let d = conf.count - 1; d > 0; d--) {
    array.unshift(t);
    t = new Date(t.valueOf() - conf.increment);
  }

  return array;
}
