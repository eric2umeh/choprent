/** Formats an ISO date (yyyy-mm-dd) or datetime string as DD-MM-YYYY for display. */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/** Formats a start/end date pair for tables and summaries. */
export function formatDateRange(
  startDate: string,
  endDate: string,
  separator = " → "
): string {
  return `${formatDisplayDate(startDate)}${separator}${formatDisplayDate(endDate)}`;
}

/** @deprecated Use formatDateRange */
export const formatLeasePeriod = formatDateRange;
