// @flow

export function startOfDayTime(date: string): number {
  const d = new Date(date);
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return startOfDate.getTime();
}
