/**
 * Header behaviour, scroll-spy and the mobile menu.
 */
(function () {
  "use strict";

  var header = document.querySelector("[data-header]");
  if (!header) return;

  var root = document.documentElement;
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-mobile-menu]");
  var toggleLabel = document.querySelector("[data-menu-label]");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link[data-spy]"));
  var themed = Array.prototype.slice.call(document.querySelectorAll("[data-header-theme]"));
  var spyTargets = navLinks
    .map(function (link) { return document.getElementById(link.getAttribute("data-spy")); })
    .filter(Boolean);
  var spySections = Array.prototype.slice.call(document.querySelectorAll("main > section[id]"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Header surface + theme ---------- */
  function updateHeader() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle("is-scrolled", y > 24);

    // Pick the innermost themed region under the middle of the header.
    var probe = header.offsetHeight / 2;
    var theme = "dark";
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) theme = themed[i].getAttribute("data-header-theme");
    }
    header.classList.toggle("is-light", theme === "light" && y > 24);
  }

  /* ---------- Scroll-spy ---------- */
  function updateSpy() {
    var line = window.innerHeight * 0.35;
    var current = null;
    for (var i = 0; i < spySections.length; i++) {
      if (spySections[i].getBoundingClientRect().top <= line) current = spySections[i];
    }
    var activeId = current && spyTargets.indexOf(current) !== -1 ? current.id : null;
    navLinks.forEach(function (link) {
      var on = link.getAttribute("data-spy") === activeId;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      updateSpy();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateHeader();
  updateSpy();

  /* ---------- Mobile menu ---------- */
  if (!toggle || !menu) return;

  var isOpen = false;
  var closeTimer = null;

  function focusables() {
    var inMenu = Array.prototype.slice.call(menu.querySelectorAll("a[href], button:not([disabled])"));
    var brand = header.querySelector(".brand");
    return [brand, toggle].concat(inMenu).filter(Boolean);
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    window.clearTimeout(closeTimer);
    menu.hidden = false;
    // Force a reflow so the opening transition runs.
    void menu.offsetWidth;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
    if (toggleLabel) toggleLabel.textContent = "Close menu";
    var first = menu.querySelector("a[href]");
    if (first) first.focus({ preventScroll: true });
    document.addEventListener("keydown", onKeydown);
  }

  function closeMenu(returnFocus) {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    if (toggleLabel) toggleLabel.textContent = "Open menu";
    document.removeEventListener("keydown", onKeydown);
    closeTimer = window.setTimeout(function () { menu.hidden = true; }, reduceMotion.matches ? 0 : 700);
    if (returnFocus) toggle.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
      return;
    }
    if (e.key !== "Tab") return;
    var items = focusables();
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener("click", function () {
    if (isOpen) closeMenu(false);
    else openMenu();
  });

  // Close when a destination is chosen; the link's default navigation still happens.
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a[href]")) closeMenu(false);
  });
  header.querySelector(".brand").addEventListener("click", function () { closeMenu(false); });

  var desktop = window.matchMedia("(min-width: 1024px)");
  function onBreakpoint(e) { if (e.matches) closeMenu(false); }
  if (desktop.addEventListener) desktop.addEventListener("change", onBreakpoint);
  else desktop.addListener(onBreakpoint);

  root.classList.add("nav-ready");
})();
