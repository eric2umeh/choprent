/** Compare unit codes like "2", "10", "14/16", "Flat 3B" in ascending numeric order. */
export function compareNatural(a: string, b: string): number {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .split(/(\d+)/)
      .filter(Boolean)
      .map((part) => (/^\d+$/.test(part) ? Number(part) : part));

  const left = tokens(a);
  const right = tokens(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const lv = left[i];
    const rv = right[i];
    if (lv === undefined) return -1;
    if (rv === undefined) return 1;
    if (typeof lv === "number" && typeof rv === "number") {
      if (lv !== rv) return lv - rv;
      continue;
    }
    const ls = String(lv);
    const rs = String(rv);
    if (ls !== rs) return ls.localeCompare(rs);
  }

  return 0;
}

export function sortByNaturalKey<T>(
  items: T[],
  key: (item: T) => string
): T[] {
  return [...items].sort((a, b) => compareNatural(key(a), key(b)));
}
