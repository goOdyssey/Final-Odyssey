/* Odyssey public authentication navigation — v3.
 * Single source of truth:
 *   Supabase Auth user exists -> authenticated navigation.
 *   No Supabase Auth user     -> logged-out navigation.
 *
 * Profile data is used only to obtain the first name and role. A missing
 * profile must NEVER make an authenticated user look logged out.
 * No localStorage/demo flag is consulted for authentication.
 */
(function(){
  'use strict';

  const LOGGED_OUT =
    '<a class="nav-login" href="auth.html?mode=login">Log in</a>' +
    '<a class="nav-cta" href="auth.html?mode=signup">Sign up free ✨</a>';

  let syncSerial = 0;
  let authSubscription = null;

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function firstName(profile, user){
    const candidates = [
      profile?.full_name,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.email ? String(user.email).split('@')[0] : ''
    ];
    for(const candidate of candidates){
      const value = String(candidate || '').trim();
      if(value) return escapeHtml(value.split(/\s+/)[0]);
    }
    return 'Learner';
  }

  function portalFor(role){
    if(role === 'instructor' || role === 'institution') return 'instructor_portal.html';
    if(role === 'admin' || role === 'support') return 'admin_dashboard.html';
    if(role === 'superuser') return 'founder-dashboard.html';
    return 'student_portal.html';
  }

  function targets(){
    const out = [];
    [
      'landingNavAuth','landingMobileAuth',
      'catalogDesktopAuth','catalogMobileAuth',
      'subscriptionNavAuth','subscriptionMobileAuth'
    ].forEach(id => {
      const el = document.getElementById(id);
      if(el) out.push(el);
    });

    document.querySelectorAll('.nav-right, .nav-mobile-panel').forEach(nav => {
      if(out.includes(nav)) return;
      if(nav.querySelector('#landingNavAuth,#landingMobileAuth,#catalogDesktopAuth,#catalogMobileAuth,#subscriptionNavAuth,#subscriptionMobileAuth')) return;
      const links = [...nav.querySelectorAll('a[href*="mode=login"],a[href*="mode=signup"]')];
      if(!links.length) return;
      out.push({
        _authNav:true,
        set(html){
          links.forEach(a => a.remove());
          const holder=document.createElement('span');
          holder.className='odyssey-auth-nav-slot';
          holder.innerHTML=html;
          nav.appendChild(holder);
        }
      });
    });
    return out;
  }

  function render(html){
    targets().forEach(target => {
      if(target?._authNav) target.set(html);
      else if(target) target.innerHTML = html;
    });
  }

  function renderLoggedOut(){ render(LOGGED_OUT); }

  function renderLoggedIn(user, profile){
    const role = profile?.role || user?.user_metadata?.role || 'student';
    const greeting = `<a class="nav-cta" href="${portalFor(role)}">Hi, ${firstName(profile, user)} →</a>`;
    render(greeting);
  }

  async function readAuthState(){
    if(!window.OdysseySupabase?.isConfigured?.()) return null;
    const sb = await window.OdysseySupabase.client();
    const { data, error } = await sb.auth.getUser();
    if(error || !data?.user?.id) return null;

    const user = data.user;
    let profile = null;
    try{
      const result = await sb
        .from('profiles')
        .select('id,role,full_name')
        .eq('id', user.id)
        .maybeSingle();
      if(!result.error && result.data?.id === user.id) profile = result.data;
    }catch(error){
      // Authentication itself remains authoritative even if the profile query fails.
      console.warn('Odyssey auth navigation: profile lookup failed; using Auth identity.', error);
    }
    return { user, profile };
  }

  async function sync(){
    const serial = ++syncSerial;
    renderLoggedOut();
    try{
      const state = await readAuthState();
      if(serial !== syncSerial) return;
      if(state?.user) renderLoggedIn(state.user, state.profile);
    }catch(error){
      if(serial !== syncSerial) return;
      console.warn('Odyssey auth navigation verification failed; keeping logged-out navigation.', error);
      renderLoggedOut();
    }
  }

  async function init(){
    renderLoggedOut();
    let sb = null;
    try{
      if(window.OdysseySupabase?.isConfigured?.()){
        sb = await window.OdysseySupabase.client();
        if(authSubscription?.unsubscribe) authSubscription.unsubscribe();
        const result = sb.auth.onAuthStateChange((event) => {
          if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','TOKEN_REFRESHED'].includes(event)) sync();
        });
        authSubscription = result?.data?.subscription || null;
      }
    }catch(error){
      console.warn('Odyssey auth navigation listener could not initialize.', error);
    }
    await sync();
  }

  window.addEventListener('focus', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('odyssey:auth-changed', sync);

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();
