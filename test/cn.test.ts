import { describe, it, expect } from "vitest";
import { cn } from "../src/cn";

describe("cn", () => {
  it("concatenates class strings with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values (false, null, undefined, 0, empty string)", () => {
    expect(cn("a", false, null, undefined, "", 0, "b")).toBe("a b");
  });

  it("keeps conditional expressions that evaluate to a class", () => {
    const active = true;
    const disabled = false;
    expect(cn("base", active && "on", disabled && "off")).toBe("base on");
  });

  it("flattens nested arrays", () => {
    expect(cn("a", ["b", ["c", false, "d"]], "e")).toBe("a b c d e");
  });

  it("returns empty string when everything is falsy", () => {
    expect(cn(false, null, undefined, "")).toBe("");
  });

  it("does NOT dedupe or tailwind-merge — later duplicates are preserved (plain concat)", () => {
    // This lib is intentionally clsx-style concat, not tailwind-merge.
    expect(cn("p-2", "p-4")).toBe("p-2 p-4");
    expect(cn("x", "x")).toBe("x x");
  });
});
