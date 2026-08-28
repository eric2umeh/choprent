"use client";

import { useEffect } from "react";
import type { UsageEventType } from "@/lib/usage-events/types";
import {
  hasLoggedUsageToday,
  isStandaloneDisplayMode,
  markUsageLogged,
  usageDedupeKey,
} from "@/lib/pwa/install-state";

async function postUsageEvent(
  orgSlug: string,
  eventType: UsageEventType,
  metadata: Record<string, unknown> = {}
) {
  try {
    await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, eventType, metadata }),
      keepalive: true,
    });
  } catch {
    // Non-blocking
  }
}

function logOncePerDay(
  orgSlug: string,
  userId: string | null,
  eventType: UsageEventType,
  metadata?: Record<string, unknown>
) {
  const key = usageDedupeKey(orgSlug, eventType, userId);
  if (hasLoggedUsageToday(key)) return;
  markUsageLogged(key);
  void postUsageEvent(orgSlug, eventType, metadata);
}

/** Records sign-ins, app installs, and standalone sessions for workspace analytics. */
export function AppUsageRecorder({
  orgSlug,
  userId,
  audience,
}: {
  orgSlug: string;
  userId: string;
  audience: "staff" | "tenant";
}) {
  useEffect(() => {
    logOncePerDay(orgSlug, userId, "login", { audience });

    const visitKey = `choprent-first-visit-${orgSlug}`;
    const isReturn = !!localStorage.getItem(visitKey);
    if (isReturn) {
      logOncePerDay(orgSlug, userId, "return_visit", { audience });
    } else {
      localStorage.setItem(visitKey, new Date().toISOString());
    }

    if (isStandaloneDisplayMode()) {
      logOncePerDay(orgSlug, userId, "standalone_session", { audience });
    }

    const onInstalled = () => {
      void postUsageEvent(orgSlug, "pwa_installed", { audience });
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [orgSlug, userId, audience]);

  return null;
}

export function logInstallPromptShown(orgSlug: string, userId: string | null, audience: "staff" | "tenant") {
  logOncePerDay(orgSlug, userId, "pwa_install_prompt_shown", { audience });
}

export function logInstallPromptDismissed(orgSlug: string, userId: string | null, audience: "staff" | "tenant") {
  logOncePerDay(orgSlug, userId, "pwa_install_dismissed", { audience });
}
