import SkeletonContent from '../../shared/components/Skeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Award, BriefcaseBusiness, CheckCircle2, FileText, Plus, Trash2, UploadCloud, UserRound, X, GraduationCap, Save, Edit2, Eye, Sparkles, ArrowRight, Check, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '../../shared/lib/toast';
import { samePayload, seekerProfileForm, seekerProfilePayload, validateSeekerProfile } from '../../shared/lib/editableProfile';
import { getFieldErrors } from '../../shared/lib/errors';

const EMPTY_PROFILE = { full_name: '', phone: '', headline: '', location_city: '', location_province: '', skills: [], default_resume_path: '', experience: [], education: [] };

// Current date (YYYY-MM-DD format)
const todayStr = new Date().toISOString().split('T')[0];

export default function JobSeekerProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [dashboardState, setDashboardState] = useState({ loading: true, error: '', success: '', profile: null });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [resumeFile, setResumeFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [profileBaseline, setProfileBaseline] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const pending = useRef(false);
  const uploadedResume = useRef(null);
  const autoParseInputRef = useRef(null);
  const formRef = useRef(null);
  const focusField = useRef('');
  const profileDirty = Boolean(profileBaseline) && (Boolean(resumeFile) || !samePayload(seekerProfilePayload(profileForm), profileBaseline));
  
  const [activeTab, setActiveTab] = useState(urlTab && ['basic', 'experience', 'education', 'skills', 'resume'].includes(urlTab) ? urlTab : 'basic');

  // Profile Completeness Calculations (Weighted Strength Meter)
  const checks = [
    { id: 'full_name', tab: 'basic', label: 'Full name & Contact', prompt: '+15% Full Name & Contact Info', weight: 15, done: Boolean(profileForm.full_name?.trim() && profileForm.phone?.trim()) },
    { id: 'headline', tab: 'basic', label: 'Professional headline', prompt: '+15% Professional Headline & Summary', weight: 15, done: Boolean(profileForm.headline?.trim()) },
    { id: 'location_city', tab: 'basic', label: 'City location', prompt: '+10% City Location', weight: 10, done: Boolean(profileForm.location_city?.trim()) },
    { id: 'experience', tab: 'experience', label: 'Work experience', prompt: '+15% Add Work Experience', weight: 15, done: Array.isArray(profileForm.experience) && profileForm.experience.length > 0 },
    { id: 'education', tab: 'education', label: 'Education', prompt: '+15% Add Education', weight: 15, done: Array.isArray(profileForm.education) && profileForm.education.length > 0 },
    { id: 'skills', tab: 'skills', label: 'Skills', prompt: '+10% Add at least 5 Skills', weight: 10, done: Array.isArray(profileForm.skills) && profileForm.skills.filter(s => Boolean(typeof s === 'string' && s.trim())).length >= 5 },
    { id: 'resume', tab: 'resume', label: 'Resume document', prompt: '+20% Upload Resume', weight: 20, done: Boolean(resumeFile || profileForm.default_resume_path?.trim()) },
  ];
  const completenessPercent = Math.min(100, checks.filter(c => c.done).reduce((acc, c) => acc + c.weight, 0));

  const isTabDone = (tabId) => {
    if (tabId === 'basic') return Boolean(profileForm.full_name?.trim() && profileForm.phone?.trim() && profileForm.headline?.trim() && profileForm.location_city?.trim());
    if (tabId === 'experience') return Array.isArray(profileForm.experience) && profileForm.experience.length > 0;
    if (tabId === 'education') return Array.isArray(profileForm.education) && profileForm.education.length > 0;
    if (tabId === 'skills') return Array.isArray(profileForm.skills) && profileForm.skills.filter(s => Boolean(typeof s === 'string' && s.trim())).length >= 5;
    if (tabId === 'resume') return Boolean(resumeFile || profileForm.default_resume_path?.trim());
    return false;
  };

  const loadProfile = useCallback(async (signal) => {
    try {
      const result = await apiRequest('/job-seeker/dashboard', { auth: true, signal });
      if (signal?.aborted) return;
      const profile = result?.profile;
      if (!profile) throw new Error('Your profile could not be loaded. Please try again.');
      setProfileForm(seekerProfileForm(profile));
      setProfileBaseline(seekerProfilePayload(profile));
      setDashboardState({ loading: false, error: '', success: '', profile });
    } catch (error) { if (!signal?.aborted) setDashboardState(c => ({ ...c, loading: false, error: 'Could not load profile. Please reload and try again.' })); }
  }, []);

  useEffect(() => { const controller = new AbortController(); loadProfile(controller.signal); return () => controller.abort(); }, [loadProfile]);
  useEffect(() => {
    if (!focusField.current) return;
    const field = formRef.current?.elements.namedItem(focusField.current);
    if (field) { field.focus(); focusField.current = ''; }
  }, [activeTab, profileForm, fieldErrors]);

  const showFieldErrors = (errors) => {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return;
    focusField.current = first;
    const group = first.split('.')[0];
    setActiveTab(['experience', 'education', 'skills', 'resume'].includes(group) ? group : 'basic');
    if (group === 'experience' || group === 'education') {
      const index = Number(first.split('.')[1]);
      setProfileForm((current) => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, isEditing: true } : item) }));
    }
  };
  const clearFieldError = (event) => {
    const name = event.target.name;
    if (!name) return;
    setFieldErrors((current) => { const next = { ...current }; delete next[name]; delete next[name.split('.')[0]]; return next; });
  };
  const handleParseResume = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast(new Error('Resume must be 10 MB or smaller.'));
      return;
    }
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      showErrorToast(new Error('Please select a valid PDF or DOCX file.'));
      return;
    }

    setParsingResume(true);
    try {
      let body = {};
      if (file) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not read the selected resume file.'));
          reader.readAsDataURL(file);
        });

        const isDocx = file.name.toLowerCase().endsWith('.docx');
        const contentType = file.type || (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');

        body = {
          base64,
          filename: file.name,
          contentType,
        };
      } else if (profileForm.default_resume_path) {
        body = {
          path: profileForm.default_resume_path,
        };
      } else {
        return;
      }

      const result = await apiRequest('/job-seeker/parse-resume', {
        method: 'POST',
        auth: true,
        body,
      });

      const parsed = result?.data || {};

      setProfileForm((prev) => {
        const next = { ...prev };
        if (parsed.full_name && !prev.full_name?.trim()) next.full_name = parsed.full_name;
        if (parsed.phone) next.phone = parsed.phone;
        if (parsed.headline) {
          next.headline = parsed.headline;
        } else if (!next.headline && parsed.summary) {
          next.headline = parsed.summary.slice(0, 200);
        }
        if (parsed.location_city) next.location_city = parsed.location_city;
        if (parsed.location_province) next.location_province = parsed.location_province;

        if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          const combined = Array.from(new Set([...(prev.skills || []), ...parsed.skills]));
          next.skills = combined.slice(0, 50);
        }

        if (Array.isArray(parsed.experience) && parsed.experience.length > 0) {
          next.experience = parsed.experience.map((item) => ({
            ...item,
            isEditing: false,
          }));
        }

        if (Array.isArray(parsed.education) && parsed.education.length > 0) {
          next.education = parsed.education.map((item) => ({
            ...item,
            isEditing: false,
          }));
        }

        return next;
      });

      if (file) {
        setResumeFile(file);
        uploadedResume.current = null;
      }
      setFieldErrors({});

      showSuccessToast('Resume parsed successfully! Structured details pre-filled. Review across tabs and click Save.');
    } catch (err) {
      showErrorToast(err, 'Failed to extract resume details.');
    } finally {
      setParsingResume(false);
    }
  };

  const chooseResume = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    const errors = validateSeekerProfile(profileForm, file);
    if (errors.resume) { setFieldErrors((current) => ({ ...current, resume: errors.resume })); return; }
    uploadedResume.current = null;
    setResumeFile(file);
    setFieldErrors((current) => ({ ...current, resume: undefined }));
    handleParseResume(file);
  };

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
      setDashboardState(c => ({ ...c, error: extractErrorMessage(error, 'Resume could not be opened.') }));
      showErrorToast(error, 'Resume could not be opened.');
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (pending.current || !profileDirty) return;
    const errors = validateSeekerProfile(profileForm, resumeFile, todayStr);
    if (Object.keys(errors).length) { showFieldErrors(errors); return; }
    const submitted = seekerProfilePayload(profileForm);
    pending.current = true;
    setSavingProfile(true);
    setFieldErrors({});
    setDashboardState(c => ({ ...c, error: '', success: '' }));

    try {
      let resumePath = uploadedResume.current?.file === resumeFile ? uploadedResume.current.path : submitted.default_resume_path;
      if (resumeFile && uploadedResume.current?.file !== resumeFile) {
        if (!supabase || !auth.user?.id) throw new Error('Resume upload is not available.');
        if (resumeFile.size > 10 * 1024 * 1024) throw new Error('Resume must be 10 MB or smaller.');
        const isDocx = resumeFile.name.toLowerCase().endsWith('.docx');
        const isPdf = resumeFile.name.toLowerCase().endsWith('.pdf') || resumeFile.type === 'application/pdf';
        if (!isPdf && !isDocx) throw new Error('Only PDF and DOCX resumes are accepted.');
        const contentType = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
        const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-180);
        const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(path, resumeFile, { upsert: false, contentType, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        try {
          await apiRequest('/job-seeker/resumes', { method: 'POST', auth: true, body: { path, original_name: resumeFile.name, size_bytes: resumeFile.size, content_type: contentType } });
        } catch (registrationError) {
          try { await supabase.storage.from('resumes').remove([path]); } catch { /* preserve the registration error */ }
          throw registrationError;
        }
        resumePath = path;
        uploadedResume.current = { file: resumeFile, path };
      }
      submitted.default_resume_path = resumePath;
      const result = await apiRequest('/auth/profile', {
        method: 'PATCH', auth: true, notifyError: false,
        body: submitted,
      });
      const saved = seekerProfilePayload(result?.profile || submitted);
      setProfileBaseline(saved);
      setProfileForm(seekerProfileForm(saved));
      setResumeFile(null);
      uploadedResume.current = null;
      auth.updateCachedProfile?.(result.profile);

      // Same completion rules for manual entry and resume auto-fill: all sections must be filled.
      const isComplete = Boolean(
        saved.full_name?.trim() && saved.phone?.trim() &&
        saved.headline?.trim() &&
        saved.location_city?.trim() &&
        saved.experience?.length > 0 &&
        saved.education?.length > 0 &&
        saved.skills?.filter(Boolean).length >= 5 &&
        (saved.default_resume_path || '').trim()
      );
      if (isComplete) {
        showSuccessToast('Your profile is 100% complete! Redirecting to browse jobs...');
        setTimeout(() => navigate('/dashboard/job-seeker/jobs'), 700);
      } else {
        showSuccessToast('Profile updated. Complete the remaining sections to reach 100% and start applying.');
      }
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length) { showFieldErrors(fields); return; }
      setDashboardState(c => ({ ...c, error: extractErrorMessage(error, 'Could not update profile.') }));
      showErrorToast(error, 'Could not update profile.');
    } finally { pending.current = false; setSavingProfile(false); }
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

      <div className="profile-container">
        
        {/* Profile Completion Tracker (Shown only when profile is not yet 100%) */}
        {completenessPercent < 100 && (
          <div className="profile-completion-tracker fade-in">
            <div className="tracker-header">
              <div>
                <span className="tracker-badge">Profile Completion Strength Meter</span>
                <h4>Complete your profile to 100% to apply for jobs ({completenessPercent}%)</h4>
              </div>
              <div className="tracker-percentage-pill">{completenessPercent}%</div>
            </div>
            <div className="tracker-bar-bg">
              <div className="tracker-bar-fill" style={{ width: `${completenessPercent}%` }} />
            </div>
            <div className="tracker-missing-box">
              <span className="tracker-missing-label">Still required for 100%:</span>
              <div className="tracker-tags-list">
                {checks.filter(c => !c.done).map(c => (
                  <button key={c.id} type="button" className="tracker-tag-btn" onClick={() => setActiveTab(c.tab)} title={`Go to ${c.tab} tab`}>
                    {c.prompt || `+ ${c.label}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🔥 Resume-Driven Auto-Profile Banner */}
        <div className="resume-autofill-banner fade-in">
          <div className="autofill-content">
            <div className="autofill-icon-wrap">
              <Sparkles size={24} color="#2563eb" />
            </div>
            <div>
              <h4 className="autofill-title">Resume-Driven Auto-Profile Completion</h4>
              <p className="autofill-desc">
                Upload your resume (.pdf or .docx). Our smart parser extracts your Full Name, Contact info, Headline, Summary, Work History, Education, and Skills so you can review and confirm before saving.
              </p>
            </div>
          </div>
          <div className="autofill-action">
            <input
              ref={autoParseInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: 'none' }}
              onChange={chooseResume}
            />
            <button
              type="button"
              className="btn-autofill"
              onClick={() => autoParseInputRef.current?.click()}
              disabled={parsingResume || savingProfile}
            >
              {parsingResume ? (
                <>
                  <RefreshCw size={18} className="spin-icon" /> Parsing Resume...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Upload Resume & Auto-Fill
                </>
              )}
            </button>
          </div>
        </div>

        {/* 🔥 THE PREMIUM TABS HEADER */}
        <div className="profile-tabs-header">
          {TABS.map(tab => {
            const done = isTabDone(tab.id);
            return (
              <button 
                key={tab.id} 
                type="button" 
                className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} className="tab-icon" />
                <span>{tab.label}</span>
                {done ? (
                  <span className="tab-status-check" title="Section complete">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="tab-status-dot" title="Incomplete requirement" />
                )}
              </button>
            );
          })}
        </div>

        <form ref={formRef} onSubmit={saveProfile} onChangeCapture={clearFieldError} className="profile-tab-content-area">

          <fieldset disabled={savingProfile || !profileBaseline} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          
          {/* 1. BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <div className="tab-pane fade-in">
              <div className="profile-section-card">
                <div className="profile-section-header"><UserRound size={20} color="#2557a7" /><h3>Basic Information</h3></div>
                <div className="profile-form-grid">
                  <ProfileField name="full_name" error={fieldErrors.full_name} required minLength={2} maxLength={160} label="Full Name" value={profileForm.full_name} onChange={(val) => setProfileForm(c => ({...c, full_name: val}))} />
                  <ProfileField name="phone" error={fieldErrors.phone} maxLength={50} label="Phone Number" value={profileForm.phone} onChange={(val) => setProfileForm(c => ({...c, phone: val}))} />
                  <ProfileField name="headline" error={fieldErrors.headline} maxLength={220} label="Professional Headline" value={profileForm.headline} onChange={(val) => setProfileForm(c => ({...c, headline: val}))} wide placeholder="e.g. Senior Software Engineer at Tech Corp" />
                  <ProfileField name="location_city" error={fieldErrors.location_city} maxLength={120} label="City" value={profileForm.location_city} onChange={(val) => setProfileForm(c => ({...c, location_city: val}))} />
                  <ProfileField name="location_province" error={fieldErrors.location_province} maxLength={120} label="Province / State" value={profileForm.location_province} onChange={(val) => setProfileForm(c => ({...c, location_province: val}))} />
                </div>
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
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
                  <button type="button" className="btn-secondary" onClick={addExperience} disabled={profileForm.experience.length >= 20} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                {fieldErrors.experience && <p className="field-error">{fieldErrors.experience}</p>}
                
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

                  return (
                    <div key={index} className="experience-item">
                      <div className="exp-header-actions" style={{ gap: '8px', display: 'flex' }}>
                        <button type="button" className="btn-secondary" onClick={() => toggleExperienceEdit(index, false)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> Done Editing</button>
                        <button type="button" className="btn-danger-ghost" onClick={() => removeExperience(index)}><Trash2 size={14} /> Remove</button>
                      </div>
                      <div className="profile-form-grid">
                        <ProfileField name={`experience.${index}.title`} error={fieldErrors[`experience.${index}.title`]} required maxLength={180} label="Job Title" value={exp.title} onChange={(val) => updateExperience(index, 'title', val)} placeholder="e.g. Product Manager" />
                        <ProfileField name={`experience.${index}.company`} error={fieldErrors[`experience.${index}.company`]} required maxLength={180} label="Company" value={exp.company} onChange={(val) => updateExperience(index, 'company', val)} placeholder="e.g. Google" />
                        <ProfileField name={`experience.${index}.startDate`} error={fieldErrors[`experience.${index}.startDate`]} type="date" label="Start Date" max={todayStr} value={exp.startDate || ''} onChange={(val) => updateExperience(index, 'startDate', val)} />
                        {exp.current ? (
                          <div className="form-group"><label>End Date</label><input type="text" className="form-input" value="Present" disabled style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} /></div>
                        ) : (
                          <ProfileField name={`experience.${index}.endDate`} error={fieldErrors[`experience.${index}.endDate`]} type="date" label="End Date" min={exp.startDate} max={todayStr} value={exp.endDate || ''} onChange={(val) => updateExperience(index, 'endDate', val)} />
                        )}
                        <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input type="checkbox" id={`current-exp-${index}`} checked={exp.current || false} onChange={(e) => updateExperience(index, 'current', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                          <label htmlFor={`current-exp-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '500', color: '#374151' }}>I currently work in this role</label>
                        </div>
                        <div className="form-group full-width"><label htmlFor={`experience-description-${index}`}>Description</label><textarea name={`experience.${index}.description`} id={`experience-description-${index}`} maxLength={4000} className="form-input form-textarea" value={exp.description || ''} aria-invalid={Boolean(fieldErrors[`experience.${index}.description`])} aria-describedby={fieldErrors[`experience.${index}.description`] ? `experience-description-error-${index}` : undefined} onChange={(e) => updateExperience(index, 'description', e.target.value)} placeholder="Describe your responsibilities and achievements..." />{fieldErrors[`experience.${index}.description`] && <span className="field-error" id={`experience-description-error-${index}`}>{fieldErrors[`experience.${index}.description`]}</span>}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
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
                  <button type="button" className="btn-secondary" onClick={addEducation} disabled={profileForm.education.length >= 20} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                {fieldErrors.education && <p className="field-error">{fieldErrors.education}</p>}
                
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

                  return (
                    <div key={index} className="experience-item">
                      <div className="exp-header-actions" style={{ gap: '8px', display: 'flex' }}>
                        <button type="button" className="btn-secondary" onClick={() => toggleEducationEdit(index, false)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> Done Editing</button>
                        <button type="button" className="btn-danger-ghost" onClick={() => removeEducation(index)}><Trash2 size={14} /> Remove</button>
                      </div>
                      <div className="profile-form-grid">
                        <ProfileField name={`education.${index}.degree`} error={fieldErrors[`education.${index}.degree`]} required maxLength={180} label="Degree / Certification" value={edu.degree} onChange={(val) => updateEducation(index, 'degree', val)} placeholder="e.g. B.S. Computer Science" />
                        <ProfileField name={`education.${index}.institution`} error={fieldErrors[`education.${index}.institution`]} required maxLength={180} label="Institution / School" value={edu.institution} onChange={(val) => updateEducation(index, 'institution', val)} placeholder="e.g. University of Toronto" />
                        <ProfileField name={`education.${index}.startDate`} error={fieldErrors[`education.${index}.startDate`]} type="date" label="Start Date" max={todayStr} value={edu.startDate || ''} onChange={(val) => updateEducation(index, 'startDate', val)} />
                        {edu.current ? (
                          <div className="form-group"><label>End Date</label><input type="text" className="form-input" value="Present" disabled style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} /></div>
                        ) : (
                          <ProfileField name={`education.${index}.endDate`} error={fieldErrors[`education.${index}.endDate`]} type="date" label="End Date" min={edu.startDate} max={todayStr} value={edu.endDate || ''} onChange={(val) => updateEducation(index, 'endDate', val)} />
                        )}
                        <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input type="checkbox" id={`current-edu-${index}`} checked={edu.current || false} onChange={(e) => updateEducation(index, 'current', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                          <label htmlFor={`current-edu-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '500', color: '#374151' }}>I am currently studying here</label>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
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
                  <button type="button" className="btn-secondary" onClick={addSkill} disabled={profileForm.skills.length >= 50} style={{ padding: '6px 12px', fontSize: '0.85rem' }}><Plus size={16} /> Add New</button>
                </div>
                {fieldErrors.skills && <p className="field-error">{fieldErrors.skills}</p>}
                
                {profileForm.skills.length === 0 && <div className="empty-state">No skills added yet. Add skills to get better job recommendations.</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {profileForm.skills.map((skill, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}><input name={`skills.${index}`} aria-label={`Skill ${index + 1}`} aria-invalid={Boolean(fieldErrors[`skills.${index}`])} aria-describedby={fieldErrors[`skills.${index}`] ? `skill-error-${index}` : undefined} maxLength={80} className="form-input" value={skill} placeholder="e.g. React.js, Marketing, Data Analysis" onChange={(e) => updateSkill(index, e.target.value)} />{fieldErrors[`skills.${index}`] && <span className="field-error" id={`skill-error-${index}`}>{fieldErrors[`skills.${index}`]}</span>}</div>
                      <button type="button" className="btn-icon" onClick={() => removeSkill(index)} style={{ color: '#e11d48', borderColor: '#fecaca', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
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
                        <span style={{fontWeight: '600', color: '#111827', fontSize: '1rem'}}>Click to Upload Resume & Auto-Fill</span>
                        <span style={{fontSize: '0.85rem'}}>PDF or DOCX up to 10MB</span>
                        <input name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={chooseResume} />
                      </label>
                    </div>
                  ) : (
                    <div className="attached-file-card" style={{ padding: '16px', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div className="file-info">
                        <div style={{background: '#fee2e2', padding: '10px', borderRadius: '8px'}}><FileText size={20} color="#e11d48" /></div>
                        <div className="file-details">
                          <span className="file-name" style={{fontSize: '1rem', maxWidth: '250px'}} title={resumeFile ? resumeFile.name : (profileForm.default_resume_path?.split('/').pop() || 'Existing Resume')}>
                            {resumeFile ? resumeFile.name : (profileForm.default_resume_path?.split('/').pop() || 'Existing_Resume.pdf')}
                          </span>
                          <span className="file-size" style={{fontSize: '0.85rem'}}>
                            {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 'Securely stored on Jooblie'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="file-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleParseResume(resumeFile || null)}
                          disabled={parsingResume}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                          title="Extract structured data to fill your profile"
                        >
                          {parsingResume ? (
                            <>
                              <RefreshCw size={14} className="spin-icon" /> Parsing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> Parse & Pre-fill
                            </>
                          )}
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleViewResume} style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                          <Eye size={16} /> View
                        </button>
                        <label className="btn-icon-small" title="Replace Resume" style={{ width: '34px', height: '34px' }}>
                          <UploadCloud size={16} />
                          <input name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{display: 'none'}} onChange={chooseResume} />
                        </label>
                        {resumeFile && (
                          <button type="button" className="btn-icon-small" onClick={() => { setResumeFile(null); uploadedResume.current = null; }} title="Cancel upload" style={{ width: '34px', height: '34px', color: '#e11d48', borderColor: '#fecaca' }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {fieldErrors.resume && <p className="field-error" role="status">{fieldErrors.resume}</p>}
                <div className="tab-footer">
                  <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    {savingProfile ? 'Saving...' : <><Save size={16} /> Save Updates</>}
                  </button>
                </div>

              </div>
            </div>
          )}

          </fieldset>
        </form>
      </div>
    </DashboardLayout>
  );
}

/* --- REUSABLE COMPONENTS & CSS --- */
const premiumCSS = `
  /* AUTOFILL BANNER */
  .resume-autofill-banner {
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
    border: 1.5px solid #bfdbfe;
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);
  }
  .autofill-content { display: flex; align-items: flex-start; gap: 16px; }
  .autofill-icon-wrap { background: #dbeafe; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .autofill-title { margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #1e3a8a; }
  .autofill-desc { margin: 0; font-size: 0.88rem; color: #334155; line-height: 1.45; }
  .autofill-action { flex-shrink: 0; }
  .btn-autofill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #2563eb;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 12px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    transition: all 0.2s;
    white-space: nowrap;
  }
  .btn-autofill:hover { background: #1d4ed8; transform: translateY(-1px); }
  .btn-autofill:disabled { opacity: 0.7; cursor: not-allowed; }
  .spin-icon { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  @media (max-width: 768px) {
    .resume-autofill-banner { flex-direction: column; align-items: flex-start; }
    .autofill-action { width: 100%; }
    .btn-autofill { width: 100%; justify-content: center; }
  }

  /* TABS HEADER DESIGN */
  .profile-container { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
  .profile-tabs-header { display: flex; gap: 8px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #f3f4f6; overflow-x: auto; scrollbar-width: none; }
  .profile-tabs-header::-webkit-scrollbar { display: none; }
  .profile-tab-btn { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px 18px; background: transparent; border: none; color: #6b7280; font-weight: 600; font-size: 0.95rem; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; outline: none; }
  .profile-tab-btn:hover { background: #f9fafb; color: #374151; }
  .profile-tab-btn.active { background: #eff6ff; color: #2557a7; box-shadow: inset 0 -3px 0 0 #2557a7; border-radius: 8px 8px 0 0; }
  .tab-icon { opacity: 0.7; }
  .profile-tab-btn.active .tab-icon { opacity: 1; }
  .tab-status-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: #dcfce7; color: #16a34a; margin-left: 2px; }
  .tab-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; margin-left: 2px; }

  /* 100% SUCCESS BANNER */
  .profile-100-success-banner { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #86efac; border-radius: 14px; padding: 22px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.12); }
  .profile-100-success-banner__content { display: flex; align-items: center; gap: 16px; }
  .profile-100-success-banner__icon { font-size: 2.2rem; line-height: 1; }
  .profile-100-badge { display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 12px; border: 1px solid #bbf7d0; text-transform: uppercase; letter-spacing: 0.05em; }
  .profile-100-success-banner h3 { margin: 0 0 4px 0; font-size: 1.15rem; color: #14532d; font-weight: 700; }
  .profile-100-success-banner p { margin: 0; font-size: 0.9rem; color: #166534; }
  .btn-success-apply { display: inline-flex; align-items: center; gap: 8px; background: #16a34a; color: #ffffff !important; font-weight: 600; font-size: 0.95rem; padding: 12px 20px; border-radius: 8px; text-decoration: none; white-space: nowrap; transition: all 0.2s; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25); flex-shrink: 0; }
  .btn-success-apply:hover { background: #15803d; transform: translateY(-1px); }

  /* COMPLETION TRACKER */
  .profile-completion-tracker { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
  .tracker-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .tracker-badge { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
  .tracker-header h4 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
  .tracker-percentage-pill { font-size: 1.1rem; font-weight: 800; color: #2563eb; background: #eff6ff; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; }
  .tracker-bar-bg { width: 100%; height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
  .tracker-bar-fill { height: 100%; background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%); border-radius: 999px; transition: width 0.4s ease; }
  .tracker-missing-box { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .tracker-missing-label { font-size: 0.85rem; font-weight: 600; color: #64748b; }
  .tracker-tags-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .tracker-tag-btn { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s; }
  .tracker-tag-btn:hover { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }


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

function ProfileField({ label, name, error, value, onChange, wide = false, placeholder = '', type = 'text', min, max, ...constraints }) {
  const id = `profile-${name}`;
  return <div className={`form-group ${wide ? 'full-width' : ''}`}><label htmlFor={id}>{label}</label><input {...constraints} id={id} name={name} type={type} min={min} max={max} className="form-input" value={value || ''} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{error && <span className="field-error" id={`${id}-error`}>{error}</span>}</div>;
}
