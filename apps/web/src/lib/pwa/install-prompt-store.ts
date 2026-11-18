"use client";

type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
};

type Listener = () => void;

let deferred: DeferredInstallPrompt | null = null;
const listeners = new Set<Listener>();
let listening = false;

function emit() {
  for (const listener of listeners) listener();
}

function onBeforeInstall(event: Event) {
  event.preventDefault();
  const ev = event as Event & { prompt: () => Promise<void> };
  deferred = {
    prompt: async () => {
      await ev.prompt();
    },
  };
  emit();
}

/** Capture Chrome/Edge install events as early as possible (root layout). */
export function ensureInstallPromptListener() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function getDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return deferred;
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearDeferredInstallPrompt() {
  deferred = null;
  emit();
}
