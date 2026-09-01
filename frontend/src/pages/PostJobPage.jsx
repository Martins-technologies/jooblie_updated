import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import PageHero from '../components/PageHero';
import PageSection from '../components/PageSection';
import Reveal from '../components/Reveal';
import usePublicData, { clearPublicDataCache } from '../hooks/usePublicData';
import { createJob, getRecruiterCompanies } from '../lib/data';
import { SITE_SLUG } from '../config/site';

const initialForm = {
  title: '',
  companyId: '',
  categoryId: '',
  province: '',
  city: '',
  isRemote: false,
  employmentType: 'full_time',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'CAD',
  salaryPeriod: 'yearly',
  skills: '',
  description: '',
  newcomerFriendly: false,
  aboriginalFriendly: false,
};

export default function PostJobPage() {
  const { data } = usePublicData();
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ submitting: false, error: '', success: false });

  useEffect(() => {
    let active = true;
    getRecruiterCompanies().then(({ data: recruiterCompanies, error }) => {
      if (!active) return;
      setCompanies(recruiterCompanies || []);
      setCompaniesLoading(false);
      if (error) setState((current) => ({ ...current, error: error.message }));
    });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => data.categories.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [data.categories],
  );

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setState({ submitting: true, error: '', success: false });

    const audienceSites = [
      form.newcomerFriendly ? 'newcomers' : null,
      form.aboriginalFriendly ? 'aboriginal' : null,
    ].filter(Boolean);

    const payload = {
      title: form.title.trim(),
      company_id: form.companyId,
      category_id: Number(form.categoryId),
      province: form.province.trim() || null,
      city: form.city.trim() || null,
      is_remote: form.isRemote,
      employment_type: form.employmentType,
      salary_min: form.salaryMin === '' ? null : Number(form.salaryMin),
      salary_max: form.salaryMax === '' ? null : Number(form.salaryMax),
      salary_currency: form.salaryCurrency,
      salary_period: form.salaryPeriod || null,
      skills: form.skills.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 50),
      description: form.description.trim(),
      audience_sites: audienceSites,
    };

    const { error } = await createJob(payload);

    if (error) {
      setState({ submitting: false, error: error.message || 'The job could not be submitted.', success: false });
      return;
    }

    clearPublicDataCache();
    setForm(initialForm);
    setState({ submitting: false, error: '', success: true });
  };

  return (
    <>
      <PageHero
        eyebrow="Recruiter workspace"
        title="Post a job"
        text="Submit one job to the shared backend. Jooblie and the matching specialist portal are assigned automatically from the selected category."
      />

      <PageSection soft reveal={false}>
        <div className="form-page-grid">
          <Reveal as="form" className="content-card form-card" onSubmit={submit} direction="left">
            {state.success && (
              <div className="success-banner">
                <CheckCircle2 size={20} />
                Job submitted for admin review. Its Jooblie and specialist-portal visibility is already mapped in the shared database.
              </div>
            )}

            {state.error && <div className="error-banner">{state.error}</div>}
            {!data.configured && <div className="error-banner">The shared Jooblie API is not configured.</div>}
            {!companiesLoading && companies.length === 0 && (
              <div className="error-banner">Create a company from the Recruiter Dashboard before posting a job.</div>
            )}

            <div className="form-grid">
              <Field label="Job title" required>
                <input required minLength="3" value={form.title} onChange={set('title')} placeholder="e.g. Senior Full Stack Developer" />
              </Field>

              <Field label="Company" required>
                <select required disabled={companiesLoading || companies.length === 0} value={form.companyId} onChange={set('companyId')}>
                  <option value="">{companiesLoading ? 'Loading companies...' : 'Select company'}</option>
                  {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
                </select>
              </Field>

              <Field label="Category" required>
                <select required value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">Select category</option>
                  {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
              </Field>

              <Field label="Employment type" required>
                <select required value={form.employmentType} onChange={set('employmentType')}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="internship">Internship</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </Field>

              <Field label="City">
                <input value={form.city} onChange={set('city')} placeholder="e.g. Toronto" />
              </Field>

              <Field label="Province">
                <input value={form.province} onChange={set('province')} placeholder="e.g. Ontario" />
              </Field>

              <div className="form-grid__full audience-options">
                <label className="check-field">
                  <input type="checkbox" checked={form.isRemote} onChange={set('isRemote')} />
                  <span>This role can be worked remotely</span>
                </label>
              </div>

              <Field label="Salary currency">
                <select value={form.salaryCurrency} onChange={set('salaryCurrency')}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </Field>

              <Field label="Salary period">
                <select value={form.salaryPeriod} onChange={set('salaryPeriod')}>
                  <option value="hourly">Hourly</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </Field>

              <div className="field-pair">
                <Field label="Salary min">
                  <input type="number" min="0" value={form.salaryMin} onChange={set('salaryMin')} />
                </Field>
                <Field label="Salary max">
                  <input type="number" min="0" value={form.salaryMax} onChange={set('salaryMax')} />
                </Field>
              </div>

              <Field className="form-grid__full" label="Skills">
                <input value={form.skills} onChange={set('skills')} placeholder="React, JavaScript, SQL" />
              </Field>

              <Field className="form-grid__full" label="Job description" required>
                <textarea required minLength="20" rows="9" value={form.description} onChange={set('description')} placeholder="Describe the role, responsibilities, qualifications, and team." />
              </Field>

              <div className="form-grid__full audience-options">
                <label className="check-field">
                  <input type="checkbox" checked={form.newcomerFriendly} onChange={set('newcomerFriendly')} />
                  <span>Also publish to the Newcomers portal</span>
                </label>
                <label className="check-field">
                  <input type="checkbox" checked={form.aboriginalFriendly} onChange={set('aboriginalFriendly')} />
                  <span>Also publish to the Aboriginal portal</span>
                </label>
              </div>
            </div>

            <button className="button button--primary form-submit" type="submit" disabled={state.submitting || companies.length === 0}>
              {state.submitting ? 'Submitting...' : 'Submit Job for Review'}
            </button>
          </Reveal>

          <Reveal as="aside" className="content-card form-side-card" direction="right" delay={80}>
            <ShieldCheck size={28} />
            <span className="eyebrow">Shared publishing</span>
            <h2>One job record, correct portals.</h2>
            <p>The current source is <strong>{SITE_SLUG}</strong>. The backend stores that as the origin site, while database triggers maintain Jooblie, category-site, and optional audience visibility without duplicating the job.</p>
            <ul className="check-list">
              <li>Recruiter company ownership is checked server-side.</li>
              <li>Specialist portals can only post categories they are configured for.</li>
              <li>Newcomers and Aboriginal visibility is stored separately as audience targeting.</li>
              <li>Public visibility begins only after admin approval.</li>
            </ul>
          </Reveal>
        </div>
      </PageSection>
    </>
  );
}

function Field({ label, required = false, className = '', children }) {
  return (
    <label className={`form-field ${className}`.trim()}>
      <span>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}
