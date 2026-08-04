import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FindPalette, FindButton, closeFind } from "../src/FindPalette";
import type { FindResult } from "../src/find";

// The palette talks to ONE thing — supabase.rpc("ssi_search", …) — so the whole
// component is testable against a stub client with a single method.
//
// Timer note: @testing-library/user-event deadlocks under Vitest 4's fake
// timers (reproducible on a bare <input>, nothing to do with this component),
// so the debounce/stale-response tests drive the DOM with fireEvent and the
// real-timer tests keep using userEvent.
type RpcArgs = { q: string; max_rows?: number };
type RpcResult = { data: unknown; error: { message: string } | null };

function stubClient(handler: (args: RpcArgs) => RpcResult | Promise<RpcResult>) {
  const rpc = vi.fn((_fn: string, args?: Record<string, unknown>) =>
    Promise.resolve(handler((args ?? {}) as RpcArgs)),
  );
  return { client: { rpc }, rpc };
}

function row(over: Partial<FindResult> = {}): FindResult {
  return {
    kind: "client",
    app: "e-mteja",
    id: "1",
    title: "Acme Ltd",
    subtitle: "Dar es Salaam",
    path: "/app/clients/1",
    at: null,
    ...over,
  };
}

const ROWS: FindResult[] = [
  row({
    app: "e-office",
    kind: "engagement",
    id: "e1",
    title: "Acme Ltd retainer",
    subtitle: "Active · FY2026",
    path: "/app/engagements/e1",
  }),
  row({
    app: "e-office",
    kind: "task",
    id: "t1",
    title: "Acme kickoff deck",
    subtitle: "Due Friday",
    path: "/app/tasks/t1",
  }),
  row({ app: "e-mteja", kind: "client", id: "c1", title: "Acme Ltd", path: "/app/clients/c1" }),
];

beforeEach(() => {
  closeFind();
});

afterEach(() => {
  closeFind();
  vi.useRealTimers();
});

/** Press ⌘K on the document, the way the global shortcut is really used. */
function pressShortcut(key = "k", mods: { metaKey?: boolean; ctrlKey?: boolean } = { metaKey: true }) {
  fireEvent.keyDown(document, { key, ...mods });
}

/** Type into the palette input one character at a time (each fires an input event). */
function typeQuery(text: string) {
  const input = screen.getByRole("combobox") as HTMLInputElement;
  for (let i = 1; i <= text.length; i++) {
    fireEvent.change(input, { target: { value: text.slice(0, i) } });
  }
  return input;
}

/** Let the debounce fire and the rpc promise settle. */
async function settle(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("FindPalette — opening and closing", () => {
  it("renders nothing until ⌘K is pressed, then shows the dialog", async () => {
    const { client } = stubClient(() => ({ data: [], error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    pressShortcut();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("opens on Ctrl+K for non-Mac keyboards and toggles shut on a second press", () => {
    const { client } = stubClient(() => ({ data: [], error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut("k", { ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    pressShortcut("k", { ctrlKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from <FindButton /> and closes on Escape, restoring focus", async () => {
    const user = userEvent.setup();
    const { client } = stubClient(() => ({ data: [], error: null }));
    render(
      <>
        <FindButton />
        <FindPalette client={client} currentApp="e-office" />
      </>,
    );

    const trigger = screen.getByRole("button", { name: /search/i });
    trigger.focus();
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("FindPalette — querying", () => {
  it("debounces four keystrokes into exactly one rpc call", async () => {
    vi.useFakeTimers();
    const { client, rpc } = stubClient(() => ({ data: ROWS, error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut();
    typeQuery("acme");
    expect(rpc).not.toHaveBeenCalled();

    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("ssi_search", { q: "acme", max_rows: 6 });
  });

  it("does not query below the 2-character minimum", async () => {
    vi.useFakeTimers();
    const { client, rpc } = stubClient(() => ({ data: ROWS, error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut();
    typeQuery("a");
    await settle(600);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("groups results by app with a count, subtitle and highlighted title", async () => {
    vi.useFakeTimers();
    const { client } = stubClient(() => ({ data: ROWS, error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut();
    typeQuery("acme");
    await settle();

    const office = screen.getByRole("group", { name: "E-office" });
    const mteja = screen.getByRole("group", { name: "E-mteja" });
    // Count per group.
    expect(office.textContent).toContain("2");
    expect(mteja.textContent).toContain("1");

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("Active · FY2026")).toBeInTheDocument();
    // Matched substring is marked inside the title.
    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe("Acme");
  });

  it("shows an honest empty state naming the query", async () => {
    vi.useFakeTimers();
    const { client } = stubClient(() => ({ data: [], error: null }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut();
    typeQuery("zzz");
    await settle();

    expect(screen.getByText('No matches for "zzz"')).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("never leaks raw PostgREST text in the error state", async () => {
    vi.useFakeTimers();
    const { client } = stubClient(() => ({
      data: null,
      error: { message: "permission denied for function ssi_search (PGRST202)" },
    }));
    render(<FindPalette client={client} currentApp="e-office" />);

    pressShortcut();
    typeQuery("acme");
    await settle();

    expect(screen.getByText("Search is unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/PGRST202|permission denied/i)).not.toBeInTheDocument();
  });

  it("survives a rejected rpc without leaking the thrown error", async () => {
    vi.useFakeTimers();
    const rpc = vi.fn(() => Promise.reject(new Error("fetch failed: ECONNREFUSED")));
    render(<FindPalette client={{ rpc }} currentApp="e-office" />);

    pressShortcut();
    typeQuery("acme");
    await settle();

    expect(screen.getByText("Search is unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
  });

  it("cannot let a slow stale response overwrite a newer one", async () => {
    vi.useFakeTimers();

    let resolveStale: ((r: RpcResult) => void) | null = null;
    const stale = [row({ app: "e-mteja", id: "old", title: "Stale result" })];
    const fresh = [row({ app: "e-mteja", id: "new", title: "Newer result" })];
    const rpc = vi.fn((_fn: string, args?: Record<string, unknown>) => {
      if ((args as RpcArgs).q === "ac") {
        return new Promise<RpcResult>((resolve) => {
          resolveStale = resolve;
        });
      }
      return Promise.resolve<RpcResult>({ data: fresh, error: null });
    });

    render(<FindPalette client={{ rpc }} currentApp="e-office" />);
    pressShortcut();

    // Query 1 — fires, and is left hanging.
    typeQuery("ac");
    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(resolveStale).not.toBeNull();

    // Query 2 — fires and answers first.
    typeQuery("acme");
    await settle();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Newer result")).toBeInTheDocument();

    // Query 1's answer lands late — it must be discarded, not rendered.
    await act(async () => {
      resolveStale?.({ data: stale, error: null });
    });
    expect(screen.getByText("Newer result")).toBeInTheDocument();
    expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
  });
});

describe("FindPalette — keyboard navigation", () => {
  async function openWithResults() {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const { client } = stubClient(() => ({ data: ROWS, error: null }));
    render(<FindPalette client={client} currentApp="e-office" onNavigate={onNavigate} />);
    pressShortcut();
    const input = typeQuery("acme");
    await settle();
    return { input, onNavigate };
  }

  it("moves with ArrowDown/ArrowUp and opens the active row with Enter", async () => {
    const { input, onNavigate } = await openWithResults();
    const options = screen.getAllByRole("option");

    // First row is active on arrival, and exposed via aria-activedescendant.
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    // Row 2 is an e-office task → same app → in-app (relative) navigation.
    expect(onNavigate).toHaveBeenCalledWith("/app/tasks/t1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("wraps ArrowUp from the first row to the last", async () => {
    const { input } = await openWithResults();
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
  });

  it("cycles groups with Tab and keeps focus inside the palette", async () => {
    const { input } = await openWithResults();
    // Groups: e-office (rows 0,1) then e-mteja (row 2).
    fireEvent.keyDown(input, { key: "Tab" });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Tab" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveFocus();
  });

  it("opens the clicked row", async () => {
    const { onNavigate } = await openWithResults();
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(onNavigate).toHaveBeenCalledWith("/app/engagements/e1");
  });

  it("announces the result count politely", async () => {
    await openWithResults();
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live.textContent).toBe("3 results in 2 apps");
  });
});
