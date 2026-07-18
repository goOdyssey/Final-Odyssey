(function(){
  const url = 'https://yxewqmemegiogqwyklai.supabase.co/rest/v1/';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZXdxbWVtZWdpb2dxd3lrbGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjY3NTksImV4cCI6MjA5NzgwMjc1OX0.dQzu4llCv0WjHs93a4w9SN3zng1c1dW5moOsjwL6dDM';
  const fileHasRealConfig =
    !url.includes('YOUR_PROJECT_REF') &&
    !anonKey.includes('YOUR_SUPABASE_ANON_KEY');
  const fromStorage = {
    url: localStorage.getItem('ODYSSEY_SUPABASE_URL') || '',
    anonKey: localStorage.getItem('ODYSSEY_SUPABASE_ANON_KEY') || ''
  };
  const finalUrl = fileHasRealConfig ? url : (window.ODYSSEY_SUPABASE_URL || fromStorage.url || url);
  const finalAnonKey = fileHasRealConfig ? anonKey : (window.ODYSSEY_SUPABASE_ANON_KEY || fromStorage.anonKey || anonKey);
  const looksReady =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(finalUrl) &&
    finalAnonKey.length > 80 &&
    !finalUrl.includes('YOUR_PROJECT_REF') &&
    !finalAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

  window.ODYSSEY_SUPABASE = {
    url: finalUrl,
    anonKey: finalAnonKey,
    enabled: looksReady,
    source: fileHasRealConfig ? 'js/supabase-config.js' : (window.ODYSSEY_SUPABASE_URL ? 'window' : (fromStorage.url ? 'browser storage' : 'placeholder'))
  };

  window.OdysseySupabaseConfig = {
    isReady: () => looksReady,
    save(nextUrl, nextAnonKey){
      localStorage.setItem('ODYSSEY_SUPABASE_URL', String(nextUrl || '').trim());
      localStorage.setItem('ODYSSEY_SUPABASE_ANON_KEY', String(nextAnonKey || '').trim());
      location.reload();
    },
    clear(){
      localStorage.removeItem('ODYSSEY_SUPABASE_URL');
      localStorage.removeItem('ODYSSEY_SUPABASE_ANON_KEY');
      location.reload();
    }
  };
}());
