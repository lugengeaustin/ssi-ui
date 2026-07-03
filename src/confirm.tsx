"use client";

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { Modal } from "./Modal";
import { Button, type ButtonVariant } from "./Button";

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone of the confirm button. Default "primary"; use "danger" for destructive. */
  tone?: ButtonVariant;
}

// confirm() — imperative async confirmation dialog. Resolves true/false.
//   if (await confirm({ title: "Deprovision user?", tone: "danger" })) { ... }
// Client-only (mounts a transient React root on document.body).
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root: Root = createRoot(host);

    function cleanup(result: boolean) {
      resolve(result);
      // Allow exit animation a tick before unmounting.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 50);
    }

    function Dialog() {
      const [open, setOpen] = React.useState(true);
      function close(result: boolean) {
        setOpen(false);
        cleanup(result);
      }
      return (
        <Modal
          open={open}
          onClose={() => close(false)}
          size="sm"
          title={options.title}
          description={options.description}
          dismissable
          footer={
            <>
              <Button variant="secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={options.tone ?? "primary"}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </Button>
            </>
          }
        />
      );
    }

    root.render(<Dialog />);
  });
}
