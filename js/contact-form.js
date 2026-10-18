/**
 * Quote request form → WhatsApp.
 * Validates the details, then opens WhatsApp (app or web) with a pre-written
 * message addressed to the number in js/config.js. The customer taps Send.
 */
(function () {
  "use strict";

  var form = document.querySelector("[data-audit-form]");
  if (!form) return;

  var contact = (window.IJTEK_CONFIG && window.IJTEK_CONFIG.contact) || {};
  var waNumber = String(contact.whatsapp || "").replace(/\D/g, "");
  var submitBtn = form.querySelector("[data-submit]");
  var status = form.querySelector("[data-form-status]");
  var success = document.querySelector("[data-form-success]");
  var resetBtn = document.querySelector("[data-form-reset]");
  var retryLink = document.querySelector("[data-wa-retry]");
  var counter = form.querySelector("[data-char-count]");
  var attempted = false;

  var PROPERTY = {
    home: "Home",
    school: "School",
    "office-business": "Office or business",
    community: "Community",
    other: "Other",
  };
  var SERVICES = {
    "new-installation": "New installation",
    "system-diagnosis": "Existing system diagnosis",
    repairs: "Repairs",
    maintenance: "Maintenance",
    "general-enquiry": "General enquiry",
    products: "Solar batteries & materials",
  };

  var rules = {
    name: function (v) {
      if (!v) return "Please enter your full name.";
      if (v.length < 2) return "Please enter at least 2 characters.";
      if (v.length > 100) return "Please keep your name under 100 characters.";
      if (!/\p{L}/u.test(v)) return "Please enter a valid name.";
      return "";
    },
    phone: function (v) {
      if (!v) return "Please enter a phone number so we can reach you.";
      var d = v.replace(/\D/g, "");
      if (!/^[+\d\s().-]+$/.test(v) || d.length < 7 || d.length > 15) return "Please enter a valid phone number, e.g. 0801 234 5678 or +234 801 234 5678.";
      return "";
    },
    email: function (v) {
      if (!v) return "";
      if (v.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Please enter a valid email address, or leave this blank.";
      return "";
    },
    propertyType: function (v) { return PROPERTY[v] ? "" : "Please choose your property or facility type."; },
    service: function (v) { return SERVICES[v] ? "" : "Please choose the service you need."; },
    message: function (v) { return v.length > 1500 ? "Please keep your description under 1,500 characters." : ""; },
  };

  function fieldEl(name) { return form.elements.namedItem(name); }
  function value(name) { var el = fieldEl(name); return el ? String(el.value || "").trim() : ""; }

  function setError(name, message) {
    var el = fieldEl(name);
    var err = form.querySelector('[data-error-for="' + name + '"]');
    if (!el || !err) return;
    err.textContent = message || "";
    el.closest(".field").classList.toggle("has-error", !!message);
    if (message) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  }

  function validateField(name) {
    var message = rules[name](value(name));
    setError(name, message);
    return !message;
  }

  function validateAll() {
    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(name) && !firstInvalid) firstInvalid = fieldEl(name);
    });
    return firstInvalid;
  }

  // Live feedback: after a field is left once (or after a submit attempt), re-check as the visitor types.
  Object.keys(rules).forEach(function (name) {
    var el = fieldEl(name);
    if (!el) return;
    var touched = false;
    el.addEventListener("blur", function () {
      if (value(name) || attempted) { touched = true; validateField(name); }
    });
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () {
      if (touched || attempted) validateField(name);
    });
  });

  var messageField = fieldEl("message");
  if (messageField && counter) {
    messageField.addEventListener("input", function () { counter.textContent = String(messageField.value.length); });
  }

  function showError(text) {
    status.hidden = false;
    status.className = "form-status is-error";
    status.textContent = text;
  }

  function clearStatus() {
    status.hidden = true;
    status.textContent = "";
    status.className = "form-status";
  }

  function buildMessage() {
    var lines = [
      "Hello IJTEK Power Solutions, I'd like to request a quote.",
      "",
      "Name: " + value("name"),
      "Phone: " + value("phone"),
    ];
    if (value("email")) lines.push("Email: " + value("email"));
    lines.push("Property type: " + PROPERTY[value("propertyType")]);
    lines.push("Service required: " + SERVICES[value("service")]);
    if (value("message")) lines.push("", "Details: " + value("message"));
    return lines.join("\n");
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    clearStatus();

    var firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!waNumber) {
      showError("Sorry, WhatsApp requests aren't available just yet. Please try again later.");
      return;
    }

    var url = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(buildMessage());
    // Opening inside the submit handler counts as a user action, so pop-up blockers allow it.
    // ("noopener" would make window.open return null, so detach the opener manually.)
    var win = window.open(url, "_blank");
    if (win) win.opener = null;
    if (retryLink) retryLink.href = url;

    form.reset();
    if (counter) counter.textContent = "0";
    form.hidden = true;
    success.hidden = false;
    success.focus();

    // If a new tab couldn't be opened, continue in this tab instead.
    if (!win) window.location.href = url;
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      success.hidden = true;
      form.hidden = false;
      attempted = false;
      Object.keys(rules).forEach(function (name) { setError(name, ""); });
      fieldEl("name").focus();
    });
  }

  // Keep the submit button label in sync with what it actually does.
  if (submitBtn) submitBtn.setAttribute("aria-describedby", "form-wa-note");
})();
