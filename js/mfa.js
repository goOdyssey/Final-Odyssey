(() => {
  const client=()=>OdysseySupabase.client();
  const CACHE_KEY='odyssey_mfa_pending_enrollment';

  // The pending (unverified) enrollment's QR/secret is cached for this
  // browser tab only, so repeated visits to the setup page during the SAME
  // enrollment attempt show the identical QR instead of a new one each time.
  // Supabase only returns a factor's secret once, at creation, so once this
  // is gone (tab closed, different device) a fresh factor has to be issued.
  function readCache(){try{return JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');}catch(e){return null;}}
  function writeCache(data){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(data));}catch(e){}}
  function clearCache(){try{sessionStorage.removeItem(CACHE_KEY);}catch(e){}}

  async function assurance(){const {data,error}=await (await client()).auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;return data;}
  async function factors(){const {data,error}=await (await client()).auth.mfa.listFactors();if(error)throw error;return data;}
  async function verifiedTotpFactor(){return (await factors()).totp?.find(f=>f.status==='verified')||null;}
  async function unverifiedTotpFactor(){return (await factors()).totp?.find(f=>f.status!=='verified')||null;}

  // Starts, or resumes, TOTP enrollment. If an unverified factor already
  // exists and we still have its cached QR in this tab, that same QR/secret
  // is reused so an authenticator app scanned earlier is still valid. Only
  // falls back to issuing a brand-new secret when there's nothing usable to
  // resume (first attempt, or the cache is gone).
  async function enroll(){
    const pending=await unverifiedTotpFactor();
    if(pending){
      const cached=readCache();
      if(cached && cached.id===pending.id) return cached;
      const {error}=await (await client()).auth.mfa.unenroll({factorId:pending.id});
      if(error)throw error;
      clearCache();
    }
    const {data,error}=await (await client()).auth.mfa.enroll({factorType:'totp',issuer:'Odyssey',friendlyName:'Odyssey Founder'});
    if(error)throw error;
    writeCache(data);
    return data;
  }

  // Explicit MFA reset for an account that already has a VERIFIED factor
  // (e.g. "I lost my authenticator device"). This intentionally requires the
  // caller to already be signed in and pass an existing aal2/aal1 session —
  // it must only ever be triggered from an authenticated settings screen
  // after the user explicitly confirms, never from a public login page,
  // since the QR it produces is the live shared secret.
  async function resetAndEnroll(){
    const verified=await verifiedTotpFactor();
    if(verified){
      const {error}=await (await client()).auth.mfa.unenroll({factorId:verified.id});
      if(error)throw error;
    }
    clearCache();
    return enroll();
  }

  async function verify(factorId,code){
    const c=await client();
    const {data:challenge,error:ce}=await c.auth.mfa.challenge({factorId});
    if(ce)throw ce;
    const {data,error}=await c.auth.mfa.verify({factorId,challengeId:challenge.id,code:String(code).trim()});
    if(error)throw error;
    clearCache();
    return data;
  }

  window.OdysseyMFA={assurance,factors,verifiedTotpFactor,unverifiedTotpFactor,enroll,resetAndEnroll,verify};
})();
