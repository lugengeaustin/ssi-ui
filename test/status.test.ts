import { describe, it, expect } from "vitest";
import { STATUS_TONES, toneForStatus } from "../src/status";

describe("STATUS_TONES map", () => {
  it("maps terminal-good statuses to green", () => {
    for (const s of ["active", "done", "complete", "completed", "approved", "paid"]) {
      expect(STATUS_TONES[s]).toBe("green");
    }
  });

  it("maps terminal-bad statuses to red", () => {
    for (const s of ["blocked", "closed", "failed", "cancelled", "rejected", "overdue"]) {
      expect(STATUS_TONES[s]).toBe("red");
    }
  });

  it("maps in-progress statuses to blue", () => {
    for (const s of ["doing", "in_progress", "in_review", "open", "running"]) {
      expect(STATUS_TONES[s]).toBe("blue");
    }
  });

  it("maps in-flight/attention statuses to gold", () => {
    for (const s of ["live", "pending", "review", "attention", "warning"]) {
      expect(STATUS_TONES[s]).toBe("gold");
    }
  });

  it("maps neutral/not-started statuses to muted", () => {
    for (const s of ["todo", "prospect", "draft", "archived", "inactive"]) {
      expect(STATUS_TONES[s]).toBe("muted");
    }
  });
});

describe("toneForStatus", () => {
  it("resolves a known status", () => {
    expect(toneForStatus("active")).toBe("green");
    expect(toneForStatus("blocked")).toBe("red");
  });

  it("is case-insensitive", () => {
    expect(toneForStatus("ACTIVE")).toBe("green");
    expect(toneForStatus("Blocked")).toBe("red");
  });

  it("normalizes spaces and hyphens to underscores", () => {
    expect(toneForStatus("in progress")).toBe("blue");
    expect(toneForStatus("in-progress")).toBe("blue");
    expect(toneForStatus("  In-Review  ")).toBe("blue");
  });

  it("falls back to muted for unknown statuses", () => {
    expect(toneForStatus("banana")).toBe("muted");
  });

  it("falls back to muted for null / undefined / empty", () => {
    expect(toneForStatus(null)).toBe("muted");
    expect(toneForStatus(undefined)).toBe("muted");
    expect(toneForStatus("")).toBe("muted");
  });
});
