"use strict";

/**
 * Server-side validation for Free Power Audit enquiries.
 * Never trust the browser: everything the client checks is checked again here.
 */

const PROPERTY_TYPES = {
  home: "Home",
  school: "School",
  "office-business": "Office or business",
  community: "Community",
  other: "Other",
};

const SERVICES = {
  "new-installation": "New installation",
  "system-diagnosis": "Existing system diagnosis",
  repairs: "Repairs",
  maintenance: "Maintenance",
  "free-power-audit": "Free power audit",
  "general-consultation": "General consultation",
  products: "Solar batteries & materials",
};

const MIN_FILL_TIME_MS = 2500;

// Strip control characters (keeping \n and \t in the multi-line message).
function clean(value, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  let v = value.normalize("NFC");
  v = multiline
    ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    : v.replace(/[\u0000-\u001F\u007F]+/g, " ");
  return v.trim();
}

function validateEnquiry(body) {
  const errors = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, spam: false, errors: { form: "Invalid request." } };
  }

  // Spam signals: honeypot filled, or submitted faster than a person could.
  const honeypot = typeof body.website === "string" && body.website.trim() !== "";
  const elapsed = Number(body.elapsedMs);
  const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FILL_TIME_MS;
  if (honeypot || tooFast) return { ok: false, spam: true, errors: {} };

  const name = clean(body.name).replace(/\s+/g, " ");
  const phone = clean(body.phone);
  const email = clean(body.email).toLowerCase();
  const propertyType = clean(body.propertyType);
  const service = clean(body.service);
  const message = clean(body.message, { multiline: true });

  if (!name) errors.name = "Please enter your full name.";
  else if (name.length < 2 || name.length > 100 || !/\p{L}/u.test(name)) errors.name = "Please enter a valid name.";

  const phoneDigits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Please enter a phone number so we can reach you.";
  else if (!/^[+\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (email && (email.length > 160 || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email))) {
    errors.email = "Please enter a valid email address, or leave this blank.";
  }

  if (!Object.prototype.hasOwnProperty.call(PROPERTY_TYPES, propertyType)) {
    errors.propertyType = "Please choose your property or facility type.";
  }
  if (!Object.prototype.hasOwnProperty.call(SERVICES, service)) {
    errors.service = "Please choose the service you need.";
  }
  if (message.length > 1500) errors.message = "Please keep your description under 1,500 characters.";

  if (Object.keys(errors).length) return { ok: false, spam: false, errors };

  return {
    ok: true,
    spam: false,
    errors: {},
    data: {
      name,
      phone,
      email,
      propertyType,
      propertyTypeLabel: PROPERTY_TYPES[propertyType],
      service,
      serviceLabel: SERVICES[service],
      message,
    },
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

module.exports = { validateEnquiry, escapeHtml, PROPERTY_TYPES, SERVICES, MIN_FILL_TIME_MS };
