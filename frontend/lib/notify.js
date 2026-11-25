"use client";

import { toast } from "sonner";

/* ------------------------------------------------------------------ *
 * Single notification API for the whole app.
 *  - Sonner      -> transient feedback (success / error / info / warning)
 *  - SweetAlert2 -> decisions that need an explicit answer (confirm)
 * ------------------------------------------------------------------ */

const DURATION = { success: 3500, info: 4000, warning: 5000, error: 6000 };

export const notify = {
  success: (message, description) => toast.success(message, { description, duration: DURATION.success }),
  error: (message, description) => toast.error(message, { description, duration: DURATION.error }),
  info: (message, description) => toast.info(message, { description, duration: DURATION.info }),
  warning: (message, description) => toast.warning(message, { description, duration: DURATION.warning }),
  dismiss: (id) => toast.dismiss(id),
  // Wraps a promise with loading -> success/error toasts without altering its result.
  promise: (promise, msgs) => toast.promise(promise, msgs),
};

const swalClasses = {
  container: "p2i-swal-container",
  popup: "!rounded-3xl !border !border-ink-200 !bg-white !p-7 !shadow-3xl !font-sans !w-[min(92vw,26rem)]",
  icon: "!mt-1 !mb-3",
  title: "!font-display-tight !text-2xl !font-semibold !text-ink-900 !p-0",
  htmlContainer: "!text-sm !leading-relaxed !text-ink-600 !m-0 !mt-2",
  actions: "!mt-7 !w-full !gap-3 !flex-col-reverse sm:!flex-row sm:!justify-end",
  confirmButton: "!m-0 !w-full sm:!w-auto !rounded-full !bg-ink-950 !px-6 !py-2.5 !text-sm !font-semibold !text-paper !shadow-none hover:!bg-brand-700 focus:!ring-4 focus:!ring-brand-100",
  denyButton: "!m-0 !w-full sm:!w-auto !rounded-full !px-6 !py-2.5 !text-sm !font-semibold",
  cancelButton: "!m-0 !w-full sm:!w-auto !rounded-full !border !border-ink-200 !bg-white !px-6 !py-2.5 !text-sm !font-semibold !text-ink-800 !shadow-none hover:!border-ink-900 focus:!ring-4 focus:!ring-brand-100",
};

const dangerConfirm = "!m-0 !w-full sm:!w-auto !rounded-full !bg-rose-600 !px-6 !py-2.5 !text-sm !font-semibold !text-white !shadow-none hover:!bg-rose-700 focus:!ring-4 focus:!ring-rose-100";

/**
 * Promise<boolean> - true when the user confirms.
 * Escapes all text (SweetAlert2 `text`, never `html`) so dynamic values cannot inject markup.
 */
export async function confirmDialog({
  title = "Are you sure?",
  text = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
} = {}) {
  const { default: Swal } = await import("sweetalert2");
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? "warning" : "question",
    iconColor: danger ? "#e11d48" : "#128A5E",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: false,
    focusCancel: danger,
    buttonsStyling: false,
    returnFocus: true,
    customClass: { ...swalClasses, confirmButton: danger ? dangerConfirm : swalClasses.confirmButton },
  });
  return result.isConfirmed === true;
}
