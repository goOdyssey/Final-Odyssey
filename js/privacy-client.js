(function(){
  // Rewritten to use the real Supabase backend (privacy_get_status /
  // privacy_export_my_data / privacy_request_deletion / privacy_cancel_deletion,
  // all RLS/auth.uid()-scoped RPCs) instead of a /api/privacy/* backend that
  // never existed in this static+Supabase architecture. Function names and
  // signatures are unchanged from before, so student_portal.html and
  // instructor_portal.html need no changes at all.

  async function getCurrentEmail(){
    const sb = await OdysseySupabase.client();
    const { data } = await sb.auth.getUser();
    return data?.user?.email || '';
  }

  // Re-checks the password before a destructive/sensitive action, even though
  // the session itself already proves identity - this guards against e.g. an
  // unlocked device or a hijacked session being used to quietly delete an
  // account without the real owner re-entering credentials.
  async function reverifyPassword(promptLabel){
    const password = prompt(promptLabel);
    if(!password) return false;
    const email = await getCurrentEmail();
    if(!email){ alert('Could not verify your account. Please sign in again.'); return false; }
    try{
      const sb = await OdysseySupabase.client();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
      return true;
    }catch(error){
      alert('Incorrect password.');
      return false;
    }
  }

  async function refresh(statusId){
    const target = document.getElementById(statusId);
    if(!target) return;
    if(!window.OdysseySupabase?.isConfigured?.()){
      target.textContent = 'Privacy controls connect when Supabase is configured for this deployment.';
      return;
    }
    try{
      const sb = await OdysseySupabase.client();
      const { data, error } = await sb.rpc('privacy_get_status');
      if(error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if(row?.status === 'pending'){
        target.textContent = 'Deletion scheduled for ' + new Date(row.scheduled_for).toLocaleDateString() + '. You may cancel before that date.';
      }else if(row?.status === 'completed'){
        target.textContent = 'The most recent deletion request was completed.';
      }else{
        target.textContent = 'No account deletion is scheduled.';
      }
    }catch(error){
      target.textContent = 'Sign in through Odyssey to use privacy controls.';
    }
  }

  async function download(){
    try{
      const sb = await OdysseySupabase.client();
      const { data, error } = await sb.rpc('privacy_export_my_data');
      if(error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'odyssey-data-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      const objectUrl = link.href;
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }catch(error){
      alert(error.message || 'Export failed. Please sign in and try again.');
    }
  }

  async function requestDeletion(statusId){
    if(!confirm('Schedule permanent account deletion after a 30-day cancellation period?')) return;
    const ok = await reverifyPassword('Confirm your Odyssey password.');
    if(!ok) return;
    const reason = prompt('Optional: tell us why you are leaving.') || '';
    try{
      const sb = await OdysseySupabase.client();
      const { data, error } = await sb.rpc('privacy_request_deletion', { p_reason: reason });
      if(error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      alert('Account deletion scheduled for ' + new Date(row.scheduled_for).toLocaleDateString() + '.');
      refresh(statusId);
    }catch(error){
      alert(error.message || 'Could not schedule deletion.');
    }
  }

  async function cancelDeletion(statusId){
    const ok = await reverifyPassword('Confirm your Odyssey password to cancel deletion.');
    if(!ok) return;
    try{
      const sb = await OdysseySupabase.client();
      const { error } = await sb.rpc('privacy_cancel_deletion');
      if(error) throw error;
      alert('Account deletion was cancelled.');
      refresh(statusId);
    }catch(error){
      alert(error.message || 'Could not cancel deletion.');
    }
  }

  window.OdysseyPrivacy = { refresh, download, requestDeletion, cancelDeletion };
})();
