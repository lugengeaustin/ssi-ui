import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, ThemeToggle, accentPalette } from "../src/theme";
import { THEME_INIT_SCRIPT } from "../src/themeScript";
import { useOptimisticAction } from "../src/useOptimisticAction";

// jsdom has no matchMedia — stub a light-mode media query.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, // OS reports light
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
});

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute("style");
});

// WCAG contrast of white text over a hex colour — independent re-implementation
// so the test doesn't trust the code under test.
function contrastVsWhite(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05);
}

describe("accentPalette — guardrailed tenant accent", () => {
  it("returns null for missing or malformed input", () => {
    expect(accentPalette(null)).toBeNull();
    expect(accentPalette(undefined)).toBeNull();
    expect(accentPalette("not-a-colour")).toBeNull();
    expect(accentPalette("#12")).toBeNull();
  });

  it("keeps an already-AA accent essentially unchanged", () => {
    const p = accentPalette("#1E3FA0")!; // brand blue — already deep
    expect(p.blue.toLowerCase()).toBe("#1e3fa0");
    expect(contrastVsWhite(p.blue)).toBeGreaterThanOrEqual(4.5);
  });

  it("darkens a pale accent until white text reaches AA", () => {
    const p = accentPalette("#F0C84A")!; // Calm Studio gold — far too pale
    expect(p.blue.toLowerCase()).not.toBe("#f0c84a");
    expect(contrastVsWhite(p.blue)).toBeGreaterThanOrEqual(4.5);
  });

  it("derives deep/ring/soft companions", () => {
    const p = accentPalette("#1E3FA0")!;
    expect(p.blueDeep).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.ring).toContain("0.45");
    expect(p.soft).toContain("0.08");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("reads the cache key and sets data-theme before paint", () => {
    expect(THEME_INIT_SCRIPT).toContain("ssi-theme");
    expect(THEME_INIT_SCRIPT).toContain("dataset.theme");
    expect(THEME_INIT_SCRIPT).toContain("prefers-color-scheme");
  });
});

describe("ThemeProvider + ThemeToggle", () => {
  it("applies the resolved theme to <html> and switches on toggle", async () => {
    const onModeChange = vi.fn();
    render(
      <ThemeProvider onModeChange={onModeChange}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // Default: system → light (matchMedia stub reports light).
    expect(document.documentElement.dataset.theme).toBe("light");

    await userEvent.click(screen.getByRole("radio", { name: /dark/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("ssi-theme")).toBe("dark");
    expect(onModeChange).toHaveBeenCalledWith("dark");
  });

  it("adopts the cross-device user preference when the device has none", () => {
    render(
      <ThemeProvider userTheme="dark">
        <span>x</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("ssi-theme")).toBe("dark");
  });

  it("does NOT override an explicit device choice with the profile value", () => {
    window.localStorage.setItem("ssi-theme", "light");
    render(
      <ThemeProvider userTheme="dark">
        <span>x</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("applies and removes guardrailed accent variables", () => {
    const { rerender } = render(
      <ThemeProvider accent="#1E3FA0">
        <span>x</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--blue")).toBe("#1e3fa0");
    rerender(
      <ThemeProvider accent={null}>
        <span>x</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--blue")).toBe("");
  });
});

describe("useOptimisticAction", () => {
  it("keeps the optimistic state on success", async () => {
    const optimistic = vi.fn();
    const rollback = vi.fn();
    const { result } = renderHook(() => useOptimisticAction());
    await act(async () => {
      await result.current.run({
        optimistic,
        rollback,
        action: async () => ({ ok: true }),
      });
    });
    expect(optimistic).toHaveBeenCalledOnce();
    expect(rollback).not.toHaveBeenCalled();
  });

  it("rolls back and surfaces the error on ok:false", async () => {
    const rollback = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useOptimisticAction());
    await act(async () => {
      await result.current.run({
        optimistic: () => {},
        rollback,
        onError,
        action: async () => ({ ok: false, error: "RLS denied" }),
      });
    });
    expect(rollback).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("RLS denied");
  });

  it("rolls back on a thrown error", async () => {
    const rollback = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useOptimisticAction());
    await act(async () => {
      await result.current.run({
        optimistic: () => {},
        rollback,
        onError,
        action: async () => {
          throw new Error("network down");
        },
      });
    });
    expect(rollback).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith("network down");
  });
});
