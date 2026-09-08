import { useCallback, useEffect, useState } from 'react';
import { Award, BriefcaseBusiness, CheckCircle2, FileText, Plus, Trash2, UploadCloud, UserRound, X, GraduationCap, Save, Edit2, Eye } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';

const EMPTY_PROFILE = { full_name: '', phone: '', headline: '', location_city: '', location_province: '', skills: [], default_resume_path: '', experience: [], education: [] };

// Aaj ki date nikalnay ke liye (YYYY-MM-DD format)
const todayStr = new Date().toISOString().split('T')[0];

export default function JobSeekerProfilePage() {
  const auth = useAuth();
  const [dashboardState, setDashboardState] = useState({ loading: true, error: '', success: '', profile: null });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [resumeFile, setResumeFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // 🔥 NAYA FEATURE: Active Tab State
  const [activeTab, setActiveTab] = useState('basic');

  const loadProfile = useCallback(async () => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true });
      const profile = result?.profile;
      if (profile) {
        let parsedExperience = [];
        if (Array.isArray(profile.experience)) parsedExperience = profile.experience;
        else if (typeof profile.experience === 'string') { try { parsedExperience = JSON.parse(profile.experience) || []; } catch { parsedExperience = []; } }

        let parsedEducation = [];
        if (Array.isArray(profile.education)) parsedEducation = profile.education;
        else if (typeof profile.education === 'string') { try { parsedEducation = JSON.parse(profile.education) || []; } catch { parsedEducation = []; } }

        setProfileForm({
          full_name: profile.full_name || '', phone: profile.phone || '', headline: profile.headline || '',
          location_city: profile.location_city || '', location_province: profile.location_province || '',
          skills: Array.isArray(profile.skills) ? profile.skills : [], 
          default_resume_path: profile.default_resume_path || '',
          experience: parsedExperience.map(e => ({ ...e, isEditing: false })),
          education: parsedEducation.map(e => ({ ...e, isEditing: false })),
        });
      }
      setDashboardState({ loading: false, error: '', success: '', profile });
    } catch (error) { setDashboardState(c => ({ ...c, loading: false, error: 'Could not load profile.' })); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // --- Handlers ---
  const addExperience = () => setProfileForm(c => ({ ...c, experience: [...c.experience, { title: '', company: '', startDate: '', endDate: '', description: '', current: false, isEditing: true }] }));
  const updateExperience = (index, field, value) => { const newExp = [...profileForm.experience]; newExp[index][field] = value; if (field === 'current' && value === true) { newExp[index]['endDate'] = ''; } setProfileForm(c => ({...c, experience: newExp})); };
  const toggleExperienceEdit = (index, isEditing) => { const newExp = [...profileForm.experience]; newExp[index]['isEditing'] = isEditing; setProfileForm(c => ({...c, experience: newExp})); };
  const removeExperience = (index) => { const newExp = profileForm.experience.filter((_, i) => i !== index); setProfileForm(c => ({...c, experience: newExp})); };

  const addEducation = () => setProfileForm(c => ({ ...c, education: [...c.education, { degree: '', institution: '', startDate: '', endDate: '', current: false, isEditing: true }] }));
  const updateEducation = (index, field, value) => { const newEdu = [...profileForm.education]; newEdu[index][field] = value; if (field === 'current' && value === true) { newEdu[index]['endDate'] = ''; } setProfileForm(c => ({...c, education: newEdu})); };
  const toggleEducationEdit = (index, isEditing) => { const newEdu = [...profileForm.education]; newEdu[index]['isEditing'] = isEditing; setProfileForm(c => ({...c, education: newEdu})); };
  const removeEducation = (index) => { const newEdu = profileForm.education.filter((_, i) => i !== index); setProfileForm(c => ({...c, education: newEdu})); };

  const addSkill = () => setProfileForm(c => ({ ...c, skills: [...c.skills, ''] }));
  const updateSkill = (index, value) => { const newSkills = [...profileForm.skills]; newSkills[index] = value; setProfileForm(c => ({...c, skills: newSkills})); };
  const removeSkill = (index) => { const newSkills = profileForm.skills.filter((_, i) => i !== index); setProfileForm(c => ({...c, skills: newSkills})); };

  const handleViewResume = async () => {
    if (resumeFile) { window.open(URL.createObjectURL(resumeFile), '_blank', 'noopener,noreferrer'); return; }
    try {
      const result = await apiRequest('/job-seeker/resume-url', { auth: true });
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setDashboardState(c => ({ ...c, error: error.message || 'Resume could not be opened.' }));
    }
  };

  const hasDateErrors = profileForm.experience.some(exp => {
    if (exp.startDate && exp.startDate > todayStr) return true;
    if (!exp.current && exp.endDate && exp.endDate > todayStr) return true;
    if (!exp.current && exp.startDate && exp.endDate && exp.startDate > exp.endDate) return true;
    return false;
  }) || profileForm.education.some(edu => {
    if (edu.startDate && edu.startDate > todayStr) return true;
    if (!edu.current && edu.endDate && edu.endDate > todayStr) return true;
    if (!edu.current && edu.startDate && edu.endDate && edu.startDate > edu.endDate) return true;
    return false;
  });

  const saveProfile = async (event) => {
    event.preventDefault();
    if (hasDateErrors) return; 
    setSavingProfile(true);
    setDashboardState(c => ({ ...c, error: '', success: '' }));

    try {
      let resumePath = profileForm.default_resume_path || null;
      if (resumeFile) {
        if (!supabase || !auth.user?.id) throw new Error('Resume upload is not available.');
        if (resumeFile.size > 5 * 1024 * 1024) throw new Error('Resume must be 5 MB or smaller.');
        if (resumeFile.type !== 'application/pdf' && !resumeFile.name.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF resumes are accepted.');
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-180);
        const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(path, resumeFile, { upsert: false, contentType: 'application/pdf', cacheControl: '3600' });
        if (uploadError) throw uploadError;
        try {
          await apiRequest('/job-seeker/resumes', { method: 'POST', auth: true, body: { path, original_name: resumeFile.name, size_bytes: resumeFile.size, content_type: 'application/pdf' } });
        } catch (registrationError) {
          await supabase.storage.from('resumes').remove([path]);
          throw registrationError;
        }
        resumePath = path;
      }

      const cleanExperience = profileForm.experience.map(exp => { const { isEditing, ...rest } = exp; return { ...rest, startDate: rest.startDate || null, endDate: rest.endDate || null }; });
      const cleanEducation = profileForm.education.map(edu => { const { isEditing, ...rest } = edu; return { ...rest, startDate: rest.startDate || null, endDate: rest.endDate || null }; });

      await apiRequest('/auth/profile', {
        method: 'PATCH', auth: true,
        body: {
          full_name: profileForm.full_name, phone: profileForm.phone || null, headline: profileForm.headline || null,
          location_city: profileForm.location_city || null, location_province: profileForm.location_province || null,
          skills: profileForm.skills.map((v) => v.trim()).filter(Boolean).slice(0, 50), 
          default_resume_path: resumePath, experience: cleanExperience, education: cleanEducation
        },
      });

      setDashboardState(c => ({ ...c, success: 'Profile updated successfully.' }));
      setResumeFile(null);
      await loadProfile();
      await auth.refreshProfile();
      setTimeout(() => setDashboardState(curr => ({...curr, success: ''})), 4000);
    } catch (error) {
      setDashboardState(c => ({ ...c, error: error.message || 'Could not update profile.' }));
    } finally { setSavingProfile(false); }
  };

  // 🔥 TABS DEFINITION
  const TABS = [
    { id: 'basic', label: 'Basic Details', icon: UserRound },
    { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Award },
    { id: 'resume', label: 'Resume', icon: FileText }
  ];

  return (
    <DashboardLayout title="My Profile" subtitle="Build your profile and stand out to employers.">
      <style>{premiumCSS}</style>
      {dashboardState.error && <div className="banner banner-error"><X size={18}/> {dashboardState.error}</div>}
      {dashboardState.success && <div className="banner banner-success"><CheckCircle2 size={18}/> {dashboardState.success}</div>}

      <div className="profile-container">
        
        {/* 🔥 THE PREMIUM TABS HEADER */}
        <div className="profile-tabs-header">
          {TABS.map(tab => (
            <button 
              key={tab.id} 
              type="button" 
              className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} className="tab-icon" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={saveProfile} className="profile-tab-content-area">
          
          {/* 1. BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                <div className="profile-section-header"><UserRound size={20} color="#2557a7" /><h3>Basic Information</h3></div>
                <div className="profile-form-grid">
                  <ProfileField label="Full Name" value={profileForm.full_name} onChange={(val) => setProfileForm(c => ({...c, full_name: val}))} />
                  <ProfileField label="Phone Number" value={profileForm.phone} onChange={(val) => setProfileForm(c => ({...c, phone: val}))} />
                  <ProfileField label="Professional Headline" value={profileForm.headline} onChange={(val) => setProfileForm(c => ({...c, headline: val}))} wide placeholder="e.g. Senior Software Engineer at Tech Corp" />
                  <ProfileField label="City" value={profileForm.location_city} onChange={(val) => setProfileForm(c => ({...c, location_city: val}))} />
                  <ProfileField label="Province / State" value={profileForm.location_province} onChange={(val) => setProfileForm(c => ({...c, location_province: val}))} />
                </div>
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || hasDateErrors}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. EXPERIENCE TAB */}
          {activeTab === 'experience' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                <div className="profile-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BriefcaseBusiness size={20} color="#2557a7" /><h3>Work Experience</h3></div>
                  <button type="button" className="btn-secondary" onClick={addExperience} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                
                {profileForm.experience.length === 0 && <div className="empty-state">No experience added yet. Add your past roles to stand out.</div>}
                
                {profileForm.experience.map((exp, index) => {
                  if (!exp.isEditing) {
                    return (
                      <div key={index} className="summary-item">
                        <div className="summary-info">
                          <h4>{exp.title || 'Untitled Role'} {exp.company && <span style={{fontWeight: 400, color: '#6b7280'}}>at {exp.company}</span>}</h4>
                          <p>{exp.startDate || 'No Start Date'} — {exp.current ? 'Present' : (exp.endDate || 'No End Date')}</p>
                        </div>
                        <div className="summary-actions">
                          <button type="button" className="btn-icon" onClick={() => toggleExperienceEdit(index, true)} title="Edit"><Edit2 size={16} /></button>
                          <button type="button" className="btn-icon" onClick={() => removeExperience(index)} title="Remove" style={{ color: '#e11d48', borderColor: '#fecaca' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  }

                  let errorMsg = null;
                  if (exp.startDate && exp.startDate > todayStr) errorMsg = "Start Date cannot be in the future.";
                  else if (!exp.current && exp.endDate && exp.endDate > todayStr) errorMsg = "End Date cannot be in the future.";
                  else if (!exp.current && exp.startDate && exp.endDate && exp.startDate > exp.endDate) errorMsg = "Start Date cannot be greater than End Date.";

                  return (
                    <div key={index} className="experience-item">
                      <div className="exp-header-actions" style={{ gap: '8px', display: 'flex' }}>
                        <button type="button" className="btn-secondary" onClick={() => toggleExperienceEdit(index, false)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> Done Editing</button>
                        <button type="button" className="btn-danger-ghost" onClick={() => removeExperience(index)}><Trash2 size={14} /> Remove</button>
                      </div>
                      <div className="profile-form-grid">
                        <ProfileField label="Job Title" value={exp.title} onChange={(val) => updateExperience(index, 'title', val)} placeholder="e.g. Product Manager" />
                        <ProfileField label="Company" value={exp.company} onChange={(val) => updateExperience(index, 'company', val)} placeholder="e.g. Google" />
                        <ProfileField type="date" label="Start Date" max={todayStr} value={exp.startDate || ''} onChange={(val) => updateExperience(index, 'startDate', val)} />
                        {exp.current ? (
                          <div className="form-group"><label>End Date</label><input type="text" className="form-input" value="Present" disabled style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} /></div>
                        ) : (
                          <ProfileField type="date" label="End Date" min={exp.startDate} max={todayStr} value={exp.endDate || ''} onChange={(val) => updateExperience(index, 'endDate', val)} />
                        )}
                        <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input type="checkbox" id={`current-exp-${index}`} checked={exp.current || false} onChange={(e) => updateExperience(index, 'current', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                          <label htmlFor={`current-exp-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '500', color: '#374151' }}>I currently work in this role</label>
                        </div>
                        {errorMsg && <div className="form-group full-width" style={{ color: '#e11d48', fontSize: '0.85rem', marginTop: '-4px', fontWeight: '500' }}>{errorMsg}</div>}
                        <div className="form-group full-width"><label>Description</label><textarea className="form-input form-textarea" value={exp.description} onChange={(e) => updateExperience(index, 'description', e.target.value)} placeholder="Describe your responsibilities and achievements..." /></div>
                      </div>
                    </div>
                  );
                })}
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || hasDateErrors}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. EDUCATION TAB */}
          {activeTab === 'education' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                <div className="profile-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><GraduationCap size={20} color="#2557a7" /><h3>Educational Background</h3></div>
                  <button type="button" className="btn-secondary" onClick={addEducation} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                
                {profileForm.education.length === 0 && <div className="empty-state">No education added yet. Add your degrees or certifications.</div>}
                
                {profileForm.education.map((edu, index) => {
                  if (!edu.isEditing) {
                    return (
                      <div key={index} className="summary-item">
                        <div className="summary-info">
                          <h4>{edu.degree || 'Untitled Degree'} {edu.institution && <span style={{fontWeight: 400, color: '#6b7280'}}>at {edu.institution}</span>}</h4>
                          <p>{edu.startDate || 'No Start Date'} — {edu.current ? 'Present' : (edu.endDate || 'No End Date')}</p>
                        </div>
                        <div className="summary-actions">
                          <button type="button" className="btn-icon" onClick={() => toggleEducationEdit(index, true)} title="Edit"><Edit2 size={16} /></button>
                          <button type="button" className="btn-icon" onClick={() => removeEducation(index)} title="Remove" style={{ color: '#e11d48', borderColor: '#fecaca' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  }

                  let errorMsg = null;
                  if (edu.startDate && edu.startDate > todayStr) errorMsg = "Start Date cannot be in the future.";
                  else if (!edu.current && edu.endDate && edu.endDate > todayStr) errorMsg = "End Date cannot be in the future.";
                  else if (!edu.current && edu.startDate && edu.endDate && edu.startDate > edu.endDate) errorMsg = "Start Date cannot be greater than End Date.";

                  return (
                    <div key={index} className="experience-item">
                      <div className="exp-header-actions" style={{ gap: '8px', display: 'flex' }}>
                        <button type="button" className="btn-secondary" onClick={() => toggleEducationEdit(index, false)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> Done Editing</button>
                        <button type="button" className="btn-danger-ghost" onClick={() => removeEducation(index)}><Trash2 size={14} /> Remove</button>
                      </div>
                      <div className="profile-form-grid">
                        <ProfileField label="Degree / Certification" value={edu.degree} onChange={(val) => updateEducation(index, 'degree', val)} placeholder="e.g. B.S. Computer Science" />
                        <ProfileField label="Institution / School" value={edu.institution} onChange={(val) => updateEducation(index, 'institution', val)} placeholder="e.g. University of Toronto" />
                        <ProfileField type="date" label="Start Date" max={todayStr} value={edu.startDate || ''} onChange={(val) => updateEducation(index, 'startDate', val)} />
                        {edu.current ? (
                          <div className="form-group"><label>End Date</label><input type="text" className="form-input" value="Present" disabled style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} /></div>
                        ) : (
                          <ProfileField type="date" label="End Date" min={edu.startDate} max={todayStr} value={edu.endDate || ''} onChange={(val) => updateEducation(index, 'endDate', val)} />
                        )}
                        <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input type="checkbox" id={`current-edu-${index}`} checked={edu.current || false} onChange={(e) => updateEducation(index, 'current', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                          <label htmlFor={`current-edu-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '500', color: '#374151' }}>I am currently studying here</label>
                        </div>
                        {errorMsg && <div className="form-group full-width" style={{ color: '#e11d48', fontSize: '0.85rem', marginTop: '-4px', fontWeight: '500' }}>{errorMsg}</div>}
                      </div>
                    </div>
                  );
                })}
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || hasDateErrors}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. SKILLS TAB */}
          {activeTab === 'skills' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                <div className="profile-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Award size={20} color="#2557a7" /><h3>Skills</h3></div>
                  <button type="button" className="btn-secondary" onClick={addSkill} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                
                {profileForm.skills.length === 0 && <div className="empty-state">No skills added yet. Add skills to get better job recommendations.</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {profileForm.skills.map((skill, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input className="form-input" value={skill} placeholder="e.g. React.js, Marketing, Data Analysis" onChange={(e) => updateSkill(index, e.target.value)} style={{ flex: 1 }} />
                      <button type="button" className="btn-icon" onClick={() => removeSkill(index)} style={{ color: '#e11d48', borderColor: '#fecaca', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || hasDateErrors}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. RESUME TAB (Properly Aligned with others) */}
          {activeTab === 'resume' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                
                <div className="profile-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color="#2557a7" />
                    <h3>Resume</h3>
                  </div>
                </div>
                
                <p style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px'}}>Employers will view this document when you apply for a job.</p>

                <div style={{ marginTop: '16px' }}>
                  {!resumeFile && !profileForm.default_resume_path ? (
                    <div className="resume-upload-box" style={{ padding: '30px 20px' }}>
                      <label className="resume-upload-label">
                        <UploadCloud size={36} className="icon" style={{marginBottom: '8px'}} />
                        <span style={{fontWeight: '600', color: '#111827', fontSize: '1rem'}}>Click to Upload Resume</span>
                        <span style={{fontSize: '0.85rem'}}>PDF up to 5MB</span>
                        <input type="file" accept="application/pdf,.pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  ) : (
                    <div className="attached-file-card" style={{ padding: '16px', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div className="file-info">
                        <div style={{background: '#fee2e2', padding: '10px', borderRadius: '8px'}}><FileText size={20} color="#e11d48" /></div>
                        <div className="file-details">
                          <span className="file-name" style={{fontSize: '1rem', maxWidth: '250px'}} title={resumeFile ? resumeFile.name : 'Existing Resume.pdf'}>
                            {resumeFile ? resumeFile.name : 'Existing_Resume.pdf'}
                          </span>
                          <span className="file-size" style={{fontSize: '0.85rem'}}>
                            {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 'Securely stored on Jooblie'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="file-actions">
                        <button type="button" className="btn-secondary" onClick={handleViewResume} style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                          <Eye size={16} /> View
                        </button>
                        <label className="btn-icon-small" title="Replace Resume" style={{ width: '34px', height: '34px' }}>
                          <UploadCloud size={16} />
                          <input type="file" accept="application/pdf,.pdf" style={{display: 'none'}} onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                        </label>
                        {resumeFile && (
                          <button type="button" className="btn-icon-small" onClick={() => setResumeFile(null)} title="Cancel upload" style={{ width: '34px', height: '34px', color: '#e11d48', borderColor: '#fecaca' }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || hasDateErrors} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>

              </div>
            </div>
          )}

        </form>
      </div>
    </DashboardLayout>
  );
}

/* --- REUSABLE COMPONENTS & CSS --- */
const premiumCSS = `
  /* TABS HEADER DESIGN */
  .profile-container { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
  .profile-tabs-header { display: flex; gap: 8px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #f3f4f6; overflow-x: auto; scrollbar-width: none; }
  .profile-tabs-header::-webkit-scrollbar { display: none; }
  .profile-tab-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: transparent; border: none; color: #6b7280; font-weight: 600; font-size: 0.95rem; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; outline: none; }
  .profile-tab-btn:hover { background: #f9fafb; color: #374151; }
  .profile-tab-btn.active { background: #eff6ff; color: #2557a7; box-shadow: inset 0 -3px 0 0 #2557a7; border-radius: 8px 8px 0 0; }
  .tab-icon { opacity: 0.7; }
  .profile-tab-btn.active .tab-icon { opacity: 1; }
  
  /* ANIMATION FOR TAB SWITCHING */
  .fade-in { animation: fadeIn 0.3s ease-in-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* CARDS & FORMS */
  .profile-section-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02); }
  .profile-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; color: #111827; }
  .profile-section-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
  .profile-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  
  .empty-state { padding: 30px; text-align: center; color: #6b7280; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; font-size: 0.95rem; }
  
  /* EXPERIENCE & EDUCATION */
  .experience-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 20px; }
  .exp-header-actions { display: flex; justify-content: flex-end; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;}
  
  .summary-item { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 16px; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
  .summary-item:hover { border-color: #2557a7; box-shadow: 0 4px 6px rgba(0,0,0,0.04); transform: translateY(-1px); }
  .summary-info h4 { margin: 0 0 6px 0; font-size: 1.1rem; color: #111827; font-weight: 600; }
  .summary-info p { margin: 0; font-size: 0.9rem; color: #6b7280; font-weight: 500;}
  .summary-actions { display: flex; gap: 8px; }

  /* RESUME CARD */
  .attached-file-card { display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; transition: all 0.2s;}
  .file-info { display: flex; align-items: center; gap: 16px; overflow: hidden; }
  .file-details { display: flex; flex-direction: column; overflow: hidden; }
  .file-name { font-size: 0.95rem; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
  .file-size { font-size: 0.8rem; color: #6b7280; margin-top: 2px;}
  .file-actions { display: flex; align-items: center; gap: 8px; }
  
  .resume-upload-box { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 32px 16px; text-align: center; background: #f8fafc; transition: all 0.2s; cursor: pointer; }
  .resume-upload-box:hover { border-color: #2557a7; background: #eff6ff; }
  .resume-upload-box input[type="file"] { display: none; }
  .resume-upload-label { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; color: #4b5563; }
  .resume-upload-label .icon { color: #2557a7; }

  /* BUTTONS & FOOTER */
  .tab-footer { display: flex; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
  .form-group { display: flex; flex-direction: column; gap: 8px; }
  .form-group.full-width { grid-column: 1 / -1; }
  .form-group label { color: #374151; font-size: 0.9rem; font-weight: 600; margin: 0; }
  .form-input { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; color: #111827; outline: none; transition: all 0.2s; box-sizing: border-box; background: #fff;}
  .form-input:focus { border-color: #2557a7; box-shadow: 0 0 0 3px rgba(37, 87, 167, 0.15); }
  .form-textarea { resize: vertical; min-height: 120px; }
  
  .btn-primary { background: #2557a7; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  .btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-secondary:hover { background: #f9fafb; border-color: #9ca3af; color: #111827; }
  .btn-danger-ghost { background: transparent; color: #e11d48; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;}
  .btn-danger-ghost:hover { background: #fef2f2; }
  .btn-icon { width: 40px; height: 40px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: #4b5563; transition: all 0.2s; }
  .btn-icon:hover { background: #f3f4f6; color: #2557a7; border-color: #d1d5db; }
  .btn-icon-small { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; color: #4b5563; transition: all 0.2s; }
  .btn-icon-small:hover { background: #fef2f2; color: #e11d48; border-color: #fecaca; }

  .banner { padding: 14px 20px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
  .banner-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .banner-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  @media (max-width: 768px) { .profile-form-grid { grid-template-columns: 1fr; } .profile-section-card { padding: 20px; } }
`;

function ProfileField({ label, value, onChange, wide = false, placeholder = '', type = 'text', min, max }) {
  if (!label) return <input type={type} min={min} max={max} className="form-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
  return <div className={`form-group ${wide ? 'full-width' : ''}`}><label>{label}</label><input type={type} min={min} max={max} className="form-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}