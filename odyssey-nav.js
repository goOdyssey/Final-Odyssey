// Shared mobile nav: toggles the hamburger + dropdown panel used on every
// page. Panel position is computed from the real nav element on each open/
// resize, instead of a fixed pixel guess, so it stays aligned no matter
// how the nav's height changes across breakpoints.
document.addEventListener('DOMContentLoaded', function(){
  const nav = document.querySelector('nav');
  const burger = document.querySelector('.nav-burger');
  const panel = document.querySelector('.nav-mobile-panel');
  if(!nav || !burger || !panel) return;

  function position(){
    const r = nav.getBoundingClientRect();
    panel.style.top = Math.round(r.bottom + 8) + 'px';
  }
  function open(){
    position();
    burger.classList.add('open');
    panel.classList.add('open');
    burger.setAttribute('aria-expanded','true');
  }
  function close(){
    burger.classList.remove('open');
    panel.classList.remove('open');
    burger.setAttribute('aria-expanded','false');
  }
  function toggle(){
    if(panel.classList.contains('open')) close(); else open();
  }

  burger.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
  panel.addEventListener('click', function(e){ e.stopPropagation(); });
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', function(e){
    if(panel.classList.contains('open') && !panel.contains(e.target) && e.target !== burger) close();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  window.addEventListener('resize', function(){
    if(panel.classList.contains('open')) position();
    if(window.innerWidth > 900) close();
  });
});
