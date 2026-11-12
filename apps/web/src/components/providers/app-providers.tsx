"use client";

import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { DocumentTitleProvider } from "@/components/layout/document-title";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DocumentTitleProvider>
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </DocumentTitleProvider>
  );
}
