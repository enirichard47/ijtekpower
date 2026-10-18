"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createServer, resolveStatic } = require("../server");
const { validateEnquiry } = require("../server/validate");

const valid = {
  name: "Ada Okafor",
  phone: "0801 234 5678",
  email: "ada@example.com",
  propertyType: "home",
  service: "free-power-audit",
  message: "Inverter not holding charge.",
  website: "",
  elapsedMs: 15000,
};

/* ---------- Validation ---------- */
test("accepts a valid enquiry and labels choices", () => {
  const r = validateEnquiry(valid);
  assert.equal(r.ok, true);
  assert.equal(r.data.serviceLabel, "Free power audit");
  assert.equal(r.data.propertyTypeLabel, "Home");
});

test("accepts the products service", () => {
  assert.equal(validateEnquiry({ ...valid, service: "products" }).ok, true);
});

test("email and message are optional", () => {
  const r = validateEnquiry({ ...valid, email: "", message: "" });
  assert.equal(r.ok, true);
});

test("reports field errors", () => {
  const r = validateEnquiry({ ...valid, name: "", phone: "abc", email: "nope", propertyType: "castle", service: "x", message: "a".repeat(1501) });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "message", "name", "phone", "propertyType", "service"]);
});

test("flags honeypot and too-fast submissions as spam", () => {
  assert.equal(validateEnquiry({ ...valid, website: "http://spam" }).spam, true);
  assert.equal(validateEnquiry({ ...valid, elapsedMs: 300 }).spam, true);
  assert.equal(validateEnquiry({ ...valid, elapsedMs: undefined }).spam, true);
});

test("strips control characters and newlines from single-line fields", () => {
  const r = validateEnquiry({ ...valid, name: "Ada\r\nBcc: x@y.z" });
  assert.equal(r.ok, true);
  assert.ok(!/[\r\n]/.test(r.data.name));
});

test("rejects non-object bodies", () => {
  assert.equal(validateEnquiry(null).ok, false);
  assert.equal(validateEnquiry([1]).ok, false);
});

/* ---------- Static path safety ---------- */
test("only public files are served", () => {
  assert.ok(resolveStatic("/").endsWith("index.html"));
  assert.ok(resolveStatic("/privacy").endsWith("privacy.html"));
  assert.ok(resolveStatic("/products").endsWith("products.html"));
  assert.ok(resolveStatic("/css/style.css"));
  assert.equal(resolveStatic("/server.js"), null);
  assert.equal(resolveStatic("/package.json"), null);
  assert.equal(resolveStatic("/.env"), null);
  assert.equal(resolveStatic("/server/validate.js"), null);
  assert.equal(resolveStatic("/../secret"), null);
  assert.equal(resolveStatic("/%2e%2e/%2e%2e/windows/win.ini"), null);
  assert.equal(resolveStatic("/data/enquiries.jsonl"), null);
});

/* ---------- HTTP ---------- */
function listen(env) {
  return new Promise((resolve) => {
    const server = createServer(env);
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}
const post = (base, body, headers = {}) =>
  fetch(`${base}/api/enquiry`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

let tmp, storeFile, unconfigured, configured;
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ijtek-"));
  storeFile = path.join(tmp, "enquiries.jsonl");
  unconfigured = await listen({ RATE_LIMIT_MAX: "100" });
  configured = await listen({ ENQUIRY_STORE_FILE: storeFile, RATE_LIMIT_MAX: "3" });
});
after(() => {
  unconfigured.server.close();
  configured.server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("serves the home page with security headers and a hashed inline script", async () => {
  const res = await fetch(`${unconfigured.base}/`);
  assert.equal(res.status, 200);
  const csp = res.headers.get("content-security-policy");
  assert.match(csp, /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(await res.text(), /Powering a Brighter/);
});

test("unknown paths return the 404 page", async () => {
  const res = await fetch(`${unconfigured.base}/nope`);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /isn't available/);
});

test("never reports success when no delivery channel is configured", async () => {
  const res = await post(unconfigured.base, valid);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, false);
});

test("returns field errors as 422", async () => {
  const res = await post(unconfigured.base, { ...valid, phone: "" });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).errors.phone);
});

test("rejects cross-origin and non-JSON submissions", async () => {
  assert.equal((await post(unconfigured.base, valid, { Origin: "https://evil.example" })).status, 403);
  const res = await fetch(`${unconfigured.base}/api/enquiry`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
  assert.equal(res.status, 415);
});

test("delivers a valid enquiry, discards spam, then rate-limits", async () => {
  const ok = await post(configured.base, valid);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);

  const spam = await post(configured.base, { ...valid, website: "x" });
  assert.equal(spam.status, 200);

  const lines = fs.readFileSync(storeFile, "utf8").trim().split("\n");
  assert.equal(lines.length, 1, "spam must not be stored");
  assert.equal(JSON.parse(lines[0]).name, "Ada Okafor");

  await post(configured.base, valid);
  const limited = await post(configured.base, valid);
  assert.equal(limited.status, 429);
});
