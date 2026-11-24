// Forward Fitness site: nav, hero set card, chart draw.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Nav background once scrolled
  var navbar = document.getElementById("navbar");
  function onScroll() { if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.getElementById("navtoggle");
  var links = document.getElementById("navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      navbar.classList.toggle("menu", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) { links.classList.remove("open"); navbar.classList.remove("menu"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  // Hero card: today's set climbs past last time, then the PR badge lands
  var card = document.getElementById("setcard");
  var setnum = document.getElementById("setnum");
  if (card && setnum) {
    if (reduce) { setnum.textContent = "195"; card.classList.add("hit"); }
    else {
      var v = 185;
      setTimeout(function step() {
        v += 1; setnum.textContent = v;
        if (v < 195) setTimeout(step, 70); else setTimeout(function () { card.classList.add("hit"); }, 150);
      }, 1500);
    }
  }

  // Progress chart draws when it scrolls into view
  var chart = document.getElementById("chart");
  if (chart) {
    if (reduce || !("IntersectionObserver" in window)) chart.classList.add("drawn");
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { chart.classList.add("drawn"); io.disconnect(); } });
      }, { threshold: 0.5 });
      io.observe(chart);
    }
  }
})();
