/** Formats an ISO date string (yyyy-mm-dd) as dd-mm-yy. */
export function formatDateDdMmYy(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}-${month}-${year.slice(-2)}`;
}

export function formatLeasePeriod(startDate: string, endDate: string): string {
  return `${formatDateDdMmYy(startDate)} → ${formatDateDdMmYy(endDate)}`;
}
