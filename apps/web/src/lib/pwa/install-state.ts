export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches || isIos();
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function pwaDismissKey(orgSlug: string): string {
  return `choprent-a2hs-dismiss-${orgSlug}`;
}

export function isInstallPromptDismissed(orgSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(pwaDismissKey(orgSlug));
}

export function dismissInstallPrompt(orgSlug: string) {
  localStorage.setItem(pwaDismissKey(orgSlug), "1");
}

export function resetInstallPromptDismiss(orgSlug: string) {
  localStorage.removeItem(pwaDismissKey(orgSlug));
}

/** Dedupe keys — one server log per day per user/org/signal. */
export function usageDedupeKey(
  orgSlug: string,
  eventType: string,
  userId?: string | null
): string {
  const day = new Date().toISOString().slice(0, 10);
  return `choprent-usage-${orgSlug}-${eventType}-${userId ?? "anon"}-${day}`;
}

export function hasLoggedUsageToday(key: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(key) === "1" || localStorage.getItem(key) === "1";
}

export function markUsageLogged(key: string, persistDays = 1) {
  sessionStorage.setItem(key, "1");
  if (persistDays > 0) {
    localStorage.setItem(key, "1");
  }
}
