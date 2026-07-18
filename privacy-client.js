(function(){
  function csrfToken(){
    const match=document.cookie.match(/(?:^|;\s*)odyssey_csrf=([^;]+)/);
    return match?decodeURIComponent(match[1]):'';
  }
  async function api(path,options){
    const settings={credentials:'same-origin',...(options||{})};
    const method=String(settings.method||'GET').toUpperCase();
    if(!['GET','HEAD'].includes(method)){
      settings.headers={...(settings.headers||{}),'content-type':'application/json','x-odyssey-csrf':csrfToken()};
    }
    const response=await fetch(path,settings);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Privacy request failed.');
    return{response,data};
  }
  async function refresh(statusId){
    const target=document.getElementById(statusId);
    if(!target)return;
    if(location.protocol==='file:'){
      target.textContent='Privacy controls connect when Odyssey is running through the platform server.';
      return;
    }
    try{
      const{data}=await api('/api/privacy/status');
      const deletion=data.deletion;
      if(deletion?.status==='pending'){
        target.textContent='Deletion scheduled for '+new Date(deletion.scheduled_for||deletion.scheduledFor).toLocaleDateString()+'. You may cancel before that date.';
      }else if(deletion?.status==='completed'){
        target.textContent='The most recent deletion request was completed.';
      }else{
        target.textContent='No account deletion is scheduled.';
      }
    }catch(error){
      target.textContent='Sign in through the Odyssey platform to use privacy controls.';
    }
  }
  async function download(){
    if(location.protocol==='file:'){
      alert('Run Odyssey through the platform server and sign in to download your data.');
      return;
    }
    try{
      const response=await fetch('/api/privacy/export',{credentials:'same-origin'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Export failed.');
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);
      link.download='odyssey-data-export-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(link);
      link.click();
      const objectUrl=link.href;
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    }catch(error){alert(error.message)}
  }
  async function requestDeletion(statusId){
    if(location.protocol==='file:'){
      alert('Run Odyssey through the platform server and sign in to manage account deletion.');
      return;
    }
    if(!confirm('Schedule permanent account deletion after a 30-day cancellation period?'))return;
    const password=prompt('Confirm your Odyssey password.');
    if(!password)return;
    const reason=prompt('Optional: tell us why you are leaving.')||'';
    try{
      const{data}=await api('/api/privacy/deletion-request',{method:'POST',body:JSON.stringify({password,reason})});
      alert(data.message||'Account deletion was scheduled.');
      refresh(statusId);
    }catch(error){alert(error.message)}
  }
  async function cancelDeletion(statusId){
    if(location.protocol==='file:')return;
    const password=prompt('Confirm your Odyssey password to cancel deletion.');
    if(!password)return;
    try{
      await api('/api/privacy/deletion-request',{method:'DELETE',body:JSON.stringify({password})});
      alert('Account deletion was cancelled.');
      refresh(statusId);
    }catch(error){alert(error.message)}
  }
  window.OdysseyPrivacy={refresh,download,requestDeletion,cancelDeletion};
})();
