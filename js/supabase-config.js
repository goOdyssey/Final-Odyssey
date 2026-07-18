(function(){
  const url = 'https://YOUR_PROJECT_REF.supabase.co';
  const anonKey = 'YOUR_SUPABASE_ANON_KEY';
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
