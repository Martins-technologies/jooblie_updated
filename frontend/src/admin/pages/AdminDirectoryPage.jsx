import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, Download, Users, Building2, Globe2, FileText, Activity, ShieldCheck, CheckCircle2, Clock3, UserPlus } from 'lucide-react';
import { TableStatusTabs } from '../../shared/components/DashboardTable';
import { csvCell } from '../utils/jobsExport';
import DashboardLayout from '../../shared/components/DashboardLayout';
import Select from '../../shared/components/Select';
import { Monogram, StatusBadge } from '../../shared/components/WorkspaceCards';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { showSuccessToast } from '../../shared/lib/toast';
import { humanize } from '../../shared/lib/dashboardPresentation';
import { safeWebsite, displayDate, activityLabel } from '../utils/presentation';
import { AdminDialog, CollectionTable, CollectionToolbar, Filter, useAdminCollection } from '../components/AdminCollection';

const tabFilters={users:['status',[['active','Active'],['blocked','Blocked']]],portals:['active',[['true','Enabled'],['false','Disabled']]],companies:['verification',[['pending','Pending'],['verified','Verified'],['rejected','Rejected']]],applications:['status',['submitted','viewed','shortlisted','interviewing','offered','hired','rejected','withdrawn'].map(value=>[value,humanize(value)])],'security-events':['severity',['low','medium','high','critical'].map(value=>[value,humanize(value)])],registrations:['status',['new','contacted','reviewing','closed'].map(value=>[value,humanize(value)])]};
const roles = [['job_seeker','Job seeker'],['recruiter','Recruiter'],['admin','Administrator']];
const configs = {
  users: { title: 'People & access', subtitle: 'Manage account roles with a clear, auditable approval step.', search: 'Search name or email', sort: 'full_name', columns: [{label:'Member',sort:'full_name'},{label:'Account status',sort:'status'},{label:'Role',sort:'role'},{label:'Joined',sort:'created_at'},{label:'Actions'}] },
  portals: { title:'Portal directory', subtitle:'Configured portals and their database activity across your network.', search:'Search name, slug or domain',sort:'name',columns:[{label:'Portal',sort:'name'},{label:'Configuration'},{label:'Type / sector',sort:'site_type'},{label:'Mapped jobs'},{label:'Members'},{label:'Latest activity'},{label:'Actions'}]},
  companies: { title:'Company directory',subtitle:'Review employer records and verification status.',search:'Search company name',sort:'created_at',columns:[{label:'Company',sort:'name'},{label:'Verification',sort:'verification_status'},{label:'Status',sort:'status'},{label:'Created',sort:'created_at'},{label:'Actions'}]},
  applications: { title:'Applications',subtitle:'Monitor application progress across the network.',sort:'created_at',columns:[{label:'Applicant'},{label:'Opportunity'},{label:'Status',sort:'status'},{label:'Applied',sort:'created_at'},{label:'Actions'}]},
  'audit-logs': { title:'Activity log',subtitle:'Recorded administrative and platform actions.',search:'Search action or entity type',sort:'created_at',columns:[{label:'Action',sort:'action'},{label:'Entity',sort:'entity_type'},{label:'Recorded',sort:'created_at'},{label:'Actions'}]},
  'security-events':{title:'Security events',subtitle:'Review recorded access and security events. Event counts do not indicate system health.',search:'Search event type',sort:'created_at',columns:[{label:'Event',sort:'event_type'},{label:'Severity',sort:'severity'},{label:'Recorded',sort:'created_at'},{label:'Actions'}]},
  registrations:{title:'Mississauga registrations',subtitle:'Review job seeker leads submitted through the Mississauga landing page.',search:'Search name, email or city',sort:'created_at',columns:[{label:'Job seeker'},{label:'Location / phone'},{label:'Employment interest'},{label:'Status',sort:'status'},{label:'Received',sort:'created_at'},{label:'Actions'}]},
};
export default function AdminDirectoryPage({ type = 'users' }) {
  const config = configs[type];
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const tablePanel=useRef(null);
  const tabs=tabFilters[type];
  const collection = useAdminCollection(`/admin/${type}`, { sort:config.sort, direction: ['users','portals'].includes(type) ? 'asc':'desc' });
  const { user } = useAuth();
  const [selected,setSelected] = useState(null), [newRole,setNewRole] = useState(''), [saving,setSaving] = useState(false), [roleError,setRoleError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [companyDeleteError, setCompanyDeleteError] = useState('');
  const [newVerification, setNewVerification] = useState('pending'), [rejectionReason, setRejectionReason] = useState(''), [verificationError, setVerificationError] = useState('');
  const [companyDocuments, setCompanyDocuments] = useState(null);
  const [documentError, setDocumentError] = useState('');
  const [newApplicationStatus, setNewApplicationStatus] = useState('submitted'), [applicationStatusError, setApplicationStatusError] = useState('');
  const [registrationOwners,setRegistrationOwners]=useState([]),[newRegistrationStatus,setNewRegistrationStatus]=useState('new'),[newRegistrationOwner,setNewRegistrationOwner]=useState(''),[registrationError,setRegistrationError]=useState('');
  const pending = useRef(false);
  const close = () => { if (!pending.current) setSelected(null); };
  const selectedCompanyId = type === 'companies' ? selected?.id : null;
  useEffect(() => {
    if (!selectedCompanyId) return;
    const controller = new AbortController();
    apiRequest(`/admin/companies/${selectedCompanyId}/documents`, {
      auth: true, notifyError: false, signal: controller.signal,
    }).then(result => {
      if (!controller.signal.aborted) setCompanyDocuments(result.documents);
    }).catch(error => {
      if (!controller.signal.aborted) setDocumentError(error.message || 'Company documents could not be loaded.');
    });
    return () => controller.abort();
  }, [selectedCompanyId]);
  useEffect(()=>{if(type!=='registrations')return;let active=true;apiRequest('/admin/registration-owners',{auth:true,notifyError:false}).then(result=>{if(active)setRegistrationOwners(result.items||[]);}).catch(()=>{if(active)setRegistrationOwners([]);});return()=>{active=false;};},[type]);
  async function saveRole(event) {
    event.preventDefault();
    if (pending.current || !selected || selected.role === newRole || selected.id === user?.id) return;
    pending.current=true;setSaving(true);setRoleError('');
    try {
      await apiRequest(`/admin/users/${selected.id}/role`, { method:'PATCH',auth:true,notifyError:false,body:{ role:newRole,previous_role:selected.role } });
      setSelected(null);collection.reload();showSuccessToast('Account role updated.');
    } catch(error) { setRoleError(error.message || 'This role could not be updated.'); }
    finally {pending.current=false;setSaving(false);}
  }
  async function saveVerification(event) {
    event.preventDefault();
    if (pending.current || !selected || !newVerification) return;
    pending.current = true;
    setSaving(true);
    setVerificationError('');
    try {
      await apiRequest(`/admin/companies/${selected.id}/verification`, {
        method: 'PATCH',
        auth: true,
        notifyError: false,
        body: {
          verification_status: newVerification,
          rejection_reason: newVerification === 'rejected' ? (rejectionReason.trim() || null) : null,
        },
      });
      setSelected(null);
      collection.reload();
      showSuccessToast(`Company verification updated to ${humanize(newVerification)}.`);
    } catch (error) {
      setVerificationError(error.message || 'Could not update company verification.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function deleteCompany() {
    if (pending.current || !selectedCompanyId) return;
    pending.current = true;
    setSaving(true);
    setCompanyDeleteError('');
    try {
      await apiRequest(`/admin/companies/${selectedCompanyId}`, {
        method: 'DELETE', auth: true, notifyError: false,
      });
      setSelected(null);
      collection.reload();
      showSuccessToast('Company deleted.');
    } catch (error) {
      setCompanyDeleteError(error.message || 'This company could not be deleted.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function deleteAccount() {
    if (pending.current || !selected || selected.role === 'admin' || selected.id === user?.id) return;
    pending.current = true;
    setSaving(true);
    setRoleError('');
    try {
      await apiRequest(`/admin/users/${selected.id}`, { method:'DELETE', auth:true, notifyError:false });
      setSelected(null);
      collection.reload();
      showSuccessToast('Account deleted.');
    } catch (error) {
      setRoleError(error.message || 'This account could not be deleted.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function saveApplicationStatus(event) {
    event.preventDefault();
    if (pending.current || !selected || !newApplicationStatus) return;
    pending.current = true;
    setSaving(true);
    setApplicationStatusError('');
    try {
      await apiRequest(`/admin/applications/${selected.id}`, {
        method: 'PATCH',
        auth: true,
        notifyError: false,
        body: { status: newApplicationStatus },
      });
      setSelected(null);
      collection.reload();
      showSuccessToast(`Application status updated to ${humanize(newApplicationStatus)}.`);
    } catch (error) {
      setApplicationStatusError(error.message || 'Could not update application status.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function saveRegistration(event){
    event.preventDefault();
    if(pending.current||!selected)return;
    pending.current=true;setSaving(true);setRegistrationError('');
    try{
      await apiRequest(`/admin/registrations/${selected.id}`,{method:'PATCH',auth:true,notifyError:false,body:{status:newRegistrationStatus,assigned_to:newRegistrationOwner||null}});
      setSelected(null);collection.reload();showSuccessToast('Registration updated.');
    }catch(error){setRegistrationError(error.message||'Registration could not be updated.');}
    finally{pending.current=false;setSaving(false);}
  }

  const summaryConfig={
    users:{icon:Users,label:'Members',field:'status',value:'active',match:'Active on this page',other:'Other account states'},
    companies:{icon:Building2,label:'Companies',field:'verification_status',value:'pending',match:'Awaiting verification on this page',other:'Other verification states'},
    portals:{icon:Globe2,label:'Portals',field:'is_active',value:true,match:'Enabled on this page',other:'Disabled on this page'},
    applications:{icon:FileText,label:'Applications',field:'status',value:'submitted',match:'New submissions on this page',other:'Other application stages'},
    registrations:{icon:UserPlus,label:'Registrations',field:'status',value:'new',match:'New leads on this page',other:'Other follow-up stages'},
    'audit-logs':{icon:Activity,label:'Activity records',field:'action',value:'auth.sign_in',match:'Records on this page',other:'Entity types on this page'},
    'security-events':{icon:ShieldCheck,label:'Security events',field:'severity',value:'critical',match:'Critical on this page',other:'Other severity levels'},
  }[type];
  const matching=type==='audit-logs'?collection.items.length:collection.items.filter(item=>item[summaryConfig.field]===summaryConfig.value).length;
  const secondary=type==='audit-logs'?new Set(collection.items.map(item=>item.entity_type).filter(Boolean)).size:collection.items.length-matching;
  const SummaryIcon=summaryConfig.icon;
  const summaryUnavailable=collection.loading||Boolean(collection.error);
  const open = item => {
    setRoleError('');
    setConfirmDelete(false);
    setCompanyDeleteError('');
    setVerificationError('');
    setApplicationStatusError('');
    setSelected(item);
    if (type === 'users') setNewRole(item.role || '');
    if (type === 'companies') {
      setCompanyDocuments(null);
      setDocumentError('');
      setNewVerification(item.verification_status || 'pending');
      setRejectionReason(item.rejection_reason || '');
    }
    if (type === 'applications') {
      setNewApplicationStatus(item.status || 'submitted');
    }
    if (type === 'registrations') {
      setRegistrationError('');setNewRegistrationStatus(item.status||'new');setNewRegistrationOwner(item.assigned_to||'');
    }
  };
  async function exportPage(format){
    if(exporting||collection.loading||!collection.items.length)return;
    setExporting(true);setExportError('');
    try{
      const table=tablePanel.current?.querySelector('table');
      if(!table)throw new Error('Refresh the records before exporting.');
      const headers=Array.from(table.querySelectorAll('thead th')).slice(0,-1).map(cell=>cell.innerText.trim());
      const rows=Array.from(table.querySelectorAll('tbody tr')).map(row=>Array.from(row.cells).slice(0,-1).map(cell=>cell.innerText.trim()));
      const filename=type+'-page-'+(collection.pagination?.page||1)+'-'+new Date().toISOString().slice(0,10);
      if(format==='pdf'){
        const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
        const doc=new jsPDF({orientation:headers.length>5?'landscape':'portrait'});doc.setFontSize(16);doc.text(config.title,14,18);doc.setFontSize(10);doc.text('Current page · '+rows.length+' records',14,25);autoTable(doc,{head:[headers],body:rows,startY:32,styles:{fontSize:9},headStyles:{fillColor:[24,74,142]}});doc.save(filename+'.pdf');
      }else{
        const blob=new Blob(['\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    }catch(error){setExportError(error.message||'Export unavailable. Please try again.');}finally{setExporting(false);}
  }
  return <DashboardLayout title={config.title} subtitle={config.subtitle}>
    {type === 'portals' && <div className="admin-note">Enabled means the database configuration is active. Website uptime, deployment and integration health are not monitored here.</div>}
    {type === 'companies' && <div className="admin-note">Review and manage employer business verification: <strong>Pending</strong>, <strong>Verified</strong>, or <strong>Rejected</strong>. Verified companies establish verified trust credentials, and newly posted jobs by verified companies are automatically published. Click <strong>Review company</strong> on any company to update its verification status.</div>}
    {['audit-logs','security-events'].includes(type) && <div className="admin-tabs"><Link className={type==='audit-logs'?'is-active':''} to="/admin/activity">Activity log</Link><Link className={type==='security-events'?'is-active':''} to="/admin/security">Security events</Link></div>}
    <div className="directory-summary-grid" aria-label={config.title+' summary'} aria-busy={collection.loading}>
      {[[SummaryIcon,collection.pagination?.total,`Matching ${summaryConfig.label.toLowerCase()}`,'Across all pages · current filters','blue'],[Clock3,matching,summaryConfig.match,'Current page only','amber'],[CheckCircle2,secondary,summaryConfig.other,'Current page only','green']].map(([Icon,value,label,hint,tone])=><article key={label} className={`workspace-panel directory-summary directory-summary--${tone}`}><span className="directory-summary-icon"><Icon size={21} strokeWidth={1.8}/></span><div><span className="directory-summary-label">{label}</span><strong>{summaryUnavailable?'—':Number(value||0).toLocaleString()}</strong><small>{collection.error?'Currently unavailable':collection.loading?'Loading records…':hint}</small></div></article>)}
    </div>
    <section ref={tablePanel} className="workspace-panel admin-collection">
      <CollectionToolbar collection={collection} searchLabel={config.search}>
        {type==='users' && <Filter collection={collection} name="role" label="All roles" options={roles}/>}




        <details className="directory-export"><summary aria-label="Export records"><Download size={15}/>{exporting?'Exporting…':'Export'}</summary><div><button type="button" disabled={exporting||collection.loading||!collection.items.length} onClick={()=>exportPage('csv')}>CSV · current page</button><button type="button" disabled={exporting||collection.loading||!collection.items.length} onClick={()=>exportPage('pdf')}>PDF · current page</button></div></details>
      </CollectionToolbar>
      {exportError&&<div className="admin-note" role="alert">{exportError}</div>}
      {tabs&&<TableStatusTabs label={'Filter '+config.title} value={collection.params.get(tabs[0])||'all'} onChange={value=>collection.update({[tabs[0]]:value})} items={[["all","All"],...tabs[1]]}/>}
      <CollectionTable collection={collection} noun={type==='users'?'members':type==='audit-logs'?'events':type==='security-events'?'events':type} columns={config.columns}>{collection.items.map(item => <tr key={item.id}>
        {type==='users' && <><td><div className="admin-identity"><Monogram name={item.full_name || item.email}/><div><strong>{item.full_name || 'Unnamed member'}{item.id===user?.id && <span className="admin-you">You</span>}</strong><small>{item.email}</small></div></div></td><td><StatusBadge status={item.status || 'unknown'}/></td><td>{roles.find(([role])=>role===item.role)?.[1] || 'Unknown'}</td><td>{displayDate(item.created_at)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="View account" title="View account"><span className="table-action-label">View account</span><Eye size={16}/></button></td></>}
        {type==='portals' && <><td><div className="admin-identity"><Monogram name={item.name}/><div><Link to={`/admin/portals/${encodeURIComponent(item.slug)}`}><strong>{item.name}</strong></Link><small>{item.domain || 'Domain not configured'}</small><small>/{item.slug}</small></div></div></td><td><span className={`workspace-status workspace-status--${item.is_active?'active':'closed'}`}>{item.is_active?'Enabled':'Disabled'}</span></td><td>{humanize(item.site_type)}<small>{item.sectors?.name || 'No sector assigned'}</small></td><td>{item.metrics?.jobs ?? 'Unavailable'}</td><td>{item.metrics?.users ?? 'Unavailable'}</td><td>{item.activityAvailable ? item.lastActivity ? displayDate(item.lastActivity):'No activity recorded':'Unavailable'}</td><td><Link className="admin-row-action" to={`/admin/portals/${encodeURIComponent(item.slug)}`} aria-label="View portal" title="View portal"><span className="table-action-label">View portal</span><Eye size={16}/></Link></td></>}
        {type==='companies' && <><td><div className="admin-identity"><Monogram name={item.name}/><div><strong>{item.name}</strong><small>{item.website || 'No website'}</small></div></div></td><td><StatusBadge status={item.verification_status || 'unknown'}/></td><td><StatusBadge status={item.status || 'unknown'}/></td><td>{displayDate(item.created_at)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="Review company verification" title="Review company verification"><span className="table-action-label">Review company</span><Eye size={16}/></button></td></>}
        {type==='applications' && <><td><strong>{item.profiles?.full_name || 'Unavailable applicant'}</strong><small>{item.profiles?.email}</small></td><td>{item.jobs?.title || 'Unavailable job'}</td><td><StatusBadge status={item.status || 'unknown'}/></td><td>{displayDate(item.created_at)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="View details" title="View details"><span className="table-action-label">View details</span><Eye size={16}/></button></td></>}
        {type==='registrations' && <><td><div className="admin-identity"><Monogram name={item.full_name}/><div><strong>{item.full_name}</strong><small>{item.email}</small></div></div></td><td>{item.current_city}<small>{item.phone_e164}</small></td><td>{humanize(item.employment_goal)}<small>{item.preferred_industry||'No industry selected'}</small></td><td><StatusBadge status={item.status||'new'}/></td><td>{displayDate(item.created_at)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="Review registration" title="Review registration"><span className="table-action-label">Review lead</span><Eye size={16}/></button></td></>}
        {type==='audit-logs' && <><td><strong>{activityLabel(item.action)}</strong></td><td>{humanize(item.entity_type)}</td><td>{displayDate(item.created_at,true)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="View details" title="Details"><span className="table-action-label">Details</span><Eye size={16}/></button></td></>}
        {type==='security-events' && <><td><strong>{humanize(item.event_type)}</strong></td><td><StatusBadge status={item.severity || 'unknown'}/></td><td>{displayDate(item.created_at,true)}</td><td><button type="button" className="admin-row-action" onClick={()=>open(item)} aria-label="View details" title="Details"><span className="table-action-label">Details</span><Eye size={16}/></button></td></>}
      </tr>)}</CollectionTable>
    </section>
    {selected && <AdminDialog title={type==='users'?'Account details':type==='companies'?'Company details':type==='applications'?'Application details':type==='registrations'?'Registration details':'Record details'} busy={saving} onClose={close}>
      {type==='registrations' ? <div className="registration-details">
        <section className="registration-details__group" aria-labelledby="registration-contact-heading"><h3 id="registration-contact-heading">Contact &amp; interests</h3><dl className="admin-details admin-details--compact">{[['Name',selected.full_name],['Email',selected.email],['Phone',selected.phone_e164],['Current city',selected.current_city],['Employment interest',humanize(selected.employment_goal)],['Preferred industry',selected.preferred_industry||'Not provided']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl></section>
        <section className="registration-details__group" aria-labelledby="registration-consent-heading"><h3 id="registration-consent-heading">Consent &amp; attribution</h3><dl className="admin-details admin-details--compact">{[['Terms accepted',selected.terms_accepted?'Yes':'No'],['Terms accepted at',selected.terms_accepted_at||'Not recorded'],['Privacy acknowledged',selected.privacy_acknowledged?'Yes':'No'],['Employer sharing consent',selected.employer_sharing_consent?'Yes':'No'],['Promotional SMS consent',selected.sms_marketing_consent?'Yes':'No'],['SMS consent recorded at',selected.sms_marketing_consent_at||'Not recorded'],['Promotional email consent',selected.email_marketing_consent?'Yes':'No'],['Email consent recorded at',selected.email_marketing_consent_at||'Not recorded'],['Consent version',selected.consent_version||'Not provided'],['Consent copy snapshot',selected.consent_text_snapshot||'Not recorded'],['Campaign source',selected.source_context?.utm_source||'Not provided'],['Campaign',selected.source_context?.utm_campaign||'Not provided'],['Referrer',selected.source_context?.referrer||'Not provided']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{typeof value==='object'?JSON.stringify(value):value}</dd></div>)}</dl></section>
        <section className="registration-details__group registration-details__group--meta" aria-label="Lead follow-up details"><dl className="admin-details admin-details--compact">{[['Assigned administrator',selected.assignee?.full_name||'Unassigned'],['Received',displayDate(selected.created_at,true)],['Follow-up status',humanize(selected.status||'new')]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      </div> : <dl className="admin-details">{(type==='users' ? [['Name',selected.full_name],['Email',selected.email],['Status',humanize(selected.status)],['Joined',displayDate(selected.created_at,true)]] : type==='companies' ? [['Company',selected.name],['Website',selected.website],['Registration number',selected.registration_number || 'Not provided'],['Description',selected.description],['Current verification',humanize(selected.verification_status || 'pending')],['Verified date',selected.verified_at ? displayDate(selected.verified_at,true) : null],['Rejection reason',selected.rejection_reason]] : type==='applications' ? [['Applicant',selected.profiles?.full_name],['Email',selected.profiles?.email],['Job',selected.jobs?.title],['Status',humanize(selected.status)],['Applied',displayDate(selected.created_at,true)]] : [['Event',activityLabel(selected.action || selected.event_type)],['Entity',selected.entity_type],['Recorded',displayDate(selected.created_at,true)],['Record ID',selected.id],['Request ID',selected.request_id]]).filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      {type==='users' && <form onSubmit={saveRole} className="admin-edit-form">{roleError && <div className="error-banner" role="alert">{roleError}</div>}<label>Platform role<Select aria-label="Platform role" value={newRole} disabled={saving || selected.status==='deleted' || selected.id===user?.id} onChange={event=>setNewRole(event.target.value)}>{roles.map(([value,text])=><option key={value} value={value}>{text}</option>)}</Select></label><p className="admin-note">{selected.id===user?.id?'Your own administrator role is protected.':'Changing this role changes which workspace and records this member can access. Confirm only the access they need.'}</p><div className="admin-dialog__actions"><button type="button" className="button button--secondary" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="button button--primary" disabled={saving || selected.status==='deleted' || newRole===selected.role || selected.id===user?.id}>{saving?'Updating role…':'Confirm role change'}</button></div></form>}
      {type==='users' && selected.role!=='admin' && selected.id!==user?.id && <section className="admin-edit-form" aria-label="Delete account">
        {confirmDelete ? <>
          <p className="admin-note">This permanently removes the account, applications, and uploaded resumes. Existing jobs and companies are transferred to your admin account.</p>
          <div className="admin-dialog__actions">
            <button type="button" className="button button--secondary" disabled={saving} onClick={()=>setConfirmDelete(false)}>Back</button>
            <button type="button" className="button button--primary" disabled={saving} onClick={deleteAccount}>{saving?'Deleting account…':'Permanently delete account'}</button>
          </div>
        </> : <button type="button" className="button button--secondary" disabled={saving} onClick={()=>setConfirmDelete(true)}>Delete account</button>}
      </section>}
      {type === 'companies' && <section className="admin-edit-form" aria-label="Company verification documents">
        <strong>Company verification documents</strong>
        {documentError ? <p className="error-banner" role="alert">{documentError}</p>
          : companyDocuments === null ? <p className="admin-note" role="status">Loading documents…</p>
          : companyDocuments.length ? <ul>
            {companyDocuments.map(({ label, url }) => <li key={label}>
              <a href={url} target="_blank" rel="noopener noreferrer">View {label}</a>
            </li>)}
          </ul> : <p className="admin-note">No documents uploaded.</p>}
      </section>}
      {type==='companies' && !confirmDelete && <form onSubmit={saveVerification} className="admin-edit-form" style={{ marginTop: '16px' }}>{verificationError && <div className="error-banner" role="alert">{verificationError}</div>}<label>Verification status<Select aria-label="Verification status" value={newVerification} disabled={saving} onChange={event=>setNewVerification(event.target.value)}><option value="pending">Pending Review</option><option value="verified">Verified (Approved)</option><option value="rejected">Rejected</option></Select></label>{newVerification==='rejected' && <label style={{marginTop:'10px'}}>Rejection reason<textarea className="form-input" style={{minHeight:'70px',marginTop:'4px'}} placeholder="Optional reason for rejection (e.g. invalid business registration, unable to verify domain ownership)..." value={rejectionReason} disabled={saving} maxLength={500} onChange={event=>setRejectionReason(event.target.value)}/></label>}<p className="admin-note">{newVerification==='verified'?'Verifying this company marks their business identity as authentic and enables their posted jobs to be immediately approved and active.':newVerification==='rejected'?'Rejecting verification indicates this company identity could not be verified. Any newly posted jobs will require manual admin moderation.':'Pending review indicates the company identity is awaiting verification of business credentials.'}</p><div className="admin-dialog__actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>{safeWebsite(selected.website) && <a className="button button--secondary" href={safeWebsite(selected.website)} target="_blank" rel="noopener noreferrer">Visit website<ArrowUpRight size={14}/></a>}<button type="button" className="button button--secondary" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="button button--primary" disabled={saving || (newVerification===(selected.verification_status||'pending') && (newVerification!=='rejected' || rejectionReason.trim()===(selected.rejection_reason||'').trim()))}>{saving?'Updating verification…':'Save verification'}</button></div></form>}
      {type === 'companies' && <section className="admin-edit-form" aria-label="Delete company">
        {confirmDelete ? <>
          <p className="admin-note">Delete <strong>{selected.name}</strong> and remove its jobs from listings? Existing applications and verification documents will be kept.</p>
          {companyDeleteError && <p className="error-banner" role="alert">{companyDeleteError}</p>}
          <div className="admin-dialog__actions">
            <button type="button" className="button button--secondary" disabled={saving} onClick={() => setConfirmDelete(false)}>Back</button>
            <button type="button" className="button button--primary" disabled={saving} onClick={deleteCompany}>{saving ? 'Deleting company…' : 'Confirm deletion'}</button>
          </div>
        </> : <button type="button" className="button button--secondary" disabled={saving} onClick={() => {
          setCompanyDeleteError('');
          setConfirmDelete(true);
        }}>Delete company</button>}
      </section>}
      {type==='applications' && <form onSubmit={saveApplicationStatus} className="admin-edit-form" style={{ marginTop: '16px' }}>{applicationStatusError && <div className="error-banner" role="alert">{applicationStatusError}</div>}<label>Application status<Select aria-label="Application status" value={newApplicationStatus} disabled={saving} onChange={event=>setNewApplicationStatus(event.target.value)}><option value="submitted">Submitted</option><option value="viewed">In Progress (Viewed)</option><option value="shortlisted">Shortlisted</option><option value="interviewing">Interviewing</option><option value="offered">Offered</option><option value="hired">Hired</option><option value="rejected">Rejected</option></Select></label><p className="admin-note">Updating the application status will immediately reflect on the candidate's application tracker and the recruiter's hiring board.</p><div className="admin-dialog__actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}><button type="button" className="button button--secondary" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="button button--primary" disabled={saving || newApplicationStatus === selected.status}>{saving?'Updating status…':'Save status'}</button></div></form>}
      {type==='registrations' && <form onSubmit={saveRegistration} className="admin-edit-form registration-followup">{registrationError&&<div className="error-banner" role="alert">{registrationError}</div>}<label>Follow-up status<Select value={newRegistrationStatus} disabled={saving} onChange={event=>setNewRegistrationStatus(event.target.value)}><option value="new">New registration</option><option value="contacted">Contact attempted</option><option value="reviewing">Profile review</option><option value="closed">Closed / no current match</option></Select></label><label>Assign administrator<Select value={newRegistrationOwner} disabled={saving} onChange={event=>setNewRegistrationOwner(event.target.value)}><option value="">Unassigned</option>{registrationOwners.map(owner=><option key={owner.id} value={owner.id}>{owner.full_name||owner.email}</option>)}</Select></label><p className="admin-note">Employer-sharing permission is recorded separately. Do not share this person’s information with employers unless that permission is granted.</p><div className="admin-dialog__actions"><button type="button" className="button button--secondary" disabled={saving} onClick={close}>Close</button><button type="submit" className="button button--primary" disabled={saving}>{saving?'Saving…':'Save follow-up'}</button></div></form>}
    </AdminDialog>}

  </DashboardLayout>;
}
