/** Client-side usage signals stored per organization. */
export const USAGE_EVENT_TYPES = [
  "login",
  "pwa_installed",
  "standalone_session",
  "pwa_install_prompt_shown",
  "pwa_install_dismissed",
  "return_visit",
] as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

export function isUsageEventType(value: string): value is UsageEventType {
  return (USAGE_EVENT_TYPES as readonly string[]).includes(value);
}
