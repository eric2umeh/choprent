"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Smartphone } from "lucide-react";
import {
  ensureInstallPromptListener,
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  clearDeferredInstallPrompt,
} from "@/lib/pwa/install-prompt-store";
import {
  isIos,
  isStandaloneDisplayMode,
  resetInstallPromptDismiss,
} from "@/lib/pwa/install-state";
import { toast } from "@/components/ui/toast";

function useDeferredInstallPrompt() {
  return useSyncExternalStore(
    subscribeInstallPrompt,
    getDeferredInstallPrompt,
    () => null
  );
}

/**
 * Always-visible install control (Account / Settings).
 * Works even after the floating banner was dismissed.
 */
export function InstallAppButton({
  orgSlug,
  className,
}: {
  orgSlug: string;
  className?: string;
}) {
  const deferred = useDeferredInstallPrompt();
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    ensureInstallPromptListener();
    setStandalone(isStandaloneDisplayMode());
    setIos(isIos());
  }, []);

  if (standalone) {
    return (
      <p className="text-sm text-list-secondary">
        ChopRent is installed on this device.
      </p>
    );
  }

  async function handleInstall() {
    resetInstallPromptDismiss(orgSlug);
    if (deferred) {
      await deferred.prompt();
      clearDeferredInstallPrompt();
      toast.success("Install started — confirm in the browser dialog.");
      return;
    }
    if (ios) {
      toast.info("In Safari: tap Share, then Add to Home Screen.");
      return;
    }
    toast.info(
      "In Chrome: open the ⋮ menu → Cast, save and share → Install ChopRent. Or look for the install icon in the address bar."
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm"
        onClick={handleInstall}
      >
        {deferred ? (
          <Download className="h-4 w-4" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        {deferred ? "Install ChopRent" : "How to install ChopRent"}
      </button>
      {!deferred && !ios && (
        <p className="mt-2 text-xs text-list-secondary">
          Chrome may show an install icon in the address bar after you use the
          site for ~30 seconds. You can also install from the browser menu.
        </p>
      )}
      {ios && (
        <p className="mt-2 text-xs text-list-secondary">
          Safari on iPhone/iPad: Share → Add to Home Screen.
        </p>
      )}
    </div>
  );
}
