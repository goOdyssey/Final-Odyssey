(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function addStarfield(){
    return;
  }

  function burst(x, y){
    return;
  }

  function parseGoFilter(card){
    const code = card.getAttribute('onclick') || '';
    const match = code.match(/goFilter\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
    return match ? {type:match[1], value:match[2]} : null;
  }

  function goAfterEffect(filter){
    if(window.goFilter && filter) window.goFilter(filter.type, filter.value);
  }

  function bindCards(){
    document.querySelectorAll('.disc-panel .cat-card').forEach(card => {
      if(card.dataset.odyCosmicBound) return;
      card.dataset.odyCosmicBound = 'true';
      const filter = parseGoFilter(card);
      card.removeAttribute('onclick');
      card.style.cursor = 'pointer';
      card.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        card.classList.add('ody-card-active');
        const rect = card.getBoundingClientRect();
        const x = event.clientX || rect.left + rect.width / 2;
        const y = event.clientY || rect.top + rect.height / 2;
        burst(x, y);
        setTimeout(() => goAfterEffect(filter), 0);
      }, {capture:true});
      card.addEventListener('keydown', event => {
        if(event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const rect = card.getBoundingClientRect();
        card.classList.add('ody-card-active');
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        setTimeout(() => goAfterEffect(filter), 0);
      });
    });

    document.querySelectorAll('.disc-tab,.rtab,.lb-tab').forEach(button => {
      if(button.dataset.odyGlowBound) return;
      button.dataset.odyGlowBound = 'true';
      button.addEventListener('click', event => {
        return;
      }, {capture:true});
    });
  }

  ready(() => {
    addStarfield();
    bindCards();
  });

  window.OdysseyCardEffects = {bindCards, burst};
})();
