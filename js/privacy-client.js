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
    return downloadPDF();
  }

  async function downloadJSON(){
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

  let pdfLibraryPromise = null;
  function loadPdfLibrary(){
    if(window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if(pdfLibraryPromise) return pdfLibraryPromise;
    pdfLibraryPromise = new Promise((resolve,reject)=>{
      const sources=[
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
      ];
      let index=0;
      const tryNext=()=>{
        if(index>=sources.length){reject(new Error('Could not load the PDF export component.'));return;}
        const script=document.createElement('script');
        script.src=sources[index++];script.async=true;
        script.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):tryNext();
        script.onerror=tryNext;
        document.head.appendChild(script);
      };
      tryNext();
    });
    return pdfLibraryPromise;
  }
  function prettyKey(key){
    return String(key||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }
  function flatten(value,prefix='',out=[]){
    if(value===null||value===undefined||value==='') return out;
    if(Array.isArray(value)){
      value.forEach((item,i)=>flatten(item,`${prefix}[${i+1}]`,out));
    }else if(typeof value==='object'){
      Object.entries(value).forEach(([k,v])=>flatten(v,prefix?`${prefix} › ${prettyKey(k)}`:prettyKey(k),out));
    }else out.push([prefix,String(value)]);
    return out;
  }
  function fallbackPrint(data){
    const rows=flatten(data);
    const win=window.open('','_blank','noopener,noreferrer');
    if(!win){alert('Please allow pop-ups to create your PDF export.');return;}
    const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Odyssey data export</title><style>body{font-family:Inter,Arial,sans-serif;color:#18283b;padding:42px;line-height:1.5}h1{font-family:Georgia,serif;margin:0 0 6px;color:#142C4F}p{color:#617083}.row{padding:9px 0;border-bottom:1px solid #e4e9ee}.key{font-weight:800;color:#0F7A6C}.value{margin-top:2px;white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Odyssey personal data export</h1><p>Generated ${new Date().toLocaleString()}</p>${rows.map(([k,v])=>`<div class="row"><div class="key">${escapeHtml(k)}</div><div class="value">${escapeHtml(v)}</div></div>`).join('')}</body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),250);
  }
  async function downloadPDF(){
    try{
      const sb=await OdysseySupabase.client();
      const {data,error}=await sb.rpc('privacy_export_my_data');
      if(error) throw error;
      const jsPDF=await loadPdfLibrary();
      const doc=new jsPDF({unit:'pt',format:'a4'});
      const margin=44,pageW=595,pageH=842,maxW=pageW-margin*2;
      let y=58;
      const addPageIfNeeded=height=>{if(y+height>pageH-48){doc.addPage();y=58}};
      doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(20,44,79);doc.text('Odyssey personal data export',margin,y);y+=25;
      doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(97,112,131);doc.text(`Generated ${new Date().toLocaleString()}`,margin,y);y+=24;
      doc.setDrawColor(18,165,142);doc.setLineWidth(1.2);doc.line(margin,y,pageW-margin,y);y+=18;
      const rows=flatten(data);
      if(!rows.length){doc.setFontSize(11);doc.setTextColor(70,84,101);doc.text('No exportable account records were returned.',margin,y);}
      rows.forEach(([key,value])=>{
        const keyLines=doc.splitTextToSize(key,maxW);
        const valueLines=doc.splitTextToSize(value,maxW);
        const height=12+keyLines.length*11+valueLines.length*12+10;
        addPageIfNeeded(height);
        doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(15,122,108);doc.text(keyLines,margin,y);y+=keyLines.length*11+2;
        doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(39,53,69);doc.text(valueLines,margin,y);y+=valueLines.length*12+10;
        doc.setDrawColor(228,233,238);doc.setLineWidth(.5);doc.line(margin,y-4,pageW-margin,y-4);
      });
      const pages=doc.getNumberOfPages();
      for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,132,145);doc.text(`Odyssey · Personal data export · Page ${i} of ${pages}`,margin,pageH-24)}
      doc.save(`odyssey-data-export-${new Date().toISOString().slice(0,10)}.pdf`);
    }catch(error){
      console.warn('PDF export failed; offering browser print fallback.',error);
      try{
        const sb=await OdysseySupabase.client();const {data,error:rpcError}=await sb.rpc('privacy_export_my_data');if(rpcError)throw rpcError;fallbackPrint(data);
      }catch(fallbackError){alert(fallbackError.message||error.message||'Export failed. Please sign in and try again.');}
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

  window.OdysseyPrivacy = { refresh, download, downloadPDF, downloadJSON, requestDeletion, cancelDeletion };
})();
