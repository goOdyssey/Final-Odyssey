(function(){
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  function config(){
    return window.ODYSSEY_SUPABASE || {};
  }

  function isConfigured(){
    const cfg = config();
    return !!(cfg.enabled && cfg.url && cfg.anonKey && !String(cfg.url).includes('YOUR_PROJECT_REF'));
  }

  function assertConfigured(){
    if (!isConfigured()) {
      throw new Error('Supabase is not connected yet. Add your Project URL and anon public key in js/supabase-config.js, then redeploy.');
    }
  }

  function loadSdk(){
    if (window.supabase) return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{
      const existing = document.querySelector('script[data-odyssey-supabase-sdk]');
      if (existing) {
        existing.addEventListener('load',()=>resolve(window.supabase),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = CDN;
      script.async = false;
      script.dataset.odysseySupabaseSdk = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase SDK could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  async function client(){
    assertConfigured();
    if (window.__odysseySupabaseClient) return window.__odysseySupabaseClient;
    const sdk = await loadSdk();
    window.__odysseySupabaseClient = sdk.createClient(config().url, config().anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return window.__odysseySupabaseClient;
  }

  function memberCode(profileRow){
    const code=String(profileRow?.member_code||'').replace(/\D/g,'');
    return /^\d{8}$/.test(code)?code:'';
  }

  function routeForRole(role){
    if (role === 'superuser') return 'founder-dashboard.html';
    if (role === 'admin' || role === 'support') return 'admin_dashboard.html';
    if (role === 'instructor') return 'instructor_portal.html';
    if (role === 'institution') return 'instructor_portal.html#subscriptions';
    return 'student_portal.html';
  }

  function normalizeRole(role){
    return ['student','instructor','institution','admin','support','superuser'].includes(role) ? role : 'student';
  }

  function authMetadata(user){
    return user?.user_metadata || user?.raw_user_meta_data || {};
  }

  async function ensureProfile(user, fallbackRole){
    const sb = await client();
    if (!sb || !user?.id) return null;
    const meta = authMetadata(user);
    const role = normalizeRole(meta.role || fallbackRole || 'student');
    const baseProfile = {
      id: user.id,
      role,
      status: 'active',
      full_name: meta.full_name || meta.name || user.email || '',
      email: user.email || meta.email || '',
      country: meta.country || null,
      city: meta.city || null,
      preferred_language: meta.preferred_language || 'en'
    };

    let { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!error && data) return data;

    // Note: the database trigger handle_new_auth_user() creates this row automatically the
    // instant a new auth user is created, so in normal signup flow we should never actually
    // reach the upsert below - it's a defensive fallback only. Direct client INSERTs on
    // profiles are intentionally blocked by RLS (no insert policy exists for authenticated),
    // so if the trigger ever failed to create the row, this upsert will also fail loudly
    // rather than silently letting someone insert an arbitrary role for themselves.
    const upsert = await sb.from('profiles').upsert(baseProfile, { onConflict: 'id' }).select('*').single();
    if (upsert.error) throw upsert.error;

    if (role === 'student') {
      await sb.from('student_profiles').upsert({
        user_id: user.id,
        learning_goal: meta.learning_goal || null,
        grade_level: meta.grade_level || null
      }, { onConflict: 'user_id' });
    } else if (role === 'instructor') {
      await sb.from('instructor_profiles').upsert({
        user_id: user.id,
        title: meta.title || null,
        bio: meta.bio || null,
        teaching_languages: meta.teaching_languages ? String(meta.teaching_languages).split(',').map(v=>v.trim()).filter(Boolean) : ['English']
      }, { onConflict: 'user_id' });
    } else if (role === 'institution') {
      await sb.from('institution_profiles').upsert({
        user_id: user.id,
        institution_name: meta.institution_name || meta.full_name || 'Institution',
        institution_type: meta.institution_type || null,
        business_email: meta.business_email || user.email || '',
        subject_area: meta.subject_area || null,
        instructor_count: Number(meta.instructor_count || 0)
      }, { onConflict: 'user_id' });
    }

    return upsert.data;
  }

  async function profile(){
    const sb = await client();
    if (!sb) return null;
    const { data: authData, error: userError } = await sb.auth.getUser();
    if (userError || !authData.user) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return ensureProfile(authData.user);
    return data;
  }

  async function user(){
    const sb = await client();
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function session(){
    const sb = await client();
    // getSession() is useful for the access token, but it is local-session state.
    // For UI authentication decisions we also verify the user with Supabase Auth
    // so an expired/stale browser session can never make a visitor look logged in.
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;
    const { data: verified, error: userError } = await sb.auth.getUser();
    if (userError || !verified?.user) return null;
    return data.session;
  }

  async function signUp({email,password,role,metadata}){
    const sb = await client();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { ...(metadata || {}), role },
        emailRedirectTo: `${location.origin}${location.pathname}?mode=login`
      }
    });
    if (error) throw error;
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('This email is already registered. Please log in instead.');
    }
    let odysseyProfile = null;
    let odysseyProfileError = null;
    if (data.user && data.session) {
      try {
        odysseyProfile = await ensureProfile(data.user, role);
      } catch (profileError) {
        odysseyProfileError = profileError;
        console.warn('Odyssey profile sync failed after signup. Auth user was still created.', profileError);
      }
    } else if (data.user) {
      odysseyProfileError = null;
      console.info('Supabase created the Auth user. Profile creation will be handled by the database trigger or after email confirmation.');
    }
    data.odysseyProfile = odysseyProfile;
    data.odysseyProfileError = odysseyProfileError;
    return data;
  }

  async function signIn(email,password){
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    let p = null;
    try {
      p = await profile();
      if (!p && data.user) p = await ensureProfile(data.user);
    } catch (profileError) {
      console.warn('Odyssey profile sync failed after login. Falling back to auth metadata.', profileError);
    }
    const meta = authMetadata(data.user);
    const role = p?.role || meta.role || 'student';
    return { user: data.user, profile: p || { role, full_name: meta.full_name || data.user?.email || '', email: data.user?.email || email, country: meta.country || '', city: meta.city || '' }, redirectTo: routeForRole(role) };
  }

  async function signOut(){
    const sb = await client();
    await sb.auth.signOut();
  }

  // ---- Admin: dashboard summary + full detail drilldowns (already secure, unchanged) ----

  async function adminSummary(){
    const sb = await client();
    const { data, error } = await sb.rpc('admin_dashboard_summary');
    if (error) throw error;
    return data;
  }

  // FIXED: this used to query the admin_* views directly from the browser
  // (sb.from('admin_student_overview').select('*') etc). Those views are owned by a
  // role that bypasses Row Level Security, and had been left readable by anyone,
  // logged in or not. That grant has been revoked on the database. The only way to
  // read this data now is admin_list_collections(), a function that checks is_admin()
  // before returning anything.
  async function adminCollections(){
    const sb = await client();
    const { data, error } = await sb.rpc('admin_list_collections');
    if (error) throw error;

    const students = data.students || [];
    const instructors = data.instructors || [];
    const courses = data.courses || [];
    const payments = data.payments || [];
    const examResults = data.examResults || [];
    const subscriptions = data.subscriptions || [];
    const enrollments = data.enrollments || [];
    const audit = data.audit || [];

    return {
      users: [
        ...students.map(s=>({id:s.student_id,fullName:s.full_name,email:s.email,role:'student',status:s.status,enrollmentsCount:s.enrolled_courses,certificatesCount:s.certificates_issued,pendingPayoutCents:0,createdAt:s.created_at})),
        ...instructors.map(i=>({id:i.instructor_id,fullName:i.full_name,email:i.email,role:'instructor',status:i.status,coursesCount:i.courses_posted,pendingPayoutCents:i.payroll_pending_cents,createdAt:i.created_at}))
      ],
      students,
      instructors: instructors.map(i=>({id:i.instructor_id,fullName:i.full_name,email:i.email,country:i.country,city:i.city,role:'instructor',status:i.status,verification_status:i.verification_status,coursesCount:i.courses_posted,total_students:i.total_students,gross_sales_cents:i.gross_sales_cents,pendingPayoutCents:i.payroll_pending_cents,createdAt:i.created_at})),
      courses: courses.map(c=>({id:c.course_id,title:c.title,instructorName:c.instructor_name,field:c.field,discipline:c.discipline,subject:c.subject,priceCents:c.price_cents,interactionPriceCents:c.qa_price_cents,status:c.status,sessionCount:c.sessions,rating:c.rating,enrolledCount:c.enrollments,createdAt:c.created_at})),
      payments: payments.map(p=>({id:p.id,provider:p.provider,amountCents:p.amount_cents,status:p.status,createdAt:p.created_at,studentName:p.student_name,courseTitle:p.course_title,instructorName:p.instructor_name})),
      payoutLedger: instructors.map(i=>({id:i.instructor_id,entryType:'instructor_payout_summary',instructorNetCents:i.payroll_pending_cents,status:i.payroll_pending_cents>0?'pending':'paid',createdAt:i.created_at})),
      exams: examResults.map(e=>({id:e.exam_id,title:e.exam_title,difficulty:e.difficulty,questionCount:null,timeLimitMinutes:null,status:e.status,studentName:e.student_name,scorePercent:e.score_percent})),
      examResults,
      subscriptions,
      enrollments,
      deliveryAttempts: [],
      videos: [],
      privacyRequests: [],
      audit
    };
  }

  async function adminStudentDetail(studentId){
    const sb = await client();
    const { data, error } = await sb.rpc('admin_student_full_detail', { target_student_id: studentId });
    if (error) throw error;
    return data;
  }

  async function adminInstructorDetail(instructorId){
    const sb = await client();
    const { data, error } = await sb.rpc('admin_instructor_full_detail', { target_instructor_id: instructorId });
    if (error) throw error;
    return data;
  }

  async function setUserStatus(id,status){
    const sb = await client();
    const { error } = await sb.rpc('admin_set_user_status', { target_user_id: id, new_status: status });
    if (error) throw error;
  }

  async function setCourseStatus(id,status){
    const sb = await client();
    const { error } = await sb.rpc('admin_set_course_status', { target_course_id: id, new_status: status });
    if (error) throw error;
  }

  // ---- Founder-only: full user directory + role promote/demote (superuser gate is
  // enforced server-side inside both RPCs, not just by hiding the UI) ----

  async function founderListUsers(){
    const sb = await client();
    const { data, error } = await sb.rpc('founder_list_users');
    if (error) throw error;
    return data || [];
  }

  async function founderSetUserRole(targetUserId, newRole){
    const sb = await client();
    const { error } = await sb.rpc('founder_set_user_role', { target_user_id: targetUserId, new_role: newRole });
    if (error) throw error;
  }

  // ---- NEW: secure purchase / exam / certificate flow ----
  // These replace legacy front-end purchase, exam, and certificate state with
  // server-enforced operations.
  // Each one is enforced server-side, so nothing here can be spoofed from devtools.

  async function generateCertificatePdf(certificateId){
    const sb = await client();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Sign in to download certificates.');
    const url = `${config().url.replace(/\/$/, '')}/functions/v1/generate-certificate-pdf`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: config().anonKey
      },
      body: JSON.stringify({ certificateId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not generate certificate PDF.');
    return data; // { downloadUrl, cached }
  }

  async function enrollInCourse(courseId){
    const sb = await client();
    const { data, error } = await sb.rpc('enroll_in_course', { target_course_id: courseId });
    if (error) throw error;
    return data; // enrollment id
  }

  async function startExamAttempt(examId){
    const sb = await client();
    const { data, error } = await sb.rpc('start_exam_attempt', { target_exam_id: examId });
    if (error) throw error;
    return data; // attempt id
  }

  async function getExamQuestions(attemptId){
    const sb = await client();
    const { data, error } = await sb.rpc('get_exam_questions_for_attempt', { target_attempt_id: attemptId });
    if (error) throw error;
    return data; // question list, no answer key included
  }

  async function submitExamAttempt(attemptId, answers){
    const sb = await client();
    const { data, error } = await sb.rpc('submit_exam_attempt', { target_attempt_id: attemptId, submitted_answers: answers });
    if (error) throw error;
    return data; // { score_percent, correct_count, wrong_count, total }
  }

  async function issueCertificate(enrollmentId){
    const sb = await client();
    const { data, error } = await sb.rpc('issue_certificate', { target_enrollment_id: enrollmentId });
    if (error) throw error;
    return data; // certificate id
  }

  async function adminAnalyticsSnapshot(){
    const sb = await client();
    const { data, error } = await sb.rpc('admin_analytics_snapshot');
    if (error) throw error;
    return data;
  }

  async function adminSetMessageStatus(id, status){
    const sb = await client();
    const { error } = await sb.rpc('admin_set_message_status', { target_message_id: id, new_status: status });
    if (error) throw error;
  }

  async function listSiteContent(){
    const sb = await client();
    const { data, error } = await sb.from('site_content').select('*').order('page').order('content_key');
    if (error) throw error;
    return data || [];
  }

  async function updateSiteContent(contentKey, overrideText, updatedBy){
    const sb = await client();
    const { error } = await sb.from('site_content')
      .update({ override_text: overrideText, updated_at: new Date().toISOString(), updated_by: updatedBy || null })
      .eq('content_key', contentKey);
    if (error) throw error;
  }

  window.OdysseySupabase = {
    isConfigured, client, profile, signUp, signIn, signOut,
    session, user,
    adminSummary, adminCollections, adminStudentDetail, adminInstructorDetail,
    setUserStatus, setCourseStatus,
    adminAnalyticsSnapshot, adminSetMessageStatus, listSiteContent, updateSiteContent,
    memberCode,
    founderListUsers, founderSetUserRole,
    generateCertificatePdf,
    enrollInCourse, startExamAttempt, getExamQuestions, submitExamAttempt, issueCertificate
  };
}());
