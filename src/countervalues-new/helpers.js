// @flow
import type { Currency } from "../types";

const twoDigits = (n: number) => (n > 9 ? `${n}` : `0${n}`);

/**
 * efficient implementation of YYYY-MM-DD formatter
 * @memberof countervalue
 */
export const formatCounterValueDay = (d: Date) =>
  `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(d.getDate())}`;

/**
 * efficient implementation of YYYY-MM-DD formatter
 * @memberof countervalue
 */
export const formatCounterValueHour = (d: Date) =>
  `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(
    d.getDate()
  )}T${twoDigits(d.getHours())}`;

export const formatPerGranularity = {
  daily: formatCounterValueDay,
  hourly: formatCounterValueHour,
};

export function magFromTo(from: Currency, to: Currency) {
  return 10 ** (to.units[0].magnitude - from.units[0].magnitude);
}
