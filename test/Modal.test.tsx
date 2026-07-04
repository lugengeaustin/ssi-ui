import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../src/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        secret body
      </Modal>,
    );
    expect(screen.queryByText("secret body")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders into a portal with role=dialog and shows children when open", () => {
    render(
      <Modal open onClose={() => {}} title="Confirm">
        modal body
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Confirm");
    expect(screen.getByText("modal body")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm" })).toBeInTheDocument();
  });

  it("invokes onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        body
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("invokes onClose when the backdrop is clicked (dismissable)", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        body
      </Modal>,
    );
    // Backdrop is the dialog's parent overlay; it closes on mousedown.
    const dialog = screen.getByRole("dialog");
    const overlay = dialog.parentElement!;
    await userEvent.pointer({ target: overlay, keys: "[MouseLeft]" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does NOT close when the panel itself is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <span>inside</span>
      </Modal>,
    );
    await userEvent.pointer({
      target: screen.getByText("inside"),
      keys: "[MouseLeft]",
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes via the built-in Close button", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        body
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on backdrop click when dismissable is false", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T" dismissable={false}>
        body
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    const overlay = dialog.parentElement!;
    await userEvent.pointer({ target: overlay, keys: "[MouseLeft]" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
