/* Odyssey site content overrides.
   Reuses the data-i18n attributes already present on nearly every string
   across the site as the key space for admin-editable content - no new
   markup needed anywhere. Fetches once per page load (plus whenever the
   language switcher fires odyssey:languageChanged, so an override still
   applies after i18n.js re-renders translated text), and only touches
   elements that actually have a non-empty override saved. */
(function(){
  function currentPageFile(){
    const path = location.pathname.split('/').pop();
    return path && path.length ? path : 'index.html';
  }

  let cachedRows = null;
  async function fetchOverrides(){
    if (cachedRows) return cachedRows;
    if (!window.OdysseySupabase?.isConfigured?.()) { cachedRows = []; return cachedRows; }
    try {
      const sb = await OdysseySupabase.client();
      const { data, error } = await sb.from('site_content')
        .select('content_key, override_text')
        .in('page', [currentPageFile(), 'sitewide'])
        .not('override_text', 'eq', '');
      if (error) throw error;
      cachedRows = data || [];
    } catch (err) {
      console.warn('Odyssey site-content: could not load overrides, showing default text.', err);
      cachedRows = [];
    }
    return cachedRows;
  }

  async function applyOverrides(){
    const rows = await fetchOverrides();
    rows.forEach(row => {
      if (!row.override_text) return;
      document.querySelectorAll(`[data-i18n="${CSS.escape(row.content_key)}"]`).forEach(el => {
        el.textContent = row.override_text;
      });
    });
  }

  function run(){
    // Let i18n.js finish its own render first (it dispatches odyssey:languageChanged
    // after applying translations on boot too), then layer overrides on top -
    // this way an admin edit is always the final word regardless of load order.
    applyOverrides();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  document.addEventListener('odyssey:languageChanged', run);

  window.OdysseySiteContent = { refresh(){ cachedRows = null; return applyOverrides(); } };
})();
