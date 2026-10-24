import { useEffect, useRef, useState } from 'react';
import { Building2, FileSpreadsheet, FileText, BriefcaseBusiness, CheckCircle2, Clock3, CircleSlash, Download, Eye, MapPin, MoreVertical, Plus, RefreshCw, SquarePen, Trash2, X, Filter as FilterIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../shared/components/DashboardLayout';
import SkeletonContent from '../../shared/components/Skeleton';
import Select from '../../shared/components/Select';
import { StatusBadge } from '../../shared/components/WorkspaceCards';
import { TableStatusTabs } from '../../shared/components/DashboardTable';
import { apiRequest } from '../../shared/lib/api';
import { showSuccessToast } from '../../shared/lib/toast';
import { getFieldErrors } from '../../shared/lib/errors';
import { displayDate } from '../utils/presentation';
import { AdminDialog, CollectionTable, CollectionToolbar, Filter, useAdminCollection } from '../components/AdminCollection';
import JobMenu from '../components/JobMenu';
import JobSparkline from '../components/JobSparkline';
import AdminJobCreate from '../components/AdminJobCreate';
import { jobsCsv, loadExportJobs } from '../utils/jobsExport';
import '../styles/jobs-management.css';

const statuses = ['active','pending_review','closed','expired','removed'].map(value => [value,value==='pending_review'?'Pending review':value[0].toUpperCase()+value.slice(1)]);
const metricItems=[['all','Total jobs',BriefcaseBusiness,'Across your hiring network'],['active','Active',CheckCircle2,'Published opportunities'],['pending_review','Pending review',Clock3,'Waiting for a decision'],['closed','Closed',CircleSlash,'No longer accepting applications']];
export default function AdminJobsPage() {
  const moderation=useLocation().pathname==='/admin/moderation';
  const collection=useAdminCollection('/admin/jobs',{limit:'10',sort:'created_at',direction:'desc',...(moderation?{status:'pending_review'}:{})});
  const [portals,setPortals]=useState([]),[portalError,setPortalError]=useState(false),[portalRevision,setPortalRevision]=useState(0);
  const [record,setRecord]=useState(null),[creating,setCreating]=useState(false),[selected,setSelected]=useState(new Set());
  const [summary,setSummary]=useState({loading:true,counts:{}}),[revision,setRevision]=useState(0);
  const [deleting,setDeleting]=useState(null),[deleteBusy,setDeleteBusy]=useState(false),[deleteError,setDeleteError]=useState('');
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const exportController=useRef(null),deletePending=useRef(false),allCheckbox=useRef(null);
  const queryKey=collection.params.toString();
  const countParams=new URLSearchParams(collection.params);['status','page','limit','sort','direction'].forEach(key=>countParams.delete(key));
  const countKey=countParams.toString();
  const reload=()=>{collection.reload();setRevision(value=>value+1);};
  useEffect(()=>()=>exportController.current?.abort(),[]);
  useEffect(()=>{setSelected(new Set());setExportError('');},[queryKey]);
  useEffect(()=>{
    const controller=new AbortController();setPortalError(false);
    (async()=>{
      const all=[];
      for(let page=1;;page++){
        const data=await apiRequest('/admin/portals?optionsOnly=true&limit=100&page='+page+'&sort=name&direction=asc',{auth:true,signal:controller.signal,notifyError:false});
        if(controller.signal.aborted)return;
        const items=data.items||[];all.push(...items);
        if(!items.length||all.length>=(data.pagination?.total??Infinity)||items.length<100)break;
      }
      if(!controller.signal.aborted)setPortals([...new Map(all.map(site=>[String(site.id),site])).values()]);
    })().catch(()=>{if(!controller.signal.aborted)setPortalError(true);});
    return()=>controller.abort();
  },[portalRevision]);
  useEffect(()=>{
    const controller=new AbortController();setSummary({loading:true,counts:{}});
    apiRequest('/admin/jobs/insights?'+countKey,{auth:true,signal:controller.signal,notifyError:false}).then(data=>{if(!controller.signal.aborted)setSummary({...data,loading:false,counts:data.counts||{}});}).catch(()=>{if(!controller.signal.aborted)setSummary({loading:false,counts:{all:null,active:null,pending_review:null,closed:null}});});
    return()=>controller.abort();
  },[countKey,revision]);
  const pageIds=collection.items.map(job=>job.id),allSelected=pageIds.length>0&&pageIds.every(id=>selected.has(id));
  useEffect(()=>{if(allCheckbox.current)allCheckbox.current.indeterminate=selected.size>0&&!allSelected;},[selected,allSelected]);
  const select=(id,checked)=>setSelected(current=>{const next=new Set(current);checked?next.add(id):next.delete(id);return next;});
  async function exportJobs(mode,format='csv'){
    if(exportController.current)return;
    const controller=new AbortController();exportController.current=controller;setExporting(true);setExportError('');
    try{
      const rows=mode==='all'?await loadExportJobs(apiRequest,collection.params,controller.signal):collection.items.filter(job=>mode!=='selected'||selected.has(job.id));
      if(!rows.length)throw new Error('There are no jobs to export.');
      if(controller.signal.aborted)return;
      const filename='jooblie-jobs-'+new Date().toISOString().slice(0,10);
      if(format==='pdf'){
        const {downloadJobsPdf}=await import('../utils/jobsPdf');
        if(controller.signal.aborted)return;
        await downloadJobsPdf(rows,filename,{signal:controller.signal,scope:mode==='all'?'All filtered jobs':mode==='selected'?'Selected jobs':'Current page'});
      }else{
        const url=URL.createObjectURL(new Blob(['\uFEFF'+jobsCsv(rows)],{type:'text/csv;charset=utf-8'}));
        const anchor=document.createElement('a');anchor.href=url;anchor.download=filename+'.csv';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
      showSuccessToast(rows.length+' jobs exported.');
    }catch(error){if(!controller.signal.aborted)setExportError(error.message||'Export failed. Please try again.');}
    finally{exportController.current=null;if(!controller.signal.aborted)setExporting(false);}
  }
  async function deleteJob(){
    if(deletePending.current)return;deletePending.current=true;setDeleteBusy(true);setDeleteError('');
    try{await apiRequest('/admin/jobs/'+deleting.id,{method:'DELETE',auth:true,notifyError:false});setDeleting(null);setSelected(new Set());reload();showSuccessToast('Job deleted.');}
    catch(error){setDeleteError(error.message||'This job could not be deleted. Try again.');}
    finally{deletePending.current=false;setDeleteBusy(false);}
  }
  const exportItems=[
    {label:'Download CSV',description:'Current page · '+collection.items.length+' jobs',icon:FileSpreadsheet,action:()=>exportJobs('page','csv')},
    {label:'Download PDF',description:'Current page · '+collection.items.length+' jobs',icon:FileText,action:()=>exportJobs('page','pdf')},
    {label:'Export all results as CSV',description:(collection.pagination?.total??0)+' matching jobs',icon:FileSpreadsheet,action:()=>exportJobs('all','csv')},
    {label:'Export all results as PDF',description:(collection.pagination?.total??0)+' matching jobs',icon:FileText,action:()=>exportJobs('all','pdf')},
    ...(selected.size?[{label:'Export selected as CSV',description:selected.size+' selected jobs',icon:FileSpreadsheet,action:()=>exportJobs('selected','csv')},{label:'Export selected as PDF',description:selected.size+' selected jobs',icon:FileText,action:()=>exportJobs('selected','pdf')}]:[])
  ];
  return <DashboardLayout title={moderation?'Job review queue':'Job management'} subtitle={moderation?'Review pending submissions before publishing.':'Manage opportunities, review submissions and keep your hiring network up to date.'}>
    <div className="jobs-management">
      <div className="jobs-summary" aria-label="Job totals">{metricItems.map(([status,label,Icon,hint])=>{
        const added=summary.recent?.[status],prior=summary.previous?.[status];
        const change=Number.isFinite(added)&&Number.isFinite(prior)&&prior>0?Math.round((added-prior)/prior*100):null;
        const note=summary.loading?hint:change!=null?(change>0?'+':'')+change+'% job additions vs previous 7 days':added!=null?added+' added in the last 7 days':hint;
        return <div key={status} className={'jobs-summary-card jobs-summary-card--'+status}><span className="jobs-summary-icon"><Icon size={23}/></span><span className="jobs-summary-copy"><span className="jobs-summary-label">{label}</span><strong>{summary.loading?<span className="jobs-count-skeleton" aria-label="Loading count"/>:summary.counts[status]?.toLocaleString()??'—'}</strong><small title={countKey?'Totals and chart match the current search and portal filters. '+note:note}>{note}</small></span>{summary.loading?<span className="jobs-chart-skeleton" aria-hidden="true"/>:<JobSparkline values={summary.series?.[status]} label={label}/>}</div>;
      })}</div>
      {!summary.loading&&Object.values(summary.counts).some(value=>value==null)&&<div className="jobs-inline-note" role="status">Some totals are unavailable. <button type="button" onClick={()=>setRevision(value=>value+1)}>Retry totals</button></div>}
      <section className="workspace-panel admin-collection jobs-collection" aria-label="Job listings">
        <CollectionToolbar collection={{...collection,reload}} searchLabel="Search job title or description">
          <span className="jobs-portal-filter"><FilterIcon size={16}/><Filter collection={collection} name="siteId" label="All origin portals" options={portals.map(site=>[String(site.id),site.name])}/></span>
          <JobMenu label={exporting?'Exporting…':'Export'} icon={Download} disabled={exporting||collection.loading||Boolean(collection.error)||!collection.items.length} items={exportItems}/>
          <button type="button" className="jobs-add-button" onClick={()=>setCreating(true)}><Plus size={18}/>Add job</button>
        </CollectionToolbar>
        {portalError&&<div className="jobs-inline-note" role="alert">Portal filters could not be loaded. <button type="button" className="jobs-portal-refresh" aria-label="Refresh portals and jobs" title="Refresh portals and jobs" onClick={()=>{setPortalRevision(value=>value+1);reload();}}><RefreshCw size={17}/></button></div>}
        <TableStatusTabs value={collection.params.get('status')||'all'} onChange={status=>collection.update({status})} items={[[ 'all','All jobs',summary.counts.all],...statuses.map(([status,label])=>[status,label,summary.counts[status]])]}/>
        {selected.size>0&&<div className="jobs-selection" role="status"><strong>{selected.size} selected on this page</strong><button type="button" onClick={()=>exportJobs('selected')} disabled={exporting}><Download size={15}/>Export selected</button><button type="button" onClick={()=>setSelected(new Set())}>Clear selection</button></div>}
        {exportError&&<div className="jobs-inline-note" role="alert">{exportError}<button type="button" onClick={()=>setExportError('')} aria-label="Dismiss export error"><X size={16}/></button></div>}
        <CollectionTable collection={collection} noun="jobs" columns={[{label:<input ref={allCheckbox} type="checkbox" aria-label="Select all jobs on this page" checked={allSelected} disabled={collection.loading||!pageIds.length} onChange={event=>setSelected(event.target.checked?new Set(pageIds):new Set())}/>,width:'4%'},{label:'Job',sort:'title',width:'42%'},{label:'Origin portal',width:'18%'},{label:'Created',sort:'created_at',width:'14%'},{label:'Status',sort:'status',width:'13%'},{label:'Actions',width:'9%'}]}>{collection.items.map(job=><tr key={job.id} className={selected.has(job.id)?'is-selected':''}><td><input type="checkbox" aria-label={'Select '+job.title} checked={selected.has(job.id)} onChange={event=>select(job.id,event.target.checked)}/></td><td><button className="admin-title-button" type="button" onClick={()=>setRecord({id:job.id,mode:'view'})} title={job.title}>{job.title}</button><small className="table-job-location jobs-job-meta"><Building2 size={13} aria-hidden="true"/><span className="jobs-company-name" title={job.companies?.name}>{job.companies?.name||'Unavailable company'}</span><span aria-hidden="true">·</span><MapPin size={13}/>{[job.city,job.province].filter(Boolean).join(', ')||(job.is_remote?'Remote':'Location not specified')}</small></td><td><span className="jobs-origin"><span aria-hidden="true"><BriefcaseBusiness size={15}/></span><span title={job.sites?.name}>{job.sites?.name||'Unavailable portal'}</span></span></td><td>{displayDate(job.created_at)}</td><td><StatusBadge status={job.status||'unknown'}/></td><td><div className="jobs-row-actions"><button type="button" className="jobs-icon-button" aria-label={'View '+job.title} title="View job" onClick={()=>setRecord({id:job.id,mode:'view'})}><Eye size={18}/></button><JobMenu label={'Actions for '+job.title} icon={MoreVertical} iconOnly items={[{label:'View job',icon:Eye,action:()=>setRecord({id:job.id,mode:'view'})},{label:'Edit job',icon:SquarePen,action:()=>setRecord({id:job.id,mode:'edit'})},{label:'Delete job',icon:Trash2,danger:true,action:()=>{setDeleteError('');setDeleting(job);}}]}/></div></td></tr>)}</CollectionTable>
      </section>
    </div>
    {record&&<JobEditor key={record.id+record.mode} jobId={record.id} readOnly={record.mode==='view'} onEdit={()=>setRecord({...record,mode:'edit'})} onClose={()=>setRecord(null)} onSaved={()=>{setRecord(null);reload();}}/>}
    {creating&&<AdminJobCreate onClose={()=>setCreating(false)} onSaved={()=>{setCreating(false);reload();}}/>}
    {deleting&&<AdminDialog title="Delete job?" busy={deleteBusy} onClose={()=>setDeleting(null)}><p className="jobs-delete-copy">Delete <strong>{deleting.title}</strong>? It will be removed from public listings and this job directory. Existing application records are retained.</p>{deleteError&&<p className="error-banner" role="alert">{deleteError}</p>}<div className="admin-dialog__actions"><button type="button" className="button button--secondary" disabled={deleteBusy} onClick={()=>setDeleting(null)}>Keep job</button><button type="button" className="jobs-delete-button" disabled={deleteBusy} onClick={deleteJob}>{deleteBusy?'Deleting…':'Delete job'}</button></div></AdminDialog>}
  </DashboardLayout>;
}
function JobEditor({ jobId,onClose,onSaved,readOnly=false,onEdit }) {
  const [state,setState]=useState({loading:true,error:'',job:null,metrics:{}}), [form,setForm]=useState({}), [errors,setErrors]=useState({}), [saving,setSaving]=useState(false),[revision,setRevision]=useState(0);
  const pending=useRef(false);
  useEffect(()=>{const controller=new AbortController();setState({loading:true,error:'',job:null});apiRequest(`/admin/jobs/${jobId}`,{auth:true,signal:controller.signal,notifyError:false}).then(data=>{if(!controller.signal.aborted){setState({...data,loading:false,error:''});setForm({title:data.job.title,description:data.job.description,status:data.job.status,moderation_note:''});setErrors({});}}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,error:error.message,job:null});});return()=>controller.abort();},[jobId,revision]);
  const dirty=state.job && ['title','description','status'].some(key=>String(form[key]||'').trim()!==String(state.job[key]||'').trim());
  const field=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:undefined,form:undefined}));};
  async function save(event) {
    event.preventDefault();if(pending.current || !dirty)return;
    const invalid={};if((form.title||'').trim().length<3)invalid.title='Enter at least 3 characters.';if((form.description||'').trim().length<20)invalid.description='Enter at least 20 characters.';
    if(form.status==='removed' && !form.moderation_note.trim())invalid.moderation_note='Explain why this listing is being removed.';
    setErrors(invalid);if(Object.keys(invalid).length){event.currentTarget.elements.namedItem(Object.keys(invalid)[0])?.focus();return;}
    const changes=Object.fromEntries(['title','description','status'].filter(key=>String(form[key]||'').trim()!==String(state.job[key]||'').trim()).map(key=>[key,form[key].trim()]));
    if(changes.status==='removed')changes.moderation_note=form.moderation_note.trim();
    pending.current=true;setSaving(true);
    try {
      await apiRequest(`/admin/jobs/${jobId}`,{method:'PATCH',auth:true,body:{...changes,expected_updated_at:state.job.updated_at},notifyError:false});
      onSaved();showSuccessToast('Job updated.');
    } catch(error){const fields=getFieldErrors(error);if(Object.keys(fields).length)setErrors(fields);else setErrors({form:error.message});}
    finally {pending.current=false;setSaving(false);}
  }
  if(readOnly)return <AdminDialog title="Job details" onClose={onClose}>{state.loading?<SkeletonContent variant="form" rows={3} label="Loading job details"/>:state.error?<div className="admin-state" role="alert"><p>{state.error}</p><button type="button" className="button button--secondary" onClick={()=>setRevision(value=>value+1)}>Try again</button></div>:state.job&&<div className="jobs-detail"><StatusBadge status={state.job.status}/><h3>{state.job.title}</h3><p>{state.job.companies?.name||'Unavailable company'}</p><dl>{[['Origin portal',state.job.sites?.name],['Location',[state.job.city,state.job.province].filter(Boolean).join(', ')||(state.job.is_remote?'Remote':'Not specified')],['Created',displayDate(state.job.created_at)],['Applications',state.metrics?.applications],['Views',state.metrics?.views]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'—'}</dd></div>)}</dl><section className="jobs-detail-portals"><h4>Visible on portals</h4><div>{(state.portals||[]).map(portal=><span key={portal.id} title={portal.domain||portal.slug}>{portal.name}</span>)}</div>{!state.portals?.length&&<p>No portal visibility mapping was returned for this job.</p>}</section><h4>Description</h4><p className="jobs-description">{state.job.description}</p><div className="admin-dialog__actions"><button type="button" className="button button--secondary" onClick={onClose}>Close</button><button type="button" className="button button--primary" onClick={onEdit}><SquarePen size={16}/>Edit job</button></div></div>}</AdminDialog>;
  return <AdminDialog title="Review opportunity" busy={saving} onClose={onClose}>{state.loading?<SkeletonContent variant="form" rows={2} label="Loading opportunity"/>:state.error?<div className="admin-state" role="alert"><p>{state.error}</p><button className="button button--secondary" type="button" onClick={()=>setRevision(x=>x+1)}>Try again</button></div>:state.job&&<form onSubmit={save} className="admin-edit-form"><div className="admin-note">{state.job.companies?.name || 'Unavailable company'} · {state.metrics?.applications ?? '—'} applications · {state.metrics?.views ?? '—'} views</div>{errors.form&&<p className="error-banner" role="alert">{errors.form}</p>}
      <label>Job title<input name="title" required minLength={3} maxLength={180} value={form.title||''} disabled={saving} onChange={event=>field('title',event.target.value)} aria-invalid={Boolean(errors.title)}/>{errors.title&&<span className="field-error">{errors.title}</span>}</label>
      <label>Description<textarea name="description" required minLength={20} maxLength={30000} rows={7} value={form.description||''} disabled={saving} onChange={event=>field('description',event.target.value)} aria-invalid={Boolean(errors.description)}/>{errors.description&&<span className="field-error">{errors.description}</span>}</label>
      <label>Listing status<Select name="status" aria-label="Listing status" disabled={saving} value={form.status} onChange={event=>field('status',event.target.value)}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></label>
      {form.status==='removed'&&<label>Removal reason<textarea name="moderation_note" required maxLength={5000} value={form.moderation_note} disabled={saving} onChange={event=>field('moderation_note',event.target.value)} aria-invalid={Boolean(errors.moderation_note)}/>{errors.moderation_note&&<span className="field-error">{errors.moderation_note}</span>}</label>}
      {dirty&&form.status!==state.job.status&&<p className="admin-note">Confirming changes will {form.status==='active'?'publish this job to its mapped portals':`set this listing to ${statuses.find(([value])=>value===form.status)?.[1].toLowerCase()}`}.</p>}
      <div className="admin-dialog__actions"><button className="button button--secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="button button--primary" type="submit" disabled={saving || !dirty}>{saving?'Saving changes…':'Confirm & save changes'}</button></div>
    </form>}</AdminDialog>;
}
