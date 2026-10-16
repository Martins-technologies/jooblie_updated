const DAY=86400000;
const sources={
  users:['profiles','id,role,status,created_at',false],
  jobs:['jobs','id,status,created_at,origin_site_id',true],
  companies:['companies','id,status,verification_status,created_at',true],
  applications:['applications','id,status,created_at,job_id',true],
  portals:['sites','id,slug,name,is_active',false],
};
async function readSource(db,[table,fields,live]){
  const rows=[];
  for(let offset=0;offset<50000;offset+=1000){
    let query=db.from(table).select(fields).order('id');
    if(live)query=query.is('deleted_at',null);
    const result=await query.range(offset,offset+999);
    if(result.error)throw new Error('Analytics source unavailable');
    rows.push(...(result.data||[]));
    if((result.data||[]).length<1000)return rows;
  }
  throw new Error('Analytics source exceeds the live aggregation limit');
}
const counts=(rows,key)=>rows===null?null:Object.entries(rows.reduce((result,row)=>{const name=String(row[key]||'unknown');result[name]=(result[name]||0)+1;return result;},{})).map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value);
export function buildOverviewAnalytics(data,days=30,now=new Date(),range=null){
  const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()),endDay=range?Date.parse(range.end+'T00:00:00Z'):today,start=range?Date.parse(range.start+'T00:00:00Z'):endDay-(days-1)*DAY,previousStart=start-days*DAY,endTime=Math.min(now.getTime(),endDay+DAY-1);
  const dates=Array.from({length:days},(_,index)=>new Date(start+index*DAY).toISOString().slice(0,10));
  const inPeriod=row=>{const timestamp=Date.parse(row.created_at);return timestamp>=start&&timestamp<=endTime;};
  function trend(rows,filter=()=>true){
    if(rows===null)return null;
    const values=Array(days).fill(0);let previous=0;
    for(const row of rows){
      if(!filter(row))continue;
      const timestamp=Date.parse(row.created_at);
      if(!Number.isFinite(timestamp)||timestamp>endTime)continue;
      if(timestamp>=start){const index=Math.floor((timestamp-start)/DAY);if(index>=0&&index<days)values[index]++;}
      else if(timestamp>=previousStart)previous++;
    }
    const total=values.reduce((sum,value)=>sum+value,0);
    return {values,total,previous,changePercent:previous>0?Math.round((total-previous)/previous*100):null};
  }
  const trends={users:trend(data.users),jobs:trend(data.jobs),activeJobs:trend(data.jobs,row=>row.status==='active'),pendingJobs:trend(data.jobs,row=>row.status==='pending_review'),companies:trend(data.companies),applications:trend(data.applications)};
  let portals=null;
  if(data.portals!==null&&data.jobs!==null&&data.applications!==null){
    const lookup=new Map(data.portals.map(portal=>[String(portal.id),{id:portal.id,name:portal.name,slug:portal.slug,enabled:portal.is_active,jobs:0,applications:0}]));
    const unknown={id:'unassigned',name:'Unassigned origin',slug:null,jobs:0,applications:0};
    const jobs=new Map(data.jobs.map(job=>[String(job.id),job]));
    const origin=job=>lookup.get(String(job?.origin_site_id))||unknown;
    for(const job of data.jobs)if(inPeriod(job))origin(job).jobs++;
    for(const application of data.applications)if(inPeriod(application))origin(jobs.get(String(application.job_id))).applications++;
    portals=[...lookup.values(),...(unknown.jobs||unknown.applications?[unknown]:[])].sort((a,b)=>b.applications-a.applications||b.jobs-a.jobs||a.name.localeCompare(b.name));
  }
  const insights=[];
  if(data.jobs!==null){
    const pending=data.jobs.filter(job=>job.status==='pending_review');
    const oldest=pending.reduce((time,job)=>Math.min(time,Date.parse(job.created_at)||Infinity),Infinity);
    if(pending.length)insights.push({key:'review',value:pending.length,title:'Jobs awaiting review',detail:Number.isFinite(oldest)?'Oldest submission: '+Math.max(0,Math.floor((now.getTime()-oldest)/DAY))+' days ago.':'Review submissions before publishing.',to:'/admin/moderation',action:'Open review queue',tone:'amber'});
    if(data.applications!==null){
      const applied=new Set(data.applications.map(application=>String(application.job_id)));
      const quiet=data.jobs.filter(job=>job.status==='active'&&Date.parse(job.created_at)<=now.getTime()-7*DAY&&!applied.has(String(job.id)));
      insights.push({key:'reach',value:quiet.length,title:'Older jobs without applications',detail:'Created 7+ days ago, currently active, with no recorded applications.',to:'/admin/jobs?status=active',action:'Review active jobs',tone:'blue'});
    }
  }
  if(data.companies!==null){
    const pending=data.companies.filter(company=>company.verification_status==='pending').length;
    insights.push({key:'verification',value:pending,title:'Companies awaiting verification',detail:data.companies.length?Math.round(pending/data.companies.length*100)+'% of current companies are pending verification.':'No current company records.',to:'/admin/companies?verification=pending',action:'Review companies',tone:'purple'});
  }
  const jobCount=data.jobs?.length,applicationCount=data.applications?.length;
  return {
    days,dates,start:new Date(start).toISOString(),end:new Date(endTime).toISOString(),timezone:'UTC',generatedAt:now.toISOString(),
    trends,jobStatuses:counts(data.jobs,'status'),applicationStages:counts(data.applications,'status'),memberRoles:counts(data.users,'role'),companyVerification:counts(data.companies,'verification_status'),
    portalConfiguration:data.portals===null?null:{enabled:data.portals.filter(portal=>portal.is_active).length,total:data.portals.length},
    totals:{users:data.users?.length??null,jobs:jobCount??null,companies:data.companies?.length??null,applications:applicationCount??null},
    portals,insights,unavailable:Object.entries(data).filter(([,rows])=>rows===null).map(([key])=>key),
  };
}
export async function loadOverviewAnalytics(db,days,range=null){
  const keys=Object.keys(sources),results=await Promise.allSettled(keys.map(key=>readSource(db,sources[key])));
  return buildOverviewAnalytics(Object.fromEntries(keys.map((key,index)=>[key,results[index].status==='fulfilled'?results[index].value:null])),days,new Date(),range);
}
