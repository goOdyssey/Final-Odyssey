(function(){
  // Odyssey i18n engine.
  // Translation strings used to live as one 3.3-million-character object literal
  // right here, so every page paid the cost of parsing all 21 languages even
  // though a visitor only ever uses one. That data now lives in i18n/<code>.json,
  // one file per language (~150-190KB each instead of one shared 3MB+ blob), and
  // is fetched on demand: the active language, plus 'en' as the fallback used
  // for any key missing in the active language (see t() below).
  // LANG_META is the only thing that must be resident immediately - it's what
  // the switcher needs to render its full list of 21 options before any
  // translation data has loaded, and it's tiny (~1KB) by design.
  const LANG_META = {"en":{"name":"English","flag":"🇬🇧","dir":"ltr"},"ar":{"name":"العربية","flag":"🇸🇦","dir":"rtl"},"fa":{"name":"فارسی","flag":"🇮🇷","dir":"rtl"},"de":{"name":"Deutsch","flag":"🇩🇪","dir":"ltr"},"nl":{"name":"Nederlands","flag":"🇳🇱","dir":"ltr"},"ru":{"name":"Русский","flag":"🇷🇺","dir":"ltr"},"pt":{"name":"Português","flag":"🇵🇹","dir":"ltr"},"fr":{"name":"Français","flag":"🇫🇷","dir":"ltr"},"zh":{"name":"中文","flag":"🇨🇳","dir":"ltr"},"ja":{"name":"日本語","flag":"🇯🇵","dir":"ltr"},"az":{"name":"Azərbaycanca","flag":"🇦🇿","dir":"ltr"},"tr":{"name":"Türkçe","flag":"🇹🇷","dir":"ltr"},"ur":{"name":"اردو","flag":"🇵🇰","dir":"rtl"},"pl":{"name":"Polski","flag":"🇵🇱","dir":"ltr"},"it":{"name":"Italiano","flag":"🇮🇹","dir":"ltr"},"id":{"name":"Bahasa Indonesia","flag":"🇮🇩","dir":"ltr"},"ko":{"name":"한국어","flag":"🇰🇷","dir":"ltr"},"uk":{"name":"Українська","flag":"🇺🇦","dir":"ltr"},"ro":{"name":"Română","flag":"🇷🇴","dir":"ltr"},"ms":{"name":"Bahasa Melayu","flag":"🇲🇾","dir":"ltr"},"es":{"name":"Español","flag":"🇪🇸","dir":"ltr"}};
  const I18N_BASE = (function(){
    // Resolve relative to this script's own location so it works the same
    // whether a page is served from the repo root or a subpath.
    const el = document.currentScript || document.querySelector('script[src$="i18n.js"]');
    if (!el) return 'i18n/';
    return el.src.replace(/[^\/]*$/, '').replace(/js\/$/, '') + 'i18n/';
  })();

  const DICT = {};       // runtime cache of loaded language JSON, keyed by code
  const LOADING = {};    // in-flight fetch promises, keyed by code, to dedupe

  const STORAGE_KEY = 'odyssey_lang';
  const RTL = new Set(['ar','fa','ur']);
  const BAD_RE = /(translated\s*(text|content|faq|group|terms|privacy|about|account|material)|translation\s*(text|content)|texte\s+traduit|testo\s+tradotto|texto\s+traduzido|çevrilmiş|cevrilmis|번역된|翻訳済み|翻訳された|перекладений|ترجمہ\s*شدہ|متن\s*ترجمه|ترجمه‌شده|q_[a-z_]+)/i;
  const TECH_RE = /^(flt|fld|tax|auto_auth|auto_faq|auto_terms|auto_privacy)_/i;
  const LANGS = Object.keys(LANG_META).map(code=>({code, label: LANG_META[code].name || code.toUpperCase(), flag: LANG_META[code].flag || '🌐', dir: LANG_META[code].dir || (RTL.has(code)?'rtl':'ltr')}));
  const FULLY_LOADED = new Set();
  function ensureLangLoaded(code){
    if(FULLY_LOADED.has(code)) return Promise.resolve(DICT[code]);
    if(LOADING[code]) return LOADING[code];
    LOADING[code] = fetch(I18N_BASE+code+'.json').then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(data=>{ DICT[code]=Object.assign(DICT[code]||{}, data); FULLY_LOADED.add(code); return DICT[code]; })
      .catch(err=>{ console.warn('Odyssey i18n: could not load language "'+code+'":', err); delete LOADING[code]; return null; });
    return LOADING[code];
  }
  function humanize(key){ return String(key||'').replace(/^(flt|fld|tax|country|auto_[a-z]+)_/i,'').replace(/_[a-f0-9]{8,}$/i,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function cleanValue(v,key,lang){
    if(v===undefined||v===null||v==='') return undefined;
    const s=String(v);
    if(BAD_RE.test(s)) return undefined;
    if(TECH_RE.test(s)) return undefined;
    return s;
  }
  function getLang(){ const saved=localStorage.getItem(STORAGE_KEY); return LANG_META[saved]?saved:'en'; }
  function t(key, vars){
    const lang=getLang();
    let v=cleanValue(DICT[lang] && DICT[lang][key],key,lang);
    if(v===undefined) v=cleanValue(DICT.en && DICT.en[key],key,'en');
    if(v===undefined) v=humanize(key);
    if(vars) Object.keys(vars).forEach(k=>{ v=String(v).replace(new RegExp('\\{'+k+'\\}|{'+k+'}','g'), vars[k]); });
    return v;
  }
  function applyTranslations(){
    const lang=getLang(); const dir=(DICT[lang]&&DICT[lang].dir)||(RTL.has(lang)?'rtl':'ltr');
    document.documentElement.lang=lang; document.documentElement.dir=dir; if(document.body) document.body.dir=dir;
    document.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.getAttribute('data-i18n'); if(k) el.textContent=t(k); });
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{ const k=el.getAttribute('data-i18n-html'); if(k) el.innerHTML=t(k); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ const k=el.getAttribute('data-i18n-placeholder'); if(k) el.setAttribute('placeholder',t(k)); });
    document.querySelectorAll('[data-i18n-title]').forEach(el=>{ const k=el.getAttribute('data-i18n-title'); if(k) el.setAttribute('title',t(k)); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>{ const k=el.getAttribute('data-i18n-aria-label'); if(k) el.setAttribute('aria-label',t(k)); });
    document.querySelectorAll('[data-i18n-template]').forEach(el=>{ const k=el.getAttribute('data-i18n-template'); const count=el.getAttribute('data-i18n-count')||el.dataset.count||''; if(k) el.textContent=t(k,{count}); });
    updateCurrentButtons(lang);
    document.dispatchEvent(new CustomEvent('odyssey:languageChanged',{detail:{lang,dir}}));
  }
  function updateCurrentButtons(lang){ document.querySelectorAll('.i18n-current').forEach(btn=>{ const L=LANGS.find(x=>x.code===lang)||LANGS[0]; btn.innerHTML=`${L.flag} <span>${L.label}</span> <span aria-hidden="true">▾</span>`; }); document.querySelectorAll('.i18n-option').forEach(o=>o.classList.toggle('active',o.dataset.lang===lang)); }
  async function setLang(lang){
    if(!LANG_META[lang]) lang='en';
    await ensureLangLoaded(lang);
    if(lang!=='en') await ensureLangLoaded('en');
    localStorage.setItem(STORAGE_KEY,lang);
    applyTranslations();
  }
  function buildSwitcherHTML(){ return `<div class="i18n-switcher"><button class="i18n-current" type="button" aria-haspopup="listbox" data-i18n-aria-label="lang_switcher_aria" aria-label="Change language"></button><div class="i18n-dropdown" role="listbox">${LANGS.map(l=>`<div class="i18n-option" data-lang="${l.code}" role="option">${l.flag} <span>${l.label}</span></div>`).join('')}</div></div>`; }
  function mountSwitchers(){
    document.querySelectorAll('[data-i18n-switcher]').forEach(host=>{ if(!host.querySelector('.i18n-switcher')) host.innerHTML=buildSwitcherHTML(); });
    const hasInlineSwitcher=document.querySelector('[data-i18n-switcher]'); const isPortal=document.body.classList.contains('instructor-portal')||document.querySelector('.portal .sidebar'); if(!hasInlineSwitcher && !isPortal && !document.body.classList.contains('auth-layout') && !document.getElementById('floatingLangSwitcher')){ const f=document.createElement('div'); f.id='floatingLangSwitcher'; f.className='i18n-floating'; f.innerHTML=buildSwitcherHTML(); document.body.appendChild(f); }
    document.addEventListener('click',e=>{
      const current=e.target.closest('.i18n-current');
      if(current){ e.preventDefault(); const sw=current.closest('.i18n-switcher'); document.querySelectorAll('.i18n-switcher.open').forEach(x=>{if(x!==sw)x.classList.remove('open');}); sw.classList.toggle('open'); return; }
      const opt=e.target.closest('.i18n-option'); if(opt){ setLang(opt.dataset.lang); document.querySelectorAll('.i18n-switcher.open').forEach(x=>x.classList.remove('open')); return; }
      if(!e.target.closest('.i18n-switcher')) document.querySelectorAll('.i18n-switcher.open').forEach(x=>x.classList.remove('open'));
    });
    updateCurrentButtons(getLang());
  }
  const css = `.i18n-floating{position:fixed;right:18px;top:18px;bottom:auto;z-index:2147483647}.i18n-switcher{position:relative;display:inline-block;font-family:Inter,system-ui,sans-serif;z-index:2147483647}.i18n-current{display:flex;gap:7px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.52);background:linear-gradient(135deg,#0f766e 0%,#2563eb 52%,#e43f8f 100%);color:#fff;border-radius:999px;padding:9px 13px;font-weight:800;font-size:13px;box-shadow:0 16px 38px rgba(37,99,235,.32),0 4px 14px rgba(228,63,143,.22);cursor:pointer;min-width:132px;white-space:nowrap}.i18n-dropdown{position:absolute;right:0;top:calc(100% + 8px);bottom:auto;display:none;min-width:220px;max-height:min(420px,70vh);overflow:auto;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%);border:1px solid rgba(37,99,235,.22);border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.22);padding:7px;z-index:2147483647}.i18n-switcher.open .i18n-dropdown{display:block}.i18n-option{padding:9px 11px;border-radius:11px;cursor:pointer;font-weight:700;font-size:13px;white-space:nowrap;color:#24143f}.i18n-option:hover,.i18n-option.active{background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(37,99,235,.12),rgba(228,63,143,.10));color:#0f3f3d}.i18n-floating .i18n-dropdown{top:calc(100% + 8px);bottom:auto}footer .i18n-dropdown,.site-footer .i18n-dropdown{top:auto;bottom:calc(100% + 8px)}header .i18n-dropdown,.nav .i18n-dropdown,.navbar .i18n-dropdown{top:calc(100% + 8px)!important;bottom:auto!important}[dir=rtl] .i18n-floating{right:18px;left:auto}[dir=rtl] .i18n-dropdown{right:auto;left:0}@media(max-width:640px){.i18n-floating{right:12px;top:12px;bottom:auto}.i18n-dropdown{min-width:200px;max-width:calc(100vw - 24px)}}
/* Final switcher visibility rules */
.top-nav .i18n-dropdown,
.nav-right .i18n-dropdown,
header .i18n-dropdown,
nav .i18n-dropdown,
.navbar .i18n-dropdown{
  top:calc(100% + 8px)!important;
  bottom:auto!important;
  right:0!important;
  left:auto!important;
  max-height:min(430px,70vh)!important;
}
.i18n-floating .i18n-dropdown{top:calc(100% + 8px)!important;bottom:auto!important;max-height:min(430px,70vh)!important;}
footer .i18n-dropdown,
.site-footer .i18n-dropdown{
  top:auto!important;
  bottom:calc(100% + 8px)!important;
  max-height:min(430px,70vh)!important;
}
html[dir="rtl"] .top-nav .i18n-dropdown,
html[dir="rtl"] .nav-right .i18n-dropdown,
html[dir="rtl"] header .i18n-dropdown,
html[dir="rtl"] nav .i18n-dropdown{
  right:auto!important;
  left:0!important;
}
`;
  if(!document.getElementById('odyssey-i18n-style')){ const s=document.createElement('style'); s.id='odyssey-i18n-style'; s.textContent=css; document.head.appendChild(s); }
  window.OdysseyI18n={DICT,LANGS,t,setLang,getLang,applyTranslations,ensureLangLoaded};
  async function boot(){
    const lang = getLang();
    await Promise.all([ ensureLangLoaded(lang), lang!=='en' ? ensureLangLoaded('en') : null ].filter(Boolean));
    // Applied here, not at top-level IIFE execution: this script itself loads before
    // the assets/odyssey-translation-completion.js <script defer> that defines
    // AUTH_UI_COMPLETION, so checking for it earlier always saw "undefined" and
    // silently did nothing. Deferred scripts run in document order before
    // DOMContentLoaded, so by the time we get here it will actually be set if present.
    const AUTH_PATCH = (typeof AUTH_UI_COMPLETION !== 'undefined' && AUTH_UI_COMPLETION) || {};
    Object.keys(AUTH_PATCH).forEach(l=>{ DICT[l]=Object.assign(DICT[l]||{}, AUTH_PATCH[l]); });
    mountSwitchers();
    applyTranslations();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
