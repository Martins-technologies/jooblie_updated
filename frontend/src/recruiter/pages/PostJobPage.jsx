import SkeletonContent from '../../shared/components/Skeleton';
import Select from '../../shared/components/Select';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, MapPin, AlignLeft, Building2, ArrowLeft,
  Loader2, Wrench, GraduationCap, Clock, FolderGit2,
  DollarSign, MonitorSmartphone,
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { showErrorToast, showSuccessToast } from '../../shared/lib/toast';
import { applyFormErrors, validateForm } from '../../shared/lib/formValidation';
import { getFieldErrors, extractErrorMessage } from '../../shared/lib/errors';
import { jobPayload, validateJobForm } from '../../shared/lib/jobForm';

const emptyForm = {
  title: '', category_id: '', workplace_type: 'onsite', employment_type: 'full_time',
  experience_level: 'mid_level', city: '', province: '', skills: '',
  salary_min: '', salary_max: '', salary_currency: 'CAD', salary_period: 'yearly',
  description: '', audience_sites: [],
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [audiencePortals, setAudiencePortals] = useState([]);
  const [audiencePortalsError, setAudiencePortalsError] = useState('');
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef(null);
  const pending = useRef(false);
  const published = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [catsRes, companyRes] = await Promise.all([
          apiRequest('/public/categories'),
          apiRequest('/recruiter/companies', { auth: true }),
        ]);
        if (!mounted) return;
        setCategories(catsRes?.items || []);
        const companies = companyRes?.items || [];
        if (!companies.length) throw new Error('No company is linked to your recruiter account. Please contact support.');
        setCompany(companies[0]);
        try {
          const portalsRes = await apiRequest('/recruiter/portals', { auth: true, notifyError: false });
          if (mounted) setAudiencePortals(portalsRes?.items || []);
        } catch {
          if (mounted) setAudiencePortalsError('Additional portals could not be loaded. You can still publish to Jooblie and this portal.');
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load your recruiter profile.');
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'workplace_type' && value === 'remote' ? { city: '', province: '' } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current || published.current || initialLoading) return;
    if (!company) {
      showErrorToast('Your recruiter account is not linked to a company.');
      return;
    }
    setError('');
    const fieldErrors = validateJobForm(form, categories);
    if (!validateForm(formRef.current)) return;
    if (Object.keys(fieldErrors).length) {
      applyFormErrors(formRef.current, { code: 'VALIDATION_ERROR', details: { fieldErrors } });
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      await apiRequest('/recruiter/jobs', { method: 'POST', auth: true, body: jobPayload(form), form: formRef.current });
      published.current = true;
      showSuccessToast('Job listing published successfully.');
      navigate('/my-jobs', { state: { successMsg: 'Job published successfully.' } });
    } catch (err) {
      if (!Object.keys(getFieldErrors(err)).length || !applyFormErrors(formRef.current, err)) {
        showErrorToast(err, 'Failed to submit the job.');
        setError(extractErrorMessage(err, 'Failed to submit the job.'));
      }
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Post a Job"
      subtitle="Create a job listing and publish it to the relevant hiring portals."
      actions={<Link to="/dashboard/recruiter" className="button button--secondary"><ArrowLeft size={16} /> Back to Dashboard</Link>}
    >
      <div className="dashboard-panel" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        {error && <div className="error-banner" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {initialLoading ? <SkeletonContent variant="form" rows={3} label="Loading company and job categories..." /> : (
          <form noValidate ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            <fieldset disabled={loading} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'grid', gap: '1.35rem' }}>
            <section style={{ padding: '1rem 1.1rem', border: '1px solid #dbe4ef', borderRadius: 10, background: '#f8fbff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontWeight: 800 }}><Building2 size={18} /> Employer</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{company?.name}</div>
              <div style={{ color: '#6b7280', fontSize: '.88rem', marginTop: 4 }}>Company is locked to your recruiter account. It cannot be changed for this job.</div>
            </section>

            <div className="job-form-grid job-form-grid--title">
              <Field label="Job title" icon={<Briefcase size={16} />}><input name="title" required minLength={3} maxLength={180} value={form.title} onChange={handleChange} placeholder="e.g. Senior React Developer" /></Field>
              <Field label="Job category" icon={<FolderGit2 size={16} />}><Select name="category_id" required value={form.category_id} onChange={handleChange}><option value="">Choose category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</Select></Field>
            </div>

            <div className="job-form-grid job-form-grid--three">
              <Field label="Workplace" icon={<MonitorSmartphone size={16} />}><Select name="workplace_type" value={form.workplace_type} onChange={handleChange}><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></Select></Field>
              <Field label="Employment type" icon={<Clock size={16} />}><Select name="employment_type" value={form.employment_type} onChange={handleChange}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="temporary">Temporary</option><option value="internship">Internship</option><option value="seasonal">Seasonal</option></Select></Field>
              <Field label="Experience level" icon={<GraduationCap size={16} />}><Select name="experience_level" value={form.experience_level} onChange={handleChange}><option value="entry_level">Entry level</option><option value="mid_level">Mid level</option><option value="senior">Senior</option><option value="executive">Executive / Director</option></Select></Field>
            </div>

            <div className="job-form-grid">
              <Field label="City" icon={<MapPin size={16} />}><input name="city" maxLength={120} value={form.city} onChange={handleChange} disabled={form.workplace_type === 'remote'} placeholder="e.g. Toronto" /></Field>
              <Field label="Province / State" icon={<MapPin size={16} />}><input name="province" maxLength={120} value={form.province} onChange={handleChange} disabled={form.workplace_type === 'remote'} placeholder="e.g. Ontario" /></Field>
            </div>

            <div className="job-form-grid job-form-grid--three">
              <Field label="Minimum salary" icon={<DollarSign size={16} />}><input type="number" min="0" step="0.01" name="salary_min" value={form.salary_min} onChange={handleChange} placeholder="Optional" /></Field>
              <Field label="Maximum salary" icon={<DollarSign size={16} />}><input type="number" min="0" step="0.01" name="salary_max" value={form.salary_max} onChange={handleChange} placeholder="Optional" /></Field>
              <Field label="Salary period" icon={<Clock size={16} />}><Select name="salary_period" value={form.salary_period} onChange={handleChange}><option value="hourly">Hourly</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
            </div>

            <Field label="Required skills" icon={<Wrench size={16} />} hint="Separate skills with commas"><input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node.js, TypeScript, PostgreSQL" /></Field>
            <fieldset style={{ border: '1px solid #dbe4ef', borderRadius: 10, padding: '1rem' }}>
              <legend style={{ fontWeight: 700 }}>Where should this job appear?</legend>
              <p style={{ margin: '0 0 12px', color: '#6b7280' }}>Jooblie and this portal are included automatically. Matching category portals may also display the job. Select any other active portals where you want it listed.</p>
              {audiencePortalsError && <div className="admin-note" role="status">{audiencePortalsError}</div>}
              {!audiencePortalsError && !audiencePortals.length && <p style={{ margin: 0, color: '#6b7280' }}>No additional active portals are available.</p>}
              {audiencePortals.map(({ slug, name, domain }) => (
                <label key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input type="checkbox" checked={form.audience_sites.includes(slug)} onChange={(event) => {
                    const checked = event.target.checked;
                    setForm((current) => ({ ...current, audience_sites: checked
                      ? [...new Set([...current.audience_sites, slug])]
                      : current.audience_sites.filter((value) => value !== slug) }));
                  }} />
                  <span><strong>{name}</strong>{domain && <small style={{ display: 'block', color: '#6b7280' }}>{domain}</small>}</span>
                </label>
              ))}
            </fieldset>
            <Field label="Job description" icon={<AlignLeft size={16} />}><textarea required minLength={20} maxLength={30000} name="description" value={form.description} onChange={handleChange} placeholder="Responsibilities, qualifications, benefits, working hours, and anything candidates need to know..." rows={12} /></Field>
            </fieldset>
            <button className="button button--primary" type="submit" disabled={loading || !company} style={{ padding: '1rem', fontSize: '1rem' }}>{loading ? <><Loader2 className="spinner" size={18} /> Publishing job...</> : 'Publish Job'}</button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, icon, hint, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}><span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>{icon}{label}</span>{hint && <small style={{ color: '#6b7280', marginTop: -2 }}>{hint}</small>}<div className="job-field-control">{children}</div></label>;
}
