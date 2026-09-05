/* Odyssey rich text editor - a lightweight Word-style WYSIWYG box.
   No external dependencies. Exposes window.OdysseyEditor.build(container, opts)
   returning { el, getHTML, getText, isEmpty, clear, focus } - the exact
   contract contact.html already expects (see submitForm()). */
(function(){
  const FONTS = [
    { label: 'Default', value: '' },
    { label: 'Manrope', value: 'Manrope, system-ui, sans-serif' },
    { label: 'Newsreader', value: 'Newsreader, Georgia, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Courier New', value: '"Courier New", monospace' }
  ];
  const SIZES = [
    { label: 'Small', px: 12 },
    { label: 'Normal', px: 14 },
    { label: 'Large', px: 18 },
    { label: 'X-Large', px: 24 },
    { label: 'Huge', px: 32 }
  ];
  const SWATCHES = ['#141C2B', '#142C4F', '#0F7A6C', '#C08A3E', '#B23A48', '#4C3A82'];

  let styleInjected = false;
  function injectStyle(){
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
.ody-ed-wrap{border:2px solid rgba(20,44,79,.12);border-radius:10px;background:var(--cream,#F6F4EF);overflow:hidden;transition:border-color .2s,box-shadow .2s}
.ody-ed-wrap:focus-within{border-color:var(--navy,#142C4F);box-shadow:0 0 0 4px rgba(20,44,79,.08);background:#fff}
.ody-ed-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:7px 8px;background:rgba(20,44,79,.04);border-bottom:1px solid rgba(20,44,79,.10)}
.ody-ed-toolbar select{border:1px solid rgba(20,44,79,.16);border-radius:6px;background:#fff;font-size:12px;padding:5px 6px;font-family:inherit;color:var(--ink,#141C2B);cursor:pointer;max-width:110px}
.ody-ed-btn{min-width:28px;height:28px;padding:0 6px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;color:var(--ink,#141C2B);font-family:Georgia,serif}
.ody-ed-btn:hover{background:rgba(20,44,79,.08)}
.ody-ed-btn.active{background:rgba(20,44,79,.14);border-color:rgba(20,44,79,.22)}
.ody-ed-btn.b{font-weight:800}
.ody-ed-btn.i{font-style:italic}
.ody-ed-btn.u{text-decoration:underline}
.ody-ed-btn.dir{font-family:var(--ff-body,Manrope,sans-serif);font-size:11px;font-weight:800;letter-spacing:.02em}
.ody-ed-sep{width:1px;height:20px;background:rgba(20,44,79,.14);margin:0 2px}
.ody-ed-color-wrap{position:relative;display:inline-flex;align-items:center}
.ody-ed-color-swatch{width:28px;height:28px;border-radius:6px;border:1px solid rgba(20,44,79,.16);cursor:pointer;background:transparent;display:flex;align-items:center;justify-content:center;padding:0}
.ody-ed-color-swatch span{display:block;width:16px;height:4px;border-radius:2px;margin-top:10px}
.ody-ed-color-panel{display:none;position:absolute;top:32px;left:0;background:#fff;border:1px solid rgba(20,44,79,.14);border-radius:10px;padding:8px;box-shadow:0 12px 32px rgba(20,44,79,.18);z-index:20;gap:6px;grid-template-columns:repeat(6,20px)}
.ody-ed-color-panel.open{display:grid}
.ody-ed-color-panel button{width:20px;height:20px;border-radius:5px;border:1px solid rgba(0,0,0,.1);cursor:pointer;padding:0}
.ody-ed-surface{min-height:120px;padding:12px 15px;font-family:var(--ff-body,Manrope,sans-serif);font-size:13.5px;color:var(--ink,#141C2B);line-height:1.6;outline:none;overflow-y:auto}
.ody-ed-surface:empty::before{content:attr(data-placeholder);color:#9aa4b5;pointer-events:none}
.ody-ed-surface[dir="rtl"]:empty::before{direction:rtl}
.ody-ed-surface b,.ody-ed-surface strong{font-weight:800}
`;
    document.head.appendChild(style);
  }

  function build(container, opts){
    opts = opts || {};
    injectStyle();
    container.innerHTML = '';
    container.classList.add('ody-ed-wrap');

    const toolbar = document.createElement('div');
    toolbar.className = 'ody-ed-toolbar';

    const fontSelect = document.createElement('select');
    fontSelect.title = 'Font';
    FONTS.forEach(f => {
      const o = document.createElement('option');
      o.value = f.value; o.textContent = f.label;
      fontSelect.appendChild(o);
    });

    const sizeSelect = document.createElement('select');
    sizeSelect.title = 'Size';
    SIZES.forEach(s => {
      const o = document.createElement('option');
      o.value = String(s.px); o.textContent = s.label;
      if (s.label === 'Normal') o.selected = true;
      sizeSelect.appendChild(o);
    });

    function makeBtn(cls, label, title){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ody-ed-btn ' + cls;
      b.textContent = label;
      b.title = title;
      return b;
    }
    const boldBtn = makeBtn('b', 'B', 'Bold');
    const italicBtn = makeBtn('i', 'I', 'Italic');
    const underlineBtn = makeBtn('u', 'U', 'Underline');
    const ltrBtn = makeBtn('dir', 'LTR', 'Left to right (e.g. English)');
    const rtlBtn = makeBtn('dir', 'RTL', 'Right to left (e.g. Persian, Arabic)');

    const colorWrap = document.createElement('div');
    colorWrap.className = 'ody-ed-color-wrap';
    const colorSwatch = document.createElement('button');
    colorSwatch.type = 'button';
    colorSwatch.className = 'ody-ed-color-swatch';
    colorSwatch.title = 'Text color';
    colorSwatch.innerHTML = '<span style="background:#B23A48"></span>';
    const colorPanel = document.createElement('div');
    colorPanel.className = 'ody-ed-color-panel';
    SWATCHES.forEach(hex => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.style.background = hex;
      sw.addEventListener('mousedown', e => {
        e.preventDefault(); // keep focus/selection in the surface, not on this button
        restoreSelection();
        surface.focus();
        exec('foreColor', hex);
        colorSwatch.querySelector('span').style.background = hex;
        colorPanel.classList.remove('open');
        saveSelection();
      });
      colorPanel.appendChild(sw);
    });
    colorSwatch.addEventListener('mousedown', e => { e.preventDefault(); });
    colorSwatch.addEventListener('click', () => colorPanel.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!colorWrap.contains(e.target)) colorPanel.classList.remove('open');
    });
    colorWrap.appendChild(colorSwatch);
    colorWrap.appendChild(colorPanel);

    const sep = () => { const s = document.createElement('span'); s.className = 'ody-ed-sep'; return s; };

    toolbar.append(fontSelect, sizeSelect, sep(), boldBtn, italicBtn, underlineBtn, sep(), colorWrap, sep(), ltrBtn, rtlBtn);

    const surface = document.createElement('div');
    surface.className = 'ody-ed-surface';
    surface.contentEditable = 'true';
    surface.setAttribute('role', 'textbox');
    surface.setAttribute('aria-multiline', 'true');
    surface.setAttribute('dir', 'ltr');
    surface.setAttribute('data-placeholder', opts.placeholder || 'Type your message here…');
    if (opts.minHeight) surface.style.minHeight = opts.minHeight;

    container.appendChild(toolbar);
    container.appendChild(surface);

    // --- The actual fix for the "delay" bug ---
    // Clicking a <select> or a toolbar button moves browser focus away from
    // `surface`, and most browsers collapse or discard the text selection at
    // that point. The old code just called surface.focus() afterward and
    // hoped the selection was still intact - it wasn't, so execCommand ran
    // against a stale/empty selection and appeared to do nothing until some
    // later action "caught up". Fix: continuously track the real Range while
    // the user is selecting inside the surface, and explicitly restore that
    // exact Range before every toolbar command runs.
    let savedRange = null;
    function saveSelection(){
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && surface.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }
    function restoreSelection(){
      if (!savedRange) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    surface.addEventListener('keyup', saveSelection);
    surface.addEventListener('mouseup', saveSelection);
    surface.addEventListener('focus', () => { if (!savedRange) saveSelection(); });
    // Selects steal focus the instant they're opened, before "change" fires -
    // capture the selection at that exact moment, not after.
    fontSelect.addEventListener('mousedown', saveSelection);
    sizeSelect.addEventListener('mousedown', saveSelection);

    function exec(cmd, value){
      document.execCommand(cmd, false, value);
    }

    // execCommand('fontSize') only supports legacy sizes 1-7. The standard
    // trick: apply size 7 (produces <font size="7">), then swap those tags
    // for real px-based <span> elements so the output is clean, normal HTML.
    function applyFontSize(px){
      exec('fontSize', '7');
      surface.querySelectorAll('font[size="7"]').forEach(node => {
        const span = document.createElement('span');
        span.style.fontSize = px + 'px';
        span.innerHTML = node.innerHTML;
        node.replaceWith(span);
      });
    }

    function withRestoredSelection(fn){
      return function(e){
        e.preventDefault();
        restoreSelection();
        surface.focus();
        fn();
        saveSelection();
        updateToolbarState();
      };
    }

    boldBtn.addEventListener('mousedown', withRestoredSelection(() => exec('bold')));
    italicBtn.addEventListener('mousedown', withRestoredSelection(() => exec('italic')));
    underlineBtn.addEventListener('mousedown', withRestoredSelection(() => exec('underline')));

    fontSelect.addEventListener('change', () => {
      restoreSelection();
      surface.focus();
      exec('fontName', fontSelect.value || 'inherit');
      saveSelection();
    });
    sizeSelect.addEventListener('change', () => {
      restoreSelection();
      surface.focus();
      applyFontSize(Number(sizeSelect.value));
      saveSelection();
    });

    function setDirection(dir){
      surface.setAttribute('dir', dir);
      surface.style.textAlign = dir === 'rtl' ? 'right' : 'left';
      ltrBtn.classList.toggle('active', dir === 'ltr');
      rtlBtn.classList.toggle('active', dir === 'rtl');
      surface.focus();
    }
    ltrBtn.addEventListener('mousedown', e => { e.preventDefault(); setDirection('ltr'); });
    rtlBtn.addEventListener('mousedown', e => { e.preventDefault(); setDirection('rtl'); });
    setDirection('ltr');

    function updateToolbarState(){
      try{
        boldBtn.classList.toggle('active', document.queryCommandState('bold'));
        italicBtn.classList.toggle('active', document.queryCommandState('italic'));
        underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
      }catch(e){ /* queryCommandState can throw if selection is elsewhere - harmless */ }
    }
    surface.addEventListener('keyup', updateToolbarState);
    surface.addEventListener('mouseup', updateToolbarState);
    surface.addEventListener('focus', updateToolbarState);

    // Plain-text paste only, to keep incoming content clean (no foreign fonts/colors
    // smuggled in from Word/Google Docs pastes fighting with the toolbar's own styling).
    surface.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    function isEmpty(){
      return surface.textContent.trim().length === 0;
    }

    return {
      el: surface,
      getHTML(){ return isEmpty() ? '' : surface.innerHTML.trim(); },
      getText(){ return surface.textContent.trim(); },
      isEmpty,
      clear(){ surface.innerHTML = ''; },
      focus(){ surface.focus(); }
    };
  }

  window.OdysseyEditor = { build };
})();
