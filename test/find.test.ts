import { describe, it, expect } from "vitest";
import {
  FIND_APP_BASE_URLS,
  findAppLabel,
  findDestination,
  findHighlight,
  groupFindResults,
  safeFindPath,
  toFindResults,
} from "../src/find";
import type { FindResult } from "../src/find";

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

describe("findDestination", () => {
  it("keeps same-app results relative so the in-app router handles them", () => {
    const d = findDestination(row({ app: "e-office", path: "/app/tasks/9" }), "e-office");
    expect(d).toEqual({ href: "/app/tasks/9", external: false });
  });

  it("joins cross-app results onto the app's production origin", () => {
    const d = findDestination(row({ app: "e-mteja", path: "/app/clients/1" }), "e-office");
    expect(d.external).toBe(true);
    expect(d.href).toBe("https://ssi-emteja.vercel.app/app/clients/1");
  });

  it("uses the brand-hub custom domain", () => {
    expect(FIND_APP_BASE_URLS["brand-hub"]).toBe("https://cards.subsaharacloud.com");
    const d = findDestination(row({ app: "brand-hub", path: "/cards/7" }), "e-office");
    expect(d.href).toBe("https://cards.subsaharacloud.com/cards/7");
  });

  it("honours a caller-supplied base-URL override", () => {
    const d = findDestination(row({ app: "e-mteja", path: "/x" }), "e-office", {
      ...FIND_APP_BASE_URLS,
      "e-mteja": "https://emteja-preview.vercel.app/",
    });
    expect(d.href).toBe("https://emteja-preview.vercel.app/x");
  });

  it("stays in-app for an app it has never heard of", () => {
    const d = findDestination(row({ app: "e-future", path: "/x" }), "e-office");
    expect(d).toEqual({ href: "/x", external: false });
  });

  it("refuses to turn a poisoned path into an off-origin redirect", () => {
    expect(safeFindPath("//evil.example/steal")).toBe("/");
    expect(safeFindPath("https://evil.example")).toBe("/");
    expect(safeFindPath("javascript:alert(1)")).toBe("/");
    expect(safeFindPath("/app/ok")).toBe("/app/ok");
    const d = findDestination(row({ app: "e-mteja", path: "//evil.example" }), "e-office");
    expect(d.href).toBe("https://ssi-emteja.vercel.app/");
  });
});

describe("groupFindResults", () => {
  it("groups by app in relevance order with a count and label per group", () => {
    const groups = groupFindResults([
      row({ app: "e-office", id: "a", title: "A" }),
      row({ app: "e-mteja", id: "b", title: "B" }),
      row({ app: "e-office", id: "c", title: "C" }),
    ]);
    expect(groups.map((g) => g.app)).toEqual(["e-office", "e-mteja"]);
    expect(groups[0].count).toBe(2);
    expect(groups[0].label).toBe("E-office");
    expect(groups[1].rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("labels an unknown app rather than dropping it", () => {
    expect(findAppLabel("e-future")).toBe("E-future");
    expect(groupFindResults([row({ app: "e-future" })])[0].label).toBe("E-future");
  });
});

describe("findHighlight", () => {
  it("marks the matched substring case-insensitively", () => {
    expect(findHighlight("Acme Ltd Tanzania", "acme")).toEqual([
      { text: "Acme", match: true },
      { text: " Ltd Tanzania", match: false },
    ]);
  });

  it("marks every whitespace-separated token", () => {
    const segs = findHighlight("Acme Ltd Tanzania", "ltd acme");
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(["Acme", "Ltd"]);
  });

  it("returns one unmatched segment when nothing matches", () => {
    expect(findHighlight("Acme Ltd", "zzz")).toEqual([{ text: "Acme Ltd", match: false }]);
    expect(findHighlight("Acme Ltd", "   ")).toEqual([{ text: "Acme Ltd", match: false }]);
  });
});

describe("toFindResults", () => {
  it("drops malformed rows instead of rendering them", () => {
    const out = toFindResults([
      { kind: "client", app: "e-mteja", id: "1", title: "Acme", subtitle: null, path: "/a", at: null },
      { kind: "client", app: "e-mteja", id: "2", path: "/b" }, // no title
      null,
      "nope",
      { title: "orphan", path: "/c" }, // no app
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Acme");
  });

  it("normalises a non-array payload to an empty list", () => {
    expect(toFindResults(null)).toEqual([]);
    expect(toFindResults({ rows: [] })).toEqual([]);
  });

  it("sanitises the path while normalising", () => {
    const out = toFindResults([{ app: "e-mteja", title: "x", path: "//evil.example" }]);
    expect(out[0].path).toBe("/");
  });
});
