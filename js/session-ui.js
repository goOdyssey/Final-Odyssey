(function(){
  // Previously this whole file trusted a legacy localStorage flag
  // (odyssey_demo_logged_in) as the source of truth for "is this visitor logged
  // in as a student", while the rest of the app (auth.html, admin/founder
  // dashboards) correctly trusts the real Supabase session. Those two could
  // drift out of sync - e.g. a session expiring without an explicit sign-out
  // would leave the old flag saying "logged in" when the visitor actually
  // wasn't. This now asks Supabase directly, with the legacy flag kept only as
  // a fallback for the case where Supabase itself isn't configured on this
  // deployment (mirrors the fail-open pattern used elsewhere, e.g.
  // security-guard.js), never as a substitute when real auth is available.

  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function legacyProfile(){
    const role = localStorage.getItem('odyssey_demo_logged_in') || '';
    if (role !== 'student') return null;
    const p = readJSON('odyssey_student_profile', {});
    const name = p.name || p.full_name || p.email || '';
    if (!name) return null;
    return { role: 'student', name, email: p.email || '' };
  }

  let pending = null;
  function resolveSession(){
    if (pending) return pending;
    pending = (async () => {
      if (!window.OdysseySupabase?.isConfigured?.()) {
        return legacyProfile();
      }
      try {
        const session = await OdysseySupabase.session();
        if (!session) return null;
        const profile = await OdysseySupabase.profile();
        if (!profile) return null;
        return { role: profile.role, name: profile.full_name || profile.email || '', email: profile.email || '' };
      } catch (err) {
        console.warn('OdysseySessionUI: could not verify Supabase session, falling back to local state.', err);
        return legacyProfile();
      }
    })();
    return pending;
  }

  async function loggedRole(){
    const p = await resolveSession();
    return p ? p.role : '';
  }

  async function displayName(){
    const p = await resolveSession();
    return p ? p.name : '';
  }

  async function installBadge(){
    const p = await resolveSession();
    if (!p || p.role !== 'student' || !p.name) return;
    const navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('odysseySessionBadge')) return;
    const badge = document.createElement('a');
    badge.id = 'odysseySessionBadge';
    badge.href = 'student_portal.html';
    badge.textContent = p.name;
    badge.title = 'Open student portal';
    badge.style.cssText = 'display:inline-flex;align-items:center;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid rgba(214,162,70,.42);border-radius:999px;padding:7px 12px;background:rgba(214,162,70,.16);color:#fff;font-size:12px;font-weight:900;text-decoration:none';
    const login = [...navRight.querySelectorAll('a')].find(a => /mode=login/.test(a.getAttribute('href') || ''));
    const signup = [...navRight.querySelectorAll('a')].find(a => /mode=signup/.test(a.getAttribute('href') || ''));
    if (login) login.style.display = 'none';
    if (signup) {
      signup.textContent = 'Portal';
      signup.setAttribute('href', 'student_portal.html');
    }
    navRight.prepend(badge);
  }

  async function requireStudentLogin(returnTo){
    const p = await resolveSession();
    if (p && p.role === 'student') return true;
    localStorage.setItem('odyssey_after_login', returnTo || (location.pathname.split('/').pop() + location.search));
    location.href = 'auth.html?mode=login&role=student';
    return false;
  }

  window.OdysseySessionUI = {
    loggedRole,
    displayName,
    installBadge,
    requireStudentLogin
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installBadge);
  else installBadge();
}());
