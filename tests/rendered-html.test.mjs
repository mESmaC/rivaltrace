import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the RivalTrace commercial contract", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Competitor changes, with receipts · RivalTrace<\/title>/i);
  assert.match(html, /Know when a competitor changes the page that matters\./);
  assert.match(html, /exact website changes/i);
  assert.match(html, /Working product slice/);
  assert.match(html, /Capture baseline/);
  assert.match(html, /manual rechecks active/i);
  assert.match(html, /\$9/);
  assert.match(html, /Planned first paid tier/);
  assert.match(html, /A product from/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps claims and access boundaries explicit", async () => {
  const html = await (await render()).text();
  assert.match(html, /Public web pages only/);
  assert.match(html, /Billing is not connected in this private build/);
  assert.match(html, /automated scheduling and billing not yet connected/i);
  assert.match(html, /No login walls, private pages, or readiness claims/);
  assert.doesNotMatch(html, /guarantee|always accurate|real-time|fully automated|trusted by/i);
});

test("removes the disposable starter preview", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/_sites-preview/preview.css", import.meta.url)));
});
