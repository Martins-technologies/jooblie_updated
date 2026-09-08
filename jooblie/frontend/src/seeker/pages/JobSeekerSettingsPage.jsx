import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { useAuth } from '../../shared/context/AuthContext';

export default function JobSeekerSettingsPage() {
  const auth = useAuth();
  const [profile, setProfile] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      setProfile(result?.profile);
    } catch (error) { console.error("Error loading profile", error); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <DashboardLayout title="Account Settings" subtitle="Manage your Jooblie account details.">
      <style>{premiumCSS}</style>
      <section className="dash-panel">
        <div className="dash-heading">
          <div><h2>Account Information</h2></div>
        </div>
        <div>
          <div className="account-row">
            <span className="account-label">Full Name</span>
            <span className="account-value">{profile?.full_name || 'Not provided'}</span>
          </div>
          <div className="account-row">
            <span className="account-label">Email Address</span>
            <span className="account-value">{auth.user?.email || 'Not available'}</span>
          </div>
          <div className="account-row">
            <span className="account-label">Account Type</span>
            <span className="account-value" style={{ background: '#eef2f9', color: '#2557a7', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>Job Seeker</span>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

const premiumCSS = `
  .dash-panel { background: #ffffff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 24px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
  .dash-heading { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
  .dash-heading h2 { margin: 0; color: #111827; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 8px;}
  .account-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
  .account-row:last-child { border-bottom: none; }
  .account-label { font-weight: 600; color: #374151; }
  .account-value { color: #6b7280; }
`;