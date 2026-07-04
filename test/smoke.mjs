// Live smoke check for the SSI suite. Hits each deployed app's login (or home)
// and asserts it returns 200 and serves real branded markup — not an error page.
// Catches deploy/runtime regressions across all apps in one command:
//   node test/smoke.mjs
// This is an ops tool (kept in test/, excluded from the published tarball).

const TARGETS = [
  { name: "e-mteja", url: "https://ssi-emteja.vercel.app/login" },
  { name: "e-proposals", url: "https://ssi-eproposals.vercel.app/login" },
  { name: "e-office", url: "https://ssi-eoffice.vercel.app/login" },
  { name: "e-console", url: "https://ssi-econsole.vercel.app/login" },
  { name: "learn360", url: "https://ssi-learn360.vercel.app/login" },
  { name: "e-research", url: "https://ssi-eresearch.vercel.app/login" },
  { name: "cms", url: "https://ssi-cms.vercel.app/login" },
  { name: "sahara-cloud", url: "https://sahara-cloud.vercel.app/login" },
  { name: "dataviz", url: "https://e-analytics.subsaharacloud.com/" },
];

// Every SSI app renders the brand name somewhere in the shell — a cheap,
// stable signal that the page actually rendered rather than 200-ing an error.
const EXPECT = /Sub-?Sahara/i;
const TIMEOUT_MS = 25_000;

async function check({ name, url }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    const body = await res.text();
    const ok = res.status === 200 && EXPECT.test(body);
    return {
      name,
      url,
      status: res.status,
      branded: EXPECT.test(body),
      ok,
    };
  } catch (err) {
    return { name, url, status: 0, branded: false, ok: false, error: String(err) };
  } finally {
    clearTimeout(t);
  }
}

const results = await Promise.all(TARGETS.map(check));
let failed = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) failed++;
  const detail = r.error
    ? ` (${r.error})`
    : ` status=${r.status} branded=${r.branded}`;
  console.log(`${mark}  ${r.name.padEnd(14)} ${r.url}${detail}`);
}

console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
