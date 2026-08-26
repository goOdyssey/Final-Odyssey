function configured(name){ if(!process.env[name]) { const e=new Error(`${name} is not configured`); e.code='PROVIDER_NOT_CONFIGURED'; throw e; } return process.env[name]; }
/*
 Production adapter:
 1. authenticate Supabase caller
 2. verify instructor/institution ownership of course
 3. create Direct Upload at Mux
 4. store upload ID + course ID server-side
*/
export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).end();
  try {
    configured('MUX_TOKEN_ID'); configured('MUX_TOKEN_SECRET');
    return res.status(501).json({error:'Mux Direct Upload foundation prepared; ownership resolver must be connected to live schema.'});
  } catch(e) { return res.status(e.code==='PROVIDER_NOT_CONFIGURED'?503:400).json({error:e.message,code:e.code}); }
}
