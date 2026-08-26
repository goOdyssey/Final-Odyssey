/* Odyssey scroll-reveal engine.
   - Zero dependencies, ~1KB.
   - FAIL-SAFE BY DESIGN: content is visible by default. This script adds a
     "reveal-ready" class to <html> only once it has actually started
     running - the CSS only hides [data-reveal]/.reveal elements when that
     class is present (see odyssey-design-system.css). If this file is
     ever missing, blocked, cached incorrectly, or throws an error before
     that point, nothing on the page is ever hidden. A missing/broken
     script can make animations not happen; it can never make text
     disappear.
   - A second safety net: even after "reveal-ready" is added, every
     observed element is force-revealed after 4 seconds no matter what, in
     case IntersectionObserver somehow never fires for it (e.g. it's
     inside a display:none tab that gets shown later via other JS). */
(function(){
  var SAFETY_TIMEOUT_MS = 4000;

  function revealEl(el){ el.classList.add('od-in'); }

  function run(){
    var nodes = document.querySelectorAll('[data-reveal], .reveal');
    if(!nodes.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasIO = 'IntersectionObserver' in window;

    if(reduceMotion || !hasIO){
      // Never add reveal-ready in these cases - CSS already leaves
      // everything visible for reduced-motion / old browsers, so there's
      // nothing to reveal and nothing to hide.
      return;
    }

    document.documentElement.classList.add('reveal-ready');

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.dataset.revealDelay || 0);
        if(delay > 0) setTimeout(function(){ revealEl(el); }, delay);
        else revealEl(el);
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    nodes.forEach(function(el){
      observer.observe(el);
      // Belt-and-suspenders: guarantee visibility even if this element
      // never intersects for some reason.
      setTimeout(function(){ revealEl(el); }, SAFETY_TIMEOUT_MS);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Re-scan when the app swaps in new content dynamically (e.g. after a
  // portal re-renders a card list), so newly-added [data-reveal] nodes
  // still animate in rather than sitting invisible.
  window.OdysseyReveal = { scan: run };

  // ---- Ambient background parallax: one CSS custom property, updated at
  // most once per animation frame, only while .od-ambient[data-parallax]
  // is actually present on the page. This is the only scroll-linked code
  // in the whole design system, and it does nothing but write a number -
  // no layout reads, no forced reflow, negligible cost even on long pages.
  var ambientEl = document.querySelector('.od-ambient[data-parallax]');
  if(ambientEl && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
    var ticking = false;
    window.addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        document.documentElement.style.setProperty('--od-scroll', String(window.scrollY || 0));
        ticking = false;
      });
    }, { passive: true });
  }
})();

