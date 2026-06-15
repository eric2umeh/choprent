"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  /** Bottom sheet on small screens, centered dialog on sm+ */
  sheet?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /** Block backdrop / escape close (e.g. while submitting) */
  preventClose?: boolean;
  showCloseButton?: boolean;
  className?: string;
  panelClassName?: string;
};

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  sheet = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventClose = false,
  showCloseButton = true,
  className,
  panelClassName,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setRender(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!render) return;
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [render, visible]);

  useEffect(() => {
    if (!render || !closeOnEscape || preventClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [render, closeOnEscape, preventClose, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop && !preventClose) onClose();
  }, [closeOnBackdrop, preventClose, onClose]);

  const handleTransitionEnd = useCallback(() => {
    if (!visible) setRender(false);
  }, [visible]);

  if (!mounted || !render) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex p-4",
        sheet ? "items-end justify-center sm:items-center" : "items-center justify-center",
        className
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleBackdropClick}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-white shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:rounded-2xl",
          sheet
            ? visible
              ? "translate-y-0 opacity-100 sm:scale-100"
              : "translate-y-full opacity-0 sm:translate-y-4 sm:scale-95"
            : visible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0",
          panelClassName
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-sm font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-xs text-muted">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={preventClose}
                className="btn-icon shrink-0 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className={cn(!title && !showCloseButton ? "" : "px-5 py-4")}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
