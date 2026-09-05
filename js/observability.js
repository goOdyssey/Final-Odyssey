(function(){
  'use strict';
  const cfg=window.ODYSSEY_OBSERVABILITY||{};
  const endpoint=cfg.endpoint||null;
  function clean(value){
    const text=String(value||'').slice(0,1200);
    return text.replace(/(authorization|token|password|secret|cookie)=?[^&\s]+/ig,'$1=[redacted]');
  }
  function report(type,error,extra={}){
    const payload={type,message:clean(error?.message||error),stack:clean(error?.stack||''),path:location.pathname,ts:new Date().toISOString(),...extra};
    if(window.Sentry?.captureException && error instanceof Error) { window.Sentry.captureException(error,{extra:payload}); return; }
    if(endpoint) fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
  }
  addEventListener('error',e=>report('error',e.error||e.message,{source:e.filename,line:e.lineno,column:e.colno}));
  addEventListener('unhandledrejection',e=>report('unhandledrejection',e.reason));
  window.OdysseyObservability={report};
})();