import type { BillingCadence } from "@/types/database";

export type BillingPeriodRange = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function clampPeriod(start: Date, end: Date, leaseStart: Date, leaseEnd: Date) {
  const ps = start < leaseStart ? leaseStart : start;
  const pe = end > leaseEnd ? leaseEnd : end;
  if (ps > pe) return null;
  return { periodStart: toIsoDate(ps), periodEnd: toIsoDate(pe) };
}

/** Calendar billing periods clipped to lease dates. */
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
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const range = clampPeriod(
        new Date(y, 0, 1),
        new Date(y, 11, 31),
        start,
        end
      );
      if (range) {
        periods.push({ ...range, periodLabel: String(y) });
      }
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
