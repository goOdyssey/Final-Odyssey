(function(){
  const url = 'https://YOUR_PROJECT_REF.supabase.co';
  const anonKey = 'YOUR_SUPABASE_ANON_KEY';
  const fromStorage = {
    url: localStorage.getItem('ODYSSEY_SUPABASE_URL') || '',
    anonKey: localStorage.getItem('ODYSSEY_SUPABASE_ANON_KEY') || ''
  };
  const finalUrl = fromStorage.url || window.ODYSSEY_SUPABASE_URL || url;
  const finalAnonKey = fromStorage.anonKey || window.ODYSSEY_SUPABASE_ANON_KEY || anonKey;
  const looksReady =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(finalUrl) &&
    finalAnonKey.length > 80 &&
    !finalUrl.includes('YOUR_PROJECT_REF') &&
    !finalAnonKey.includes('YOUR_SUPABASE_ANON_KEY');

  window.ODYSSEY_SUPABASE = {
    url: finalUrl,
    anonKey: finalAnonKey,
    enabled: looksReady
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
