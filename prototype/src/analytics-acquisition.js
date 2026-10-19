// Only campaign labels, never referrer URLs, click IDs or advertising IDs.
export const acquisitionFields={
 utm_source:v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v),
 utm_medium:v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v),
 utm_campaign:v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v),
 utm_content:v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v),
 acquisition_status:v=>['attributed','unattributed','unsupported'].includes(v),
 acquisition_method:v=>['play_install_referrer','unavailable'].includes(v),
 install_date:v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v),
 install_observation:v=>['within_24h','older_install','unknown'].includes(v)
};
export function cleanAcquisition(value={}) {
 return Object.fromEntries(Object.entries(value).filter(([key,v])=>acquisitionFields[key]?.(v)));
}
export function createAcquisitionTracker({analytics,platform,readReferrer,now=()=>Date.now()}) {
 let pending=null;
 return async function collect(){
  if(analytics.consent!==true||analytics.hasAcquisition||pending)return;
  const installation=analytics.installationId;
  const task=(async()=>{
   let properties;
   if(platform==='android'){
    const result=await readReferrer();
    properties=cleanAcquisition(result);
    if(!['attributed','unattributed'].includes(properties.acquisition_status))return;
    properties.acquisition_method='play_install_referrer';
    const installed=Number(result.installTimeMs);
    if(Number.isFinite(installed)&&installed>0&&installed<=now()){
     properties.install_date=new Date(installed).toISOString().slice(0,10);
     properties.install_observation=now()-installed<=86400000?'within_24h':'older_install';
    }else properties.install_observation='unknown';
   }else properties={acquisition_status:'unsupported',acquisition_method:'unavailable',install_observation:'unknown'};
   // Withdrawal/re-consent while native work is pending must not attach old results.
   if(analytics.consent===true&&analytics.installationId===installation){analytics.recordAcquisition(properties);void analytics.flush();}
  })();
  pending=task;
  try{await task;}catch{/* Transient Play failure is unknown, never organic. Retry next open. */}
  finally{if(pending===task)pending=null;}
 };
}
