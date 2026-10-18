"use strict";

/**
 * Delivery of validated enquiries. Configure one or more channels with
 * environment variables (see .env.example):
 *
 *   Email via Resend   RESEND_API_KEY, ENQUIRY_TO_EMAIL, ENQUIRY_FROM_EMAIL
 *   Webhook / CRM      ENQUIRY_WEBHOOK_URL (+ optional ENQUIRY_WEBHOOK_SECRET)
 *   Local file (dev)   ENQUIRY_STORE_FILE
 *
 * An enquiry counts as received when at least one configured channel accepts it.
 */

const fs = require("fs/promises");
const path = require("path");
const { escapeHtml } = require("./validate");

function configuredChannels(env) {
  const channels = [];
  if (env.RESEND_API_KEY && env.ENQUIRY_TO_EMAIL && env.ENQUIRY_FROM_EMAIL) channels.push("email");
  if (env.ENQUIRY_WEBHOOK_URL) channels.push("webhook");
  if (env.ENQUIRY_STORE_FILE) channels.push("file");
  return channels;
}

function textBody(e, meta) {
  return [
    "New Free Power Audit request: IJTEK Power Solutions website",
    "",
    `Name:           ${e.name}`,
    `Phone:          ${e.phone}`,
    `Email:          ${e.email || "(not provided)"}`,
    `Property type:  ${e.propertyTypeLabel}`,
    `Service:        ${e.serviceLabel}`,
    "",
    "Energy needs:",
    e.message || "(not provided)",
    "",
    `Reference: ${meta.id}`,
    `Received:  ${meta.receivedAt}`,
  ].join("\n");
}

function htmlBody(e, meta) {
  const row = (k, v) =>
    `<tr><td style="padding:8px 16px 8px 0;color:#5a6675;font:13px Arial,sans-serif;vertical-align:top">${k}</td>` +
    `<td style="padding:8px 0;color:#07111f;font:15px Arial,sans-serif">${v}</td></tr>`;
  const tel = e.phone.replace(/[^\d+]/g, "");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f7f2">
<div style="max-width:560px;margin:auto;background:#fff;border-top:3px solid #e9b949;padding:28px">
<h1 style="margin:0 0 20px;font:700 20px Arial,sans-serif;color:#07111f">New Free Power Audit request</h1>
<table role="presentation" style="border-collapse:collapse">
${row("Name", escapeHtml(e.name))}
${row("Phone", `<a href="tel:${escapeHtml(tel)}">${escapeHtml(e.phone)}</a>`)}
${row("Email", e.email ? `<a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a>` : "(not provided)")}
${row("Property type", escapeHtml(e.propertyTypeLabel))}
${row("Service", escapeHtml(e.serviceLabel))}
</table>
<h2 style="margin:24px 0 8px;font:700 14px Arial,sans-serif;color:#07111f">Energy needs</h2>
<p style="margin:0;white-space:pre-wrap;font:15px/1.6 Arial,sans-serif;color:#3a4553">${e.message ? escapeHtml(e.message) : "(not provided)"}</p>
<p style="margin:28px 0 0;font:12px Arial,sans-serif;color:#8b98a7">Reference ${escapeHtml(meta.id)} · ${escapeHtml(meta.receivedAt)}</p>
</div></body></html>`;
}

async function sendEmail(e, meta, env) {
  const body = {
    from: env.ENQUIRY_FROM_EMAIL,
    to: env.ENQUIRY_TO_EMAIL.split(",").map((s) => s.trim()).filter(Boolean),
    subject: `Free Power Audit request: ${e.serviceLabel} (${e.propertyTypeLabel})`,
    text: textBody(e, meta),
    html: htmlBody(e, meta),
  };
  if (e.email) body.reply_to = e.email;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`email provider responded ${res.status}`);
}

async function sendWebhook(e, meta, env) {
  const url = new URL(env.ENQUIRY_WEBHOOK_URL);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("webhook URL must use https");
  const headers = { "Content-Type": "application/json" };
  if (env.ENQUIRY_WEBHOOK_SECRET) headers.Authorization = `Bearer ${env.ENQUIRY_WEBHOOK_SECRET}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "free-power-audit-request", id: meta.id, receivedAt: meta.receivedAt, enquiry: e }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

async function storeFile(e, meta, env, root) {
  const file = path.resolve(root, env.ENQUIRY_STORE_FILE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify({ id: meta.id, receivedAt: meta.receivedAt, ...e }) + "\n", { mode: 0o600 });
}

async function deliverEnquiry(enquiry, meta, env, root) {
  const channels = configuredChannels(env);
  if (!channels.length) return { configured: false, delivered: false, results: [] };

  const handlers = { email: sendEmail, webhook: sendWebhook, file: storeFile };
  const results = await Promise.all(
    channels.map((name) =>
      handlers[name](enquiry, meta, env, root).then(
        () => ({ channel: name, ok: true }),
        (err) => ({ channel: name, ok: false, error: err.message })
      )
    )
  );
  return { configured: true, delivered: results.some((r) => r.ok), results };
}

module.exports = { deliverEnquiry, configuredChannels };
