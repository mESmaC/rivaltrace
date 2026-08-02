import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeTarget,
  diffSnapshots,
  fetchPageSnapshot,
  normalizeHtml,
  sha256,
} from "../lib/monitor.mjs";

test("canonicalizes safe HTTPS targets and removes fragments", () => {
  assert.equal(
    canonicalizeTarget("  https://Example.com:443/pricing?plan=team#faq  "),
    "https://example.com/pricing?plan=team",
  );
});

test("rejects unsafe or non-public target forms", () => {
  const targets = [
    "http://example.com",
    "https://localhost/page",
    "https://127.0.0.1/page",
    "https://10.2.3.4/page",
    "https://169.254.169.254/latest/meta-data",
    "https://user:pass@example.com/page",
    "https://example.com:8443/page",
    "https://[::1]/page",
    "https://127.0.0.1.nip.io/page",
    "https://localhost./page",
    "https://metadata.google.internal./latest/meta-data",
    "https://10.0.0.1.nip.io./page",
  ];
  for (const target of targets) {
    assert.throws(() => canonicalizeTarget(target), /HTTPS|Private|credentials|ports|IP-literal/i);
  }
});

test("normalizes visible HTML text while removing executable noise", () => {
  const normalized = normalizeHtml(`
    <!doctype html><html><head><title> Plans &amp; pricing </title>
    <style>.price{color:red}</style><script>window.secret = "ignore"</script></head>
    <body><main><h1>Team plan</h1><p>$39&nbsp;/ seat</p><!-- campaign id --></main></body></html>
  `);
  assert.equal(normalized.title, "Plans & pricing");
  assert.equal(normalized.text, "Team plan\n$39 / seat");
  assert.doesNotMatch(normalized.text, /window|campaign|color:red/);
});

test("uses stable SHA-256 evidence", async () => {
  assert.equal(
    await sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("produces bounded exact change evidence and pricing classification", () => {
  const diff = diffSnapshots(
    "Team plan\n$49 / seat / month\nEmail support",
    "Team plan\n$39 / seat / month, billed annually\nPriority support",
  );
  assert.equal(diff.changed, true);
  assert.equal(diff.kind, "pricing");
  assert.deepEqual(diff.removed, ["$49 / seat / month", "Email support"]);
  assert.deepEqual(diff.added, ["$39 / seat / month, billed annually", "Priority support"]);
  assert.match(diff.summary, /2 added and 2 removed/);
});

test("reports no change for byte-identical normalized text", () => {
  const diff = diffSnapshots("Same\nContent", "Same\nContent");
  assert.equal(diff.changed, false);
  assert.equal(diff.kind, "none");
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
});

test("reports an explicit evidence boundary when a long-page change falls past the diff window", () => {
  const shared = Array.from({ length: 600 }, (_, index) => `Shared block ${index}`).join("\n");
  const diff = diffSnapshots(`${shared}\nOld tail`, `${shared}\nNew tail`);
  assert.equal(diff.changed, true);
  assert.equal(diff.kind, "unclassified");
  assert.equal(diff.evidenceLimited, true);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
  assert.match(diff.summary, /outside the bounded evidence window/i);
});

test("follows only validated redirects and captures provenance", async () => {
  const calls = [];
  const mockFetch = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return new Response(null, { status: 302, headers: { location: "/plans" } });
    }
    return new Response("<title>Acme plans</title><main><h1>Starter</h1><p>$12 monthly</p></main>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
  const snapshot = await fetchPageSnapshot("https://acme.example/pricing", mockFetch);
  assert.deepEqual(calls, ["https://acme.example/pricing", "https://acme.example/plans"]);
  assert.equal(snapshot.sourceUrl, "https://acme.example/pricing");
  assert.equal(snapshot.finalUrl, "https://acme.example/plans");
  assert.equal(snapshot.pageTitle, "Acme plans");
  assert.equal(snapshot.normalizedText, "Starter\n$12 monthly");
  assert.equal(snapshot.contentHash.length, 64);
});

test("rejects non-HTML and oversized responses", async () => {
  await assert.rejects(
    fetchPageSnapshot("https://acme.example/data", async () =>
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    ),
    /HTML page/,
  );
  await assert.rejects(
    fetchPageSnapshot("https://acme.example/huge", async () =>
      new Response("small", {
        status: 200,
        headers: { "content-type": "text/html", "content-length": "1000001" },
      }),
    ),
    /larger than/,
  );
});
