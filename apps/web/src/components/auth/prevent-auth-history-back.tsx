"use client";

import { useEffect } from "react";

/**
 * Keeps signed-in users on the app when they press the browser Back button.
 * Sign-out still navigates away normally (full page load to /auth/signout).
 *
 * Strategy: stack duplicate same-URL history entries and re-push on every
 * popstate so Back never reaches /login or the marketing landing.
 */
export function PreventAuthHistoryBack() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const href = () => window.location.href;

    const pushGuard = () => {
      window.history.pushState({ choprentGuard: true }, "", href());
    };

    // Replace the entry that may still be /login, then add a trap layer.
    window.history.replaceState({ choprentGuard: true }, "", href());
    pushGuard();

    const onPopState = () => {
      pushGuard();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
