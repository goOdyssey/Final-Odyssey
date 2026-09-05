export default function handler(req,res){
  const requestId=crypto.randomUUID();
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Request-Id',requestId);
  res.status(200).json({ok:true,service:'odyssey',timestamp:new Date().toISOString(),requestId});
}