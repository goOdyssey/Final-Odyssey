/* Odyssey scroll-reveal engine.
   - Zero dependencies, ~1KB.
   - Only ever toggles a class; all animation happens in CSS via
     transform/opacity, so the browser compositor does the work off the
     main thread. Nothing here runs on the scroll event, so there is no
     scroll-jank risk regardless of page length or card count.
   - Respects prefers-reduced-motion (elements are simply left visible).
   - Fails silently and leaves content visible if IntersectionObserver
     isn't available, so this can never hide content on an old browser. */
(function(){
  function reveal(){
    var nodes = document.querySelectorAll('[data-reveal], .reveal');
    if(!nodes.length) return;

    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      nodes.forEach(function(el){ el.classList.add('od-in'); });
      return;
    }
    if(!('IntersectionObserver' in window)){
      nodes.forEach(function(el){ el.classList.add('od-in'); });
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.dataset.revealDelay || 0);
        if(delay > 0){
          setTimeout(function(){ el.classList.add('od-in'); }, delay);
        } else {
          el.classList.add('od-in');
        }
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    nodes.forEach(function(el){ observer.observe(el); });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', reveal);
  } else {
    reveal();
  }
  // Re-scan when the app swaps in new content dynamically (e.g. after a
  // portal re-renders a card list), so newly-added [data-reveal] nodes
  // still animate in rather than sitting invisible.
  window.OdysseyReveal = { scan: reveal };
})();
