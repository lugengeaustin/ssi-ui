import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../src/Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults type to button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("honours an explicit type", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Nope</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is disabled and marked busy while loading", () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("applies a distinct representative class per variant", () => {
    const { rerender } = render(<Button variant="primary">x</Button>);
    expect(screen.getByRole("button").className).toContain("grad-primary");

    rerender(<Button variant="secondary">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-card");

    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-transparent");

    rerender(<Button variant="danger">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-danger");
  });

  it("applies a distinct size class per size", () => {
    const { rerender } = render(<Button size="sm">x</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");

    rerender(<Button size="md">x</Button>);
    expect(screen.getByRole("button").className).toContain("h-10");

    rerender(<Button size="lg">x</Button>);
    expect(screen.getByRole("button").className).toContain("h-12");
  });

  it("uses square icon-only sizing and omits children when iconOnly", () => {
    render(
      <Button iconOnly size="md" aria-label="only">
        should-not-render
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "only" });
    expect(btn.className).toContain("w-10");
    expect(btn).not.toHaveTextContent("should-not-render");
  });
});
