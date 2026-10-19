import SkeletonContent from '../../shared/components/Skeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
  X,
  GraduationCap,
  Save,
  Edit2,
  Eye,
  Sparkles,
  ArrowRight,
  Check,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  CheckCircle,
  FileCheck,
  BadgeCheck,
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { showErrorToast, showSuccessToast, extractErrorMessage } from '../../shared/lib/toast';
import { samePayload, seekerProfileForm, seekerProfilePayload, validateSeekerProfile } from '../../shared/lib/editableProfile';
import { getFieldErrors } from '../../shared/lib/errors';

const EMPTY_PROFILE = {
  full_name: '',
  phone: '',
  headline: '',
  location_city: '',
  location_province: '',
  skills: [],
  default_resume_path: '',
  experience: [],
  education: [],
};

const SUGGESTED_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'SQL',
  'Project Management',
  'Communication',
  'Leadership',
  'Problem Solving',
  'UI/UX Design',
  'Customer Service',
  'Git',
  'REST APIs',
  'Data Analysis',
];

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
  const [newSkillText, setNewSkillText] = useState('');
  const pending = useRef(false);
  const uploadedResume = useRef(null);
  const autoParseInputRef = useRef(null);
  const resumeTabInputRef = useRef(null);
  const formRef = useRef(null);
  const focusField = useRef('');
  const profileDirty = Boolean(profileBaseline) && (Boolean(resumeFile) || !samePayload(seekerProfilePayload(profileForm), profileBaseline));

  const [activeTab, setActiveTab] = useState(urlTab && ['basic', 'experience', 'education', 'skills', 'resume'].includes(urlTab) ? urlTab : 'basic');

  // Profile Completeness Calculations (Weighted Strength Meter)
  const checks = [
    { id: 'full_name', tab: 'basic', label: 'Full Name & Contact', prompt: '+15% Full Name & Contact Info', weight: 15, done: Boolean(profileForm.full_name?.trim() && profileForm.phone?.trim()) },
    { id: 'headline', tab: 'basic', label: 'Professional Headline', prompt: '+15% Professional Headline', weight: 15, done: Boolean(profileForm.headline?.trim()) },
    { id: 'location_city', tab: 'basic', label: 'City Location', prompt: '+10% City Location', weight: 10, done: Boolean(profileForm.location_city?.trim()) },
    { id: 'experience', tab: 'experience', label: 'Work Experience', prompt: '+15% Add Work Experience', weight: 15, done: Array.isArray(profileForm.experience) && profileForm.experience.length > 0 },
    { id: 'education', tab: 'education', label: 'Education', prompt: '+15% Add Education', weight: 15, done: Array.isArray(profileForm.education) && profileForm.education.length > 0 },
    { id: 'skills', tab: 'skills', label: 'Skills', prompt: '+10% Add at least 5 Skills', weight: 10, done: Array.isArray(profileForm.skills) && profileForm.skills.filter(s => Boolean(typeof s === 'string' && s.trim())).length >= 5 },
    { id: 'resume', tab: 'resume', label: 'Resume Document', prompt: '+20% Upload Resume', weight: 20, done: Boolean(resumeFile || profileForm.default_resume_path?.trim()) },
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
    } catch (error) {
      if (!signal?.aborted) {
        setDashboardState(c => ({ ...c, loading: false, error: 'Could not load profile. Please reload and try again.' }));
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  useEffect(() => {
    if (!focusField.current) return;
    const field = formRef.current?.elements.namedItem(focusField.current);
    if (field) {
      field.focus();
      focusField.current = '';
    }
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
      setProfileForm((current) => ({
        ...current,
        [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, isEditing: true } : item)
      }));
    }
  };

  const clearFieldError = (event) => {
    const name = event.target.name;
    if (!name) return;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      delete next[name.split('.')[0]];
      return next;
    });
  };

  const handleParseResume = async (file) => {
    if (!file && !profileForm.default_resume_path) return;
    if (file && file.size > 10 * 1024 * 1024) {
      showErrorToast(new Error('Resume must be 10 MB or smaller.'));
      return;
    }
    if (file && !/\.(pdf|docx)$/i.test(file.name)) {
      showErrorToast(new Error('Please select a valid PDF or DOCX file.'));
      return;
    }

    setParsingResume(true);
    try {
      let body = {};
      if (file) {
        const isDocx = file.name.toLowerCase().endsWith('.docx');
        const contentType = file.type || (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
        
        let uploadedPath = null;
        if (supabase && auth.user?.id) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-180);
          const tempPath = `${auth.user.id}/temp-parse-${crypto.randomUUID()}-${safeName}`;
          const { error: uploadErr } = await supabase.storage.from('resumes').upload(tempPath, file, { upsert: true, contentType });
          if (!uploadErr) {
            uploadedPath = tempPath;
          }
        }

        if (uploadedPath) {
          body = {
            path: uploadedPath,
            filename: file.name,
            contentType,
          };
        } else {
          if (file.size > 2 * 1024 * 1024) {
            throw new Error('Resume file exceeds direct processing limit. Please ensure your session is active to upload.');
          }
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read the selected resume file.'));
            reader.readAsDataURL(file);
          });
          body = {
            base64,
            filename: file.name,
            contentType,
          };
        }
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

      showSuccessToast('Resume parsed successfully! Structured details pre-filled. Review across tabs and save.');
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
    if (errors.resume) {
      setFieldErrors((current) => ({ ...current, resume: errors.resume }));
      return;
    }
    uploadedResume.current = null;
    setResumeFile(file);
    setFieldErrors((current) => ({ ...current, resume: undefined }));
    handleParseResume(file);
  };

  // --- Experience Handlers ---
  const addExperience = () => {
    setProfileForm(c => ({
      ...c,
      experience: [
        { title: '', company: '', startDate: '', endDate: '', description: '', current: false, isEditing: true },
        ...c.experience,
      ]
    }));
  };
  const updateExperience = (index, field, value) => {
    const newExp = [...profileForm.experience];
    newExp[index][field] = value;
    if (field === 'current' && value === true) {
      newExp[index]['endDate'] = '';
    }
    setProfileForm(c => ({ ...c, experience: newExp }));
  };
  const toggleExperienceEdit = (index, isEditing) => {
    const newExp = [...profileForm.experience];
    newExp[index]['isEditing'] = isEditing;
    setProfileForm(c => ({ ...c, experience: newExp }));
  };
  const removeExperience = (index) => {
    const newExp = profileForm.experience.filter((_, i) => i !== index);
    setProfileForm(c => ({ ...c, experience: newExp }));
  };

  // --- Education Handlers ---
  const addEducation = () => {
    setProfileForm(c => ({
      ...c,
      education: [
        { degree: '', institution: '', startDate: '', endDate: '', current: false, isEditing: true },
        ...c.education,
      ]
    }));
  };
  const updateEducation = (index, field, value) => {
    const newEdu = [...profileForm.education];
    newEdu[index][field] = value;
    if (field === 'current' && value === true) {
      newEdu[index]['endDate'] = '';
    }
    setProfileForm(c => ({ ...c, education: newEdu }));
  };
  const toggleEducationEdit = (index, isEditing) => {
    const newEdu = [...profileForm.education];
    newEdu[index]['isEditing'] = isEditing;
    setProfileForm(c => ({ ...c, education: newEdu }));
  };
  const removeEducation = (index) => {
    const newEdu = profileForm.education.filter((_, i) => i !== index);
    setProfileForm(c => ({ ...c, education: newEdu }));
  };

  // --- Skills Handlers ---
  const handleAddSkillFromInput = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSkillText.trim();
    if (!trimmed) return;
    if (profileForm.skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkillText('');
      return;
    }
    if (profileForm.skills.length >= 50) {
      showErrorToast(new Error('You can add up to 50 skills.'));
      return;
    }
    setProfileForm(c => ({ ...c, skills: [...c.skills, trimmed] }));
    setNewSkillText('');
  };

  const handleAddSuggestedSkill = (skill) => {
    if (profileForm.skills.some(s => s.toLowerCase() === skill.toLowerCase())) return;
    if (profileForm.skills.length >= 50) return;
    setProfileForm(c => ({ ...c, skills: [...c.skills, skill] }));
  };

  const removeSkill = (index) => {
    const newSkills = profileForm.skills.filter((_, i) => i !== index);
    setProfileForm(c => ({ ...c, skills: newSkills }));
  };

  const handleViewResume = async () => {
    if (resumeFile) {
      window.open(URL.createObjectURL(resumeFile), '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const result = await apiRequest('/job-seeker/resume-url', { auth: true });
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setDashboardState(c => ({ ...c, error: extractErrorMessage(error, 'Resume could not be opened.') }));
      showErrorToast(error, 'Resume could not be opened.');
    }
  };

  const discardChanges = () => {
    if (!profileBaseline) return;
    setProfileForm(seekerProfileForm(profileBaseline));
    setResumeFile(null);
    uploadedResume.current = null;
    setFieldErrors({});
    setDashboardState(c => ({ ...c, error: '' }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (pending.current || !profileDirty) return;
    const errors = validateSeekerProfile(profileForm, resumeFile, todayStr);
    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      return;
    }
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
          try { await supabase.storage.from('resumes').remove([path]); } catch { /* preserve registration error */ }
          throw registrationError;
        }
        resumePath = path;
        uploadedResume.current = { file: resumeFile, path };
      }
      submitted.default_resume_path = resumePath;
      const result = await apiRequest('/auth/profile', {
        method: 'PATCH',
        auth: true,
        notifyError: false,
        body: submitted,
      });
      const saved = seekerProfilePayload(result?.profile || submitted);
      setProfileBaseline(saved);
      setProfileForm(seekerProfileForm(saved));
      setResumeFile(null);
      uploadedResume.current = null;
      auth.updateCachedProfile?.(result.profile);

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
        showSuccessToast('Profile updated successfully! Keep going to reach 100%.');
      }
    } catch (error) {
      const fields = getFieldErrors(error);
      if (Object.keys(fields).length) {
        showFieldErrors(fields);
        return;
      }
      setDashboardState(c => ({ ...c, error: extractErrorMessage(error, 'Could not update profile.') }));
      showErrorToast(error, 'Could not update profile.');
    } finally {
      pending.current = false;
      setSavingProfile(false);
    }
  };

  const TABS = [
    { id: 'basic', label: 'Basic Details', icon: UserRound },
    { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Award },
    { id: 'resume', label: 'Resume', icon: FileText },
  ];

  const userInitial = (profileForm.full_name?.trim() || auth.profile?.email || 'U')[0].toUpperCase();

  return (
    <DashboardLayout title="My Profile" subtitle="Build a distinguished candidate profile to stand out to verified employers.">
      <style>{enhancedProfileCSS}</style>

      {dashboardState.error && (
        <div className="banner banner-error">
          <X size={18} /> {dashboardState.error}
        </div>
      )}

      <div className="profile-container">

        {/* 1. HERO IDENTITY CARD */}
        <section className="profile-hero-card">
          <div className="hero-identity">
            <div className="hero-avatar">
              <span>{userInitial}</span>
            </div>
            <div className="hero-details">
              <div className="hero-name-row">
                <h2>{profileForm.full_name?.trim() || 'Your Name Here'}</h2>
                <span className="hero-role-pill">Job Seeker</span>
                {completenessPercent === 100 && (
                  <span className="hero-verified-pill">
                    100% Verified
                  </span>
                )}
              </div>
              <p className="hero-headline">
                {profileForm.headline?.trim() || 'Add a professional headline so recruiters immediately know your expertise'}
              </p>
              <div className="hero-meta-chips">
                {(profileForm.location_city?.trim() || profileForm.location_province?.trim()) ? (
                  <span className="meta-chip">
                    {[profileForm.location_city, profileForm.location_province].filter(Boolean).join(', ')}
                  </span>
                ) : (
                  <span className="meta-chip meta-chip--muted">
                    Location not set
                  </span>
                )}
                {profileForm.phone?.trim() ? (
                  <span className="meta-chip">
                    {profileForm.phone}
                  </span>
                ) : (
                  <span className="meta-chip meta-chip--muted">
                    Phone not set
                  </span>
                )}
                <span className="meta-chip">
                  {auth.profile?.email || auth.user?.email || 'Registered account'}
                </span>
              </div>
            </div>
          </div>
          <div className="hero-metric-box">
            <div className="metric-ring-wrap">
              <span className="metric-val">{completenessPercent}%</span>
              <span className="metric-sub">Strength</span>
            </div>
            <p className="metric-caption">
              {completenessPercent === 100 ? 'Ready for applications' : 'Profile completeness'}
            </p>
          </div>
        </section>

        {/* 2. PROFILE COMPLETION TRACKER (or 100% SUCCESS BANNER) */}
        {completenessPercent === 100 ? (
          <div className="profile-100-success-banner fade-in">
            <div className="profile-100-success-banner__content">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="profile-100-badge">100% Complete</span>
                  <span style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 700 }}>All requirements satisfied</span>
                </div>
                <h3>Your profile is in peak hiring shape!</h3>
                <p>Employers see a complete, verified profile. Start applying to open positions today.</p>
              </div>
            </div>
            <Link to="/dashboard/job-seeker/jobs" className="btn-success-apply">
              Explore Open Jobs
            </Link>
          </div>
        ) : (
          <div className="profile-completion-tracker fade-in">
            <div className="tracker-header">
              <div className="tracker-title-wrap">
                <span className="tracker-badge">Profile Strength Meter</span>
                <h4>Complete your profile to 100% to apply for jobs</h4>
              </div>
              <div className="tracker-percentage-pill">
                <strong>{completenessPercent}%</strong>
                <span>Completed</span>
              </div>
            </div>
            <div className="tracker-bar-bg">
              <div
                className="tracker-bar-fill"
                style={{ width: `${Math.max(4, completenessPercent)}%` }}
              />
            </div>
            <div className="tracker-missing-box">
              <span className="tracker-missing-label">Steps needed for 100%:</span>
              <div className="tracker-tags-list">
                {checks.filter(c => !c.done).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="tracker-tag-btn"
                    onClick={() => setActiveTab(c.tab)}
                    title={`Click to complete: ${c.label}`}
                  >
                    <span>{c.prompt || `+ ${c.label}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. RESUME-DRIVEN AUTO-PROFILE COMPLETION BANNER */}
        <div className="resume-autofill-banner fade-in">
          <div className="autofill-content">
            <div>
              <div className="autofill-badge">
                Smart Auto-Fill
              </div>
              <h4 className="autofill-title">Resume-Driven Auto-Profile Completion</h4>
              <p className="autofill-desc">
                Upload your resume (.pdf or .docx). Our smart parser extracts your Full Name, Contact info, Headline, Summary, Work History, Education, and Skills so you can review and save with one click.
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
              {parsingResume ? 'Parsing Document...' : 'Upload Resume & Auto-Fill'}
            </button>
          </div>
        </div>

        {/* 4. SEGMENTED TABS HEADER */}
        <div className="profile-tabs-header">
          {TABS.map(tab => {
            const done = isTabDone(tab.id);
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`profile-tab-btn ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} className="tab-icon" />
                <span className="tab-label">{tab.label}</span>
                {done ? (
                  <span className="tab-status-check" title="Section complete">
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="tab-status-dot" title="Requirement pending" />
                )}
              </button>
            );
          })}
        </div>

        {/* 5. FORM AND TAB PANES */}
        <form ref={formRef} onSubmit={saveProfile} onChangeCapture={clearFieldError} className="profile-tab-content-area">
          <fieldset disabled={savingProfile || !profileBaseline} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

            {/* TAB 1: BASIC DETAILS */}
            {activeTab === 'basic' && (
              <div className="tab-pane fade-in">
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="section-header-icon">
                      <UserRound size={20} />
                    </div>
                    <div>
                      <h3>Basic Information</h3>
                      <p className="section-header-desc">
                        Your public candidate identity and primary contact channels.
                      </p>
                    </div>
                  </div>

                  <div className="profile-form-grid">
                    <ProfileField
                      name="full_name"
                      error={fieldErrors.full_name}
                      required
                      minLength={2}
                      maxLength={160}
                      label="Full Name *"
                      placeholder="e.g. Alex Johnson"
                      value={profileForm.full_name}
                      onChange={(val) => setProfileForm(c => ({ ...c, full_name: val }))}
                    />
                    <ProfileField
                      name="phone"
                      error={fieldErrors.phone}
                      maxLength={50}
                      label="Phone Number *"
                      placeholder="e.g. +1 (403) 555-0123"
                      value={profileForm.phone}
                      onChange={(val) => setProfileForm(c => ({ ...c, phone: val }))}
                    />
                    <ProfileField
                      name="headline"
                      error={fieldErrors.headline}
                      maxLength={220}
                      label="Professional Headline *"
                      value={profileForm.headline}
                      onChange={(val) => setProfileForm(c => ({ ...c, headline: val }))}
                      wide
                      placeholder="e.g. Senior Full-Stack Engineer with 5+ years building distributed cloud applications"
                    />
                    <ProfileField
                      name="location_city"
                      error={fieldErrors.location_city}
                      maxLength={120}
                      label="City *"
                      placeholder="e.g. Toronto"
                      value={profileForm.location_city}
                      onChange={(val) => setProfileForm(c => ({ ...c, location_city: val }))}
                    />
                    <ProfileField
                      name="location_province"
                      error={fieldErrors.location_province}
                      maxLength={120}
                      label="Province / State"
                      placeholder="e.g. Ontario"
                      value={profileForm.location_province}
                      onChange={(val) => setProfileForm(c => ({ ...c, location_province: val }))}
                    />
                  </div>

                  {/* Recruiter Preview snippet */}
                  <div className="preview-snippet-box">
                    <div className="preview-snippet-header">
                      <Eye size={15} />
                      <span>Live Candidate Card Preview (How recruiters see you)</span>
                    </div>
                    <div className="preview-snippet-card">
                      <div className="preview-snippet-avatar">
                        {userInitial}
                      </div>
                      <div className="preview-snippet-content">
                        <strong>{profileForm.full_name?.trim() || 'Your Name'}</strong>
                        <p>{profileForm.headline?.trim() || 'Professional headline will be displayed here'}</p>
                        <div className="preview-snippet-chips">
                          <span>
                            <MapPin size={11} /> {[profileForm.location_city, profileForm.location_province].filter(Boolean).join(', ') || 'Location'}
                          </span>
                          <span>
                            <Phone size={11} /> {profileForm.phone || 'Phone'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tab-footer">
                    {profileDirty && (
                      <div className="dirty-indicator">
                        <span className="dirty-dot" /> Unsaved changes
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
                      {savingProfile ? (
                        <>
                          <RefreshCw size={16} className="spin-icon" /> Saving Profile...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Updates
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXPERIENCE */}
            {activeTab === 'experience' && (
              <div className="tab-pane fade-in">
                <div className="profile-section-card">
                  <div className="profile-section-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="section-header-icon">
                        <BriefcaseBusiness size={20} />
                      </div>
                      <div>
                        <h3>Work Experience</h3>
                        <p className="section-header-desc">
                          Detail your professional roles, accomplishments, and career trajectory.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-add-action"
                      onClick={addExperience}
                      disabled={profileForm.experience.length >= 20}
                    >
                      <Plus size={16} /> Add Experience
                    </button>
                  </div>

                  {fieldErrors.experience && <p className="field-error">{fieldErrors.experience}</p>}

                  {profileForm.experience.length === 0 && (
                    <div className="empty-state-modern">
                      <div className="empty-state-icon">
                        <BriefcaseBusiness size={32} />
                      </div>
                      <h4>No work experience recorded</h4>
                      <p>Highlight your past roles, responsibilities, and achievements to boost your application score.</p>
                      <button type="button" className="btn-secondary" onClick={addExperience}>
                        <Plus size={16} /> Add First Role
                      </button>
                    </div>
                  )}

                  <div className="timeline-items-list">
                    {profileForm.experience.map((exp, index) => {
                      if (!exp.isEditing) {
                        return (
                          <div key={index} className="experience-summary-card">
                            <div className="exp-left-bar" />
                            <div className="exp-summary-main">
                              <div className="exp-summary-header">
                                <div>
                                  <h4 className="exp-role-title">
                                    {exp.title || 'Untitled Role'}
                                    {exp.company && <span className="exp-company-text"> at {exp.company}</span>}
                                  </h4>
                                  <div className="exp-date-row">
                                    <Calendar size={13} />
                                    <span>
                                      {exp.startDate || 'No start date'} — {exp.current ? 'Present' : (exp.endDate || 'No end date')}
                                    </span>
                                    {exp.current && <span className="current-badge">Current Role</span>}
                                  </div>
                                </div>
                                <div className="summary-actions">
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => toggleExperienceEdit(index, true)}
                                    title="Edit role"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-icon btn-icon-danger"
                                    onClick={() => removeExperience(index)}
                                    title="Remove role"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              {exp.description && (
                                <p className="exp-description-text">{exp.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={index} className="experience-edit-card">
                          <div className="exp-header-actions">
                            <span className="editing-pill">
                              <Edit2 size={12} /> Editing Experience #{index + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => toggleExperienceEdit(index, false)}
                                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                              >
                                <CheckCircle2 size={14} /> Done
                              </button>
                              <button
                                type="button"
                                className="btn-danger-ghost"
                                onClick={() => removeExperience(index)}
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          </div>
                          <div className="profile-form-grid">
                            <ProfileField
                              name={`experience.${index}.title`}
                              error={fieldErrors[`experience.${index}.title`]}
                              required
                              maxLength={180}
                              label="Job Title *"
                              value={exp.title}
                              onChange={(val) => updateExperience(index, 'title', val)}
                              placeholder="e.g. Senior Software Engineer"
                            />
                            <ProfileField
                              name={`experience.${index}.company`}
                              error={fieldErrors[`experience.${index}.company`]}
                              required
                              maxLength={180}
                              label="Company / Employer *"
                              value={exp.company}
                              onChange={(val) => updateExperience(index, 'company', val)}
                              placeholder="e.g. Shopify"
                            />
                            <ProfileField
                              name={`experience.${index}.startDate`}
                              error={fieldErrors[`experience.${index}.startDate`]}
                              type="date"
                              label="Start Date"
                              max={todayStr}
                              value={exp.startDate || ''}
                              onChange={(val) => updateExperience(index, 'startDate', val)}
                            />
                            {exp.current ? (
                              <div className="form-group">
                                <label>End Date</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value="Present"
                                  disabled
                                  style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                                />
                              </div>
                            ) : (
                              <ProfileField
                                name={`experience.${index}.endDate`}
                                error={fieldErrors[`experience.${index}.endDate`]}
                                type="date"
                                label="End Date"
                                min={exp.startDate}
                                max={todayStr}
                                value={exp.endDate || ''}
                                onChange={(val) => updateExperience(index, 'endDate', val)}
                              />
                            )}
                            <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                id={`current-exp-${index}`}
                                checked={exp.current || false}
                                onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                                style={{ cursor: 'pointer', width: '17px', height: '17px' }}
                              />
                              <label htmlFor={`current-exp-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '600', color: '#1e293b' }}>
                                I currently work in this role
                              </label>
                            </div>
                            <div className="form-group full-width">
                              <label htmlFor={`experience-description-${index}`}>Role Summary & Key Achievements</label>
                              <textarea
                                name={`experience.${index}.description`}
                                id={`experience-description-${index}`}
                                maxLength={4000}
                                className="form-input form-textarea"
                                value={exp.description || ''}
                                aria-invalid={Boolean(fieldErrors[`experience.${index}.description`])}
                                aria-describedby={fieldErrors[`experience.${index}.description`] ? `experience-description-error-${index}` : undefined}
                                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                placeholder="Describe your responsibilities, team impact, and measurable achievements..."
                              />
                              {fieldErrors[`experience.${index}.description`] && (
                                <span className="field-error" id={`experience-description-error-${index}`}>
                                  {fieldErrors[`experience.${index}.description`]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="tab-footer">
                    {profileDirty && (
                      <div className="dirty-indicator">
                        <span className="dirty-dot" /> Unsaved changes
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
                      {savingProfile ? (
                        <>
                          <RefreshCw size={16} className="spin-icon" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Updates
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EDUCATION */}
            {activeTab === 'education' && (
              <div className="tab-pane fade-in">
                <div className="profile-section-card">
                  <div className="profile-section-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="section-header-icon">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <h3>Educational Background</h3>
                        <p className="section-header-desc">
                          Degrees, diplomas, certifications, or ongoing academic studies.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-add-action"
                      onClick={addEducation}
                      disabled={profileForm.education.length >= 20}
                    >
                      <Plus size={16} /> Add Education
                    </button>
                  </div>

                  {fieldErrors.education && <p className="field-error">{fieldErrors.education}</p>}

                  {profileForm.education.length === 0 && (
                    <div className="empty-state-modern">
                      <div className="empty-state-icon">
                        <GraduationCap size={32} />
                      </div>
                      <h4>No education recorded yet</h4>
                      <p>Add your degrees or relevant certifications to strengthen your qualifications.</p>
                      <button type="button" className="btn-secondary" onClick={addEducation}>
                        <Plus size={16} /> Add Education
                      </button>
                    </div>
                  )}

                  <div className="timeline-items-list">
                    {profileForm.education.map((edu, index) => {
                      if (!edu.isEditing) {
                        return (
                          <div key={index} className="experience-summary-card">
                            <div className="exp-left-bar exp-left-bar--edu" />
                            <div className="exp-summary-main">
                              <div className="exp-summary-header">
                                <div>
                                  <h4 className="exp-role-title">
                                    {edu.degree || 'Untitled Degree'}
                                    {edu.institution && <span className="exp-company-text"> at {edu.institution}</span>}
                                  </h4>
                                  <div className="exp-date-row">
                                    <Calendar size={13} />
                                    <span>
                                      {edu.startDate || 'No start date'} — {edu.current ? 'Present' : (edu.endDate || 'No end date')}
                                    </span>
                                    {edu.current && <span className="current-badge">Currently Enrolled</span>}
                                  </div>
                                </div>
                                <div className="summary-actions">
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => toggleEducationEdit(index, true)}
                                    title="Edit education"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-icon btn-icon-danger"
                                    onClick={() => removeEducation(index)}
                                    title="Remove education"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={index} className="experience-edit-card">
                          <div className="exp-header-actions">
                            <span className="editing-pill">
                              <Edit2 size={12} /> Editing Education #{index + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => toggleEducationEdit(index, false)}
                                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                              >
                                <CheckCircle2 size={14} /> Done
                              </button>
                              <button
                                type="button"
                                className="btn-danger-ghost"
                                onClick={() => removeEducation(index)}
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          </div>
                          <div className="profile-form-grid">
                            <ProfileField
                              name={`education.${index}.degree`}
                              error={fieldErrors[`education.${index}.degree`]}
                              required
                              maxLength={180}
                              label="Degree / Certification *"
                              value={edu.degree}
                              onChange={(val) => updateEducation(index, 'degree', val)}
                              placeholder="e.g. B.S. in Computer Science"
                            />
                            <ProfileField
                              name={`education.${index}.institution`}
                              error={fieldErrors[`education.${index}.institution`]}
                              required
                              maxLength={180}
                              label="Institution / University *"
                              value={edu.institution}
                              onChange={(val) => updateEducation(index, 'institution', val)}
                              placeholder="e.g. University of Toronto"
                            />
                            <ProfileField
                              name={`education.${index}.startDate`}
                              error={fieldErrors[`education.${index}.startDate`]}
                              type="date"
                              label="Start Date"
                              max={todayStr}
                              value={edu.startDate || ''}
                              onChange={(val) => updateEducation(index, 'startDate', val)}
                            />
                            {edu.current ? (
                              <div className="form-group">
                                <label>End Date</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value="Present"
                                  disabled
                                  style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                                />
                              </div>
                            ) : (
                              <ProfileField
                                name={`education.${index}.endDate`}
                                error={fieldErrors[`education.${index}.endDate`]}
                                type="date"
                                label="End Date"
                                min={edu.startDate}
                                max={todayStr}
                                value={edu.endDate || ''}
                                onChange={(val) => updateEducation(index, 'endDate', val)}
                              />
                            )}
                            <div className="form-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                id={`current-edu-${index}`}
                                checked={edu.current || false}
                                onChange={(e) => updateEducation(index, 'current', e.target.checked)}
                                style={{ cursor: 'pointer', width: '17px', height: '17px' }}
                              />
                              <label htmlFor={`current-edu-${index}`} style={{ cursor: 'pointer', margin: 0, fontWeight: '600', color: '#1e293b' }}>
                                I am currently studying here
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="tab-footer">
                    {profileDirty && (
                      <div className="dirty-indicator">
                        <span className="dirty-dot" /> Unsaved changes
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
                      {savingProfile ? (
                        <>
                          <RefreshCw size={16} className="spin-icon" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Updates
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SKILLS */}
            {activeTab === 'skills' && (
              <div className="tab-pane fade-in">
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="section-header-icon">
                      <Award size={20} />
                    </div>
                    <div>
                      <h3>Skills & Competencies</h3>
                      <p className="section-header-desc">
                        Add at least 5 skills so employers can match your capabilities with relevant job openings.
                      </p>
                    </div>
                  </div>

                  {fieldErrors.skills && <p className="field-error">{fieldErrors.skills}</p>}

                  {/* Skills count badge */}
                  <div className="skills-status-row">
                    <span className={`skills-counter-badge ${profileForm.skills.length >= 5 ? 'complete' : ''}`}>
                      {profileForm.skills.length >= 5 ? <CheckCircle size={14} /> : null}
                      {profileForm.skills.length} of 5 minimum skills added
                    </span>
                    <span className="skills-max-hint">(Maximum: 50 skills)</span>
                  </div>

                  {/* Add skill input bar */}
                  <div className="skill-input-bar">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type a skill (e.g. React.js, Python, Sales, Agile)..."
                      value={newSkillText}
                      maxLength={80}
                      onChange={(e) => setNewSkillText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkillFromInput();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-skill"
                      onClick={handleAddSkillFromInput}
                      disabled={!newSkillText.trim() || profileForm.skills.length >= 50}
                    >
                      <Plus size={16} /> Add Skill
                    </button>
                  </div>

                  {/* User skills chip list */}
                  <div className="skills-chip-container">
                    {profileForm.skills.length === 0 ? (
                      <div className="empty-skills-hint">
                        No skills added yet. Use the input above or select from the recommended suggestions below.
                      </div>
                    ) : (
                      profileForm.skills.map((skill, index) => (
                        <div key={index} className="skill-tag-chip">
                          <span>{skill}</span>
                          <button
                            type="button"
                            className="skill-remove-btn"
                            onClick={() => removeSkill(index)}
                            title={`Remove ${skill}`}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Suggested skills quick-add cloud */}
                  <div className="suggested-skills-box">
                    <span className="suggested-title">
                      <Sparkles size={14} /> Popular Skill Suggestions (Click to add):
                    </span>
                    <div className="suggested-pills-list">
                      {SUGGESTED_SKILLS.filter(s => !profileForm.skills.some(userSkill => userSkill.toLowerCase() === s.toLowerCase())).map(s => (
                        <button
                          key={s}
                          type="button"
                          className="suggested-pill"
                          onClick={() => handleAddSuggestedSkill(s)}
                          title={`Add ${s}`}
                        >
                          <Plus size={12} /> {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tab-footer">
                    {profileDirty && (
                      <div className="dirty-indicator">
                        <span className="dirty-dot" /> Unsaved changes
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
                      {savingProfile ? (
                        <>
                          <RefreshCw size={16} className="spin-icon" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Updates
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RESUME */}
            {activeTab === 'resume' && (
              <div className="tab-pane fade-in">
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="section-header-icon">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3>Resume Document</h3>
                      <p className="section-header-desc">
                        Your default resume will be attached whenever you apply to jobs across the network.
                      </p>
                    </div>
                  </div>

                  <div className="resume-tab-body">
                    {!resumeFile && !profileForm.default_resume_path ? (
                      <div
                        className="resume-upload-dropzone"
                        onClick={() => resumeTabInputRef.current?.click()}
                      >
                        <input
                          ref={resumeTabInputRef}
                          name="resume"
                          type="file"
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          style={{ display: 'none' }}
                          onChange={chooseResume}
                        />
                        <div className="dropzone-icon-circle">
                          <UploadCloud size={38} />
                        </div>
                        <h4>Click or Drag to Upload Resume</h4>
                        <p>Accepted formats: PDF or DOCX up to 10 MB</p>
                        <span className="dropzone-btn">
                          <UploadCloud size={16} /> Browse Document
                        </span>
                      </div>
                    ) : (
                      <div className="attached-resume-card">
                        <div className="attached-resume-left">
                          <div className="doc-type-icon">
                            <FileCheck size={26} />
                          </div>
                          <div className="doc-metadata">
                            <h4 className="doc-filename">
                              {resumeFile
                                ? resumeFile.name
                                : (profileForm.default_resume_path?.split('/').pop() || 'Primary_Resume.pdf')}
                            </h4>
                            <div className="doc-chips">
                              <span className="doc-chip-tag">
                                {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 'Cloud Secured'}
                              </span>
                              <span className="doc-chip-tag doc-chip-tag--verified">
                                <CheckCircle size={12} /> Active Default Resume
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="attached-resume-actions">
                          <button
                            type="button"
                            className="btn-action-pill btn-action-pill--accent"
                            onClick={() => handleParseResume(resumeFile || null)}
                            disabled={parsingResume}
                            title="Extract profile details with parser"
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

                          <button
                            type="button"
                            className="btn-action-pill"
                            onClick={handleViewResume}
                            title="Open resume in new tab"
                          >
                            <Eye size={15} /> Preview
                          </button>

                          <label className="btn-action-pill btn-action-pill--upload" title="Replace with new document">
                            <UploadCloud size={15} /> Replace
                            <input
                              type="file"
                              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              style={{ display: 'none' }}
                              onChange={chooseResume}
                            />
                          </label>

                          {resumeFile && (
                            <button
                              type="button"
                              className="btn-action-pill btn-action-pill--danger"
                              onClick={() => {
                                setResumeFile(null);
                                uploadedResume.current = null;
                              }}
                              title="Discard newly chosen file"
                            >
                              <X size={15} /> Cancel New File
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {fieldErrors.resume && (
                    <p className="field-error" role="status" style={{ marginTop: '16px' }}>
                      {fieldErrors.resume}
                    </p>
                  )}

                  <div className="tab-footer">
                    {profileDirty && (
                      <div className="dirty-indicator">
                        <span className="dirty-dot" /> Unsaved changes
                      </div>
                    )}
                    <button type="submit" className="btn-primary" disabled={savingProfile || !profileDirty}>
                      {savingProfile ? (
                        <>
                          <RefreshCw size={16} className="spin-icon" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Save Updates
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </fieldset>
        </form>

        {/* 6. DRAFT ACTIONS BAR (FLOAT / FIXED IF UNSAVED) */}
        {profileDirty && (
          <div className="profile-floating-save-bar fade-in">
            <div className="save-bar-info">
              <span className="save-bar-dot" />
              <strong>You have unsaved changes in your profile.</strong>
            </div>
            <div className="save-bar-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={discardChanges}
                disabled={savingProfile}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <RefreshCw size={16} className="spin-icon" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

/* --- REUSABLE FIELD COMPONENT --- */
function ProfileField({
  label,
  name,
  error,
  value,
  onChange,
  wide = false,
  placeholder = '',
  type = 'text',
  min,
  max,
  ...constraints
}) {
  const id = `profile-${name}`;
  return (
    <div className={`form-group ${wide ? 'full-width' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        {...constraints}
        id={id}
        name={name}
        type={type}
        min={min}
        max={max}
        className={`form-input ${error ? 'is-invalid' : ''}`}
        value={value || ''}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

/* --- ENHANCED AESTHETIC DESIGN SYSTEM CSS --- */
const enhancedProfileCSS = `
  /* 1. CONTAINER: FULL COVERAGE & SMOOTH SCALING */
  .profile-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding-bottom: 80px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    box-sizing: border-box;
  }

  /* 2. HERO IDENTITY CARD - LIGHT SKY BLUE MODERN THEME */
  .profile-hero-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 55%, #f8fafc 100%);
    border: 1.5px solid #bae6fd;
    border-radius: 18px;
    padding: 28px 32px;
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.08), 0 4px 10px -2px rgba(2, 132, 199, 0.04);
    position: relative;
    overflow: hidden;
  }
  .profile-hero-card::after {
    content: '';
    position: absolute;
    right: -40px;
    top: -40px;
    width: 240px;
    height: 240px;
    background: radial-gradient(circle, rgba(186, 230, 253, 0.4) 0%, rgba(255,255,255,0) 70%);
    pointer-events: none;
  }
  .hero-identity {
    display: flex;
    align-items: center;
    gap: 22px;
    flex: 1;
  }
  .hero-avatar {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    color: #ffffff;
    border: 3px solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 800;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.28);
    position: relative;
    flex-shrink: 0;
  }
  .hero-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hero-name-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .hero-name-row h2 {
    margin: 0;
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
  }
  .hero-role-pill {
    background: #ffffff;
    border: 1px solid #bae6fd;
    color: #0284c7;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: 0 1px 3px rgba(2, 132, 199, 0.08);
  }
  .hero-verified-pill {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #047857;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    box-shadow: 0 1px 3px rgba(4, 120, 87, 0.08);
  }
  .hero-headline {
    margin: 0;
    font-size: 1.05rem;
    color: #334155;
    font-weight: 600;
    line-height: 1.5;
    max-width: 640px;
  }
  .hero-meta-chips {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .meta-chip {
    display: inline-flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 0.86rem;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .meta-chip--muted {
    color: #64748b;
    border-color: #e2e8f0;
  }
  .hero-metric-box {
    background: #ffffff;
    border: 1.5px solid #bae6fd;
    border-radius: 16px;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 140px;
    box-shadow: 0 4px 16px rgba(2, 132, 199, 0.08);
  }
  .metric-ring-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }
  .metric-val {
    font-size: 2.1rem;
    font-weight: 900;
    color: #0284c7;
    letter-spacing: -0.02em;
  }
  .metric-sub {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-top: 3px;
    font-weight: 800;
  }
  .metric-caption {
    margin: 8px 0 0 0;
    font-size: 0.84rem;
    color: #047857;
    font-weight: 700;
    text-align: center;
  }

  /* 3. PROFILE COMPLETION TRACKER */
  .profile-completion-tracker {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
  }
  .tracker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    gap: 16px;
  }
  .tracker-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #0967f2;
    background: #eff6ff;
    padding: 3px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
  }
  .tracker-title-wrap h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
  }
  .tracker-percentage-pill {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.2;
  }
  .tracker-percentage-pill strong {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0967f2;
  }
  .tracker-percentage-pill span {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 600;
  }
  .tracker-bar-bg {
    width: 100%;
    height: 10px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .tracker-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #0967f2 0%, #38bdf8 60%, #10b981 100%);
    border-radius: 999px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tracker-missing-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .tracker-missing-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #475569;
  }
  .tracker-tags-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tracker-tag-btn {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .tracker-tag-btn:hover {
    background: #eff6ff;
    border-color: #0967f2;
    color: #0967f2;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(9, 103, 242, 0.12);
  }
  .tag-arrow {
    opacity: 0.5;
    transition: transform 0.2s;
  }
  .tracker-tag-btn:hover .tag-arrow {
    opacity: 1;
    transform: translateX(2px);
  }

  /* 100% SUCCESS BANNER */
  .profile-100-success-banner {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 1.5px solid #86efac;
    border-radius: 16px;
    padding: 24px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 4px 18px rgba(34, 197, 94, 0.12);
  }
  .profile-100-success-banner__content {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .profile-100-success-banner__icon {
    font-size: 2.4rem;
    line-height: 1;
  }
  .profile-100-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #15803d;
    background: #dcfce7;
    padding: 2px 8px;
    border-radius: 12px;
    border: 1px solid #bbf7d0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .profile-100-success-banner h3 {
    margin: 0 0 4px 0;
    font-size: 1.2rem;
    color: #14532d;
    font-weight: 800;
  }
  .profile-100-success-banner p {
    margin: 0;
    font-size: 0.92rem;
    color: #166534;
  }
  .btn-success-apply {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #16a34a;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 12px 22px;
    border-radius: 10px;
    text-decoration: none;
    white-space: nowrap;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
    flex-shrink: 0;
  }
  .btn-success-apply:hover {
    background: #15803d;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(22, 163, 74, 0.3);
  }

  /* 4. RESUME-DRIVEN AUTO-FILL BANNER */
  .resume-autofill-banner {
    background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f0fdf4 100%);
    border: 1.5px solid #bfdbfe;
    border-radius: 16px;
    padding: 22px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    box-shadow: 0 4px 16px rgba(9, 103, 242, 0.07);
  }
  .autofill-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    flex: 1;
  }
  .autofill-badge {
    display: inline-block;
    font-size: 0.74rem;
    font-weight: 700;
    color: #1d4ed8;
    background: #dbeafe;
    padding: 3px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .autofill-title {
    margin: 0 0 5px 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: #1e3a8a;
  }
  .autofill-desc {
    margin: 0;
    font-size: 0.9rem;
    color: #334155;
    line-height: 1.5;
    max-width: 720px;
  }
  .autofill-action {
    flex-shrink: 0;
  }
  .btn-autofill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #0967f2 0%, #1d4ed8 100%);
    color: #ffffff !important;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 12px 22px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(9, 103, 242, 0.28);
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .btn-autofill:hover {
    background: linear-gradient(135deg, #0856ce 0%, #173fa7 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(9, 103, 242, 0.35);
  }
  .btn-autofill:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .spin-icon {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  /* 5. TABS BAR */
  .profile-tabs-header {
    display: flex;
    gap: 10px;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow-x: auto;
    scrollbar-width: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
  .profile-tabs-header::-webkit-scrollbar {
    display: none;
  }
  .profile-tab-btn {
    flex: 1;
    min-width: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    color: #64748b;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
    white-space: nowrap;
    outline: none;
  }
  .profile-tab-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .profile-tab-btn.active {
    background: #0967f2;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(9, 103, 242, 0.25);
  }
  .tab-icon {
    opacity: 0.85;
  }
  .profile-tab-btn.active .tab-icon {
    opacity: 1;
    color: #ffffff;
  }
  .tab-status-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #dcfce7;
    color: #16a34a;
    margin-left: 2px;
  }
  .profile-tab-btn.active .tab-status-check {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }
  .tab-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
    margin-left: 2px;
  }
  .profile-tab-btn.active .tab-status-dot {
    background: rgba(255, 255, 255, 0.6);
  }

  /* 6. PROFILE SECTION CARDS */
  .profile-section-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px 36px;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
  }
  .profile-section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f1f5f9;
  }
  .section-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #eff6ff;
    color: #0967f2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .profile-section-header h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.01em;
  }
  .section-header-desc {
    margin: 4px 0 0 0;
    font-size: 0.9rem;
    color: #64748b;
  }
  .btn-add-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0967f2;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-add-action:hover {
    background: #0856ce;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(9, 103, 242, 0.2);
  }
  .btn-add-action:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* 7. FORM GRID & INPUTS */
  .profile-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 22px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .form-group.full-width {
    grid-column: 1 / -1;
  }
  .form-group label {
    color: #1e293b;
    font-size: 0.88rem;
    font-weight: 700;
    margin: 0;
  }
  .form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid #cbd5e1;
    border-radius: 10px;
    font-size: 0.95rem;
    color: #0f172a;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
    background: #ffffff;
  }
  .form-input:focus {
    border-color: #0967f2;
    box-shadow: 0 0 0 4px rgba(9, 103, 242, 0.12);
  }
  .form-input.is-invalid {
    border-color: #ef4444;
    background: #fffdfd;
  }
  .form-textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.6;
    font-family: inherit;
  }
  .field-error {
    color: #dc2626;
    font-size: 0.82rem;
    font-weight: 600;
    margin-top: 2px;
  }

  /* PREVIEW SNIPPET BOX */
  .preview-snippet-box {
    margin-top: 32px;
    padding: 20px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
  }
  .preview-snippet-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    color: #475569;
    margin-bottom: 14px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .preview-snippet-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  }
  .preview-snippet-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #eff6ff;
    color: #0967f2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 800;
    flex-shrink: 0;
  }
  .preview-snippet-content strong {
    font-size: 1.05rem;
    color: #0f172a;
    display: block;
    margin-bottom: 2px;
  }
  .preview-snippet-content p {
    margin: 0 0 6px 0;
    font-size: 0.88rem;
    color: #475569;
  }
  .preview-snippet-chips {
    display: flex;
    gap: 12px;
    font-size: 0.8rem;
    color: #64748b;
  }
  .preview-snippet-chips span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* 8. TIMELINE & EXPERIENCE / EDUCATION CARDS */
  .timeline-items-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .experience-summary-card {
    display: flex;
    align-items: stretch;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  }
  .experience-summary-card:hover {
    border-color: #0967f2;
    box-shadow: 0 6px 14px rgba(9, 103, 242, 0.08);
    transform: translateY(-1px);
  }
  .exp-left-bar {
    width: 6px;
    background: #0967f2;
    flex-shrink: 0;
  }
  .exp-left-bar--edu {
    background: #8b5cf6;
  }
  .exp-summary-main {
    flex: 1;
    padding: 20px 24px;
  }
  .exp-summary-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .exp-role-title {
    margin: 0 0 6px 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
  }
  .exp-company-text {
    font-weight: 500;
    color: #475569;
  }
  .exp-date-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    color: #64748b;
    font-weight: 600;
  }
  .current-badge {
    background: #dcfce7;
    color: #15803d;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .exp-description-text {
    margin: 12px 0 0 0;
    font-size: 0.9rem;
    color: #475569;
    line-height: 1.55;
    white-space: pre-line;
  }
  .summary-actions {
    display: flex;
    gap: 8px;
  }
  .btn-icon {
    width: 38px;
    height: 38px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 8px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: #475569;
    transition: all 0.2s;
  }
  .btn-icon:hover {
    background: #eff6ff;
    color: #0967f2;
    border-color: #bfdbfe;
  }
  .btn-icon-danger:hover {
    background: #fef2f2;
    color: #ef4444;
    border-color: #fecaca;
  }
  .experience-edit-card {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 8px;
  }
  .exp-header-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .editing-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #e0e7ff;
    color: #3730a3;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .btn-danger-ghost {
    background: transparent;
    color: #ef4444;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-danger-ghost:hover {
    background: #fee2e2;
  }
  .empty-state-modern {
    padding: 48px 24px;
    text-align: center;
    background: #f8fafc;
    border-radius: 14px;
    border: 1.5px dashed #cbd5e1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .empty-state-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #eff6ff;
    color: #0967f2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .empty-state-modern h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #0f172a;
  }
  .empty-state-modern p {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    color: #64748b;
    max-width: 440px;
  }

  /* 9. SKILLS SECTION STYLING */
  .skills-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .skills-counter-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #eff6ff;
    color: #0967f2;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.84rem;
    font-weight: 700;
  }
  .skills-counter-badge.complete {
    background: #dcfce7;
    color: #15803d;
  }
  .skills-max-hint {
    font-size: 0.8rem;
    color: #94a3b8;
  }
  .skill-input-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .btn-add-skill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0967f2;
    color: #ffffff;
    font-weight: 700;
    padding: 0 20px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 0.92rem;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .btn-add-skill:hover {
    background: #0856ce;
  }
  .btn-add-skill:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .skills-chip-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    min-height: 80px;
    align-items: center;
  }
  .empty-skills-hint {
    color: #64748b;
    font-size: 0.9rem;
    text-align: center;
    width: 100%;
    padding: 12px;
  }
  .skill-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    color: #0f172a;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: all 0.15s;
  }
  .skill-tag-chip:hover {
    border-color: #0967f2;
    color: #0967f2;
  }
  .skill-remove-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    padding: 0;
    border-radius: 50%;
  }
  .skill-remove-btn:hover {
    color: #ef4444;
  }
  .suggested-skills-box {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
  }
  .suggested-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #475569;
    margin-bottom: 12px;
  }
  .suggested-pills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .suggested-pill {
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    color: #475569;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }
  .suggested-pill:hover {
    background: #eff6ff;
    border-color: #0967f2;
    color: #0967f2;
    transform: translateY(-1px);
  }

  /* 10. RESUME SECTION STYLING */
  .resume-upload-dropzone {
    border: 2px dashed #93c5fd;
    border-radius: 16px;
    padding: 44px 28px;
    text-align: center;
    background: #f8fafc;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .resume-upload-dropzone:hover {
    background: #eff6ff;
    border-color: #0967f2;
    transform: translateY(-1px);
  }
  .dropzone-icon-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #dbeafe;
    color: #0967f2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .resume-upload-dropzone h4 {
    margin: 0 0 6px 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: #0f172a;
  }
  .resume-upload-dropzone p {
    margin: 0 0 16px 0;
    font-size: 0.9rem;
    color: #64748b;
  }
  .dropzone-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0967f2;
    color: #ffffff;
    font-weight: 700;
    padding: 10px 22px;
    border-radius: 8px;
    font-size: 0.92rem;
  }

  .attached-resume-card {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 14px;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
  .attached-resume-left {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .doc-type-icon {
    width: 54px;
    height: 54px;
    border-radius: 12px;
    background: #fee2e2;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .doc-filename {
    margin: 0 0 6px 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #0f172a;
    word-break: break-all;
  }
  .doc-chips {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .doc-chip-tag {
    font-size: 0.78rem;
    font-weight: 600;
    background: #e2e8f0;
    color: #475569;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .doc-chip-tag--verified {
    background: #dcfce7;
    color: #15803d;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .attached-resume-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .btn-action-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-action-pill:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
  }
  .btn-action-pill--accent {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #0967f2;
  }
  .btn-action-pill--accent:hover {
    background: #dbeafe;
    border-color: #0967f2;
    color: #0856ce;
  }
  .btn-action-pill--upload {
    cursor: pointer;
  }
  .btn-action-pill--danger {
    color: #ef4444;
    border-color: #fecaca;
  }
  .btn-action-pill--danger:hover {
    background: #fef2f2;
  }

  /* 11. TAB FOOTER & BUTTONS */
  .tab-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #f1f5f9;
  }
  .dirty-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #b45309;
  }
  .dirty-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f59e0b;
    animation: pulseDot 1.5s infinite;
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  .btn-primary {
    background: #0967f2;
    color: #ffffff;
    border: none;
    padding: 12px 26px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(9, 103, 242, 0.25);
  }
  .btn-primary:hover {
    background: #0856ce;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(9, 103, 242, 0.32);
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-secondary {
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .btn-secondary:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #0f172a;
  }

  /* 12. FLOATING / FIXED UNSAVED SAVE BAR */
  .profile-floating-save-bar {
    position: sticky;
    bottom: 24px;
    z-index: 90;
    background: #0f172a;
    color: #ffffff;
    border-radius: 14px;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .save-bar-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .save-bar-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #f59e0b;
    box-shadow: 0 0 10px #f59e0b;
  }
  .save-bar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* 13. ANIMATIONS & BANNERS */
  .fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .banner {
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 0.92rem;
    font-weight: 600;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .banner-error {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  /* 14. RESPONSIVE BREAKPOINTS */
  @media (max-width: 900px) {
    .profile-hero-card {
      flex-direction: column;
      align-items: flex-start;
      padding: 24px;
    }
    .hero-metric-box {
      width: 100%;
      flex-direction: row;
      justify-content: space-between;
    }
    .resume-autofill-banner {
      flex-direction: column;
      align-items: flex-start;
    }
    .autofill-action {
      width: 100%;
    }
    .btn-autofill {
      width: 100%;
      justify-content: center;
    }
    .profile-tabs-header {
      justify-content: flex-start;
    }
    .profile-section-card {
      padding: 24px 20px;
    }
    .attached-resume-card {
      flex-direction: column;
      align-items: flex-start;
    }
    .attached-resume-actions {
      width: 100%;
      justify-content: flex-start;
    }
    .profile-floating-save-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .save-bar-actions {
      justify-content: flex-end;
    }
  }

  @media (max-width: 640px) {
    .profile-form-grid {
      grid-template-columns: 1fr;
    }
    .hero-identity {
      flex-direction: column;
      align-items: flex-start;
    }
    .tracker-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .tracker-percentage-pill {
      align-items: flex-start;
    }
    .profile-100-success-banner {
      flex-direction: column;
      align-items: flex-start;
    }
    .btn-success-apply {
      width: 100%;
      justify-content: center;
    }
  }
`;
