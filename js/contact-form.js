/**
 * Free Power Audit enquiry form.
 * Validates in the browser, submits JSON to the configured endpoint and only
 * reports success once the endpoint has confirmed it received the enquiry.
 * The server re-validates everything (see server/validate.js).
 */
(function () {
  "use strict";

  var form = document.querySelector("[data-audit-form]");
  if (!form) return;

  var config = (window.IJTEK_CONFIG && window.IJTEK_CONFIG.form) || {};
  var endpoint = (config.endpoint || "").trim();
  var submitBtn = form.querySelector("[data-submit]");
  var submitLabel = submitBtn.querySelector(".btn__label");
  var status = form.querySelector("[data-form-status]");
  var success = document.querySelector("[data-form-success]");
  var resetBtn = document.querySelector("[data-form-reset]");
  var counter = form.querySelector("[data-char-count]");
  var loadedAt = Date.now();
  var attempted = false;
  var sending = false;

  var PROPERTY = ["home", "school", "office-business", "community", "other"];
  var SERVICES = ["new-installation", "system-diagnosis", "repairs", "maintenance", "free-power-audit", "general-consultation", "products"];

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
    propertyType: function (v) { return PROPERTY.indexOf(v) === -1 ? "Please choose your property or facility type." : ""; },
    service: function (v) { return SERVICES.indexOf(v) === -1 ? "Please choose the service you need." : ""; },
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

  var message = fieldEl("message");
  if (message && counter) {
    message.addEventListener("input", function () { counter.textContent = String(message.value.length); });
  }

  /* ---------- Status messages ---------- */
  function fallbackContacts() {
    var links = (window.IJTEK && window.IJTEK.contactLinks) ? window.IJTEK.contactLinks() : [];
    if (!links.length) return null;
    var ul = document.createElement("ul");
    links.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label + (item.key === "whatsapp" ? "" : ": " + item.text);
      if (item.external) { a.target = "_blank"; a.rel = "noopener"; }
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  function showError(text, withContacts) {
    status.hidden = false;
    status.className = "form-status is-error";
    status.textContent = "";
    var p = document.createElement("p");
    p.textContent = text;
    status.appendChild(p);
    if (withContacts) {
      var list = fallbackContacts();
      if (list) {
        var lead = document.createElement("p");
        lead.textContent = "You can also reach us directly:";
        status.appendChild(lead);
        status.appendChild(list);
      }
    }
  }

  function clearStatus() {
    status.hidden = true;
    status.textContent = "";
    status.className = "form-status";
  }

  function setLoading(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.setAttribute("aria-busy", on ? "true" : "false");
    submitLabel.textContent = on ? "Sending your request…" : "Request My Free Power Audit";
  }

  function showSuccess() {
    form.reset();
    if (counter) counter.textContent = "0";
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    attempted = true;
    clearStatus();

    var firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!endpoint) {
      showError("Online requests aren't available just yet. Please try again later.", true);
      return;
    }

    var payload = {
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      propertyType: value("propertyType"),
      service: value("service"),
      message: value("message"),
      website: fieldEl("website") ? fieldEl("website").value : "",
      elapsedMs: Date.now() - loadedAt,
    };

    var controller = "AbortController" in window ? new AbortController() : null;
    var timeout = window.setTimeout(function () { if (controller) controller.abort(); }, 20000);
    setLoading(true);

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (result) {
        var res = result.res;
        var data = result.data || {};

        if (res.ok && data.ok !== false) {
          showSuccess();
          return;
        }
        if (res.status === 422 && data.errors) {
          var first = null;
          Object.keys(data.errors).forEach(function (name) {
            if (rules[name]) {
              setError(name, data.errors[name]);
              if (!first) first = fieldEl(name);
            }
          });
          showError("Please check the highlighted fields and try again.", false);
          if (first) first.focus();
          return;
        }
        if (res.status === 429) {
          showError("We've received several requests from your connection. Please wait a few minutes and try again.", true);
          return;
        }
        if (res.status === 503) {
          showError("Online requests aren't available just yet. Your details have not been sent.", true);
          return;
        }
        showError("Sorry, something went wrong and your request was not sent. Please try again.", true);
      })
      .catch(function () {
        showError("We couldn't reach our server, so your request was not sent. Please check your connection and try again.", true);
      })
      .then(function () {
        window.clearTimeout(timeout);
        setLoading(false);
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      success.hidden = true;
      form.hidden = false;
      attempted = false;
      loadedAt = Date.now();
      Object.keys(rules).forEach(function (name) { setError(name, ""); });
      fieldEl("name").focus();
    });
  }
})();
