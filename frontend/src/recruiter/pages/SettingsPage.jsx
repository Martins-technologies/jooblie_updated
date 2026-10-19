import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SkeletonContent from '../../shared/components/Skeleton';
import { User, Shield, Bell, Loader2, Save } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';
import { supabase, createPasswordVerificationClient } from '../../shared/lib/supabase';
import { changeAccountPassword } from '../../shared/lib/password';
import { notificationPreferencesPayload } from '../../shared/lib/notificationPreferences';
import { SITE_NAME } from '../../shared/config/site';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '../../shared/lib/toast';
import { accountPayload, samePayload, validateAccount, validatePassword } from '../../shared/lib/editableProfile';
import { getFieldErrors } from '../../shared/lib/errors';

export default function SettingsPage() {
  const { profile, user, role, updateCachedProfile } = useAuth();
  const [params,setParams] = useSearchParams();
  const activeTab = ['security','notifications'].includes(params.get('tab')) ? params.get('tab') : 'account';
  const setActiveTab = tab => setParams(tab === 'account' ? {} : { tab });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preferencesRevision, setPreferencesRevision] = useState(0);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const pending = useRef(false);
  const accountEdited = useRef(false);
  const accountUser = useRef(user?.id);
  const [accountBaseline, setAccountBaseline] = useState(() => profile ? accountPayload(profile) : null);
  const [preferencesBaseline, setPreferencesBaseline] = useState(null);
  const [accountErrors, setAccountErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Account State (Sirf editable fields yahan rakhi hain)
  const [accountForm, setAccountForm] = useState({ 
    full_name: profile?.full_name || '', 
    phone: profile?.phone || '' 
  });

  // Password State
  const [passwordForm, setPasswordForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });

  // Notifications State
  const [notifications, setNotifications] = useState({ 
    email_new_applicant: true, 
    email_daily_summary: false, 
    email_marketing: false 
  });

  useEffect(() => {
    if (accountUser.current !== user?.id) {
      accountUser.current = user?.id;
      accountEdited.current = false;
      setAccountBaseline(null);
    }
    if (!profile || accountEdited.current) return;
    const next = accountPayload(profile);
    setAccountForm({ full_name: next.full_name, phone: next.phone || '' });
    setAccountBaseline(next);
  }, [profile, user?.id]);

  const accountDirty = Boolean(accountBaseline) && !samePayload(accountPayload(accountForm), accountBaseline);
  const preferencesDirty = Boolean(preferencesBaseline) && !samePayload(notificationPreferencesPayload(notifications), preferencesBaseline);
  const focusError = (form, errors) => requestAnimationFrame(() => {
    const first = Object.keys(errors)[0];
    form?.elements.namedItem(first)?.focus();
  });
  const updateAccount = (field, value) => {
    accountEdited.current = true;
    setAccountForm((current) => ({ ...current, [field]: value }));
    setAccountErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };
  const updatePassword = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined, ...(field === 'newPassword' ? { confirmPassword: undefined } : {}) }));
    setError('');
  };

  useEffect(() => {
    let active = true; const controller = new AbortController();
    setPreferencesLoading(true);setPreferencesError('');
    apiRequest('/auth/notification-preferences', { auth: true, signal: controller.signal, notifyError: false })
      .then(({ preferences }) => {
        if (active) {
          setNotifications(notificationPreferencesPayload(preferences));
          setPreferencesBaseline(notificationPreferencesPayload(preferences));
          setPreferencesLoaded(true);
        }
      })
      .catch((err) => { if (active) setPreferencesError(err.message || 'Email preferences could not be loaded.'); })
      .finally(() => { if (active) setPreferencesLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [preferencesRevision]);

  const showSuccess = showSuccessToast;

  const handleAccountSubmit = async (e) => {
    e.preventDefault(); 
    const form = e.currentTarget;
    if (pending.current || !accountDirty) return;
    const errors = validateAccount(accountForm);
    setAccountErrors(errors);
    if (Object.keys(errors).length) { focusError(e.currentTarget, errors); return; }
    const submitted = accountPayload(accountForm);
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/auth/profile', { method: 'PATCH', auth: true, body: submitted, notifyError: false });
      const saved = accountPayload(result?.profile || submitted);
      setAccountBaseline(saved);
      setAccountForm({ full_name: saved.full_name, phone: saved.phone || '' });
      accountEdited.current = false;
      updateCachedProfile?.(result.profile);
      showSuccess('Personal details saved.');
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) { setAccountErrors(fields); focusError(form, fields); return; }
      setError(extractErrorMessage(err, 'Personal details could not be updated.'));
      showErrorToast(err, 'Personal details could not be updated.');
    } finally { 
      pending.current = false;
      setLoading(false); 
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (pending.current) return;
    const errors = validatePassword(passwordForm);
    setPasswordErrors(errors);
    if (Object.keys(errors).length) { focusError(e.currentTarget, errors); return; }
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      await changeAccountPassword({
        authClient: supabase,
        verificationClient: createPasswordVerificationClient(),
        email: user?.email,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (/current password is incorrect/i.test(err.message || '')) {
        const fields = { currentPassword: 'Your current password is incorrect.' };
        setPasswordErrors(fields); focusError(form, fields); return;
      }
      setError(extractErrorMessage(err, 'Password could not be updated.'));
      showErrorToast(err, 'Password could not be updated.');
    } finally { 
      pending.current = false;
      setLoading(false); 
    }
  };

  const handlePreferencesSubmit = async () => {
    if (pending.current || !preferencesLoaded || !preferencesDirty) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/auth/notification-preferences', {
        method: 'PATCH', auth: true, body: notificationPreferencesPayload(notifications),
      });
      setNotifications(notificationPreferencesPayload(result.preferences));
      setPreferencesBaseline(notificationPreferencesPayload(result.preferences));
      showSuccess('Email preferences saved.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Email preferences could not be saved.'));
      showErrorToast(err, 'Email preferences could not be saved.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Account Settings" subtitle="Manage your personal information, security, and preferences.">
      <div className="dashboard-panel" style={{ width: '100%', padding: '0', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HORIZONTAL TABS (Scrollbar removed, FlexWrap added) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '0 1rem' }}>
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={User} label="Personal Details" />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={Shield} label="Password & Security" />
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="Email Notifications" />
        </div>

        {/* SETTINGS CONTENT */}
        <div className="workspace-settings-body" style={{ padding: '2.5rem' }}>
          {error && <div className="error-banner" style={{ marginBottom: '1.5rem' }}>{error}</div>}
          
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Personal Information</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>This information is used to log in and contact you internally.</p>
              </div>

              {/* Editable Fields */}
              <div className="workspace-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <label style={labelStyle}>
                  Full Name
                  <input name="full_name" type="text" value={accountForm.full_name} onChange={(e) => updateAccount('full_name', e.target.value)} style={inputStyle} required minLength={2} maxLength={160} disabled={loading || !accountBaseline} aria-invalid={Boolean(accountErrors.full_name)} aria-describedby={accountErrors.full_name ? 'account-name-error' : undefined} />
                  {accountErrors.full_name && <span className="field-error" id="account-name-error">{accountErrors.full_name}</span>}
                </label>
                <label style={labelStyle}>
                  Phone Number
                  <input name="phone" type="tel" value={accountForm.phone} onChange={(e) => updateAccount('phone', e.target.value)} style={inputStyle} maxLength={50} disabled={loading || !accountBaseline} aria-invalid={Boolean(accountErrors.phone)} aria-describedby={accountErrors.phone ? 'account-phone-error' : undefined} placeholder="+1 (403) 555-0123" />
                  {accountErrors.phone && <span className="field-error" id="account-phone-error">{accountErrors.phone}</span>}
                </label>
              </div>

              {/* Disabled Fields (Cannot be changed) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <label style={labelStyle}>
                  <span>Email Address <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '0.8rem' }}>(Cannot be changed)</span></span>
                  <input type="email" value={profile?.email || ''} disabled style={disabledInputStyle} />
                </label>
                <label style={labelStyle}>
                  <span>Your Role <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '0.8rem' }}>(Cannot be changed)</span></span>
                  <input type="text" value={({ admin: 'Administrator', recruiter: 'Recruiter', job_seeker: 'Job seeker' })[role] || 'Unavailable'} disabled style={disabledInputStyle} />
                </label>
              </div>

              <button type="submit" className="button button--primary" disabled={loading || !accountDirty} style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />} Save Changes
              </button>
              {accountDirty&&<div className="settings-draft-actions"><span role="status">You have unsaved changes.</span><button type="button" className="button button--secondary" disabled={loading} onClick={()=>{setAccountForm({full_name:accountBaseline.full_name,phone:accountBaseline.phone||''});accountEdited.current=false;setAccountErrors({});setError('');}}>Discard changes</button></div>}
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Change Password</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Ensure your account is using a long, random password to stay secure.</p>
              </div>

              <label style={labelStyle}>
                Current Password 
                <input name="currentPassword" autoComplete="current-password" type="password" value={passwordForm.currentPassword} onChange={(e) => updatePassword('currentPassword', e.target.value)} style={inputStyle} required disabled={loading} aria-invalid={Boolean(passwordErrors.currentPassword)} aria-describedby={passwordErrors.currentPassword ? 'current-password-error' : undefined} />
                {passwordErrors.currentPassword && <span className="field-error" id="current-password-error">{passwordErrors.currentPassword}</span>}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                <label style={labelStyle}>
                  New Password 
                  <input name="newPassword" autoComplete="new-password" type="password" value={passwordForm.newPassword} onChange={(e) => updatePassword('newPassword', e.target.value)} style={inputStyle} required minLength={8} disabled={loading} aria-invalid={Boolean(passwordErrors.newPassword)} aria-describedby={passwordErrors.newPassword ? 'new-password-error' : undefined} />
                  {passwordErrors.newPassword && <span className="field-error" id="new-password-error">{passwordErrors.newPassword}</span>}
                </label>
                <label style={labelStyle}>
                  Confirm New Password 
                  <input name="confirmPassword" autoComplete="new-password" type="password" value={passwordForm.confirmPassword} onChange={(e) => updatePassword('confirmPassword', e.target.value)} style={inputStyle} required minLength={8} disabled={loading} aria-invalid={Boolean(passwordErrors.confirmPassword)} aria-describedby={passwordErrors.confirmPassword ? 'confirm-password-error' : undefined} />
                  {passwordErrors.confirmPassword && <span className="field-error" id="confirm-password-error">{passwordErrors.confirmPassword}</span>}
                </label>
              </div>

              <button type="submit" className="button button--primary" disabled={loading || !Object.values(passwordForm).some(Boolean)} style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Shield size={18} />} Update Password
              </button>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Email Preferences</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Choose what kind of emails you want to receive from {SITE_NAME}.</p>
              </div>

              {preferencesError && <div className="error-banner" role="alert">{preferencesError} <button type="button" className="admin-row-action" onClick={() => setPreferencesRevision(value => value + 1)}>Retry</button></div>}
              <fieldset disabled={preferencesLoading || !preferencesLoaded || loading} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: 0, padding: 0, margin: 0 }}>
                {preferencesLoading && <SkeletonContent rows={2} label="Loading email preferences"/>}
                {role !== 'job_seeker' && <ToggleSwitch label="New Applicant Alerts" description="Email me about new applications to my jobs." checked={notifications.email_new_applicant} onChange={() => setNotifications(p => ({ ...p, email_new_applicant: !p.email_new_applicant }))} />}
                {role !== 'job_seeker' && <ToggleSwitch label="Daily Summary Digest" description="Include me in daily hiring summaries." checked={notifications.email_daily_summary} onChange={() => setNotifications(p => ({ ...p, email_daily_summary: !p.email_daily_summary }))} />}
                <ToggleSwitch label="Platform Updates & Tips" description={`Receive emails about new features and hiring tips from ${SITE_NAME}.`} checked={notifications.email_marketing} onChange={() => setNotifications(p => ({ ...p, email_marketing: !p.email_marketing }))} />
              </fieldset>

              <button disabled={preferencesLoading || !preferencesLoaded || loading || !preferencesDirty} className="button button--primary" style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handlePreferencesSubmit}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />} Save Preferences
              </button>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

// --- SUB COMPONENTS & STYLES ---

const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold', color: '#374151', fontSize: '0.95rem' };
const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', fontWeight: '400', backgroundColor: '#fff' };
const disabledInputStyle = { ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', border: '1px solid #e5e7eb' };

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', 
        padding: '1.2rem 1.5rem', 
        border: 'none', background: 'none', cursor: 'pointer', 
        fontSize: '0.95rem', fontWeight: active ? 'bold' : '600',
        color: active ? '#2563eb' : '#6b7280', 
        borderBottom: active ? '3px solid #2563eb' : '3px solid transparent',
        marginBottom: '-1px', transition: 'all 0.2s', whiteSpace: 'nowrap'
      }}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

function ToggleSwitch({ label, description, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', padding: '1rem', border: '1px solid #f3f4f6', borderRadius: '8px', transition: 'background-color 0.2s', backgroundColor: checked ? '#f8fafc' : '#fff' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <strong style={{ color: '#111827', fontSize: '1rem' }}>{label}</strong>
        <span style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '2px' }}>{description}</span>
      </div>
    </label>
  );
}
