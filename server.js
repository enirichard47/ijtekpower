"use strict";

/**
 * IJTEK Power Solutions — production web server (no dependencies, Node 18+).
 *
 *   • Serves the static website with security headers, compression and caching.
 *   • POST /api/enquiry validates Free Power Audit requests and delivers them
 *     through the channels configured in the environment (see server/deliver.js).
 *
 * Run:  node server.js        (reads .env if present)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { validateEnquiry } = require("./server/validate");
const { deliverEnquiry, configuredChannels } = require("./server/deliver");

const ROOT = __dirname;

/* ---------- .env loader (simple KEY=VALUE lines) ---------- */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

/* ---------- Static file rules ---------- */
const PUBLIC_DIRS = ["css", "js", "assets"];
const PUBLIC_FILES = new Set(["index.html", "products.html", "privacy.html", "404.html", "favicon.svg", "robots.txt", "sitemap.xml"]);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml"]);

function isPublic(rel) {
  const parts = rel.split("/");
  if (parts.some((p) => !p || p.startsWith("."))) return false;
  if (parts.length === 1) return PUBLIC_FILES.has(parts[0]);
  return PUBLIC_DIRS.includes(parts[0]);
}

function resolveStatic(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  rel = path.posix.normalize(rel).replace(/^\/+/, "");
  if (rel === "" || rel === ".") rel = "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  if (rel.startsWith("..")) return null;
  if (!path.posix.extname(rel) && isPublic(rel + ".html")) rel += ".html"; // clean URLs: /privacy
  if (!isPublic(rel)) return null;
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

/* ---------- Security headers ---------- */
const inlineHashCache = new Map();
function inlineScriptHashes(abs, html, mtime) {
  const cached = inlineHashCache.get(abs);
  if (cached && cached.mtime === mtime) return cached.hashes;
  const hashes = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) hashes.push(`'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`);
  inlineHashCache.set(abs, { mtime, hashes });
  return hashes;
}

function securityHeaders(env, extraScript = []) {
  const prod = env.NODE_ENV === "production";
  const connect = ["'self'"].concat((env.CSP_CONNECT_SRC || "").split(/\s+/).filter(Boolean));
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${extraScript.join(" ")}`.trim(),
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "media-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (prod) csp.push("upgrade-insecure-requests");
  const h = {
    "Content-Security-Policy": csp.join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (prod) h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return h;
}

/* ---------- Static serving ---------- */
const gzipCache = new Map();

function cacheControl(ext) {
  if ([".webp", ".avif", ".jpg", ".jpeg", ".png", ".mp4", ".webm", ".woff2", ".ico"].includes(ext)) return "public, max-age=2592000";
  if (ext === ".svg") return "public, max-age=604800";
  return "no-cache"; // HTML, CSS, JS: always revalidate (cheap 304s via ETag)
}

function serveFile(req, res, abs, env, status = 200) {
  fs.stat(abs, (err, stat) => {
    if (err || !stat.isFile()) return notFound(req, res, env);
    const ext = path.extname(abs).toLowerCase();
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": status === 200 ? cacheControl(ext) : "no-store",
      ETag: etag,
      Vary: "Accept-Encoding",
    };

    if (ext === ".html") {
      const html = fs.readFileSync(abs, "utf8");
      Object.assign(headers, securityHeaders(env, inlineScriptHashes(abs, html, stat.mtimeMs)));
    } else {
      Object.assign(headers, securityHeaders(env));
    }

    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }

    const wantsGzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    if (wantsGzip) {
      const key = `${abs}:${stat.mtimeMs}`;
      let buf = gzipCache.get(key);
      if (!buf) {
        buf = zlib.gzipSync(fs.readFileSync(abs), { level: 9 });
        gzipCache.set(key, buf);
      }
      headers["Content-Encoding"] = "gzip";
      headers["Content-Length"] = buf.length;
      res.writeHead(status, headers);
      return res.end(req.method === "HEAD" ? undefined : buf);
    }

    headers["Content-Length"] = stat.size;
    res.writeHead(status, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(abs).pipe(res);
  });
}

function notFound(req, res, env) {
  const page = path.join(ROOT, "404.html");
  if (fs.existsSync(page)) return serveFile(req, res, page, env, 404);
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

/* ---------- API helpers ---------- */
function sendJson(res, status, body, env, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    ...securityHeaders(env),
    ...extra,
  });
  res.end(payload);
}

function readJsonBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"));
      } catch {
        reject(Object.assign(new Error("bad json"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req, env) {
  if (env.TRUST_PROXY === "true") {
    const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || "unknown";
}

function sameOrigin(req, env) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients; other protections still apply
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/* ---------- App ---------- */
function createServer(env = process.env) {
  const RATE_LIMIT = Number(env.RATE_LIMIT_MAX || 5);
  const RATE_WINDOW = Number(env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const hits = new Map();

  function rateLimited(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > RATE_LIMIT;
  }
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of hits) if (!times.some((t) => now - t < RATE_WINDOW)) hits.delete(ip);
  }, 60 * 1000);
  sweep.unref();

  async function handleEnquiry(req, res) {
    if (!sameOrigin(req, env)) return sendJson(res, 403, { ok: false, error: "forbidden" }, env);
    if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) {
      return sendJson(res, 415, { ok: false, error: "unsupported_media_type" }, env);
    }
    if (rateLimited(clientIp(req, env))) {
      return sendJson(res, 429, { ok: false, error: "rate_limited" }, env, { "Retry-After": String(Math.ceil(RATE_WINDOW / 1000)) });
    }

    let body;
    try {
      body = await readJsonBody(req, 16 * 1024);
    } catch (err) {
      return sendJson(res, err.status || 400, { ok: false, error: "invalid_body" }, env);
    }

    const result = validateEnquiry(body);
    if (result.spam) {
      // Quietly accept so bots learn nothing; nothing is delivered.
      console.info("[enquiry] discarded (spam signals)");
      return sendJson(res, 200, { ok: true }, env);
    }
    if (!result.ok) return sendJson(res, 422, { ok: false, error: "validation", errors: result.errors }, env);

    const meta = { id: crypto.randomUUID(), receivedAt: new Date().toISOString() };
    let outcome;
    try {
      outcome = await deliverEnquiry(result.data, meta, env, ROOT);
    } catch (err) {
      console.error(`[enquiry] ${meta.id} delivery error: ${err.message}`);
      return sendJson(res, 502, { ok: false, error: "delivery_failed" }, env);
    }

    if (!outcome.configured) {
      console.warn("[enquiry] received but no delivery channel is configured (see README)");
      return sendJson(res, 503, { ok: false, error: "not_configured" }, env);
    }
    for (const r of outcome.results) {
      if (!r.ok) console.error(`[enquiry] ${meta.id} ${r.channel} failed: ${r.error}`);
    }
    if (!outcome.delivered) return sendJson(res, 502, { ok: false, error: "delivery_failed" }, env);

    console.info(`[enquiry] ${meta.id} delivered via ${outcome.results.filter((r) => r.ok).map((r) => r.channel).join(", ")}`);
    return sendJson(res, 200, { ok: true, id: meta.id }, env);
  }

  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/enquiry") {
      if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method_not_allowed" }, env, { Allow: "POST" });
      return void handleEnquiry(req, res).catch((err) => {
        console.error(`[enquiry] unexpected error: ${err.message}`);
        if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" }, env);
      });
    }

    if (url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, enquiryDelivery: configuredChannels(env).length ? "configured" : "not-configured" }, env);
    }

    if (url.pathname.startsWith("/api/")) return sendJson(res, 404, { ok: false, error: "not_found" }, env);

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }

    const abs = resolveStatic(url.pathname);
    if (!abs) return notFound(req, res, env);
    serveFile(req, res, abs, env);
  });
}

module.exports = { createServer, resolveStatic };

if (require.main === module) {
  loadEnvFile(path.join(ROOT, ".env"));
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || "127.0.0.1";
  createServer(process.env).listen(port, host, () => {
    const channels = configuredChannels(process.env);
    console.log(`IJTEK Power Solutions running at http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
    console.log(channels.length
      ? `Enquiry delivery: ${channels.join(", ")}`
      : "Enquiry delivery: NOT CONFIGURED. Form submissions will be refused (see README).");
  });
}
