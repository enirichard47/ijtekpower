/**
 * Hero image slideshow: a slow crossfade with a gentle zoom ("Ken Burns").
 * Auto-advances every 7 seconds, pausing while the tab is hidden or the hero
 * is off screen. With reduced motion it stays on the first image.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-hero-slides]");
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
  var hero = root.closest(".hero");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTERVAL = 7000;
  var FADE = 1600;

  var current = 0;
  var timer = null;
  var inView = true;
  var leaveTimer = null;
  var started = false;

  if (slides.length < 2 || reduceMotion) return;

  // Load the other slides only after the page has loaded, so the first image stays the priority.
  function loadSlide(slide) {
    var img = slide.querySelector("img[data-src]");
    if (!img) return;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
    img.removeAttribute("data-srcset");
  }
  function loadAll() { slides.forEach(loadSlide); }
  if (document.readyState === "complete") loadAll();
  else window.addEventListener("load", function () { window.setTimeout(loadAll, 300); });

  function show(index) {
    index = (index + slides.length) % slides.length;
    if (index === current) return;
    var prev = slides[current];
    var next = slides[index];
    loadSlide(next);

    window.clearTimeout(leaveTimer);
    slides.forEach(function (s) { s.classList.remove("is-prev"); });
    prev.classList.remove("is-active");
    prev.classList.add("is-prev");
    prev.setAttribute("aria-hidden", "true");
    next.classList.add("is-active");
    next.removeAttribute("aria-hidden");
    leaveTimer = window.setTimeout(function () { prev.classList.remove("is-prev"); }, FADE + 100);
    current = index;
  }

  function schedule() {
    window.clearInterval(timer);
    timer = null;
    if (!started || !inView || document.hidden) return;
    timer = window.setInterval(function () { show(current + 1); }, INTERVAL);
  }

  document.addEventListener("visibilitychange", schedule);
  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(hero);
  }

  // Start the clock once the preloader (if any) has lifted.
  var whenReady = (window.IJTEK && window.IJTEK.afterPreloader) || function (fn) { fn(); };
  whenReady(function () { started = true; schedule(); });
})();
