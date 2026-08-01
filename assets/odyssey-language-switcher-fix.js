(function(){
  const LANGS = [
    ['en','🇬🇧','English'],['ar','🇸🇦','العربية'],['fa','🇮🇷','فارسی'],['de','🇩🇪','Deutsch'],['nl','🇳🇱','Nederlands'],
    ['ru','🇷🇺','Русский'],['pt','🇵🇹','Português'],['fr','🇫🇷','Français'],['zh','🇨🇳','中文'],['ja','🇯🇵','日本語'],
    ['az','🇦🇿','Azərbaycanca'],['tr','🇹🇷','Türkçe'],['ur','🇵🇰','اردو'],['pl','🇵🇱','Polski'],['it','🇮🇹','Italiano'],
    ['id','🇮🇩','Indonesia'],['ko','🇰🇷','한국어'],['uk','🇺🇦','Українська'],['ro','🇷🇴','Română'],['ms','🇲🇾','Melayu'],['es','🇪🇸','Español']
  ];
  const STORAGE_KEY = 'odyssey_lang';
  function current(){
    const saved = localStorage.getItem(STORAGE_KEY) || 'en';
    return LANGS.find(l => l[0] === saved) || LANGS[0];
  }
  function applyLang(code){
    if(window.OdysseyI18n && typeof window.OdysseyI18n.setLang === 'function'){
      window.OdysseyI18n.setLang(code);
    }else{
      localStorage.setItem(STORAGE_KEY, code);
      location.reload();
    }
    update();
  }
  function update(){
    const cur = current();
    document.querySelectorAll('#odysseyLanguageFallback .ody-lang-current').forEach(btn => {
      btn.innerHTML = `<span>${cur[1]}</span><span>${cur[2]}</span><b aria-hidden="true">▾</b>`;
    });
    document.querySelectorAll('#odysseyLanguageFallback .ody-lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === cur[0]);
    });
  }
  function mount(){
    if(document.getElementById('odysseyLanguageFallback')) return;
    const style = document.createElement('style');
    style.id = 'odyssey-language-fallback-style';
    style.textContent = `
      #odysseyLanguageFallback{position:fixed!important;left:18px!important;bottom:18px!important;z-index:2147483647!important;font-family:Manrope,Inter,system-ui,sans-serif!important}
      #odysseyLanguageFallback.ody-lang-header{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;display:inline-flex!important;align-items:center!important;flex:0 1 132px!important;min-width:0!important;max-width:132px!important;margin:0 2px!important;z-index:2147483647!important}
      #odysseyLanguageFallback .ody-lang-current{display:flex!important;align-items:center!important;gap:8px!important;min-width:150px!important;height:44px!important;border:1px solid rgba(255,255,255,.38)!important;border-radius:999px!important;background:linear-gradient(135deg,#0f766e 0%,#2563eb 52%,#e43f8f 100%)!important;color:#fff!important;padding:0 15px!important;font-weight:900!important;font-size:13px!important;box-shadow:0 18px 46px rgba(0,0,0,.32)!important;cursor:pointer!important}
      #odysseyLanguageFallback.ody-lang-header .ody-lang-current{width:100%!important;min-width:0!important;height:36px!important;padding:0 10px!important;font-size:12px!important;box-shadow:0 8px 20px rgba(7,28,43,.18)!important;background:linear-gradient(135deg,#0f766e 0%,#2563eb 52%,#e43f8f 100%)!important;color:#fff!important;border-color:rgba(255,255,255,.35)!important}
      #odysseyLanguageFallback .ody-lang-current b{margin-left:auto!important;color:#fff!important}
      #odysseyLanguageFallback .ody-lang-current span:nth-child(2){min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #odysseyLanguageFallback .ody-lang-menu{position:absolute!important;left:0!important;bottom:calc(100% + 10px)!important;width:250px!important;max-height:min(460px,72vh)!important;overflow:auto!important;display:none!important;padding:8px!important;border:1px solid rgba(7,28,43,.16)!important;border-radius:18px!important;background:#fff!important;box-shadow:0 22px 70px rgba(0,0,0,.28)!important}
      #odysseyLanguageFallback.ody-lang-header .ody-lang-menu{top:calc(100% + 10px)!important;bottom:auto!important;left:auto!important;right:0!important}
      #odysseyLanguageFallback.open .ody-lang-menu{display:block!important}
      #odysseyLanguageFallback .ody-lang-option{display:flex!important;gap:9px!important;align-items:center!important;width:100%!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#17202c!important;padding:10px 11px!important;text-align:left!important;font:800 13px/1.2 Manrope,Inter,system-ui,sans-serif!important;cursor:pointer!important}
      #odysseyLanguageFallback .ody-lang-option:hover,#odysseyLanguageFallback .ody-lang-option.active{background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(37,99,235,.12),rgba(228,63,143,.10))!important;color:#0f3f3d!important}
      html[dir="rtl"] #odysseyLanguageFallback{left:auto!important;right:18px!important}
      html[dir="rtl"] #odysseyLanguageFallback.ody-lang-header{left:auto!important;right:auto!important}
      html[dir="rtl"] #odysseyLanguageFallback .ody-lang-menu{left:auto!important;right:0!important}
      body:has(#odysseyLanguageFallback.ody-lang-header) #floatingLangSwitcher{display:none!important}
      @media(max-width:860px){#odysseyLanguageFallback.ody-lang-header .ody-lang-current{min-width:44px!important;width:44px!important;padding:0!important;justify-content:center!important}#odysseyLanguageFallback.ody-lang-header .ody-lang-current span:nth-child(2),#odysseyLanguageFallback.ody-lang-header .ody-lang-current b{display:none!important}}
      @media(max-width:640px){#odysseyLanguageFallback{left:12px!important;bottom:12px!important}#odysseyLanguageFallback .ody-lang-current{min-width:128px!important;height:42px!important;font-size:12px!important}#odysseyLanguageFallback.ody-lang-header .ody-lang-current{min-width:44px!important;height:36px!important}#odysseyLanguageFallback .ody-lang-menu{width:min(250px,calc(100vw - 24px))!important}}
    `;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'odysseyLanguageFallback';
    box.setAttribute('data-no-auto-i18n','true');
    box.innerHTML = `<button type="button" class="ody-lang-current" aria-haspopup="listbox" aria-label="Change language"></button><div class="ody-lang-menu" role="listbox">${LANGS.map(l=>`<button type="button" class="ody-lang-option" data-lang="${l[0]}" role="option"><span>${l[1]}</span><span>${l[2]}</span></button>`).join('')}</div>`;
    const headerSlot = document.querySelector('nav [data-i18n-switcher], header [data-i18n-switcher], .topbar [data-i18n-switcher], .nav-right [data-i18n-switcher], .sidebar [data-i18n-switcher], .portal [data-i18n-switcher]');
    const header = headerSlot || document.querySelector('nav .nav-right, header .nav-right, nav, header, .topbar, .sidebar');
    if(header){
      if(headerSlot) headerSlot.innerHTML = '';
      box.classList.add('ody-lang-header');
      header.appendChild(box);
    }else{
      document.body.appendChild(box);
    }
    box.querySelector('.ody-lang-current').addEventListener('click', event => {
      event.preventDefault();
      box.classList.toggle('open');
    });
    box.querySelectorAll('.ody-lang-option').forEach(option => {
      option.addEventListener('click', () => {
        applyLang(option.dataset.lang);
        box.classList.remove('open');
      });
    });
    document.addEventListener('click', event => {
      if(!event.target.closest('#odysseyLanguageFallback')) box.classList.remove('open');
    });
    document.addEventListener('odyssey:languageChanged', update);
    update();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
