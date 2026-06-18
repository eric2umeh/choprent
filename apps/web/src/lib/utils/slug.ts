const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "property"
  );
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Build a URL-safe unit path segment (supports composite codes like 14/16). */
export function unitCodeToUrlRef(unitCode: string): string {
  return unitCode
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

/** Restore unit code from catch-all URL segments. */
export function unitCodeFromUrlRef(segments: string[]): string {
  return segments.map((segment) => decodeRouteSegment(segment)).join("/");
}

export function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
