import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "../src/Tabs";

const items = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done", disabled: true },
];

describe("Tabs", () => {
  it("renders a tablist with all tab labels", () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Done" })).toBeInTheDocument();
  });

  it("marks the controlled active tab as selected", () => {
    render(<Tabs items={items} value="open" onValueChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Open" })).toHaveAttribute("aria-selected", "true");
  });

  it("defaults the active tab to the first item when uncontrolled", () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  });

  it("honours defaultValue for the initial active tab", () => {
    render(<Tabs items={items} defaultValue="open" />);
    expect(screen.getByRole("tab", { name: "Open" })).toHaveAttribute("aria-selected", "true");
  });

  it("fires onValueChange when a tab is selected", async () => {
    const onValueChange = vi.fn();
    render(<Tabs items={items} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Open" }));
    expect(onValueChange).toHaveBeenCalledWith("open");
  });

  it("updates the active tab in uncontrolled mode on click", async () => {
    render(<Tabs items={items} />);
    await userEvent.click(screen.getByRole("tab", { name: "Open" }));
    expect(screen.getByRole("tab", { name: "Open" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "false");
  });

  it("disables a disabled tab", () => {
    render(<Tabs items={items} />);
    expect(screen.getByRole("tab", { name: "Done" })).toBeDisabled();
  });
});
