import SkeletonContent from '../../shared/components/Skeleton';
import { useEffect, useRef, useState } from 'react';
import { Building2, Globe2, FileText, AlignLeft, Loader2, LockKeyhole, Save } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '../../shared/lib/toast';
import { getFieldErrors, isAbortError } from '../../shared/lib/errors';
import { companyChanges, validateCompanyForm } from '../../shared/lib/companyForm';

const EMPTY = { id: null, name: '', website: '', registration_number: '', description: '' };
const labelStyle = { fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#14243e' };
const inputStyle = { width: '100%', padding: '0.85rem', borderRadius: 8, border: '1px solid #cfd8e6', fontSize: '0.95rem', background: '#fff' };

export default function CompanyProfilePage() {
  const [form, setForm] = useState(EMPTY);
  const [baseline, setBaseline] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const formRef = useRef(null);
  const saveController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setFetching(true); setLoadError('');
    apiRequest('/recruiter/companies', { auth: true, signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          if (!Array.isArray(data?.items) || (data.items.length > 0 && !data.items[0]?.id)) {
            throw new Error('Your company could not be loaded. Please try again.');
          }
          const loaded = { ...EMPTY, ...(data.items?.[0] || {}) };
          setForm(loaded); setBaseline(loaded); setFieldErrors({}); setSaveError('');
        }
      })
      .catch(error => { if (!isAbortError(error)) { setLoadError(extractErrorMessage(error, 'Your company could not be loaded.')); showErrorToast(error, 'Your company could not be loaded.'); } })
      .finally(() => { if (!controller.signal.aborted) setFetching(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => () => saveController.current?.abort(), []);

  const changes = companyChanges(form, baseline);
  const hasChanges = Object.keys(changes).length > 0;
  const unchanged = Boolean(form.id) && !hasChanges;

  const focusError = errors => {
    requestAnimationFrame(() => {
      const field = [...(formRef.current?.elements || [])].find(element => errors[element.name] && !element.readOnly && !element.disabled);
      field?.focus();
    });
  };
  const handleChange = event => {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setFieldErrors(previous => { const next = { ...previous }; delete next[name]; return next; });
    setSaveError('');
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (pending.current || fetching || loadError) return;
    // Guard the handler too: Enter and programmatic submits must not issue a no-op PATCH.
    const payload = companyChanges(form, baseline);
    if (form.id && !Object.keys(payload).length) { setFieldErrors({}); setSaveError(''); return; }
    const errors = validateCompanyForm(form, baseline);
    setFieldErrors(errors); setSaveError('');
    if (Object.keys(errors).length) {
      focusError(errors); return;
    }
    pending.current = true; setLoading(true);
    const controller = new AbortController();
    saveController.current = controller;
    try {
      const result = await apiRequest(form.id ? `/recruiter/companies/${form.id}` : '/recruiter/companies', {
        method: form.id ? 'PATCH' : 'POST', auth: true, body: payload, signal: controller.signal, notifyError: false,
      });
      if (!result?.company?.id) throw new Error('Your request finished, but the saved company could not be confirmed. Refresh before saving again.');
      const saved = { ...EMPTY, ...form, ...payload, ...result.company };
      setForm(saved); setBaseline(saved); setFieldErrors({}); setSaveError('');
      showSuccessToast(form.id ? 'Company profile updated successfully.' : 'Company profile created successfully.');
    } catch (error) {
      if (!isAbortError(error)) {
        const errors = Object.fromEntries(Object.entries(getFieldErrors(error)).filter(([field]) => Object.hasOwn(EMPTY, field)));
        const hasFieldErrors = Object.keys(errors).length > 0;
        setFieldErrors(errors); setSaveError(hasFieldErrors ? '' : extractErrorMessage(error, 'Your company could not be saved.'));
        if (!hasFieldErrors) showErrorToast(error, 'Your company could not be saved.');
        focusError(errors);
      }
    } finally {
      pending.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const props = name => ({
    id: `company-${name}`, name, value: form[name] || '', onChange: handleChange,
    'data-skip-validation': form.id && !Object.hasOwn(changes, name) ? 'true' : undefined,
    'aria-invalid': fieldErrors[name]?.length ? true : undefined,
    'aria-describedby': [fieldErrors[name]?.length && `company-${name}-error`, name === 'name' && form.id && 'company-name-hint'].filter(Boolean).join(' ') || undefined,
  });
  const errorFor = name => fieldErrors[name]?.length ? <span id={`company-${name}-error`} className="field-error">{fieldErrors[name].join(' ')}</span> : null;

  return <DashboardLayout title="Company Profile" subtitle="Update your employer details to build trust with candidates.">
    <div className="dashboard-panel company-profile-panel" style={{ maxWidth: 900, padding: 'clamp(20px, 4vw, 40px)', background: '#fff', borderRadius: 14, border: '1px solid #e5eaf2' }}>
      {fetching ? <SkeletonContent variant="form" rows={2} label="Loading company profile..." />
        : loadError ? <div className="company-load-error"><h2>Company could not be loaded</h2><p role="alert">{loadError}</p><button type="button" className="button button--primary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : <form noValidate ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {saveError && <div className="error-banner" role="alert">{saveError}</div>}
            <fieldset disabled={loading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 26 }}>
              <div className="company-form-grid">
                <label htmlFor="company-name"><span style={labelStyle}><Building2 size={18} />Company Name {form.id ? <LockKeyhole size={14} aria-label="Locked" /> : '*'}</span>
                  <input {...props('name')} type="text" required={!form.id} minLength={2} maxLength={180} readOnly={Boolean(form.id)} style={{ ...inputStyle, ...(form.id ? { background: '#f5f8fc', color: '#536178' } : {}) }} placeholder="Enter company name" />
                  {form.id && <span id="company-name-hint" className="field-hint">Company name is locked after creation.</span>}{errorFor('name')}</label>
                <label htmlFor="company-website"><span style={labelStyle}><Globe2 size={18} />Website URL *</span>
                  <input {...props('website')} type="url" required maxLength={1000} style={inputStyle} placeholder="https://example.com" />{errorFor('website')}</label>
              </div>
              <label htmlFor="company-registration_number"><span style={labelStyle}><FileText size={18} />Registration / Tax Number *</span>
                <input {...props('registration_number')} type="text" required minLength={2} maxLength={180} style={inputStyle} placeholder="e.g. TAX-123456" />{errorFor('registration_number')}</label>
              <label htmlFor="company-description"><span style={labelStyle}><AlignLeft size={18} />Company Description</span>
                <textarea {...props('description')} maxLength={10000} rows={6} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Tell candidates about your company..." />{errorFor('description')}</label>
            </fieldset>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button type="submit" className="button button--primary" disabled={loading || unchanged} aria-busy={loading} style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 9, padding: '0.85rem 1.7rem', ...(unchanged ? { opacity: 0.6, cursor: 'default' } : {}) }}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}{loading ? 'Saving profile...' : 'Save Profile'}
              </button>
              {form.id && <span className="field-hint" role="status">{loading ? 'Saving your changes…' : unchanged ? 'No unsaved changes' : 'Unsaved changes'}</span>}
            </div>
          </form>}
    </div>
  </DashboardLayout>;
}
