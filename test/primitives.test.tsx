import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill, Badge, StatusBadge } from "../src/Pill";
import { StatCard } from "../src/StatCard";
import { EmptyState } from "../src/EmptyState";
import { TextLink, linkClass } from "../src/TextLink";

describe("Pill", () => {
  it("renders children", () => {
    render(<Pill>Active</Pill>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies the tone class", () => {
    render(<Pill tone="green">ok</Pill>);
    const el = screen.getByText("ok");
    expect(el.className).toContain("bg-green-soft");
    expect(el.className).toContain("text-green-deep");
  });

  it("defaults to the muted tone", () => {
    render(<Pill>n</Pill>);
    expect(screen.getByText("n").className).toContain("text-muted");
  });

  it("Badge is an alias of Pill", () => {
    render(<Badge tone="blue">7</Badge>);
    expect(screen.getByText("7").className).toContain("bg-blue-soft");
  });

  it("StatusBadge maps a status to the right tone and humanizes the label", () => {
    render(<StatusBadge status="in_progress" />);
    const el = screen.getByText("In Progress");
    expect(el.className).toContain("bg-blue-soft");
  });

  it("StatusBadge honours a label override", () => {
    render(<StatusBadge status="active" label="Live now" />);
    expect(screen.getByText("Live now").className).toContain("bg-green-soft");
  });
});

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Revenue" value="$12,000" />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12,000")).toBeInTheDocument();
  });

  it("renders hint and an up-delta with a positive tone", () => {
    render(
      <StatCard
        label="Users"
        value={42}
        hint="this month"
        delta={{ value: "12%", direction: "up" }}
      />,
    );
    expect(screen.getByText("this month")).toBeInTheDocument();
    const delta = screen.getByText(/12%/);
    expect(delta.className).toContain("text-green-deep");
  });
});

describe("EmptyState", () => {
  it("renders title, description and the icon slot", () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="Nothing here"
        description="Add your first record"
        action={<button>New</button>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add your first record")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });
});

describe("TextLink", () => {
  it("renders a plain anchor with href, children and the link class (no next/link)", () => {
    render(<TextLink href="/records/1">View record</TextLink>);
    const a = screen.getByRole("link", { name: "View record" });
    expect(a.tagName).toBe("A");
    expect(a).toHaveAttribute("href", "/records/1");
    expect(a.className).toContain("hover:underline");
  });

  it("linkClass returns the subtle variant classes when asked", () => {
    expect(linkClass({ subtle: true })).toContain("text-muted");
    expect(linkClass()).toContain("text-blue");
  });
});
