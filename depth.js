// ===========================================================================
// depth.js — purely decorative visual-depth layer for The Long Box.
//
// This file never calls into, imports from, or is called by script.js/seo.js.
// It only reads the DOM that script.js has already rendered and layers on:
//   - a slow background parallax (via a CSS custom property; the idle drift
//     itself is a pure-CSS keyframe animation, not driven by JS)
//   - a scroll-reveal fade/rise for cards and panels
//   - a short fade+rise on #pageArea whenever script.js swaps in a new route,
//     so navigation reads as a transition rather than a hard cut
//
// Card hover lift/shadow effects are plain CSS (see style.css) and need no
// JS at all -- an earlier cursor-tracked tilt/glare version lived here and
// looked rough in practice, so it's been removed in favor of that simpler,
// reliably-smooth approach.
//
// It is safe to delete this file and its <script> tag entirely: nothing
// else on the site depends on it, and every effect it adds degrades to the
// site's normal flat-but-functional appearance without it.
// ===========================================================================
(function () {
  "use strict";

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var root = document.documentElement;

  // ---------------------------------------------------------------------
  // 1. Slow background parallax offset, fed into the CSS keyframe drift.
  //    Throttled to one write per frame.
  // ---------------------------------------------------------------------
  if (!reduceMotion) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || window.pageYOffset || 0;
        root.style.setProperty("--scroll-parallax", (y * 0.035).toFixed(2) + "px");
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------------------------------------------------------------------
  // 2. Scroll reveal: cards/panels fade + rise into place once visible.
  // ---------------------------------------------------------------------
  var REVEAL_SELECTOR = ".spine-card, .browse-card, .issue-card, .stat-block, .explore-hero, .toolbar, .about-box";
  var revealCounter = 0;
  var io = null;

  if (!reduceMotion && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  }

  function prepareReveal(el) {
    if (el.__depthRevealBound) return;
    el.__depthRevealBound = true;
    if (!io) return; // reduced motion or unsupported: leave fully visible
    el.classList.add("reveal-init");
    el.style.transitionDelay = (Math.min(revealCounter % 10, 10) * 30) + "ms";
    revealCounter++;
    // Wait two frames so the browser has actually painted the hidden
    // (opacity:0) state before we start observing -- otherwise elements
    // already in the viewport (e.g. above-the-fold content on load) get
    // marked in-view before that first paint happens, and the reveal
    // never becomes visible at all.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        io.observe(el);
      });
    });
  }

  // ---------------------------------------------------------------------
  // 3. Page-enter transition: whenever script.js replaces #pageArea's
  //    content wholesale for a new route, restart a short fade+rise on
  //    the container itself so navigation doesn't feel like a hard cut.
  // ---------------------------------------------------------------------
  function replayPageEnter(pageArea) {
    if (reduceMotion) return;
    pageArea.classList.remove("page-enter");
    // Force a reflow so removing/re-adding the class actually restarts
    // the CSS animation instead of being a no-op.
    void pageArea.offsetWidth;
    pageArea.classList.add("page-enter");
  }

  // ---------------------------------------------------------------------
  // 4. Watch #pageArea for content script.js renders/re-renders, and wire
  //    up any matching new elements. Read-only observation -- never
  //    mutates anything script.js manages.
  // ---------------------------------------------------------------------
  function wireUp(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches(REVEAL_SELECTOR)) prepareReveal(node);
    var revealMatches = node.querySelectorAll ? node.querySelectorAll(REVEAL_SELECTOR) : [];
    for (var j = 0; j < revealMatches.length; j++) prepareReveal(revealMatches[j]);
  }

  function init() {
    var pageArea = document.getElementById("pageArea");
    if (!pageArea) return;

    wireUp(pageArea);

    var observer = new MutationObserver(function (mutations) {
      var pageAreaSwapped = false;
      for (var m = 0; m < mutations.length; m++) {
        if (mutations[m].target === pageArea) pageAreaSwapped = true;
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) wireUp(added[n]);
      }
      if (pageAreaSwapped) replayPageEnter(pageArea);
    });
    observer.observe(pageArea, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();