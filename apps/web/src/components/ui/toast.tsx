"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastFn>(() => {});

let pushToast: ToastFn | null = null;

export function toast(message: string, type: ToastType = "info") {
  pushToast?.(message, type);
}

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");
toast.info = (message: string) => toast(message, "info");

export function useToast() {
  return useContext(ToastContext);
}

const styles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-border bg-white text-foreground",
};

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const iconColors: Record<ToastType, string> = {
  success: "text-green-700",
  error: "text-red-600",
  info: "text-muted",
};

function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => {
        const Icon = icons[item.type];
        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2.5 shadow-md ${styles[item.type]}`}
            role="status"
          >
            <Icon className={`mt-0.5 size-4 shrink-0 ${iconColors[item.type]}`} aria-hidden />
            <p className="min-w-0 flex-1 text-xs leading-relaxed">{item.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((current) => [...current, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  useEffect(() => {
    pushToast = show;
    return () => {
      pushToast = null;
    };
  }, [show]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
