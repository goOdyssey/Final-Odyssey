(function(){
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  function config(){
    return window.ODYSSEY_SUPABASE || {};
  }

  function isConfigured(){
    const cfg = config();
    return !!(cfg.enabled && cfg.url && cfg.anonKey && !String(cfg.url).includes('YOUR_PROJECT_REF'));
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
    if (!isConfigured()) return null;
    if (window.__odysseySupabaseClient) return window.__odysseySupabaseClient;
    const sdk = await loadSdk();
    window.__odysseySupabaseClient = sdk.createClient(config().url, config().anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return window.__odysseySupabaseClient;
  }

  function routeForRole(role){
    if (role === 'admin' || role === 'support') return 'admin_dashboard.html';
    if (role === 'instructor') return 'instructor_portal.html';
    if (role === 'institution') return 'instructor_portal.html#subscriptions';
    return 'student_portal.html';
  }

  async function profile(){
    const sb = await client();
    if (!sb) return null;
    const { data: authData, error: userError } = await sb.auth.getUser();
    if (userError || !authData.user) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', authData.user.id).single();
    if (error) throw error;
    return data;
  }

  async function signUp({email,password,role,metadata}){
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { ...(metadata || {}), role } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email,password){
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await profile();
    return { user: data.user, profile: p, redirectTo: routeForRole(p?.role || 'student') };
  }

  async function signOut(){
    const sb = await client();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('odyssey_demo_logged_in');
  }

  async function adminSummary(){
    const sb = await client();
    if (!sb) return null;
    const { data, error } = await sb.rpc('admin_dashboard_summary');
    if (error) throw error;
    return data;
  }

  async function adminCollections(){
    const sb = await client();
    if (!sb) return null;
    const queries = await Promise.all([
      sb.from('admin_student_overview').select('*').order('created_at',{ascending:false}).limit(500),
      sb.from('admin_instructor_overview').select('*').order('created_at',{ascending:false}).limit(500),
      sb.from('admin_instructor_course_detail').select('*').order('created_at',{ascending:false}).limit(500),
      sb.from('admin_payment_detail').select('*').order('created_at',{ascending:false}).limit(500),
      sb.from('admin_exam_results_detail').select('*').order('started_at',{ascending:false}).limit(500),
      sb.from('admin_subscription_detail').select('*').order('created_at',{ascending:false}).limit(500),
      sb.from('admin_student_course_detail').select('*').order('enrolled_at',{ascending:false}).limit(500),
      sb.from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(250)
    ]);
    const firstError = queries.find(q=>q.error)?.error;
    if (firstError) throw firstError;
    const [students,instructors,courses,payments,examResults,subscriptions,enrollments,audit] = queries.map(q=>q.data || []);
    return {
      users: [
        ...students.map(s=>({id:s.student_id,fullName:s.full_name,email:s.email,role:'student',status:s.status,enrollmentsCount:s.enrolled_courses,certificatesCount:s.certificates_issued,pendingPayoutCents:0,createdAt:s.created_at})),
        ...instructors.map(i=>({id:i.instructor_id,fullName:i.full_name,email:i.email,role:'instructor',status:i.status,coursesCount:i.courses_posted,pendingPayoutCents:i.payroll_pending_cents,createdAt:i.created_at}))
      ],
      students,
      instructors: instructors.map(i=>({id:i.instructor_id,fullName:i.full_name,email:i.email,role:'instructor',status:i.status,coursesCount:i.courses_posted,pendingPayoutCents:i.payroll_pending_cents,createdAt:i.created_at})),
      courses: courses.map(c=>({id:c.course_id,title:c.title,instructorName:c.instructor_name,field:c.field,discipline:c.discipline,subject:c.subject,priceCents:c.price_cents,interactionPriceCents:c.qa_price_cents,status:c.status,sessionCount:c.sessions,rating:c.rating,enrolledCount:c.enrollments,createdAt:c.created_at})),
      payments: payments.map(p=>({id:p.id,provider:p.provider,amountCents:p.amount_cents,status:p.status,createdAt:p.created_at,studentName:p.student_name,courseTitle:p.course_title})),
      payoutLedger: instructors.map(i=>({id:i.instructor_id,entryType:'instructor_payout_summary',instructorNetCents:i.payroll_pending_cents,status:i.payroll_pending_cents>0?'pending':'paid',createdAt:i.created_at})),
      exams: examResults.map(e=>({id:e.exam_id,title:e.exam_title,difficulty:e.difficulty,questionCount:null,timeLimitMinutes:null,status:e.status,studentName:e.student_name,scorePercent:e.score_percent})),
      examResults,
      subscriptions,
      enrollments,
      certificates: [],
      messages: [],
      deliveryAttempts: [],
      videos: [],
      privacyRequests: [],
      audit
    };
  }

  async function setUserStatus(id,status){
    const sb = await client();
    if (!sb) return null;
    const { error } = await sb.rpc('admin_set_user_status', { target_user_id: id, new_status: status });
    if (error) throw error;
  }

  async function setCourseStatus(id,status){
    const sb = await client();
    if (!sb) return null;
    const { error } = await sb.rpc('admin_set_course_status', { target_course_id: id, new_status: status });
    if (error) throw error;
  }

  window.OdysseySupabase = {
    isConfigured, client, profile, signUp, signIn, signOut,
    adminSummary, adminCollections, setUserStatus, setCourseStatus
  };
}());
