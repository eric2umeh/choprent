"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  input?: {
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    type?: string;
  };
};

type ConfirmRequest = ConfirmDialogOptions & {
  resolve: (result: { confirmed: boolean; value?: string }) => void;
};

let openConfirmDialog: ((request: ConfirmRequest) => void) | null = null;

/** In-app confirmation — replaces window.confirm / window.prompt. */
export function confirmDialog(
  options: ConfirmDialogOptions
): Promise<{ confirmed: boolean; value?: string }> {
  return new Promise((resolve) => {
    if (!openConfirmDialog) {
      resolve({ confirmed: false });
      return;
    }
    openConfirmDialog({ ...options, resolve });
  });
}

export function useConfirmDialog() {
  return useContext(ConfirmDialogContext);
}

const ConfirmDialogContext = createContext<
  ((options: ConfirmDialogOptions) => Promise<{ confirmed: boolean; value?: string }>) | null
>(null);

function ConfirmDialogViewport({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (request) {
      setInputValue(request.input?.defaultValue ?? "");
      setVisible(true);
      document.body.style.overflow = "hidden";
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    document.body.style.overflow = "";
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        request.resolve({ confirmed: false });
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [request, onClose]);

  if (!mounted || !request) return null;

  const activeRequest = request;

  function handleConfirm() {
    activeRequest.resolve({
      confirmed: true,
      value: activeRequest.input ? inputValue.trim() : undefined,
    });
    onClose();
  }

  function handleCancel() {
    activeRequest.resolve({ confirmed: false });
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cancel"
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleCancel}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={activeRequest.message ? descId : undefined}
        className={cn(
          "relative z-10 w-full max-w-sm overflow-hidden rounded-t-2xl border border-border bg-white shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:rounded-2xl",
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95"
        )}
      >
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                request.destructive ? "bg-red-100 text-red-600" : "bg-green-50 text-green-700"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-form-title">
                {request.title}
              </h2>
              {request.message && (
                <p id={descId} className="mt-1.5 text-form-hint">
                  {request.message}
                </p>
              )}
            </div>
          </div>

          {request.input && (
            <div className="mt-4">
              {request.input.label && (
                <label className="text-label normal-case">{request.input.label}</label>
              )}
              <input
                ref={inputRef}
                type={request.input.type ?? "text"}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={request.input.placeholder}
                className="input-field mt-1.5"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-ghost w-full px-4 py-2.5 sm:w-auto"
            >
              {request.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors sm:w-auto",
                request.destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-700 hover:bg-green-800"
              )}
            >
              {request.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const show = useCallback((next: ConfirmRequest) => {
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    setRequest(null);
  }, []);

  useEffect(() => {
    openConfirmDialog = show;
    return () => {
      openConfirmDialog = null;
    };
  }, [show]);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return confirmDialog(options);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <ConfirmDialogViewport request={request} onClose={close} />
    </ConfirmDialogContext.Provider>
  );
}
