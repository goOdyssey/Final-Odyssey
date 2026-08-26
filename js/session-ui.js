(function(){
  'use strict';

  let pending = null;

  function resolveSession(){
    if (pending) return pending;
    pending = (async () => {
      if (!window.OdysseySupabase?.isConfigured?.()) return null;
      try {
        const session = await OdysseySupabase.session();
        if (!session) return null;
        const profile = await OdysseySupabase.profile();
        if (!profile) return null;
        return {
          role: profile.role,
          name: profile.full_name || profile.email || '',
          email: profile.email || ''
        };
      } catch (err) {
        console.warn('OdysseySessionUI: could not verify Supabase session; treating the visitor as logged out.', err);
        return null;
      }
    })();
    return pending;
  }

  async function requireStudentLogin(returnTo){
    const profile = await resolveSession();
    if (profile?.role === 'student') return true;
    localStorage.setItem(
      'odyssey_after_login',
      returnTo || (location.pathname.split('/').pop() + location.search)
    );
    location.href = 'auth.html?mode=login&role=student';
    return false;
  }

  window.OdysseySessionUI = { requireStudentLogin };
}());
