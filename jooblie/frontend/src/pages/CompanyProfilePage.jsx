import { useState, useEffect } from 'react';
import { 
  Building2, Globe2, Linkedin, Loader2, 
  Users, Briefcase, FileText, AlignLeft, MapPin 
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState('');
  
  // State mein 'location' aur 'is_remote' add kar diya gaya hai
  const [form, setForm] = useState({
    id: null, name: '', website: '', linkedin_url: '', 
    registration_number: '', industry: 'Technology', company_size: '1-10', 
    location: '', is_remote: false, description: ''
  });

  useEffect(() => {
    async function loadCompany() {
      try {
        const data = await apiRequest('/recruiter/dashboard', { auth: true });
        if (data.companies?.length > 0) {
          setForm({ ...form, ...data.companies[0] });
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setFetching(false); 
      }
    }
    loadCompany();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess('');
    try {
      const endpoint = form.id ? `/recruiter/companies/${form.id}` : '/recruiter/companies';
      
      // Payload tayyar karte waqt agar remote hai to location null bhejenge
      const payload = { 
        ...form, 
        location: form.is_remote ? null : form.location 
      };

      await apiRequest(endpoint, { method: form.id ? 'PATCH' : 'POST', auth: true, body: payload });
      setSuccess('Company profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  };

  // Checkbox aur text dono ke liye generic handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Agar user remote check kare to location empty kar dein
      ...(name === 'is_remote' && checked ? { location: '' } : {})
    }));
  };

  // CSS Styles for uniform alignment
  const labelStyle = { 
    fontWeight: 'bold', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    marginBottom: '0.6rem',
    color: '#111827'
  };
  
  const inputStyle = { 
    width: '100%', 
    padding: '0.8rem', 
    borderRadius: '6px', 
    border: '1px solid #d1d5db', 
    fontSize: '0.95rem',
    backgroundColor: '#fff'
  };

  return (
    <DashboardLayout 
      title="Company Profile" 
      subtitle="Update your employer details to build trust with candidates."
    >
      <div className="dashboard-panel" style={{ maxWidth: '900px', padding: '2.5rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        {fetching ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            Loading profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {success && (
              <div className="success-banner" style={{ marginBottom: '-1rem' }}>
                {success}
              </div>
            )}
            
            {/* ROW 1: Name & Website */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <label>
                <span style={labelStyle}><Building2 size={18} color="#4b5563" /> Company Name *</span>
                <input type="text" name="name" required value={form.name} onChange={handleChange} style={inputStyle} placeholder="Enter company name" />
              </label>
              <label>
                <span style={labelStyle}><Globe2 size={18} color="#4b5563" /> Website URL *</span>
                <input type="url" name="website" required value={form.website} onChange={handleChange} style={inputStyle} placeholder="https://example.com" />
              </label>
            </div>

            {/* ROW 2: LinkedIn & Registration Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <label>
                <span style={labelStyle}><Linkedin size={18} color="#4b5563" /> LinkedIn URL</span>
                <input type="url" name="linkedin_url" value={form.linkedin_url || ''} onChange={handleChange} placeholder="https://linkedin.com/company/..." style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}><FileText size={18} color="#4b5563" /> Registration / Tax Number</span>
                <input type="text" name="registration_number" value={form.registration_number || ''} onChange={handleChange} placeholder="e.g. TAX-123456" style={inputStyle} />
              </label>
            </div>

            {/* ROW 3: Industry & Size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <label>
                <span style={labelStyle}><Briefcase size={18} color="#4b5563" /> Industry</span>
                <select name="industry" value={form.industry || 'Technology'} onChange={handleChange} style={inputStyle}>
                  <option value="Technology">Technology / IT</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span style={labelStyle}><Users size={18} color="#4b5563" /> Company Size</span>
                <select name="company_size" value={form.company_size || '1-10'} onChange={handleChange} style={inputStyle}>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="200+">200+ Employees</option>
                </select>
              </label>
            </div>

            {/* ROW 4: Location & Remote Checkbox */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <label>
                <span style={labelStyle}><MapPin size={18} color="#4b5563" /> Company Address / Headquarters</span>
                <input 
                  type="text" 
                  name="location" 
                  value={form.location || ''} 
                  onChange={handleChange} 
                  disabled={form.is_remote}
                  placeholder={form.is_remote ? "N/A (Fully Remote)" : "e.g. 123 Business Rd, New York, NY"} 
                  style={{ ...inputStyle, opacity: form.is_remote ? 0.5 : 1 }} 
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: 'fit-content' }}>
                <input 
                  type="checkbox" 
                  name="is_remote" 
                  checked={form.is_remote || false} 
                  onChange={handleChange} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>This is a fully remote company (No physical office)</span>
              </label>
            </div>

            {/* ROW 5: Description */}
            <label>
              <span style={labelStyle}><AlignLeft size={18} color="#4b5563" /> Company Description</span>
              <textarea 
                name="description" 
                value={form.description || ''} 
                onChange={handleChange} 
                placeholder="Tell candidates about your company's mission and culture..."
                style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', fontFamily: 'inherit' }} 
              />
            </label>

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              className="button button--primary" 
              disabled={loading} 
              style={{ width: 'fit-content', padding: '0.8rem 2.5rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            >
              {loading ? <Loader2 className="spinner" size={20} /> : 'Save Profile'}
            </button>
            
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}