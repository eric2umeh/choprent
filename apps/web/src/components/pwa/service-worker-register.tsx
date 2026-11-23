"use client";

import { useEffect } from "react";
import { ensureInstallPromptListener } from "@/lib/pwa/install-prompt-store";

/** Registers the service worker and captures install prompts early. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    ensureInstallPromptListener();

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-blocking — install may still work via browser menu on some platforms
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
