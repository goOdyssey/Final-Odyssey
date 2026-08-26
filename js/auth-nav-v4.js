/* Odyssey public authentication navigation — v4.
 * One rule only:
 *   verified, non-anonymous Supabase Auth user -> Hi, FirstName
 *   anything else                              -> Log in + Sign up free
 *
 * No localStorage profile, demo flag, cached profile, or role is used to
 * decide whether somebody is logged in. Profile data is read only after the
 * Auth identity has been verified and is used only for the name/destination.
 */
(function () {
  'use strict';

  const LOGGED_OUT =
    '<a class="nav-login" href="auth.html?mode=login">Log in</a>' +
    '<a class="nav-cta" href="auth.html?mode=signup">Sign up free ✨</a>';

  let sequence = 0;
  let subscription = null;
  let running = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFirstName(user, profile) {
    const values = [
      profile?.full_name,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name
    ];
    for (const candidate of values) {
      const value = String(candidate || '').trim();
      if (value) return escapeHtml(value.split(/\s+/)[0]);
    }
    return 'Learner';
  }

  function portalFor(role) {
    if (role === 'instructor' || role === 'institution') return 'instructor_portal.html';
    if (role === 'admin' || role === 'support') return 'admin_dashboard.html';
    if (role === 'superuser') return 'founder-dashboard.html';
    return 'student_portal.html';
  }

  function authTargets() {
    const ids = [
      'landingNavAuth', 'landingMobileAuth',
      'catalogDesktopAuth', 'catalogMobileAuth',
      'subscriptionNavAuth', 'subscriptionMobileAuth'
    ];
    const result = ids.map(id => document.getElementById(id)).filter(Boolean);

    document.querySelectorAll('.nav-right, .nav-mobile-panel').forEach(nav => {
      if (result.includes(nav)) return;
      if (nav.querySelector('#landingNavAuth,#landingMobileAuth,#catalogDesktopAuth,#catalogMobileAuth,#subscriptionNavAuth,#subscriptionMobileAuth')) return;
      const links = [...nav.querySelectorAll('a[href*="mode=login"],a[href*="mode=signup"]')];
      if (!links.length) return;
      result.push({
        set(html) {
          const holder = document.createElement('span');
          holder.className = 'odyssey-auth-nav-slot';
          holder.innerHTML = html;
          links.forEach(link => link.remove());
          nav.appendChild(holder);
        }
      });
    });
    return result;
  }

  function render(html) {
    authTargets().forEach(target => {
      if (typeof target.set === 'function') target.set(html);
      else target.innerHTML = html;
    });
  }

  async function verifiedAuthIdentity() {
    if (!window.OdysseySupabase?.isConfigured?.()) return null;
    const sb = await window.OdysseySupabase.client();

    // getSession() confirms that the client actually has a session.
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session?.user?.id) return null;

    // getUser() is the authoritative server-verified identity check.
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData?.user?.id) return null;

    const user = userData.user;
    if (user.id !== sessionData.session.user.id) return null;

    // Anonymous Auth users are visitors, not logged-in Odyssey accounts.
    if (user.is_anonymous === true) return null;
    if (user.aud && user.aud !== 'authenticated') return null;

    let profile = null;
    try {
      const result = await sb.from('profiles')
        .select('id,role,full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!result.error && result.data?.id === user.id) profile = result.data;
    } catch (error) {
      console.warn('Odyssey auth nav: profile lookup failed; Auth remains authoritative.', error);
    }

    return { user, profile };
  }

  async function sync() {
    const token = ++sequence;
    render(LOGGED_OUT);
    try {
      const identity = await verifiedAuthIdentity();
      if (token !== sequence) return;
      if (!identity) return;

      const role = identity.profile?.role || identity.user.user_metadata?.role || 'student';
      render(`<a class="nav-cta" href="${portalFor(role)}">Hi, ${getFirstName(identity.user, identity.profile)} →</a>`);
    } catch (error) {
      if (token !== sequence) return;
      console.warn('Odyssey auth nav check failed; keeping logged-out navigation.', error);
      render(LOGGED_OUT);
    }
  }

  async function init() {
    render(LOGGED_OUT);
    try {
      if (window.OdysseySupabase?.isConfigured?.()) {
        const sb = await window.OdysseySupabase.client();
        if (subscription?.unsubscribe) subscription.unsubscribe();
        const result = sb.auth.onAuthStateChange((event) => {
          if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
            sync();
          }
        });
        subscription = result?.data?.subscription || null;
      }
    } catch (error) {
      console.warn('Odyssey auth nav listener unavailable.', error);
    }
    await sync();
  }

  window.addEventListener('focus', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('odyssey:auth-changed', sync);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
