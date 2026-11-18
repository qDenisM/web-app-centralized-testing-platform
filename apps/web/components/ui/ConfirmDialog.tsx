"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormButton } from "@/components/ui/FormButton";
import { Alert } from "@/components/ui/Alert";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "destructive";
  busy?: boolean;
  error?: string | null;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel = "Отмена",
  variant = "primary",
  busy = false,
  error = null,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </FormButton>
          <FormButton
            type="button"
            variant={variant === "destructive" ? "destructive" : "primary"}
            className="w-auto px-4 py-2.5"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </FormButton>
        </>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary">
        <div>{children}</div>
        {error ? (
          <Alert compact className="font-semibold">{error}</Alert>
        ) : null}
      </div>
    </Modal>
  );
}
