/**
 * Page set-up: verified contact details from js/config.js, service pre-selection,
 * lightweight scroll reveals and small utilities.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var config = window.IJTEK_CONFIG || {};
  var contact = config.contact || {};
  var social = config.social || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Helpers (exposed for other scripts) ---------- */
  function digits(value) { return String(value || "").replace(/[^\d]/g, ""); }

  function contactLinks() {
    var links = [];
    if (contact.phone) {
      links.push({ key: "phone", label: "Call", text: contact.phoneDisplay || contact.phone, href: "tel:+" + digits(contact.phone) });
    }
    if (contact.whatsapp) {
      var msg = encodeURIComponent("Hello IJTEK Power Solutions, I'd like to enquire about your solar and inverter services.");
      links.push({ key: "whatsapp", label: "WhatsApp", text: "Chat on WhatsApp", href: "https://wa.me/" + digits(contact.whatsapp) + "?text=" + msg, external: true });
    }
    if (contact.email) {
      links.push({ key: "email", label: "Email", text: contact.email, href: "mailto:" + contact.email + "?subject=" + encodeURIComponent("Enquiry: IJTEK Power Solutions") });
    }
    return links;
  }

  /* ---------- Preloader ---------- */
  // Shown on every page load (see the inline script in <head>). Other scripts call
  // IJTEK.afterPreloader(fn) so the hero entrance starts as the curtain lifts.
  var preloadQueue = [];
  var preloading = root.classList.contains("is-preloading");

  function flushPreloadQueue() {
    preloading = false;
    while (preloadQueue.length) preloadQueue.shift()();
  }

  function afterPreloader(fn) {
    if (preloading) preloadQueue.push(fn);
    else fn();
  }

  // Wordmark waits for its fonts so it never shifts from a fallback font.
  var markFontsReady = function () { root.classList.add("fonts-ready"); };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 1em "Manrope"'),
      document.fonts.load('500 1em "Space Grotesk"'),
    ]).then(markFontsReady, markFontsReady);
  } else {
    markFontsReady();
  }
  window.setTimeout(markFontsReady, 1200);

  if (preloading) {
    // Progress follows real loading: above-the-fold images and fonts, then the load event.
    var bar = document.querySelector("[data-preloader-bar]");
    var setProgress = function (p) { if (bar) bar.style.transform = "scaleX(" + p + ")"; };
    var tracked = Array.prototype.filter.call(document.images, function (img) {
      return img.loading !== "lazy" && !img.hasAttribute("data-src") && !img.closest(".preloader");
    });
    var total = tracked.length + 1;
    var done = 0;
    var step = function () {
      done += 1;
      setProgress(Math.min(0.9, 0.15 + 0.75 * (done / total)));
    };
    setProgress(0.15);
    tracked.forEach(function (img) {
      if (img.complete) step();
      else {
        img.addEventListener("load", step, { once: true });
        img.addEventListener("error", step, { once: true });
      }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(step, step);
    else step();

    var exitPreloader = function () {
      if (!preloading) return;
      root.classList.add("preloader-exit");
      root.classList.remove("is-preloading");
      flushPreloadQueue();
      window.setTimeout(function () { root.classList.remove("preloader-exit"); }, 1300);
    };
    var onLoaded = function () {
      setProgress(1);
      // Let the bar finish, and keep the mark up long enough to complete (~1.8s from navigation start).
      var elapsed = window.performance && performance.now ? performance.now() : 0;
      window.setTimeout(exitPreloader, Math.max(450, 1800 - elapsed));
    };
    if (document.readyState === "complete") onLoaded();
    else window.addEventListener("load", onLoaded);
    // Matches the 6s safety timer in <head>.
    window.setTimeout(exitPreloader, 6000);
  }

  window.IJTEK = { contactLinks: contactLinks, afterPreloader: afterPreloader };

  /* ---------- Year ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Verified contact details ---------- */
  var links = contactLinks();

  links.forEach(function (item) {
    var row = document.querySelector('[data-contact-item="' + item.key + '"]');
    var a = document.querySelector('[data-contact-link="' + item.key + '"]');
    if (!row || !a) return;
    a.href = item.href;
    a.textContent = item.key === "whatsapp" ? (contact.phoneDisplay && digits(contact.phone) === digits(contact.whatsapp) ? contact.phoneDisplay : "+" + digits(contact.whatsapp)) : item.text;
    row.hidden = false;
  });

  ["address", "serviceAreas", "hours"].forEach(function (key) {
    if (!contact[key]) return;
    var row = document.querySelector('[data-contact-item="' + key + '"]');
    var el = document.querySelector('[data-contact-text="' + key + '"]');
    if (!row || !el) return;
    el.textContent = contact[key];
    row.hidden = false;
  });

  var mapLink = document.querySelector("[data-contact-map]");
  if (mapLink && contact.address) {
    mapLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(contact.address);
    mapLink.hidden = false;
  }


  // Footer contact column
  var footerCol = document.querySelector("[data-footer-contact]");
  var footerList = document.querySelector("[data-footer-contact-list]");
  var footerSocial = document.querySelector("[data-footer-social]");
  if (footerCol && footerList) {
    links.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.key === "whatsapp" ? "WhatsApp" : item.text;
      if (item.external) { a.target = "_blank"; a.rel = "noopener"; }
      li.appendChild(a);
      footerList.appendChild(li);
    });
    if (contact.address) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = contact.address;
      li.appendChild(span);
      footerList.appendChild(li);
    }
    var socialNames = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X" };
    Object.keys(socialNames).forEach(function (key) {
      var url = social[key];
      if (!url || !/^https:\/\//i.test(url)) return;
      var sli = document.createElement("li");
      var sa = document.createElement("a");
      sa.href = url;
      sa.target = "_blank";
      sa.rel = "noopener";
      sa.textContent = socialNames[key];
      sli.appendChild(sa);
      footerSocial.appendChild(sli);
    });
    if (footerList.children.length || footerSocial.children.length) footerCol.hidden = false;
  }

  /* ---------- WhatsApp quote / enquiry buttons ---------- */
  // Links with data-whatsapp="<message>" open WhatsApp with that message.
  // Without a configured number they keep their fallback href (the quote form).
  if (contact.whatsapp) {
    Array.prototype.forEach.call(document.querySelectorAll("a[data-whatsapp]"), function (a) {
      a.href = "https://wa.me/" + digits(contact.whatsapp) + "?text=" + encodeURIComponent(a.getAttribute("data-whatsapp"));
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ---------- Service pre-selection ---------- */
  // Any link with data-service="<value>" pointing at the form selects that service.
  // Links from other pages can use index.html?service=<value>&product=<slug>#quote.
  var serviceSelect = document.getElementById("f-service");
  var PRODUCTS = {
    batteries: "solar batteries",
    panels: "solar panels",
    inverters: "inverters and charge controllers",
    mounting: "mounting structures",
    protection: "cables and protection devices",
  };
  if (serviceSelect && window.URLSearchParams) {
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("service");
    if (wanted && serviceSelect.querySelector('option[value="' + wanted.replace(/[^a-z-]/g, "") + '"]')) {
      serviceSelect.value = wanted;
    }
    var product = PRODUCTS[params.get("product")];
    var messageField = document.getElementById("f-message");
    if (product && messageField && !messageField.value) {
      messageField.value = "I'm interested in " + product + ". ";
      messageField.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-service]");
    if (!link || !serviceSelect) return;
    var value = link.getAttribute("data-service");
    var option = serviceSelect.querySelector('option[value="' + value + '"]');
    if (!option) return;
    serviceSelect.value = value;
    serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    var field = serviceSelect.closest(".field");
    if (field && !reduceMotion) {
      window.setTimeout(function () {
        field.classList.remove("is-highlight");
        void field.offsetWidth;
        field.classList.add("is-highlight");
      }, 650);
    }
  });

  /* ---------- Testimonials ---------- */
  // Rendered from IJTEK_CONFIG.testimonials. Only real, permitted feedback belongs there.
  (function () {
    var wrap = document.querySelector("[data-testimonials]");
    if (!wrap) return;
    var list = (config.testimonials || []).filter(function (t) { return t && t.quote && t.name; });
    if (!list.length) return;

    var viewport = wrap.querySelector("[data-t-viewport]");
    var controls = wrap.querySelector("[data-t-controls]");
    var count = wrap.querySelector("[data-t-count]");
    var section = wrap.closest("section");
    if (section) section.hidden = false;
    wrap.classList.add("has-items");

    var items = list.map(function (t, i) {
      var fig = document.createElement("figure");
      fig.className = "t-item" + (i === 0 ? " is-active" : "");
      if (i !== 0) fig.hidden = true;
      var bq = document.createElement("blockquote");
      bq.className = "t-item__quote";
      var p = document.createElement("p");
      p.textContent = t.quote;
      bq.appendChild(p);
      var cap = document.createElement("figcaption");
      cap.className = "t-item__cite";
      var name = document.createElement("span");
      name.className = "t-item__name";
      name.textContent = t.name;
      cap.appendChild(name);
      var meta = [t.detail, t.service].filter(Boolean).join(" · ");
      if (meta) {
        var m = document.createElement("span");
        m.className = "t-item__meta";
        m.textContent = meta;
        cap.appendChild(m);
      }
      fig.appendChild(bq);
      fig.appendChild(cap);
      viewport.appendChild(fig);
      return fig;
    });

    if (items.length < 2) return;
    controls.hidden = false;
    var index = 0;
    function go(n) {
      items[index].classList.remove("is-active");
      items[index].hidden = true;
      index = (n + items.length) % items.length;
      items[index].hidden = false;
      void items[index].offsetWidth;
      items[index].classList.add("is-active");
      count.textContent = String(index + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    }
    count.textContent = "01 / " + String(items.length).padStart(2, "0");
    wrap.querySelector("[data-t-prev]").addEventListener("click", function () { go(index - 1); });
    wrap.querySelector("[data-t-next]").addEventListener("click", function () { go(index + 1); });
  })();

  /* ---------- Scroll reveals ---------- */
  var revealables = document.querySelectorAll("[data-reveal], [data-reveal-stagger], [data-timeline]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("motion-ready");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Cross-page anchors ---------- */
  // Arriving from another page (e.g. products.html → index.html?service=products#quote):
  // re-apply the jump once images and fonts have settled, without smooth scrolling.
  if (window.location.hash.length > 1) {
    window.addEventListener("load", function () {
      var target = document.getElementById(window.location.hash.slice(1));
      if (!target) return;
      root.style.scrollBehavior = "auto";
      target.scrollIntoView();
      root.style.scrollBehavior = "";
    });
  }

  /* ---------- Hero fallback ---------- */
  // If GSAP failed to load, release the hero so the CSS entrance runs.
  if (!window.gsap) afterPreloader(function () { root.classList.remove("hero-pending"); });
})();
