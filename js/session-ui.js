(function(){
  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function loggedRole(){
    return localStorage.getItem('odyssey_demo_logged_in') || '';
  }

  function studentProfile(){
    return readJSON('odyssey_student_profile', {});
  }

  function displayName(){
    const p = studentProfile();
    return p.name || p.full_name || p.email || '';
  }

  function installBadge(){
    const role = loggedRole();
    const name = displayName();
    if (role !== 'student' || !name) return;
    const navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('odysseySessionBadge')) return;
    const badge = document.createElement('a');
    badge.id = 'odysseySessionBadge';
    badge.href = 'student_portal.html';
    badge.textContent = name;
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

  function requireStudentLogin(returnTo){
    if (loggedRole() === 'student') return true;
    localStorage.setItem('odyssey_after_login', returnTo || (location.pathname.split('/').pop() + location.search));
    location.href = 'auth.html?mode=login&role=student';
    return false;
  }

  window.OdysseySessionUI = {
    loggedRole,
    studentProfile,
    displayName,
    installBadge,
    requireStudentLogin
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installBadge);
  else installBadge();
}());
