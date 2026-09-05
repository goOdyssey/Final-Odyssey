/*
 Production adapter:
 1. authenticate caller
 2. resolve course/video from server-side ID
 3. verify enrollment or instructor/admin access
 4. create a short-lived signed Mux playback JWT server-side
 5. never expose MUX_PRIVATE_KEY to the browser
*/
export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).end();
  if(!process.env.MUX_SIGNING_KEY_ID || !process.env.MUX_PRIVATE_KEY) {
    return res.status(503).json({error:'Mux signing is not configured',code:'PROVIDER_NOT_CONFIGURED'});
  }
  return res.status(501).json({error:'Mux playback authorization foundation prepared; live enrollment/video resolver must be connected.'});
}
