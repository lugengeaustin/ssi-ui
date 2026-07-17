// Server-safe theme constants — NO "use client" directive, so a Next.js server
// root layout can import THEME_INIT_SCRIPT for its <head> without pulling a
// client-module binding into server code. theme.tsx (the client engine) imports
// the same constants, keeping one source of truth.

export const THEME_STORAGE_KEY = "ssi-theme";

/** Inline <head> script — sets data-theme from the cache before first paint. */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
