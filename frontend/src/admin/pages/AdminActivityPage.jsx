import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Globe2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';

// 🚀 Yahan humne aapke diye gaye tamaam official links add kar diye hain.
// Is list ke ilawa koi bhi aur portal dashboard par nazar nahi aayega!
const OFFICIAL_PORTALS = [
  { id: 'jooblie', name: 'Jooblie (Main)', slug: 'jooblie', domain: 'https://jooblie-updated.vercel.app/' },
  { id: 'newcomer', name: 'Newcomer Jobline', slug: 'newcomers', domain: 'https://newcomer-jobline.vercel.app/' },
  { id: 'aboriginal', name: 'Aboriginal Jobline', slug: 'aboriginal', domain: 'https://aboriginal-jobline.vercel.app/' },
  { id: 'service-care', name: 'Service Care Jobline', slug: 'service-care', domain: 'https://service-care-jobline.vercel.app/' },
  { id: 'farmerfreight', name: 'FarmerFreight Jobline', slug: 'farmerfreight', domain: 'https://farmerfreight-jobline.vercel.app/' },
  { id: 'office-jobs', name: 'Office Jobline', slug: 'office-jobs', domain: 'https://office-jobline.vercel.app/' },
  { id: 'health-care', name: 'Health Care Jobline', slug: 'health-care', domain: 'https://health-care-jobline-rho.vercel.app/' }
];

export default function AdminActivityPage() {
  // Initial state mein humne apni official list de di hai
  const [state, setState] = useState({ loading: true, error: '', portals: OFFICIAL_PORTALS });

  const load = useCallback(async () => {
    setState((x) => ({ ...x, loading: true, error: '' }));
    try {
      const res = await apiRequest('/admin/portals', { auth: true });
      const apiItems = res.items || [];
      
      // Backend se jo metrics ayengi, unhein apni official list ke sath merge kar rahay hain
      const mergedPortals = OFFICIAL_PORTALS.map(officialPortal => {
        const apiMatch = apiItems.find(apiItem => apiItem.slug === officialPortal.slug) || {};
        return {
          ...officialPortal,
          metrics: apiMatch.metrics || { jobs: 0, users: 0 }
        };
      });

      setState((x) => ({ ...x, loading: false, error: '', portals: mergedPortals }));
    } catch (e) { 
      // Agar error aaye tab bhi humari official list show hogi (with 0 metrics)
      setState((x) => ({ ...x, loading: false, error: e.message, portals: OFFICIAL_PORTALS })); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout 
      title="Network Portals" 
      subtitle="Monitor every configured GitHub/network portal with live backend metrics." 
      actions={
        <button className="button button--secondary" onClick={load} type="button">
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      {state.error && <div className="error-banner">{state.error}</div>}
      
      <section className="dashboard-panel" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Connected Platforms</h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Only the verified official portals are listed here.</p>
          </div>
        </div>
        
        {state.loading ? (
          <div style={{ color: '#6b7280', padding: '1rem 0' }}>Loading portals data…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {state.portals.map((site) => (
              <article key={site.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, backgroundColor: '#fff' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <strong style={{ fontSize: 18, color: '#111827' }}>{site.name}</strong>
                    <div style={{ color: '#6b7280', fontSize: 13, marginTop: '2px' }}>{site.slug}</div>
                  </div>
                  <Globe2 size={20} color="#2563eb" />
                </div>
                
                <div style={{ display: 'flex', gap: 16, margin: '16px 0', color: '#374151' }}>
                  <span style={{ backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <b>{site.metrics?.jobs || 0}</b> jobs
                  </span>
                  <span style={{ backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <b>{site.metrics?.users || 0}</b> users
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="button button--primary" to={`/admin/portals/${site.slug}`}>
                    View Portal Data
                  </Link>
                  {site.domain && (
                    <a className="button button--secondary" href={site.domain} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Open Website <ExternalLink size={14} />
                    </a>
                  )}
                </div>

              </article>
            ))}
          </div>
        )}
      </section>

    </DashboardLayout>
  );
}