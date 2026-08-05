import type { BillingCadence } from "@/types/database";

export type BillingPeriodRange = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
};

/** Format a local calendar date without UTC shifting (safe in WAT / UTC+1). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function clampPeriod(start: Date, end: Date, leaseStart: Date, leaseEnd: Date) {
  const ps = start < leaseStart ? leaseStart : start;
  const pe = end > leaseEnd ? leaseEnd : end;
  if (ps > pe) return null;
  return { periodStart: toIsoDate(ps), periodEnd: toIsoDate(pe) };
}

function addYearsMinusOneDay(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  result.setDate(result.getDate() - 1);
  return result;
}

/** End of an annual lease term: start + N years − 1 day (e.g. 2026-08-05 → 2027-08-04). */
export function anniversaryEndDate(startIso: string, years = 1): string {
  return toIsoDate(addYearsMinusOneDay(parseDate(startIso), years));
}

/** Default annual lease window starting today (or a given start date). */
export function defaultAnnualLeaseRange(fromIso?: string): {
  start: string;
  end: string;
} {
  const start = fromIso ?? toIsoDate(new Date());
  return { start, end: anniversaryEndDate(start, 1) };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Human label for a billing window, e.g. "Apr 2026–Mar 2027". */
export function formatBillingPeriodLabel(periodStart: string, periodEnd: string): string {
  const start = parseDate(periodStart);
  const end = parseDate(periodEnd);
  const startLabel = `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  const endLabel = `${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  if (startLabel === endLabel) return startLabel;
  return `${startLabel}–${endLabel}`;
}

/**
 * Billing periods clipped to lease dates.
 * Annual cadence uses lease-anniversary years (e.g. 1 Apr → 31 Mar),
 * not calendar Jan–Dec years.
 */
export function listBillingPeriods(
  leaseStart: string,
  leaseEnd: string,
  cadence: BillingCadence
): BillingPeriodRange[] {
  const start = parseDate(leaseStart);
  const end = parseDate(leaseEnd);
  if (start > end) return [];

  const periods: BillingPeriodRange[] = [];

  if (cadence === "annual") {
    let periodStart = new Date(start);
    while (periodStart <= end) {
      const anniversaryEnd = addYearsMinusOneDay(periodStart, 1);
      const periodEnd = anniversaryEnd > end ? new Date(end) : anniversaryEnd;
      const periodStartIso = toIsoDate(periodStart);
      const periodEndIso = toIsoDate(periodEnd);

      periods.push({
        periodStart: periodStartIso,
        periodEnd: periodEndIso,
        periodLabel: formatBillingPeriodLabel(periodStartIso, periodEndIso),
      });

      if (periodEnd >= end) break;
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() + 1);
    }
    return periods;
  }

  if (cadence === "quarterly") {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const quarter = Math.floor(cursor.getMonth() / 3);
      const qStart = new Date(cursor.getFullYear(), quarter * 3, 1);
      const qEnd = new Date(cursor.getFullYear(), quarter * 3 + 3, 0);
      const range = clampPeriod(qStart, qEnd, start, end);
      if (range) {
        const label = `Q${quarter + 1} ${cursor.getFullYear()}`;
        if (!periods.some((p) => p.periodLabel === label)) {
          periods.push({ ...range, periodLabel: label });
        }
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1);
    }
    return periods;
  }

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const mStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const range = clampPeriod(mStart, mEnd, start, end);
    if (range) {
      const label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      periods.push({ ...range, periodLabel: label });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return periods;
}
