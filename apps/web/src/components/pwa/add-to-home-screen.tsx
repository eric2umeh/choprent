"use client";

import { useEffect, useState } from "react";
import { X, Smartphone, Download } from "lucide-react";
import {
  dismissInstallPrompt,
  isInstallPromptDismissed,
  isIos,
  isStandaloneDisplayMode,
  resetInstallPromptDismiss,
} from "@/lib/pwa/install-state";
import {
  logInstallPromptDismissed,
  logInstallPromptShown,
} from "@/components/pwa/app-usage-recorder";

export { isInstallPromptDismissed, resetInstallPromptDismiss };

type Audience = "staff" | "tenant";

/** Floating install banner — phone and desktop (Chrome/Edge Install). */
export function AddToHomeScreenPrompt({
  orgSlug,
  userId,
  audience = "tenant",
}: {
  orgSlug: string;
  userId?: string;
  audience?: Audience;
}) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (isStandaloneDisplayMode() || isInstallPromptDismissed(orgSlug)) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setDeferredPrompt({
        prompt: async () => {
          await ev.prompt();
        },
      });
      setVisible(true);
      logInstallPromptShown(orgSlug, userId ?? null, audience);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);

    // Show guidance even before Chromium fires the event (iOS / Firefox / Safari).
    const timer = window.setTimeout(() => {
      setVisible(true);
      logInstallPromptShown(orgSlug, userId ?? null, audience);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    };
  }, [orgSlug, userId, audience]);

  if (!visible || isStandaloneDisplayMode() || isInstallPromptDismissed(orgSlug)) return null;

  return (
    <InstallPromptContent
      orgSlug={orgSlug}
      userId={userId}
      audience={audience}
      deferredPrompt={deferredPrompt}
      onDismiss={() => setVisible(false)}
    />
  );
}

/** Inline card on tenant home. */
export function TenantInstallAppCard({
  orgSlug,
  userId,
}: {
  orgSlug: string;
  userId?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (isStandaloneDisplayMode() || isInstallPromptDismissed(orgSlug)) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setDeferredPrompt({
        prompt: async () => {
          await ev.prompt();
        },
      });
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    setVisible(true);
    logInstallPromptShown(orgSlug, userId ?? null, "tenant");

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    };
  }, [orgSlug, userId]);

  if (!visible || isStandaloneDisplayMode() || isInstallPromptDismissed(orgSlug)) return null;

  return (
    <div className="border-b border-green-200 bg-white px-3 py-3">
      <InstallPromptContent
        orgSlug={orgSlug}
        userId={userId}
        audience="tenant"
        deferredPrompt={deferredPrompt}
        onDismiss={() => setVisible(false)}
        inline
      />
    </div>
  );
}

function InstallPromptContent({
  orgSlug,
  userId,
  audience,
  deferredPrompt,
  onDismiss,
  inline = false,
}: {
  orgSlug: string;
  userId?: string;
  audience: Audience;
  deferredPrompt: { prompt: () => Promise<void> } | null;
  onDismiss: () => void;
  inline?: boolean;
}) {
  function dismiss() {
    dismissInstallPrompt(orgSlug);
    logInstallPromptDismissed(orgSlug, userId ?? null, audience);
    onDismiss();
  }

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      dismiss();
    }
  }

  const wrapperClass = inline
    ? "rounded-xl border border-green-200 bg-green-50/50 p-3"
    : "fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] rounded-xl border border-green-200 bg-white p-3 shadow-lg md:bottom-6 md:left-auto md:right-4 md:max-w-sm";

  const blurb =
    audience === "staff"
      ? "Install ChopRent for faster access to payments and units."
      : "Install for quick access to pay rent and view your ledger.";

  return (
    <div className={wrapperClass}>
      <div className="flex items-start gap-2">
        {deferredPrompt ? (
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        ) : (
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install ChopRent</p>
          {isIos() ? (
            <p className="mt-1 text-xs text-list-secondary">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          ) : deferredPrompt ? (
            <p className="mt-1 text-xs text-list-secondary">{blurb}</p>
          ) : (
            <p className="mt-1 text-xs text-list-secondary">
              Use the browser menu (⋮ or ⋯) and choose <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {deferredPrompt && (
              <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={install}>
                Install
              </button>
            )}
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={dismiss}>
              Not now
            </button>
          </div>
        </div>
        <button type="button" className="icon-btn-muted" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
