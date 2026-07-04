import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest with globals auto-cleans via RTL's afterEach hook when @testing-library/react
// detects the test globals, but we register it explicitly so the harness is robust
// regardless of auto-detection.
afterEach(() => {
  cleanup();
});
