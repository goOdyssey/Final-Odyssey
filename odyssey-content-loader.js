// Applies any founder-dashboard text overrides to this page. Runs once,
// after the page's own content is already rendered — if a key has no
// override, the page's original text is left exactly as it was, so this
// is safe to include on every page without risk of blanking anything.
(function(){
  const URL = 'https://yxewqmemegiogqwyklai.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZXdxbWVtZWdpb2dxd3lrbGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjY3NTksImV4cCI6MjA5NzgwMjc1OX0.dQzu4llCv0WjHs93a4w9SN3zng1c1dW5moOsjwL6dDM';

  async function applyOverrides(){
    if(!window.supabase){ return; } // supabase-js CDN script not present on this page — nothing to do
    try{
      const sb = window.supabase.createClient(URL, KEY);
      const { data, error } = await sb.from('site_content').select('content_key, override_text');
      if(error || !data || !data.length) return;
      data.forEach(row => {
        document.querySelectorAll(`[data-i18n="${CSS.escape(row.content_key)}"]`).forEach(el => {
          el.textContent = row.override_text;
        });
      });
    } catch(e){ console.warn('Site content overrides could not be applied.', e); }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyOverrides);
  else applyOverrides();
}());
