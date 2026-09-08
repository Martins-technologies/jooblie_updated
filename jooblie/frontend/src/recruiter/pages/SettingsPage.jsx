import { useState } from 'react';
import { User, Shield, Bell, Loader2, Save } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { useAuth } from '../../shared/context/AuthContext';
import { apiRequest } from '../../shared/lib/api';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
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

  const showSuccess = (msg) => { 
    setSuccess(msg); 
    setTimeout(() => setSuccess(''), 3000); 
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    try {
      await apiRequest('/auth/profile', { method: 'PATCH', auth: true, body: accountForm });
      showSuccess('Personal details updated successfully!');
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { 
      alert("New passwords don't match!"); 
      return; 
    }
    setLoading(true);
    try {
      // Password update API call yahan aayegi
      showSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <DashboardLayout title="Account Settings" subtitle="Manage your personal information, security, and preferences.">
      <div className="dashboard-panel" style={{ maxWidth: '900px', padding: '0', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HORIZONTAL TABS (Scrollbar removed, FlexWrap added) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '0 1rem' }}>
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={User} label="Personal Details" />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={Shield} label="Password & Security" />
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="Email Notifications" />
        </div>

        {/* SETTINGS CONTENT */}
        <div style={{ padding: '2.5rem' }}>
          {success && <div className="success-banner" style={{ marginBottom: '1.5rem' }}>{success}</div>}
          
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Personal Information</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>This information is used to log in and contact you internally.</p>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <label style={labelStyle}>
                  Full Name
                  <input type="text" value={accountForm.full_name} onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })} style={inputStyle} required />
                </label>
                <label style={labelStyle}>
                  Phone Number
                  <input type="tel" value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} style={inputStyle} placeholder="+92 300 1234567" />
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
                  <input type="text" value={profile?.headline || 'Recruiter'} disabled style={disabledInputStyle} />
                </label>
              </div>

              <button type="submit" className="button button--primary" disabled={loading} style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Save size={18} />} Save Changes
              </button>
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
                <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} style={inputStyle} required />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                <label style={labelStyle}>
                  New Password 
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} style={inputStyle} required minLength="8" />
                </label>
                <label style={labelStyle}>
                  Confirm New Password 
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} style={inputStyle} required minLength="8" />
                </label>
              </div>

              <button type="submit" className="button button--primary" disabled={loading} style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? <Loader2 className="spinner" size={18} /> : <Shield size={18} />} Update Password
              </button>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827' }}>Email Preferences</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Choose what kind of emails you want to receive from Jooblie.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ToggleSwitch label="New Applicant Alerts" description="Get an email instantly when someone applies to your active jobs." checked={notifications.email_new_applicant} onChange={() => setNotifications(p => ({ ...p, email_new_applicant: !p.email_new_applicant }))} />
                <ToggleSwitch label="Daily Summary Digest" description="Receive a daily summary of all your active jobs and new candidates." checked={notifications.email_daily_summary} onChange={() => setNotifications(p => ({ ...p, email_daily_summary: !p.email_daily_summary }))} />
                <ToggleSwitch label="Platform Updates & Tips" description="Receive emails about new features and hiring tips from Jooblie." checked={notifications.email_marketing} onChange={() => setNotifications(p => ({ ...p, email_marketing: !p.email_marketing }))} />
              </div>

              <button className="button button--primary" style={{ width: 'fit-content', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => showSuccess('Preferences saved!')}>
                <Save size={18} /> Save Preferences
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
const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem', backgroundColor: '#fff' };
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