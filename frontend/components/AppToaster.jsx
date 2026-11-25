"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      closeButton
      richColors
      expand={false}
      visibleToasts={4}
      offset={{ top: 20, right: 20, bottom: 20, left: 20 }}
      mobileOffset={{ top: 12, right: 12, bottom: 12, left: 12 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-ink-200 !shadow-lift !font-sans !text-sm",
          title: "!font-semibold",
          description: "!text-ink-600",
        },
      }}
    />
  );
}
