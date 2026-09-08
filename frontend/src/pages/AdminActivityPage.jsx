import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, ArrowRight, Loader2, Server } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';

export default function AdminActivityPage() {
  const [state, setState] = useState({ loading: true, error: '', sites: [] });

  const load = useCallback(async () => {
    try {
      // Backend se sirf sites/portals ka data mangwaya ja raha hai
      // Aap chahain to is endpoint ko '/admin/portals' bhi kar sakte hain backend mein
      const data = await apiRequest('/admin/dashboard', { auth: true });
      setState({ loading: false, error: '', sites: data.sites || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, sites: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout title="Network Portals" subtitle="Manage and monitor all connected platforms in the Jooblie network.">
      
      {state.error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
          {state.error}
        </div>
      )}

      {/* PORTALS GRID */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe2 size={24} color="#2563eb" /> Connected Platforms
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Select a portal to view its specific jobs, users, and data.</p>
          </div>
        </div>
        
        {state.loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} className="spinner" color="#9ca3af" />
            <span>Fetching network portals...</span>
          </div>
        ) : state.sites.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {state.sites.map(site => (
              <Link 
                key={site.id} 
                // Yeh link abhi placeholder hai, future mein hum isay `/admin/portals/${site.slug}` par route karenge
                to={`#portal-${site.slug}`} 
                style={{ 
                  display: 'flex', flexDirection: 'column', padding: '1.5rem', 
                  border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#fff', 
                  textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Server size={24} color="#4b5563" />
                    </div>
                    <div>
                      <strong style={{ display: 'block', color: '#111827', fontSize: '1.1rem' }}>{site.name}</strong>
                      <code style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#f9fafb', padding: '2px 6px', borderRadius: '4px' }}>{site.slug}</code>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: site.is_active ? '#dcfce7' : '#fee2e2', color: site.is_active ? '#16a34a' : '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: site.is_active ? '#16a34a' : '#ef4444' }}></span>
                    {site.is_active ? 'Active & Online' : 'Offline'}
                  </span>
                  
                  <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: '600' }}>
                    Manage <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b7280' }}>
            <Globe2 size={40} color="#9ca3af" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, color: '#111827' }}>No Portals Found</h3>
            <p>Connect network sites to see them listed here.</p>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}