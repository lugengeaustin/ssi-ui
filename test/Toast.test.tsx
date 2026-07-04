import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster, toast } from "../src/Toast";

// The toast store is module-global (so toast() works from anywhere without a
// context). Sticky (duration:0) toasts would otherwise leak across tests, so
// each test tracks the ids it creates and dismisses them afterward.
const spawned: number[] = [];
function track(id: number) {
  spawned.push(id);
  return id;
}
afterEach(() => {
  spawned.splice(0).forEach((id) => toast.dismiss(id));
});

describe("Toast", () => {
  it("renders a toast with role=status after toast() is called", async () => {
    render(<Toaster />);
    track(toast("Saved successfully", { duration: 0 }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Saved successfully");
  });

  it("renders a description when provided", async () => {
    render(<Toaster />);
    track(toast.info("Heads up", { description: "check your inbox", duration: 0 }));
    expect(await screen.findByText("check your inbox")).toBeInTheDocument();
  });

  it("supports the tone helpers (toast.success / toast.error)", async () => {
    render(<Toaster />);
    track(toast.success("It worked", { duration: 0 }));
    track(toast.error("It broke", { duration: 0 }));
    expect(await screen.findByText("It worked")).toBeInTheDocument();
    expect(await screen.findByText("It broke")).toBeInTheDocument();
  });

  it("dismisses a toast when its Dismiss button is clicked", async () => {
    render(<Toaster />);
    track(toast("Dismiss me", { duration: 0 }));
    expect(await screen.findByText("Dismiss me")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument(),
    );
  });
});
