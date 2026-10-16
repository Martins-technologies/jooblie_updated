import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, BriefcaseBusiness, FileText, Globe2, Users, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import SkeletonContent from '../../shared/components/Skeleton';
import { MetricCard, PanelHeading, StatusBadge } from '../../shared/components/WorkspaceCards';
import { apiRequest } from '../../shared/lib/api';
import { humanize } from '../../shared/lib/dashboardPresentation';
import { displayDate, activityLabel } from '../utils/presentation';
import OverviewAnalytics, {useOverviewAnalytics,OverviewCardGraph} from '../components/OverviewAnalytics';

export default function AdminDashboardPage() {
  const [state,setState]=useState({loading:true,error:'',data:{}}), [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setState(previous=>({...previous,loading:true,error:''}));apiRequest('/admin/dashboard',{auth:true,signal:controller.signal,notifyError:false}).then(data=>{if(!controller.signal.aborted)setState({loading:false,error:'',data});}).catch(error=>{if(!controller.signal.aborted)setState(previous=>({...previous,loading:false,error:error.message}));});return()=>controller.abort();},[revision]);
  const analytics=useOverviewAnalytics(revision);
  const data=state.data, metrics=data.metrics||{}, unavailable=data.unavailable||[];
  const missing=key=>unavailable.includes(key);
  const empty=(key,text)=> <p className="admin-section-empty">{missing(key)?'This information is currently unavailable.':text}</p>;
  const preview=metric=>{
    if(metric==='users')return data.recentUsers?.length?data.recentUsers.slice(0,2).map(member=><Link key={member.id} to={`/admin/users?search=${encodeURIComponent(member.email||member.full_name||'')}`}><span>{member.full_name||member.email||'Unnamed member'}</span><small>{humanize(member.role)}</small></Link>):<span>No recent members</span>;
    if(metric==='activeJobs'||metric==='pendingJobs'){
      const jobs=metric==='pendingJobs'?data.pendingJobs:data.recentJobs?.filter(job=>job.status==='active');
      return jobs?.length?jobs.slice(0,2).map(job=><Link key={job.id} to={metric==='pendingJobs'?'/admin/moderation':`/admin/jobs?search=${encodeURIComponent(job.title)}`}><span>{job.title}</span><small>{job.companies?.name||displayDate(job.created_at)}</small></Link>):<span>{metric==='pendingJobs'?'No jobs awaiting review':'No recent active opportunities'}</span>;
    }
    if(metric==='activeSites')return data.sites?.slice(0,2).map(site=><Link key={site.id} to={`/admin/portals/${encodeURIComponent(site.slug)}`}><span>{site.name}</span><small>{site.is_active?'Enabled':'Disabled'}</small></Link>);
    if(metric==='companies')return <><Link to="/admin/companies?verification=pending"><span>Awaiting verification</span><small>{metrics.pendingCompanies??'—'}</small></Link><Link to="/admin/companies"><span>Company directory</span><ArrowRight size={13}/></Link></>;
    return <><Link to="/admin/applications?status=submitted"><span>New submissions</span><small>{metrics.pendingApplications??'—'}</small></Link><Link to="/admin/applications"><span>All applications</span><ArrowRight size={13}/></Link></>;
  };
  return <DashboardLayout title="Network overview" subtitle="The people, opportunities and decisions that need your attention." actions={<button type="button" className="button button--secondary" disabled={state.loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={15} className={state.loading?'dashboard-refresh-spinner':undefined}/>{state.loading?'Refreshing…':'Refresh overview'}</button>}>
    {state.loading?<SkeletonContent variant="admin-dashboard" rows={5} metrics={6} label="Loading network overview"/>:state.error&&!data.metrics?<div className="admin-state" role="alert"><strong>Overview unavailable</strong><p>{state.error}</p><button type="button" className="button button--secondary" onClick={()=>setRevision(value=>value+1)}>Try again</button></div>:<div className="workspace-stack" aria-busy={state.loading}>
      {state.error&&<div className="admin-note" role="alert">{state.error} Previous results are still shown.</div>}
      {unavailable.length>0&&<div className="admin-note" role="status">Some information could not be loaded. Unavailable figures are shown with a dash.</div>}
      <div className="admin-metrics">{[[Users,'Members',metrics.users,'All registered accounts','/admin/users','blue','users'],[BriefcaseBusiness,'Active jobs',metrics.activeJobs,`${metrics.jobs ?? '—'} total listings`,'/admin/jobs?status=active','purple','activeJobs'],[FileText,'Awaiting review',metrics.pendingJobs,'Job submissions needing a decision','/admin/moderation','amber','pendingJobs'],[Building2,'Companies',metrics.companies,`${metrics.pendingCompanies ?? '—'} pending verification`,'/admin/companies','green','companies'],[Globe2,'Enabled portals',metrics.activeSites,`${metrics.sites ?? '—'} configured portal records`,'/admin/portals','cyan','activeSites'],[ShieldCheck,'Applications',metrics.applications,`${metrics.pendingApplications ?? '—'} newly submitted`,'/admin/applications','purple','applications']].map(([Icon,label,value,hint,to,tone,metric])=><section className={`admin-summary-card workspace-panel admin-summary-card--${tone}`} key={label}><Link to={to} aria-label={`${label}: ${value ?? 'unavailable'}. ${hint}`} className="admin-metric-link"><MetricCard icon={Icon} label={label} value={value} hint={hint} tone={tone}/><OverviewCardGraph analytics={analytics} metric={metric} label={label}/></Link><div className="admin-summary-preview">{preview(metric)}</div><Link className="admin-summary-footer" to={to}>{metric==='pendingJobs'?'Review pending jobs':metric==='activeSites'?'View all portals':`View all ${label.toLowerCase()}`}<ArrowRight size={14}/></Link></section>)}</div>
      <div className="admin-overview-grid admin-priority-grid"><section className="workspace-panel"><PanelHeading title="Needs attention" description="Review the oldest pending opportunities first." to="/admin/moderation" link="Open queue"/>{data.pendingJobs?.length?<div className="admin-preview-list">{data.pendingJobs.slice(0,3).map(job=><Link key={job.id} to={`/admin/moderation?search=${encodeURIComponent(job.title)}`}><span><strong>{job.title}</strong><small>{job.companies?.name || 'Unavailable company'} · {displayDate(job.created_at)}</small></span><StatusBadge status={job.status}/></Link>)}</div>:empty('queue','No jobs are awaiting review.')}<div className="admin-queue-footer"><Link to="/admin/companies?verification=pending"><Building2 size={16}/><span>Companies awaiting verification</span><strong>{metrics.pendingCompanies ?? '—'}</strong><ArrowRight size={14}/></Link><Link to="/admin/applications?status=submitted"><FileText size={16}/><span>Newly submitted applications</span><strong>{metrics.pendingApplications ?? '—'}</strong><ArrowRight size={14}/></Link></div></section>
<section className="workspace-panel"><PanelHeading title="Recent activity" to="/admin/activity"/>{data.auditLogs?.length?<div className="admin-event-list">{data.auditLogs.slice(0,4).map(event=><div key={event.id}><span className="admin-event-dot"/><span><strong>{activityLabel(event.action)}</strong><small>{humanize(event.entity_type)}</small></span><time>{displayDate(event.created_at,true)}</time></div>)}</div>:empty('audit','No activity has been recorded.')}</section></div>
      <OverviewAnalytics analytics={analytics}/>
    </div>}
  </DashboardLayout>;
}
