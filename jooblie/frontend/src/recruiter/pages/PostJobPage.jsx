import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, MapPin, AlignLeft, Building2, ArrowLeft,
  Loader2, Wrench, GraduationCap, Clock, FolderGit2,
  DollarSign, MonitorSmartphone,
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';

const emptyForm = {
  title: '', category_id: '', workplace_type: 'onsite', employment_type: 'full_time',
  experience_level: 'mid_level', city: '', province: '', skills: '',
  salary_min: '', salary_max: '', salary_currency: 'CAD', salary_period: 'yearly',
  description: '',
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(emptyForm);

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
    if (!company) return setError('Your recruiter account is not linked to a company.');
    setLoading(true); setError('');
    try {
      const salaryMin = form.salary_min === '' ? null : Number(form.salary_min);
      const salaryMax = form.salary_max === '' ? null : Number(form.salary_max);
      if (salaryMin != null && Number.isNaN(salaryMin)) throw new Error('Minimum salary must be a valid number.');
      if (salaryMax != null && Number.isNaN(salaryMax)) throw new Error('Maximum salary must be a valid number.');
      if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) throw new Error('Maximum salary cannot be lower than minimum salary.');
      const payload = {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        workplace_type: form.workplace_type,
        is_remote: form.workplace_type === 'remote',
        employment_type: form.employment_type,
        experience_level: form.experience_level,
        city: form.workplace_type === 'remote' ? null : form.city.trim(),
        province: form.workplace_type === 'remote' ? null : form.province.trim(),
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: form.salary_currency,
        salary_period: form.salary_period,
        skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 50),
        description: form.description.trim(),
      };
      await apiRequest('/recruiter/jobs', { method: 'POST', auth: true, body: payload });
      navigate('/my-jobs', { state: { successMsg: 'Job submitted for review.' } });
    } catch (err) {
      setError(err.message || 'Failed to submit the job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Post a Job"
      subtitle="Create a complete, professional job listing. New jobs enter moderation before they become public."
      actions={<Link to="/dashboard/recruiter" className="button button--secondary"><ArrowLeft size={16} /> Back to Dashboard</Link>}
    >
      <div className="dashboard-panel" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        {error && <div className="error-banner" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {initialLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading your company and job categories...</div> : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            <section style={{ padding: '1rem 1.1rem', border: '1px solid #dbe4ef', borderRadius: 10, background: '#f8fbff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontWeight: 800 }}><Building2 size={18} /> Employer</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{company?.name}</div>
              <div style={{ color: '#6b7280', fontSize: '.88rem', marginTop: 4 }}>Company is locked to your recruiter account. It cannot be changed for this job.</div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
              <Field label="Job title" icon={<Briefcase size={16} />}><input name="title" required minLength={3} maxLength={180} value={form.title} onChange={handleChange} placeholder="e.g. Senior React Developer" /></Field>
              <Field label="Job category" icon={<FolderGit2 size={16} />}><select name="category_id" required value={form.category_id} onChange={handleChange}><option value="">Choose category</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <Field label="Workplace" icon={<MonitorSmartphone size={16} />}><select name="workplace_type" value={form.workplace_type} onChange={handleChange}><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></Field>
              <Field label="Employment type" icon={<Clock size={16} />}><select name="employment_type" value={form.employment_type} onChange={handleChange}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="temporary">Temporary</option><option value="internship">Internship</option><option value="seasonal">Seasonal</option></select></Field>
              <Field label="Experience level" icon={<GraduationCap size={16} />}><select name="experience_level" value={form.experience_level} onChange={handleChange}><option value="entry_level">Entry level</option><option value="mid_level">Mid level</option><option value="senior">Senior</option><option value="executive">Executive / Director</option></select></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Field label="City" icon={<MapPin size={16} />}><input name="city" value={form.city} onChange={handleChange} disabled={form.workplace_type === 'remote'} placeholder="e.g. Toronto" /></Field>
              <Field label="Province / State" icon={<MapPin size={16} />}><input name="province" value={form.province} onChange={handleChange} disabled={form.workplace_type === 'remote'} placeholder="e.g. Ontario" /></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <Field label="Minimum salary" icon={<DollarSign size={16} />}><input type="number" min="0" step="0.01" name="salary_min" value={form.salary_min} onChange={handleChange} placeholder="Optional" /></Field>
              <Field label="Maximum salary" icon={<DollarSign size={16} />}><input type="number" min="0" step="0.01" name="salary_max" value={form.salary_max} onChange={handleChange} placeholder="Optional" /></Field>
              <Field label="Salary period" icon={<Clock size={16} />}><select name="salary_period" value={form.salary_period} onChange={handleChange}><option value="hourly">Hourly</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></Field>
            </div>

            <Field label="Required skills" icon={<Wrench size={16} />} hint="Separate skills with commas"><input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node.js, TypeScript, PostgreSQL" /></Field>
            <Field label="Job description" icon={<AlignLeft size={16} />}><textarea required minLength={20} maxLength={30000} name="description" value={form.description} onChange={handleChange} placeholder="Responsibilities, qualifications, benefits, working hours, and anything candidates need to know..." rows={12} /></Field>

            <button className="button button--primary" type="submit" disabled={loading || !company} style={{ padding: '1rem', fontSize: '1rem' }}>{loading ? <><Loader2 className="spinner" size={18} /> Submitting for review...</> : 'Submit Job for Review'}</button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, icon, hint, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children.type === 'input' || children.type === 'textarea' || children.type === 'select' ? null : null}<span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>&nbsp;{icon}{label}</span>{hint && <small style={{ color: '#6b7280', marginTop: -2 }}>{hint}</small>} {children && children.type ? <div className="job-field-control">{children}</div> : children}</label>;
}
