/*
 Mux webhook foundation.
 Verify Mux webhook signatures using the provider-supported signing secret,
 deduplicate events, and update only server-owned video processing state.
*/
export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).end();
  if(!process.env.MUX_WEBHOOK_SECRET) return res.status(503).json({error:'Mux webhook not configured'});
  return res.status(501).json({error:'Mux webhook verification adapter not connected'});
}
