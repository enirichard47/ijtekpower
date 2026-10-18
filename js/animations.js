/**
 * GSAP choreography: hero entrance, process timeline and a gentle parallax.
 * Everything here is progressive enhancement. The page is complete without it.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var gsap = window.gsap;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!gsap || reduceMotion) {
    if (window.IJTEK && window.IJTEK.afterPreloader) window.IJTEK.afterPreloader(function () { root.classList.remove("hero-pending"); });
    else root.classList.remove("hero-pending");
    return;
  }

  var ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Hero entrance ---------- */
  var whenReady = (window.IJTEK && window.IJTEK.afterPreloader) || function (fn) { fn(); };
  whenReady(playHero);

  function playHero() {
    // Only run if the safety timer hasn't already revealed the hero.
    if (!root.classList.contains("hero-pending")) return;
    root.classList.add("hero-gsap");

    var eyebrow = document.querySelector('[data-hero="eyebrow"]');
    var lines = gsap.utils.toArray(".hero__title .line__inner");
    var lead = document.querySelector('[data-hero="lead"]');
    var actions = gsap.utils.toArray('[data-hero="actions"] > *');
    var small = window.matchMedia("(max-width: 767px)").matches;

    // Match the CSS "before" state exactly, then hand over to GSAP.
    // y: 0 stops GSAP inheriting the CSS offset as pixels and stacking it on top of yPercent.
    gsap.set(lines, { y: 0, yPercent: 140 });
    gsap.set([eyebrow, lead].concat(actions), { opacity: 0, y: 20 });
    gsap.set('[data-hero="actions"]', { opacity: 1, y: 0 });
    root.classList.remove("hero-pending");

    // Order: eyebrow → headline lines → (divider, via CSS) → intro → buttons.
    var tl = gsap.timeline({
      delay: 0.15,
      defaults: { ease: "power4.out" },
      onComplete: function () {
        gsap.set([eyebrow, lead].concat(actions, lines), { clearProps: "transform,opacity" });
      },
    });

    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.9 }, 0)
      .to(lines, { yPercent: 0, duration: 1.2, stagger: 0.12 }, 0.1)
      .to(lead, { opacity: 1, y: 0, duration: 1 }, 0.62)
      .to(actions, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.78);

    if (small) tl.timeScale(1.15);
  }

  /* ---------- Hero pointer parallax (desktop mouse only) ---------- */
  var heroEl = document.querySelector(".hero");
  var heroMedia = document.querySelector("[data-hero-media]");
  if (heroEl && heroMedia && window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) {
    var xTo = gsap.quickTo(heroMedia, "x", { duration: 1.4, ease: "power3.out" });
    var yTo = gsap.quickTo(heroMedia, "y", { duration: 1.4, ease: "power3.out" });
    heroEl.addEventListener("pointermove", function (e) {
      var r = heroEl.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width - 0.5) * -28);
      yTo(((e.clientY - r.top) / r.height - 0.5) * -18);
    });
    heroEl.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
  }

  if (!ScrollTrigger) return;
  root.classList.add("has-scrolltrigger");

  var mm = gsap.matchMedia();

  /* ---------- Hero image drift ---------- */
  gsap.to(".hero__slides", {
    yPercent: 8,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* ---------- Brand story parallax ---------- */
  gsap.fromTo("[data-parallax] img",
    { yPercent: -6 },
    {
      yPercent: 6,
      ease: "none",
      scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: true },
    });

  /* ---------- Process timeline ---------- */
  var timeline = document.querySelector("[data-timeline]");
  var progress = document.querySelector("[data-timeline-progress]");
  var steps = gsap.utils.toArray("[data-step]");
  if (timeline && progress && steps.length) {
    var rail = timeline.querySelector(".timeline__rail");
    var thresholds = [];

    function measure(horizontal) {
      var r = rail.getBoundingClientRect();
      thresholds = steps.map(function (step) {
        var n = step.querySelector(".step__node").getBoundingClientRect();
        return horizontal
          ? (n.left + n.width / 2 - r.left) / r.width
          : (n.top + n.height / 2 - r.top) / r.height;
      });
    }

    function setActive(p) {
      steps.forEach(function (step, i) {
        step.classList.toggle("is-active", p >= thresholds[i] - 0.02);
      });
    }

    function build(horizontal) {
      var prop = horizontal ? "scaleX" : "scaleY";
      var from = {}; from[prop] = 0;
      var to = { ease: "none" }; to[prop] = 1;
      to.scrollTrigger = {
        trigger: timeline,
        start: horizontal ? "top 70%" : "top 65%",
        end: horizontal ? "bottom 45%" : "bottom 55%",
        scrub: 0.6,
        onRefresh: function () { measure(horizontal); },
        onUpdate: function (self) { setActive(self.progress); },
      };
      gsap.set(progress, horizontal ? { scaleY: 1 } : { scaleX: 1 });
      gsap.fromTo(progress, from, to);
      return function () { steps.forEach(function (s) { s.classList.remove("is-active"); }); };
    }

    mm.add("(min-width: 1024px)", function () { return build(true); });
    mm.add("(max-width: 1023px)", function () { return build(false); });
  }

  // Images loading late can shift layout; keep trigger positions accurate.
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
