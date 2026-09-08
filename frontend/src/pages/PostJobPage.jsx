import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Briefcase, MapPin, AlignLeft, Building2, ArrowLeft, 
  Loader2, Link as LinkIcon, Wrench, GraduationCap, Clock 
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { apiRequest } from '../lib/api';

export default function PostJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Job Form State (Updated with Professional Fields)
  const [form, setForm] = useState({
    title: '',
    workplace_type: 'onsite', // 'onsite', 'remote', 'hybrid'
    employment_type: 'full_time', // 'full_time', 'part_time', 'contract', 'internship'
    experience_level: 'mid_level', // 'entry_level', 'mid_level', 'senior', 'executive'
    city: '',
    province: '',
    skills: '', // Comma separated string
    external_link: '', // e.g. LinkedIn or company career page
    description: '',
    status: 'active'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Agar 'remote' select ho to city aur province empty kar dein
      ...(name === 'workplace_type' && value === 'remote' ? { city: '', province: '' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Backend par job post karne ki API call
      // Skills ko array mein convert kar rahe hain database ke liye
      const payload = {
        ...form,
        skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean)
      };

      await apiRequest('/recruiter/jobs', {
        method: 'POST',
        auth: true,
        body: payload,
      });
      
      navigate('/dashboard', { state: { successMsg: 'Job posted successfully!' } });
    } catch (err) {
      setError(err.message || 'Failed to post job. Please try again.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title="Post a New Job" 
      subtitle="Fill out the details below to publish a professional job opening."
      actions={
        <Link to="/dashboard" className="button button--secondary">
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Dashboard
        </Link>
      }
    >
      <div className="dashboard-panel" style={{ maxWidth: '850px', margin: '0 auto', padding: '2.5rem' }}>
        {error && <div className="error-banner" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ROW 1: Title & External Link */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={16} /> Job Title *
              </span>
              <input 
                type="text" name="title" required value={form.title} onChange={handleChange} 
                placeholder="e.g. Senior React Developer" 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={16} /> Apply Link (Optional)
              </span>
              <input 
                type="url" name="external_link" value={form.external_link} onChange={handleChange} 
                placeholder="e.g. LinkedIn URL" 
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </label>
          </div>

          {/* ROW 2: Employment Details (Dropdowns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} /> Workplace Type
              </span>
              <select name="workplace_type" value={form.workplace_type} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Employment Type
              </span>
              <select name="employment_type" value={form.employment_type} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={16} /> Experience Level
              </span>
              <select name="experience_level" value={form.experience_level} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="entry_level">Entry Level</option>
                <option value="mid_level">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive / Director</option>
              </select>
            </label>
          </div>

          {/* ROW 3: Location (Disabled if Remote) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} /> City
              </span>
              <input 
                type="text" name="city" value={form.city} onChange={handleChange} 
                placeholder={form.workplace_type === 'remote' ? "N/A (Remote)" : "e.g. Lahore"} 
                disabled={form.workplace_type === 'remote'}
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', opacity: form.workplace_type === 'remote' ? 0.5 : 1 }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} /> Province / State
              </span>
              <input 
                type="text" name="province" value={form.province} onChange={handleChange} 
                placeholder={form.workplace_type === 'remote' ? "N/A (Remote)" : "e.g. Punjab"} 
                disabled={form.workplace_type === 'remote'}
                style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', opacity: form.workplace_type === 'remote' ? 0.5 : 1 }}
              />
            </label>
          </div>

          {/* ROW 4: Skills */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={16} /> Required Skills
            </span>
            <input 
              type="text" name="skills" value={form.skills} onChange={handleChange} 
              placeholder="e.g. React, Node.js, TypeScript (Separate with commas)" 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </label>

          {/* ROW 5: Description */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlignLeft size={16} /> Job Description *
            </span>
            <textarea 
              name="description" required value={form.description} onChange={handleChange} 
              placeholder="Describe the role, responsibilities, and requirements..." 
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '220px', fontFamily: 'inherit' }}
            />
          </label>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="button button--primary" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Loader2 className="spinner" size={20} /> : 'Publish Job'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}