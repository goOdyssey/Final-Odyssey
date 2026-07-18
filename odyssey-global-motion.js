(function(){
  const originalFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    const options = Object.assign({}, init || {});
    const method = String(options.method || 'GET').toUpperCase();
    const target = new URL(typeof input === 'string' ? input : input.url, location.href);
    if(target.origin === location.origin && !['GET','HEAD','OPTIONS'].includes(method)){
      const match = document.cookie.match(/(?:^|;\s*)odyssey_csrf=([^;]+)/);
      if(match){
        const headers = new Headers(options.headers || (typeof input !== 'string' ? input.headers : undefined));
        headers.set('x-odyssey-csrf', decodeURIComponent(match[1]));
        options.headers = headers;
      }
    }
    return originalFetch(input, options);
  };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const passiveEvents = new Set(['touchstart','touchmove','wheel','mousewheel']);
  const nativeAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options){
    if(passiveEvents.has(type) && options === undefined){
      options = {passive:true};
    }
    return nativeAddEventListener.call(this, type, listener, options);
  };
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function(){
    const pageIsLanding = !!document.querySelector('.professional-space-hero');
    const pageIsPortal = !!document.querySelector('.portal');
    const pageIsCatalog = /learnworld_catalog\.html$/.test(location.pathname) || !!document.querySelector('.course-grid,.courses-grid,#coursesGrid');
    document.documentElement.classList.toggle('odyssey-page-landing', pageIsLanding);
    document.documentElement.classList.toggle('odyssey-page-portal', pageIsPortal);
    document.documentElement.classList.toggle('odyssey-page-catalog', pageIsCatalog);
    const style = document.createElement('style');
    style.textContent = `
      .odyssey-skip-link{position:fixed;left:16px;top:12px;z-index:100000;padding:11px 15px;border-radius:6px;background:#111827;color:#fff;font:700 14px/1.2 Manrope,system-ui,sans-serif;transform:translateY(-150%);transition:transform .15s}
      .odyssey-skip-link:focus{transform:translateY(0)}
      :where(a,button,input,select,textarea,[role="button"],[tabindex]):focus-visible{outline:3px solid #f5b942!important;outline-offset:3px!important;box-shadow:0 0 0 5px rgba(17,24,39,.22)!important}
      :where(button,[role="button"]){touch-action:manipulation}
      .odyssey-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      html{scroll-behavior:smooth}
      html.odyssey-page-landing{scroll-behavior:auto}
      body{overscroll-behavior-y:none}
      img{height:auto}
      :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.course-card,.course,.card,.item,.story,.sub-plan,.stat-card,.theme-card,.message-card,.cert-card){content-visibility:auto;contain-intrinsic-size:1px 220px}
      :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.course-card,.course,.card,.item,.story,.sub-plan,.stat-card,.theme-card,.message-card,.cert-card,.hero,.welcome,.search-hero,.catalog-header){contain:layout paint}
      :where(.odyssey-dynamic-bg,.scroll-depth-scene,.odyssey-global-depth,.blob,.ody-bg-layer,.ody-bg-plane,.depth-ribbon){pointer-events:none;user-select:none}
      .odyssey-page-landing :where(.odyssey-dynamic-bg,.scroll-depth-scene){contain:strict}
      .odyssey-page-landing :where(.ody-bg-layer,.ody-bg-plane,.depth-ribbon,.odyssey-hero-visual,.odyssey-glass-tile){backface-visibility:hidden;transform:translateZ(0)}
      .odyssey-page-landing :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.disc-tab,.lb-wrap,.hero-stats,.odyssey-hero-visual,.odyssey-glass-tile){will-change:auto!important}
      .odyssey-page-landing :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.lb-row,.lb-podium-item){content-visibility:visible!important;contain-intrinsic-size:auto!important}
      .odyssey-page-landing :where(.categories,.regions,.how,.instructors,.testimonials,.cta-section,footer){content-visibility:visible!important;contain-intrinsic-size:auto!important}
      .odyssey-page-landing :where(.ody-bg-layer,.ody-bg-plane,.depth-ribbon,.hero-stats,.section-inner){will-change:auto!important}
      .odyssey-motion-lite.odyssey-page-landing :where(.ody-bg-layer,.ody-bg-plane,.depth-ribbon,.hero-stats,.section-inner){transition:none!important}
      .odyssey-motion-lite.odyssey-page-landing .ody-bg-plane{transform:rotateX(58deg) rotateZ(-15deg)!important}
      .odyssey-motion-lite.odyssey-page-landing .ody-bg-plane.two{transform:rotateX(60deg) rotateZ(18deg)!important}
      .odyssey-motion-lite.odyssey-page-landing .depth-ribbon.one{transform:rotateX(58deg) rotateZ(-18deg)!important}
      .odyssey-motion-lite.odyssey-page-landing .depth-ribbon.two{transform:rotateX(60deg) rotateZ(18deg)!important}
      .odyssey-page-landing :where(.ticker-track){transform:translateZ(0)}
      .odyssey-page-landing nav{max-width:100vw!important;min-width:0!important;gap:clamp(7px,1vw,14px)!important;overflow:visible!important}
      .odyssey-page-landing .nav-logo{flex:0 0 auto!important;min-width:0!important}
      .odyssey-page-landing .nav-links{min-width:0!important;flex:1 1 auto!important;gap:clamp(4px,.65vw,10px)!important;justify-content:center!important;overflow:hidden!important}
      .odyssey-page-landing .nav-links a{max-width:clamp(54px,7.4vw,118px)!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:clamp(10px,.76vw,12px)!important;padding-inline:clamp(5px,.65vw,9px)!important}
      .odyssey-page-landing .nav-right{min-width:0!important;flex:0 1 auto!important;gap:clamp(5px,.65vw,8px)!important}
      .odyssey-page-landing .nav-login,.odyssey-page-landing .nav-cta{white-space:nowrap!important;min-width:0!important;font-size:clamp(10px,.76vw,12px)!important;padding-inline:clamp(8px,.85vw,13px)!important}
      .odyssey-page-landing .i18n-current{min-width:0!important;max-width:132px!important}
      .odyssey-page-landing .i18n-current span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      .odyssey-is-scrolling :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.course-card,.theme-card){transition-duration:.08s!important}
      .odyssey-is-scrolling :where(.odyssey-dynamic-bg,.scroll-depth-scene,.odyssey-global-depth){will-change:auto!important}
      .odyssey-fast-scroll :where(.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.course-card,.theme-card,.odyssey-glass-tile){transition-duration:.04s!important}
      .odyssey-fast-scroll :where(.odyssey-dynamic-bg,.scroll-depth-scene,.odyssey-global-depth,.ody-bg-layer,.ody-bg-plane,.depth-ribbon){transition:none!important}
      .odyssey-page-catalog :where(.course-card){contain-intrinsic-size:1px 360px}
      .odyssey-page-portal :where(.sidebar){contain:layout paint style}
      @media(max-width:1180px){.odyssey-page-landing .nav-links{justify-content:flex-start!important;overflow-x:auto!important;max-width:calc(100vw - 340px)!important;scrollbar-width:none!important}.odyssey-page-landing .nav-links::-webkit-scrollbar{display:none!important}}
      @media(max-width:780px){html{scroll-behavior:auto}.odyssey-page-landing :where(.odyssey-dynamic-bg,.scroll-depth-scene){contain:paint}.odyssey-page-landing .nav-links{max-width:calc(100vw - 190px)!important}.odyssey-page-landing .nav-login{display:none!important}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);

    const preloadImages = [
      'assets/odyssey-road-hero-fast.jpg',
      'assets/odyssey-global-learning-fast.jpg',
      'assets/odyssey-logo-mark.jpg',
      'assets/odyssey-bg-stem.jpg',
      'assets/odyssey-bg-life-science.jpg',
      'assets/odyssey-bg-exams.jpg',
      'assets/odyssey-bg-leaderboard.jpg'
    ];
    preloadImages.forEach(href => {
      if(document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      document.head.appendChild(link);
    });

    document.querySelectorAll('img').forEach((img,index) => {
      const src = img.getAttribute('src') || '';
      const important = index < 3 || /logo|hero|road/i.test(src) || img.closest('nav,.hero,.welcome');
      img.decoding = 'async';
      if(!important){
        img.loading = 'lazy';
        img.fetchPriority = 'low';
      }else{
        img.loading = img.loading || 'eager';
        img.fetchPriority = 'high';
      }
    });

    if(!pageIsLanding && 'IntersectionObserver' in window){
      const heavySelector = '.cat-card,.exam-card,.step-card,.instr-card,.testi-card,.course-card,.course,.story,.sub-plan';
      const visibilityObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('odyssey-near-view', entry.isIntersecting);
        });
      }, {rootMargin:'360px 0px', threshold:0.01});
      document.querySelectorAll(heavySelector).forEach(el => visibilityObserver.observe(el));
    }

    let scrollTimer = 0;
    let fastScrollTimer = 0;
    let scrollTicking = false;
    let lastScrollY = window.scrollY || 0;
    let lastScrollTime = performance.now();
    let lastBucket = -1;
    let isScrolling = false;
    const setScrollState = () => {
      if(!isScrolling){
        document.documentElement.classList.add('odyssey-is-scrolling');
        isScrolling = true;
      }
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('odyssey-is-scrolling','odyssey-fast-scroll');
        isScrolling = false;
      }, 150);
      if(scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        const now = performance.now();
        const currentY = window.scrollY || 0;
        const delta = Math.abs(currentY - lastScrollY);
        const velocity = delta / Math.max(16, now - lastScrollTime);
        const next = Math.min(1, Math.max(0, (window.scrollY || 0) / max));
        const bucket = Math.round(next * 120);
        if(velocity > 2.2 || delta > 220){
          document.documentElement.classList.add('odyssey-fast-scroll');
          window.clearTimeout(fastScrollTimer);
          fastScrollTimer = window.setTimeout(() => document.documentElement.classList.remove('odyssey-fast-scroll'), 180);
        }
        if(bucket !== lastBucket || delta > 180){
          const quantized = bucket / 120;
          document.documentElement.style.setProperty('--odyScroll', quantized.toFixed(4));
          if(pageIsLanding){
            const flow = Math.min(.32, Math.max(.10, .14 + quantized * .16));
            document.documentElement.style.setProperty('--odyFlow', flow.toFixed(3));
            document.documentElement.style.setProperty('--odyShift', (3.2 + quantized * 1.8).toFixed(2) + '%');
          }
          lastBucket = bucket;
        }
        lastScrollY = currentY;
        lastScrollTime = now;
        scrollTicking = false;
      });
    };
    if(pageIsLanding){
      document.documentElement.style.setProperty('--odyScroll', '0');
      document.documentElement.style.setProperty('--odyFlow', '0.18');
      document.documentElement.style.setProperty('--odyShift', '3.2%');
      document.documentElement.classList.add('odyssey-motion-lite');
    }else{
      window.addEventListener('scroll', setScrollState, {passive:true});
      window.addEventListener('resize', setScrollState, {passive:true});
      setScrollState();
    }

    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.main');
    if(main){
      if(!main.id) main.id = 'main-content';
      main.setAttribute('tabindex','-1');
      if(!document.querySelector('.odyssey-skip-link')){
        const skip = document.createElement('a');
        skip.className = 'odyssey-skip-link';
        skip.href = `#${main.id}`;
        skip.textContent = 'Skip to main content';
        document.body.prepend(skip);
      }
    }

    document.querySelectorAll('[onclick]').forEach(element => {
      if(/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(element.tagName)) return;
      if(!element.hasAttribute('role')) element.setAttribute('role','button');
      if(!element.hasAttribute('tabindex')) element.setAttribute('tabindex','0');
      element.addEventListener('keydown', event => {
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          element.click();
        }
      });
    });

    document.querySelectorAll('.faq-q').forEach((question,index) => {
      const answer = question.nextElementSibling;
      if(answer){
        if(!answer.id) answer.id = `faq-answer-${index+1}`;
        question.setAttribute('aria-controls',answer.id);
        question.setAttribute('aria-expanded',question.closest('.faq-item')?.classList.contains('open')?'true':'false');
        question.addEventListener('click',() => {
          setTimeout(() => question.setAttribute('aria-expanded',question.closest('.faq-item')?.classList.contains('open')?'true':'false'),0);
        });
      }
    });

    document.querySelectorAll('input,select,textarea').forEach((control,index) => {
      if(control.type === 'hidden' || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
      if(control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) return;
      const wrappingLabel = control.closest('label');
      if(wrappingLabel) return;
      const field = control.closest('.field,.form-group,.input-group');
      const visibleLabel = field?.querySelector('label');
      if(visibleLabel){
        if(!control.id) control.id = `odyssey-field-${index+1}`;
        visibleLabel.setAttribute('for',control.id);
        return;
      }
      const name = control.getAttribute('placeholder') || control.getAttribute('name') || control.id;
      if(name) control.setAttribute('aria-label',String(name).replace(/[-_]/g,' '));
    });
    document.querySelectorAll('button').forEach(button => {
      if(button.hasAttribute('aria-label')) return;
      if(button.classList.contains('pw-toggle')){
        button.setAttribute('aria-label','Show or hide password');
      }else if(button.classList.contains('modal-close') || button.classList.contains('close')){
        button.setAttribute('aria-label','Close dialog');
      }else if(!button.textContent.trim() && button.title){
        button.setAttribute('aria-label',button.title);
      }
    });

    document.querySelectorAll('.modal,[role="dialog"],.modal-overlay').forEach(dialog => {
      if(!dialog.hasAttribute('role')) dialog.setAttribute('role','dialog');
      dialog.setAttribute('aria-modal','true');
    });
    document.addEventListener('keydown',event => {
      if(event.key !== 'Escape') return;
      const openDialog = [...document.querySelectorAll('.modal,[role="dialog"],.modal-overlay')]
        .find(dialog => !dialog.classList.contains('hidden') && getComputedStyle(dialog).display !== 'none');
      if(!openDialog) return;
      const close = openDialog.querySelector('[data-close],.modal-close,.close,[aria-label*="Close" i]');
      if(close) close.click();
    });

    const live = document.createElement('div');
    live.className = 'odyssey-sr-only';
    live.setAttribute('aria-live','polite');
    live.setAttribute('aria-atomic','true');
    live.id = 'odyssey-live-region';
    document.body.appendChild(live);

    document.documentElement.style.setProperty('--odyScroll', '0');
    document.documentElement.style.setProperty('--odyPointerX', '50%');
    document.documentElement.style.setProperty('--odyPointerY', '20%');
    document.documentElement.classList.add('odyssey-motion-lite');
    return;

    const isLanding = /learnworld_landing\.html$|\/$/.test(location.pathname);
    if(document.querySelector('.odyssey-dynamic-bg')) return;
    if(reduce) return;
    if(isLanding) return;
    if(!document.querySelector('.odyssey-global-depth')){
      const depth = document.createElement('div');
      depth.className = 'odyssey-global-depth';
      depth.setAttribute('aria-hidden','true');
      depth.innerHTML = '<div class="odyssey-depth-picture one"></div><div class="odyssey-depth-picture two"></div><div class="odyssey-depth-picture three"></div>';
      document.body.prepend(depth);
    }
    let ticking = false;
    function update(){
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = Math.min(1, Math.max(0, scrollY / max));
      document.documentElement.style.setProperty('--odyScroll', p.toFixed(4));
      ticking = false;
    }
    function request(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', request, {passive:true});
    window.addEventListener('resize', request);
    update();

    let pointerTicking = false;
    let pointerX = 50;
    let pointerY = 18;
    function updatePointer(){
      document.documentElement.style.setProperty('--odyPointerX', pointerX.toFixed(2) + '%');
      document.documentElement.style.setProperty('--odyPointerY', pointerY.toFixed(2) + '%');
      pointerTicking = false;
    }
    window.addEventListener('pointermove', event => {
      if(event.pointerType === 'touch') return;
      pointerX = Math.max(0, Math.min(100, (event.clientX / Math.max(1, innerWidth)) * 100));
      pointerY = Math.max(0, Math.min(100, (event.clientY / Math.max(1, innerHeight)) * 100));
      if(pointerTicking) return;
      pointerTicking = true;
      requestAnimationFrame(updatePointer);
    }, {passive:true});
  });
})();
