import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {AdminDialog} from './AdminCollection';
import SkeletonContent from '../../shared/components/Skeleton';
import Select from '../../shared/components/Select';
import {apiRequest} from '../../shared/lib/api';
import {jobPayload,validateJobForm} from '../../shared/lib/jobForm';
import {getFieldErrors} from '../../shared/lib/errors';
import {showSuccessToast} from '../../shared/lib/toast';

const empty={title:'',category_id:'',description:'',city:'',province:'',workplace_type:'onsite',employment_type:'full_time',experience_level:'mid_level',salary_min:'',salary_max:'',salary_currency:'CAD',salary_period:'yearly',skills:'',audience_sites:[]};
export default function AdminJobCreate({onClose,onSaved}) {
  const [data,setData]=useState({loading:true,error:'',company:null,categories:[]}),[form,setForm]=useState(empty),[errors,setErrors]=useState({}),[saving,setSaving]=useState(false),[revision,setRevision]=useState(0);
  const pending=useRef(false),formRef=useRef(null);
  useEffect(()=>{
    const controller=new AbortController();setData({loading:true,error:'',company:null,categories:[]});
    Promise.all([apiRequest('/recruiter/companies',{auth:true,signal:controller.signal,notifyError:false}),apiRequest('/public/categories',{signal:controller.signal,notifyError:false})]).then(([companies,categories])=>{if(!controller.signal.aborted)setData({loading:false,error:'',company:companies.items?.[0]||null,categories:categories.items||[]});}).catch(error=>{if(!controller.signal.aborted)setData({loading:false,error:error.message,company:null,categories:[]});});
    return()=>controller.abort();
  },[revision]);
  const field=(key,value)=>{setForm(current=>({...current,[key]:value}));setErrors(current=>({...current,[key]:undefined,form:undefined}));};
  async function submit(event){
    event.preventDefault();if(pending.current||!data.company)return;
    const invalid=validateJobForm(form,data.categories);setErrors(invalid);
    if(Object.keys(invalid).length){formRef.current?.elements.namedItem(Object.keys(invalid)[0])?.focus();return;}
    pending.current=true;setSaving(true);
    try{await apiRequest('/recruiter/jobs',{method:'POST',auth:true,body:jobPayload(form),notifyError:false});onSaved();showSuccessToast('Job created.');}
    catch(error){const fields=getFieldErrors(error);setErrors(Object.keys(fields).length?fields:{form:error.message});}
    finally{pending.current=false;setSaving(false);}
  }
  const error=key=>errors[key]&&<span className="field-error" id={'create-job-'+key}>{Array.isArray(errors[key])?errors[key][0]:errors[key]}</span>;
  const input=(key,label,required=false)=><label>{label}<input name={key} value={form[key]} disabled={saving} aria-required={required} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'create-job-'+key:undefined} onChange={event=>field(key,event.target.value)}/>{error(key)}</label>;
  return <AdminDialog title="Add job" busy={saving} onClose={onClose}>{data.loading?<SkeletonContent variant="form" rows={4} label="Loading posting details"/>:data.error?<div className="admin-state" role="alert"><p>{data.error}</p><button type="button" className="button button--secondary" onClick={()=>setRevision(value=>value+1)}>Try again</button></div>:!data.company?<div className="jobs-create-empty"><h3>A company is required to post a job</h3><p>Your account has no linked employer company. Job posting uses the existing employer workflow and requires a company membership.</p><p>You can review companies below, or have an employer with a linked company submit the listing.</p><div className="admin-dialog__actions"><button type="button" className="button button--secondary" onClick={onClose}>Close</button><Link to="/admin/companies" className="button button--primary">Review companies</Link></div></div>:<form ref={formRef} className="admin-edit-form jobs-create-form" noValidate onSubmit={submit}>
    <div className="admin-note">Posting for <strong>{data.company.name}</strong>. New jobs follow the existing review and portal visibility rules.</div>
    {errors.form&&<p className="error-banner" role="alert">{errors.form}</p>}
    {input('title','Job title',true)}
    <div className="jobs-form-grid"><label>Job category<Select name="category_id" aria-label="Job category" aria-invalid={Boolean(errors.category_id)} aria-describedby={errors.category_id?'create-job-category_id':undefined} value={form.category_id} disabled={saving} onChange={event=>field('category_id',event.target.value)}><option value="">Choose category</option>{data.categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</Select>{error('category_id')}</label><label>Employment type<Select name="employment_type" aria-label="Employment type" value={form.employment_type} disabled={saving} onChange={event=>field('employment_type',event.target.value)}>{['full_time','part_time','contract','temporary','internship','seasonal'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</Select>{error('employment_type')}</label></div>
    <label>Workplace<Select name="workplace_type" aria-label="Workplace" value={form.workplace_type} disabled={saving} onChange={event=>field('workplace_type',event.target.value)}><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></Select></label>
    {form.workplace_type!=='remote'&&<div className="jobs-form-grid">{input('city','City')}{input('province','Province / State')}</div>}
    <label>Description<textarea name="description" rows={7} value={form.description} disabled={saving} aria-required="true" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description?'create-job-description':undefined} onChange={event=>field('description',event.target.value)}/>{error('description')}</label>
    <div className="admin-dialog__actions"><button type="button" className="button button--secondary" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="button button--primary" disabled={saving||!data.categories.length}>{saving?'Submitting…':'Submit job'}</button></div>
  </form>}</AdminDialog>;
}

