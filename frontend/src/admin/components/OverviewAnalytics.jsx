import {useEffect,useId,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,BarChart3,CalendarDays,Info,TrendingUp} from 'lucide-react';
import {apiRequest} from '../../shared/lib/api';
import Select from '../../shared/components/Select';
import {Skeleton,AnalyticsSkeleton} from '../../shared/components/Skeleton';
import '../styles/overviewAnalytics.css';

const palette={active:'#16b982',pending_review:'#edaa38',closed:'#8395b7',expired:'#b2bed0',removed:'#e47987',submitted:'#3478ef',viewed:'#7e98d5',shortlisted:'#28b5b6',interviewing:'#eba43f',offered:'#9a75e5',hired:'#16b982',rejected:'#e47987',withdrawn:'#a7b3c6',job_seeker:'#3478ef',recruiter:'#8b72db',admin:'#2eb9b5',pending:'#edaa38',verified:'#16b982',unknown:'#a7b3c6'};
const seriesConfig=[{key:'users',label:'Members',color:'#3478ef'},{key:'jobs',label:'Jobs',color:'#8b72db'},{key:'applications',label:'Applications',color:'#16b982'},{key:'companies',label:'Companies',color:'#eaa137'}];
const human=value=>String(value||'Unknown').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
const total=rows=>(rows||[]).reduce((sum,row)=>sum+row.value,0);
const dateLabel=value=>new Date(value+'T00:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});

export function useOverviewAnalytics(refreshKey){
  const [days,setDays]=useState(30),[range,setRange]=useState(null),[retry,setRetry]=useState(0),[state,setState]=useState({loading:true,error:'',data:null});
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true,error:'',data:null});
    const query=range?new URLSearchParams({start:range.start,end:range.end}).toString():'days='+days;
    apiRequest('/admin/analytics?'+query,{auth:true,signal:controller.signal,notifyError:false,timeoutMs:30000}).then(data=>{if(!controller.signal.aborted)setState({loading:false,error:'',data});}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,error:error.message||'Analytics could not be loaded.',data:null});});
    return()=>controller.abort();
  },[days,range,refreshKey,retry]);
  return {...state,days,range,setDays:value=>{setRange(null);setDays(value);},applyRange:(start,end)=>{setDays(Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1);setRange({start,end});},reload:()=>setRetry(value=>value+1)};
}

export function OverviewCardGraph({analytics,metric,label}){
  const gradient=useId().replaceAll(':','');
  if(analytics.loading)return <div className="overview-card-graph"><Skeleton width={88} height={42}/><Skeleton width={72} height={9}/></div>;
  if(metric==='activeSites'){
    const config=analytics.data?.portalConfiguration;
    if(!config)return <div className="overview-card-graph overview-card-graph--missing">Unavailable</div>;
    const percent=config.total?config.enabled/config.total*100:0;
    return <div className="overview-card-graph overview-card-graph--portals" title="Current enabled portal configuration, not historical website uptime."><div className="overview-mini-ring" style={{background:`conic-gradient(#27b4bb ${percent}%,#edf2f8 0)`}}><span>{config.enabled}/{config.total}</span></div><small>Enabled now</small></div>;
  }
  const trend=analytics.data?.trends?.[metric];
  if(!trend)return <div className="overview-card-graph overview-card-graph--missing">Trend unavailable</div>;
  const values=trend.values,max=Math.max(...values,1),points=values.map((value,index)=>[4+index*82/Math.max(1,values.length-1),37-value/max*28]),line=points.map(point=>point.join(',')).join(' ');
  const text=trend.total+' added · '+analytics.days+' days';
  return <div className="overview-card-graph" title={`${label}: ${trend.total} current records created in the selected ${analytics.days}-day period; ${trend.previous} in the previous period. This is creation activity, not historical status changes.`}><svg viewBox="0 0 90 44" role="img" aria-label={`${label}: daily creation counts ${values.join(', ')}`}><defs><linearGradient id={'overview-mini-'+gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".18"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><polygon points={`4,43 ${line} 86,43`} fill={`url(#overview-mini-${gradient})`}/><polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx={points.at(-1)[0]} cy={points.at(-1)[1]} r="2" fill="currentColor"/></svg><small>{text}</small></div>;
}

function GrowthChart({data}){
  const [visible,setVisible]=useState(['users','jobs','applications','companies']),[hover,setHover]=useState(null);
  const valid=seriesConfig.filter(item=>data.trends?.[item.key]),shown=valid.filter(item=>visible.includes(item.key));
  if(!valid.length)return <p className="analytics-empty">Growth information is unavailable.</p>;
  const dates=data.dates||[],max=Math.max(1,...shown.flatMap(item=>data.trends[item.key].values)),ceiling=Math.max(4,Math.ceil(max/4)*4),x=index=>48+index*604/Math.max(1,dates.length-1),y=value=>197-value/ceiling*166;
  const selected=hover==null?null:Math.max(0,Math.min(dates.length-1,hover));
  const toggle=key=>setVisible(current=>current.includes(key)?current.filter(value=>valid.some(item=>item.key===value)).length>1?current.filter(value=>value!==key):current:[...current,key]);
  return <><div className="analytics-chart-legend">{valid.map(item=><button type="button" key={item.key} aria-pressed={visible.includes(item.key)} onClick={()=>toggle(item.key)}><i style={{background:item.color}}/>{item.label}<strong>{data.trends[item.key].total}</strong></button>)}</div><div className="analytics-line-frame"><svg viewBox="0 0 680 233" role="img" tabIndex={0} aria-label="Daily additions over the selected period. Use left and right arrow keys to explore daily values." onFocus={()=>setHover(dates.length-1)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setHover(current=>Math.max(0,Math.min(dates.length-1,(current??dates.length-1)+(event.key==='ArrowRight'?1:-1))));}if(event.key==='Escape')setHover(null);}} onMouseMove={event=>{const rect=event.currentTarget.getBoundingClientRect(),local=(event.clientX-rect.left)/rect.width*680;setHover(Math.round((local-48)/604*(dates.length-1)));}} onMouseLeave={()=>setHover(null)}>
    {[0,1,2,3,4].map(index=><g key={index}><line x1="48" x2="652" y1={y(index*ceiling/4)} y2={y(index*ceiling/4)} stroke="#e8eef7" strokeDasharray="3 5"/><text x="35" y={y(index*ceiling/4)+4} textAnchor="end">{index*ceiling/4}</text></g>)}
    {[...new Set([0,Math.floor((dates.length-1)/3),Math.floor((dates.length-1)*2/3),dates.length-1])].map(index=><text key={index} x={x(index)} y="222" textAnchor="middle">{dateLabel(dates[index])}</text>)}
    {shown.map(item=><polyline key={item.key} points={data.trends[item.key].values.map((value,index)=>`${x(index)},${y(value)}`).join(' ')} stroke={item.color} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" fill="none"/>)}
    {selected!=null&&<g><line x1={x(selected)} x2={x(selected)} y1="25" y2="198" stroke="#a9bddc" strokeDasharray="4 4"/>{shown.map(item=><circle key={item.key} cx={x(selected)} cy={y(data.trends[item.key].values[selected])} r="4" fill={item.color} stroke="#fff" strokeWidth="2"/>)}</g>}
  </svg>{selected!=null&&<div className="analytics-chart-tooltip" role="status" style={{left:Math.max(8,Math.min(70,x(selected)/680*100))+'%'}}><strong>{dateLabel(dates[selected])}</strong>{shown.map(item=><span key={item.key}><i style={{background:item.color}}/>{item.label}<b>{data.trends[item.key].values[selected]}</b></span>)}</div>}</div><p className="analytics-footnote">Daily creation activity in UTC. Legend counts cover the selected period. Historical deletions and status changes are not reconstructed.</p></>;
}

function Distribution({rows,label,route,param,donut=false}){
  if(rows===null||rows===undefined)return <p className="analytics-empty">This information is unavailable.</p>;
  const sum=total(rows);let angle=0;
  const stops=rows.map(row=>{const start=angle;angle+=sum?row.value/sum*360:0;return `${palette[row.key]||'#86a0c7'} ${start}deg ${angle}deg`;});
  return <div className={donut?'analytics-distribution analytics-distribution--donut':'analytics-distribution'}>{donut&&<div className="analytics-donut" role="img" aria-label={`${label}: ${sum} records. ${rows.map(row=>human(row.key)+' '+row.value).join(', ')}`} style={{background:sum?`conic-gradient(${stops.join(',')})`:'#edf2f8'}}><div><strong>{sum.toLocaleString()}</strong><span>{label}</span></div></div>}<div className="analytics-breakdown">{rows.length?rows.map(row=>{const percent=sum?Math.round(row.value/sum*100):0;const content=<><div className="analytics-breakdown-label"><span><i style={{background:palette[row.key]||'#86a0c7'}}/>{human(row.key)}</span><strong>{row.value.toLocaleString()}<small>{percent}%</small></strong></div>{!donut&&<div className="analytics-bar-track"><span style={{width:percent+'%',background:palette[row.key]||'#86a0c7'}}/></div>}</>;return route?<Link key={row.key} to={`${route}?${param}=${encodeURIComponent(row.key)}`}>{content}</Link>:<div key={row.key}>{content}</div>;}):<p className="analytics-empty">No records yet.</p>}</div></div>;
}

function PortalChart({rows,days}){
  const [all,setAll]=useState(false);
  if(rows===null)return <p className="analytics-empty">Portal activity is unavailable.</p>;
  const max=Math.max(1,...rows.flatMap(row=>[row.jobs,row.applications]));
  return <><div className="analytics-simple-legend"><span><i style={{background:'#3478ef'}}/>New jobs</span><span><i style={{background:'#9a79dc'}}/>Applications</span></div><div className="analytics-portal-list">{rows.slice(0,all?rows.length:6).map(row=><div key={row.id} className="analytics-portal-row"><div className="analytics-portal-name">{row.slug?<Link to={`/admin/portals/${encodeURIComponent(row.slug)}`}>{row.name}<ArrowRight size={12}/></Link>:row.name}</div><div className="analytics-portal-bars"><div title={row.jobs+' jobs created'}><span style={{width:row.jobs/max*100+'%',background:'#3478ef'}}/><b>{row.jobs}</b></div><div title={row.applications+' applications submitted'}><span style={{width:row.applications/max*100+'%',background:'#9a79dc'}}/><b>{row.applications}</b></div></div></div>)}</div>{rows.length>6&&<button className="analytics-text-button" type="button" onClick={()=>setAll(value=>!value)}>{all?'Show fewer portals':'Show all '+rows.length+' portals'}</button>}<p className="analytics-footnote">Selected {days}-day period, grouped by the job’s posting origin. Cross-posted jobs count once. Applications with no current job are shown as unassigned.</p></>;
}

function AnalyticsLoading(){return <div role="status" aria-busy="true" aria-label="Loading analytics"><AnalyticsSkeleton/></div>;}

function Panel({title,description,children,className=''}){return <section className={'workspace-panel analytics-panel '+className}><div className="analytics-panel-heading"><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}</section>;}

export default function OverviewAnalytics({analytics}){
  const data=analytics.data;
  return <section className="overview-analytics" aria-label="Business analytics">
    {analytics.loading?<AnalyticsLoading/>:analytics.error?<div className="admin-note" role="alert">{analytics.error}<button type="button" className="analytics-text-button" onClick={analytics.reload}>Retry analytics</button></div>:data&&<>
      {data.unavailable.length>0&&<div className="admin-note" role="status"><Info size={15}/>Some analytics sources are unavailable. Affected charts show an unavailable state.</div>}
      <div className="analytics-grid analytics-grid--main"><Panel title="Network growth" description={`New records during the selected ${analytics.days}-day period. Select a legend item to compare series.`}><GrowthChart data={data}/></Panel><Panel title="Current job mix" description="All current listings, grouped by their latest status."><Distribution rows={data.jobStatuses} label="jobs" route="/admin/jobs" param="status" donut/></Panel></div>
      <div className="analytics-grid analytics-grid--three"><Panel title="Application stages" description="Current application statuses; stages are not cumulative funnel steps."><Distribution rows={data.applicationStages} label="applications" route="/admin/applications" param="status"/></Panel><Panel title="Member composition" description="Current registered accounts by platform role."><Distribution rows={data.memberRoles} label="members" route="/admin/users" param="role" donut/></Panel><Panel title="Company verification" description="Current company verification workload."><Distribution rows={data.companyVerification} label="companies" route="/admin/companies" param="verification"/></Panel></div>
      <div className="analytics-grid analytics-grid--main"><Panel title="Portal activity" description={`Job creation and applications during the selected ${analytics.days}-day period.`}><PortalChart rows={data.portals} days={analytics.days}/></Panel><Panel title="Where to focus" description="Actionable signals from current records."><div className="analytics-insights">{data.insights.map(insight=><div key={insight.key} className={'analytics-insight analytics-insight--'+insight.tone}><span className="analytics-insight-value">{insight.value}</span><div><h3>{insight.title}</h3><p>{insight.detail}</p><Link to={insight.to}>{insight.action}<ArrowRight size={13}/></Link></div></div>)}{!data.insights.length&&<p className="analytics-empty">No actionable information is available.</p>}</div></Panel></div>
      <div className="analytics-updated"><TrendingUp size={13}/>Trends describe creation activity; status charts describe current records.<span>Updated {new Date(data.generatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
    </>}
  </section>;
}
