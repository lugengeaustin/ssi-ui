import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card, Panel, Section, PageHeader } from "../src/Card";

describe("Card — plain (static)", () => {
  it("renders a plain div with no button role and no tabindex", () => {
    render(<Card>plain content</Card>);
    const el = screen.getByText("plain content").closest("div")!;
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("tabindex");
    expect(el.className).not.toContain("cursor-pointer");
    // No sheen span for a static card.
    expect(el.querySelector(".card-sheen")).toBeNull();
  });

  it("applies the requested padding class", () => {
    const { rerender } = render(<Card padding="none">c</Card>);
    let el = screen.getByText("c").closest("div")!;
    // padding none => neither p-4/p-5/p-7
    expect(el.className).not.toMatch(/\bp-4\b|\bp-5\b|\bp-7\b/);

    rerender(<Card padding="sm">c</Card>);
    el = screen.getByText("c").closest("div")!;
    expect(el.className).toContain("p-4");

    rerender(<Card padding="md">c</Card>);
    el = screen.getByText("c").closest("div")!;
    expect(el.className).toContain("p-5");

    rerender(<Card padding="lg">c</Card>);
    el = screen.getByText("c").closest("div")!;
    expect(el.className).toContain("p-7");
  });
});

describe("Card — onClick (clickable)", () => {
  it("gets role=button, tabIndex 0 and cursor-pointer when onClick is provided", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>hit me</Card>);
    const el = screen.getByRole("button", { name: /hit me/ });
    expect(el).toHaveAttribute("tabindex", "0");
    expect(el.className).toContain("cursor-pointer");
    expect(el.className).toContain("card-interactive");
  });

  it("fires onClick on click", async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>hit me</Card>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fires onClick on Enter", async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>hit me</Card>);
    const el = screen.getByRole("button");
    el.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("fires onClick on Space", async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>hit me</Card>);
    const el = screen.getByRole("button");
    el.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalled();
  });

  it("renders a sheen span for the hover treatment when clickable", () => {
    render(<Card onClick={() => {}}>hit me</Card>);
    const el = screen.getByRole("button");
    expect(el.querySelector(".card-sheen")).not.toBeNull();
  });
});

describe("Card — interactive prop (no onClick)", () => {
  // NOTE ON REAL API: role/tabindex/keyboard wiring is gated on `clickable && onClick`.
  // `interactive` alone marks the card clickable (visual affordance: card-interactive,
  // cursor-pointer, sheen) but does NOT add role=button / tabIndex, since there is no
  // handler to invoke. This matches the source in src/Card.tsx.
  it("applies the interactive visual affordance classes", () => {
    render(<Card interactive>look interactive</Card>);
    const el = screen.getByText("look interactive").closest("div")!;
    expect(el.className).toContain("card-interactive");
    expect(el.className).toContain("cursor-pointer");
  });

  it("does not add role=button or tabindex without an onClick handler", () => {
    render(<Card interactive>look interactive</Card>);
    const el = screen.getByText("look interactive").closest("div")!;
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("tabindex");
  });

  it("still shows the sheen span (clickable visual treatment)", () => {
    render(<Card interactive>look interactive</Card>);
    const el = screen.getByText("look interactive").closest("div")!;
    expect(el.querySelector(".card-sheen")).not.toBeNull();
  });
});

describe("Card — sheen prop", () => {
  it("applies the sheen (lift-pop) treatment and a card-sheen span", () => {
    render(<Card sheen>catalog card</Card>);
    const el = screen.getByText("catalog card").closest("div")!;
    expect(el.className).toContain("lift-pop");
    expect(el.querySelector(".card-sheen")).not.toBeNull();
  });

  it("does NOT add button role / tabindex / cursor-pointer (click delegated to a child)", () => {
    render(<Card sheen>catalog card</Card>);
    const el = screen.getByText("catalog card").closest("div")!;
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("tabindex");
    expect(el.className).not.toContain("cursor-pointer");
  });

  it("sheen is superseded by clickable when an onClick is also present", () => {
    // sheeny = sheen && !clickable — so with onClick it becomes a real button.
    render(
      <Card sheen onClick={() => {}}>
        both
      </Card>,
    );
    const el = screen.getByRole("button", { name: /both/ });
    expect(el).toHaveAttribute("tabindex", "0");
    expect(el.className).toContain("card-interactive");
    expect(el.className).not.toContain("lift-pop");
  });
});

describe("Panel / Section / PageHeader", () => {
  it("Panel renders title, children and actions", () => {
    render(
      <Panel title="Records" actions={<button>Add</button>}>
        body-content
      </Panel>,
    );
    expect(screen.getByText("Records")).toBeInTheDocument();
    expect(screen.getByText("body-content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("Panel renders its description", () => {
    render(<Panel title="T" description="a subtitle">x</Panel>);
    expect(screen.getByText("a subtitle")).toBeInTheDocument();
  });

  it("Section renders a heading and children", () => {
    render(<Section title="Overview">section-body</Section>);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("section-body")).toBeInTheDocument();
  });

  it("PageHeader renders title, subtitle and actions", () => {
    render(
      <PageHeader
        title="Dashboard"
        subtitle="all your data"
        actions={<button>Export</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("all your data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
