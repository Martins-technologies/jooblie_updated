import DashboardTable, { TablePagination } from '../../shared/components/DashboardTable';
import { StatusBadge } from '../../shared/components/WorkspaceCards';
import Select from '../../shared/components/Select';
import { useCallback, useEffect, useState } from 'react';
import { 
  FileText, Search, Eye, X, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, 
  RefreshCw, Radio, Globe, Calendar, Send, CheckCircle2, XCircle, Sparkles, AlertCircle, 
  UploadCloud, Clock, DollarSign, ChevronRight, Check, MessageSquare
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { apiRequest } from '../../shared/lib/api';
import { formatDate } from '../../shared/lib/format';
import { LoadingState } from '../../shared/components/StatusMessage';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { showSuccessToast, showErrorToast } from '../../shared/lib/toast';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'viewed', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewing', label: 'Interview Scheduled' },
  { value: 'offered', label: 'Offer Received' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

export default function CandidatesPage() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Stage action modals: 'shortlist' | 'interview' | 'offer' | 'reject' | null
  const [actionModal, setActionModal] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Forms for action triggers
  const [shortlistNote, setShortlistNote] = useState('');
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    time: '',
    format: 'google_meet',
    location: '',
    notes: '',
  });
  const [offerForm, setOfferForm] = useState({
    jobTitle: '',
    salary: '',
    startDate: '',
    expiryDate: '',
    documentName: '',
    documentBase64: '',
    welcomeMessage: '',
  });
  const [rejectFeedback, setRejectFeedback] = useState('');

  useEffect(() => setPage(1), [search, statusFilter, jobFilter, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/recruiter/applications?page=1&pageSize=100&status=${encodeURIComponent(statusFilter)}`;
      if (jobFilter !== 'all') url += `&jobId=${encodeURIComponent(jobFilter)}`;
      const data = await apiRequest(url, { auth: true });
      const items = data.items || [];
      setApplications(items);
      // Keep selected app updated if open
      if (selectedApp) {
        const found = items.find(a => a.id === selectedApp.id);
        if (found) setSelectedApp(found);
      }
    } catch (err) {
      setError(err.message || 'Candidates could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, jobFilter, selectedApp?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time candidate sync
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('recruiter-candidates-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        () => {
          load();
        }
      )
      .subscribe();

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        load();
      }
    }, 10000);

    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  // Opening candidate profile automatically transitions 'submitted' to 'viewed' (Under Review)
  const openCandidateModal = async (app) => {
    setSelectedApp(app);
    if (app.status === 'submitted') {
      try {
        await apiRequest(`/recruiter/applications/${app.id}`, {
          method: 'PATCH',
          auth: true,
          body: { status: 'viewed' },
        });
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'viewed' } : a));
        setSelectedApp(prev => prev && prev.id === app.id ? { ...prev, status: 'viewed' } : prev);
      } catch (e) {
        console.warn('Could not auto-transition submitted to viewed', e);
      }
    }
  };

  const updateStatus = async (id, status) => {
    setWorking(id);
    try {
      await apiRequest(`/recruiter/applications/${id}`, { method: 'PATCH', auth: true, body: { status } });
      await load();
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp(prev => ({ ...prev, status }));
      }
      showSuccessToast(`Application moved to ${status}`);
    } catch (err) {
      setError(err.message || 'Status update failed.');
      showErrorToast(err, 'Status update failed.');
    } finally {
      setWorking(null);
    }
  };

  const viewResume = async (id) => {
    setWorking(`resume:${id}`);
    setError('');
    try {
      const result = await apiRequest(`/recruiter/applications/${id}/resume-url`, { auth: true });
      window.open(result.url, '_blank', 'noopener,noreferrer');
      await load();
    } catch (err) {
      setError(err.message || 'Resume could not be opened.');
      showErrorToast(err, 'Resume could not be opened.');
    } finally {
      setWorking(null);
    }
  };

  // Open action modal for a candidate
  const startAction = (type, app) => {
    setActionTarget(app);
    setActionModal(type);
    if (type === 'shortlist') {
      setShortlistNote(app.internal_note || '');
    } else if (type === 'interview') {
      setInterviewForm({
        date: app.interview?.date || '',
        time: app.interview?.time || '',
        format: app.interview?.format || 'google_meet',
        location: app.interview?.location || '',
        notes: app.interview?.notes || '',
      });
    } else if (type === 'offer') {
      setOfferForm({
        jobTitle: app.offer?.jobTitle || app.jobs?.title || '',
        salary: app.offer?.salary || '',
        startDate: app.offer?.startDate || '',
        expiryDate: app.offer?.expiryDate || '',
        documentName: app.offer?.documentName || '',
        documentBase64: '',
        welcomeMessage: app.offer?.welcomeMessage || `We are delighted to extend an offer of employment for the position of ${app.jobs?.title || 'this role'}.`,
      });
    } else if (type === 'reject') {
      setRejectFeedback(app.feedback || '');
    }
  };

  // Submit stage action triggers
  const submitStageAction = async (e) => {
    e.preventDefault();
    if (!actionTarget) return;

    setActionSubmitting(true);
    setError('');
    try {
      let body = {};
      if (actionModal === 'shortlist') {
        body = { status: 'shortlisted', note: shortlistNote.trim() || null };
      } else if (actionModal === 'interview') {
        body = {
          status: 'interviewing',
          interview: {
            date: interviewForm.date,
            time: interviewForm.time,
            format: interviewForm.format,
            location: interviewForm.location.trim(),
            notes: interviewForm.notes.trim(),
          },
        };
      } else if (actionModal === 'offer') {
        body = {
          status: 'offered',
          offer: {
            jobTitle: offerForm.jobTitle.trim(),
            salary: offerForm.salary.trim(),
            startDate: offerForm.startDate,
            expiryDate: offerForm.expiryDate,
            documentName: offerForm.documentName || null,
            documentBase64: offerForm.documentBase64 || null,
            welcomeMessage: offerForm.welcomeMessage.trim(),
          },
        };
      } else if (actionModal === 'reject') {
        body = { status: 'rejected', feedback: rejectFeedback.trim() || null };
      }

      await apiRequest(`/recruiter/applications/${actionTarget.id}`, {
        method: 'PATCH',
        auth: true,
        body,
      });

      showSuccessToast(`Candidate successfully updated to ${body.status}! Notification dispatched.`);
      setActionModal(null);
      setActionTarget(null);
      await load();
    } catch (err) {
      showErrorToast(err, 'Failed to update candidate stage.');
      setError(err.message || 'Failed to update candidate stage.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Handle offer file upload
  const handleOfferFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast(new Error('File size exceeds 10MB limit.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOfferForm(prev => ({
        ...prev,
        documentName: file.name,
        documentBase64: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Unique job options for filter
  const jobOptionsMap = new Map();
  applications.forEach(a => {
    if (a.jobs?.id && a.jobs?.title) jobOptionsMap.set(a.jobs.id, a.jobs.title);
  });
  const jobOptions = Array.from(jobOptionsMap.entries());

  const filteredApps = applications.filter(app => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return app.profiles?.full_name?.toLowerCase().includes(q) || app.jobs?.title?.toLowerCase().includes(q) || app.portal?.name?.toLowerCase().includes(q);
  });

  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filteredApps.length / pageSize)));

  return (
    <DashboardLayout title="Candidates (ATS)" subtitle="Review cross-portal candidate applications, inspect credentials, and manage hiring stages.">
      <style>{candidatesModalCSS}</style>
      <section className="workspace-panel dashboard-table-panel">
        {error && <div className="error-banner" role="alert">{error}</div>}
        
        <div className="dashboard-table-toolbar">
          <label className="dashboard-table-search">
            <Search size={16} />
            <input aria-label="Search loaded candidates" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search candidate, job, or portal…" />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '12px' }}>
              <Radio size={12} className="animate-pulse" /> Live ATS
            </span>

            {/* Filter by Job */}
            {jobOptions.length > 0 && (
              <Select aria-label="Filter by job" value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
                <option value="all">All jobs ({jobOptions.length})</option>
                {jobOptions.map(([id, title]) => (
                  <option key={id} value={id}>{title}</option>
                ))}
              </Select>
            )}

            {/* Filter by Status */}
            <Select aria-label="Filter candidate status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            
            <button type="button" className="admin-icon" onClick={load} title="Refresh candidates">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState variant="table" columns={['Candidate', 'Job & Portal', 'Applied', 'Status', 'Actions'].map(label => ({ label }))} rows={pageSize} label="Loading candidates…" />
        ) : filteredApps.length ? (
          <>
            <DashboardTable
              className="dashboard-data-table--candidates"
              label="Candidates"
              columns={[
                { label: 'Candidate', width: '25%' },
                { label: 'Job & Portal', width: '27%' },
                { label: 'Applied', width: '13%' },
                { label: 'Status & Triggers', width: '19%' },
                { label: 'Actions', width: '16%' },
              ]}
            >
              {filteredApps.slice((visiblePage - 1) * pageSize, visiblePage * pageSize).map(app => (
                <tr key={app.id}>
                  <td>
                    <button
                      type="button"
                      className="candidate-name-btn"
                      onClick={() => openCandidateModal(app)}
                      title="View candidate full profile"
                    >
                      <strong className="table-primary">{app.profiles?.full_name || 'Candidate'}</strong>
                    </button>
                    <small>{app.profiles?.headline || 'Application received'}</small>
                  </td>
                  <td>
                    <strong>{app.jobs?.title || 'Job unavailable'}</strong>
                    <div style={{ marginTop: '4px' }}>
                      <span className="portal-badge-chip" title="Applied via portal">
                        <Globe size={11} /> {app.portal?.name || 'Jooblie'}
                      </span>
                    </div>
                  </td>
                  <td>{formatDate(app.created_at) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <StatusBadge status={app.status} />
                      {app.status === 'submitted' && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>● Unreviewed</span>
                      )}
                      {app.status === 'interviewing' && app.interview?.date && (
                        <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                          <Calendar size={10} style={{ display: 'inline', marginRight: '2px' }} />
                          {app.interview.date}
                        </span>
                      )}
                      {app.status === 'offered' && (
                        <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                          <DollarSign size={10} style={{ display: 'inline', marginRight: '2px' }} />
                          Offer Extended
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => openCandidateModal(app)}
                        title="View complete candidate details"
                      >
                        <Eye size={14} /> Profile
                      </button>
                      <button
                        type="button"
                        className="table-action"
                        disabled={!app.resume_path || working === `resume:${app.id}`}
                        onClick={() => viewResume(app.id)}
                        title={app.resume_path ? 'Open secure verified resume' : 'No resume attached'}
                      >
                        <FileText size={14} /> Resume
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DashboardTable>
            <TablePagination page={visiblePage} pageSize={pageSize} total={filteredApps.length} noun="loaded candidates" onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        ) : (
          <div className="admin-state">
            <Search size={24} />
            <strong>No candidates found</strong>
            <p>Try another search, job, or status filter.</p>
          </div>
        )}
      </section>

      {/* 🔥 CANDIDATE FULL PROFILE MODAL */}
      {selectedApp && (
        <div className="candidate-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="candidate-modal-card" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="candidate-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="candidate-applied-for">Applied for {selectedApp.jobs?.title || 'Job'}</span>
                  <span className="candidate-portal-tag">
                    <Globe size={11} /> {selectedApp.portal?.name || 'Jooblie'}
                  </span>
                </div>
                <h2>{selectedApp.profiles?.full_name || 'Candidate Profile'}</h2>
                <p className="candidate-headline">{selectedApp.profiles?.headline || 'No professional headline provided'}</p>
              </div>
              <button type="button" className="candidate-modal-close" onClick={() => setSelectedApp(null)} aria-label="Close details">
                <X size={20} />
              </button>
            </div>

            {/* Quick Status Bar & Action Triggers */}
            <div className="candidate-status-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Stage:</span>
                <StatusBadge status={selectedApp.status} />
              </div>

              {/* Action Buttons */}
              <div className="candidate-stage-actions">
                <button
                  type="button"
                  className="btn-stage-action btn-shortlist"
                  onClick={() => startAction('shortlist', selectedApp)}
                  title="Move candidate to shortlisted pool"
                >
                  <CheckCircle2 size={14} /> Shortlist
                </button>
                <button
                  type="button"
                  className="btn-stage-action btn-interview"
                  onClick={() => startAction('interview', selectedApp)}
                  title="Schedule technical or HR interview"
                >
                  <Calendar size={14} /> Schedule Interview
                </button>
                <button
                  type="button"
                  className="btn-stage-action btn-offer"
                  onClick={() => startAction('offer', selectedApp)}
                  title="Extend official job offer letter"
                >
                  <Send size={14} /> Send Offer
                </button>
                <button
                  type="button"
                  className="btn-stage-action btn-reject"
                  onClick={() => startAction('reject', selectedApp)}
                  title="Politely reject candidate"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>

            {/* Active Stage Details Banner (if scheduled or offered) */}
            {selectedApp.interview && (
              <div className="stage-info-banner banner-interview">
                <Calendar size={18} />
                <div>
                  <strong>Interview Scheduled</strong>
                  <p>Date: {selectedApp.interview.date} at {selectedApp.interview.time} ({selectedApp.interview.format?.replace('_', ' ')})</p>
                  {selectedApp.interview.location && <p>Link/Address: {selectedApp.interview.location}</p>}
                  {selectedApp.interview.notes && <p>Notes: {selectedApp.interview.notes}</p>}
                </div>
              </div>
            )}

            {selectedApp.offer && (
              <div className="stage-info-banner banner-offer">
                <Sparkles size={18} />
                <div>
                  <strong>Official Offer Extended</strong>
                  <p>Role: {selectedApp.offer.jobTitle} | Compensation: {selectedApp.offer.salary || 'Competitive'}</p>
                  <p>Start Date: {selectedApp.offer.startDate || 'TBD'} | Expires: {selectedApp.offer.expiryDate || 'N/A'}</p>
                  {selectedApp.offer.welcomeMessage && <p>Message: "{selectedApp.offer.welcomeMessage}"</p>}
                </div>
              </div>
            )}

            {selectedApp.feedback && (
              <div className="stage-info-banner banner-reject">
                <AlertCircle size={18} />
                <div>
                  <strong>Rejection Feedback</strong>
                  <p>{selectedApp.feedback}</p>
                </div>
              </div>
            )}

            {/* Modal Body with All Submitted Details */}
            <div className="candidate-modal-body">
              {/* Contact Information */}
              <div className="candidate-detail-block">
                <h3>Contact & Location</h3>
                <div className="candidate-contact-grid">
                  <div className="contact-item">
                    <Mail size={16} className="contact-icon" />
                    <div>
                      <span className="contact-label">Email Address</span>
                      <strong className="contact-val">
                        {selectedApp.profiles?.email ? (
                          <a href={`mailto:${selectedApp.profiles.email}`}>{selectedApp.profiles.email}</a>
                        ) : (
                          'Not provided'
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="contact-item">
                    <Phone size={16} className="contact-icon" />
                    <div>
                      <span className="contact-label">Phone Number</span>
                      <strong className="contact-val">
                        {selectedApp.profiles?.phone ? (
                          <a href={`tel:${selectedApp.profiles.phone}`}>{selectedApp.profiles.phone}</a>
                        ) : (
                          'Not provided'
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="contact-item">
                    <MapPin size={16} className="contact-icon" />
                    <div>
                      <span className="contact-label">Location</span>
                      <strong className="contact-val">
                        {[selectedApp.profiles?.location_city, selectedApp.profiles?.location_province].filter(Boolean).join(', ') || 'Not specified'}
                      </strong>
                    </div>
                  </div>
                  <div className="contact-item">
                    <Globe size={16} className="contact-icon" />
                    <div>
                      <span className="contact-label">Portal Applied Through</span>
                      <strong className="contact-val">{selectedApp.portal?.name || 'Jooblie'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="candidate-detail-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Award size={18} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Skills</h3>
                </div>
                {Array.isArray(selectedApp.profiles?.skills) && selectedApp.profiles.skills.length > 0 ? (
                  <div className="candidate-skills-wrap">
                    {selectedApp.profiles.skills.map((skill, idx) => (
                      <span key={idx} className="candidate-skill-chip">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="detail-empty">No skills recorded.</p>
                )}
              </div>

              {/* Work Experience */}
              <div className="candidate-detail-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Briefcase size={18} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Work Experience</h3>
                </div>
                {Array.isArray(selectedApp.profiles?.experience) && selectedApp.profiles.experience.length > 0 ? (
                  <div className="candidate-history-list">
                    {selectedApp.profiles.experience.map((exp, idx) => (
                      <div key={idx} className="candidate-history-card">
                        <div className="history-top">
                          <h4>{exp.title || 'Untitled Role'}</h4>
                          <span className="history-dates">
                            {exp.startDate || 'Start'} — {exp.current ? 'Present' : (exp.endDate || 'End')}
                          </span>
                        </div>
                        {exp.company && <p className="history-company">{exp.company}</p>}
                        {exp.description && <p className="history-desc">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="detail-empty">No experience history listed.</p>
                )}
              </div>

              {/* Education Background */}
              <div className="candidate-detail-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <GraduationCap size={18} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Education</h3>
                </div>
                {Array.isArray(selectedApp.profiles?.education) && selectedApp.profiles.education.length > 0 ? (
                  <div className="candidate-history-list">
                    {selectedApp.profiles.education.map((edu, idx) => (
                      <div key={idx} className="candidate-history-card">
                        <div className="history-top">
                          <h4>{edu.degree || 'Degree / Certificate'}</h4>
                          <span className="history-dates">
                            {edu.startDate || 'Start'} — {edu.current ? 'Present' : (edu.endDate || 'End')}
                          </span>
                        </div>
                        {edu.institution && <p className="history-company">{edu.institution}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="detail-empty">No education background listed.</p>
                )}
              </div>

              {/* Cover Letter (if any) */}
              {selectedApp.cover_letter && (
                <div className="candidate-detail-block">
                  <h3>Cover Letter</h3>
                  <div className="candidate-cover-letter">
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              {/* Resume Document */}
              <div className="candidate-detail-block">
                <h3>Resume Document</h3>
                {selectedApp.resume_path ? (
                  <div className="candidate-resume-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
                        <FileText size={22} color="#e11d48" />
                      </div>
                      <div>
                        <strong>Verified Candidate Resume</strong>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Securely stored and verified by Jooblie</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-resume-open"
                      disabled={working === `resume:${selectedApp.id}`}
                      onClick={() => viewResume(selectedApp.id)}
                    >
                      <Eye size={16} /> {working === `resume:${selectedApp.id}` ? 'Opening…' : 'Open Resume'}
                    </button>
                  </div>
                ) : (
                  <p className="detail-empty">No resume document attached.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="candidate-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setSelectedApp(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE PROGRESSION ACTION TRIGGER MODALS
      ========================================================= */}

      {/* 1. SHORTLIST MODAL */}
      {actionModal === 'shortlist' && actionTarget && (
        <div className="candidate-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="action-dialog-card" onClick={e => e.stopPropagation()}>
            <div className="action-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={22} color="#16a34a" />
                <h3>Shortlist Candidate</h3>
              </div>
              <button type="button" className="candidate-modal-close" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={submitStageAction} className="action-dialog-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
                Move <strong>{actionTarget.profiles?.full_name || 'Candidate'}</strong> to the shortlisted pool for <strong>{actionTarget.jobs?.title}</strong>. An in-app status update will be dispatched.
              </p>
              <div className="form-group">
                <label>Internal Note (Optional):</label>
                <textarea
                  className="pro-dialog-input pro-dialog-textarea"
                  value={shortlistNote}
                  onChange={e => setShortlistNote(e.target.value)}
                  placeholder="e.g. Strong technical match, recommend scheduling interview..."
                />
              </div>
              <div className="action-dialog-footer">
                <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={actionSubmitting}>
                  {actionSubmitting ? 'Updating...' : 'Shortlist & Notify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SCHEDULE INTERVIEW MODAL */}
      {actionModal === 'interview' && actionTarget && (
        <div className="candidate-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="action-dialog-card" onClick={e => e.stopPropagation()}>
            <div className="action-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={22} color="#2563eb" />
                <h3>Schedule Interview</h3>
              </div>
              <button type="button" className="candidate-modal-close" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={submitStageAction} className="action-dialog-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
                Schedule an interview for <strong>{actionTarget.profiles?.full_name || 'Candidate'}</strong>. Details will be delivered live to the candidate's portal.
              </p>
              <div className="dialog-form-grid">
                <div className="form-group">
                  <label>Interview Date *</label>
                  <input
                    type="date"
                    required
                    className="pro-dialog-input"
                    value={interviewForm.date}
                    onChange={e => setInterviewForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Interview Time *</label>
                  <input
                    type="time"
                    required
                    className="pro-dialog-input"
                    value={interviewForm.time}
                    onChange={e => setInterviewForm(p => ({ ...p, time: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Interview Format</label>
                  <select
                    className="pro-dialog-input"
                    value={interviewForm.format}
                    onChange={e => setInterviewForm(p => ({ ...p, format: e.target.value }))}
                  >
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom Meeting</option>
                    <option value="phone">Phone Screen</option>
                    <option value="in_person">In-Person Address</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Meeting Link or Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. meet.google.com/abc-xyz or 123 Main St"
                    className="pro-dialog-input"
                    value={interviewForm.location}
                    onChange={e => setInterviewForm(p => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes & Preparation for Candidate</label>
                  <textarea
                    className="pro-dialog-input pro-dialog-textarea"
                    placeholder="e.g. 45-minute technical discussion covering system design..."
                    value={interviewForm.notes}
                    onChange={e => setInterviewForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="action-dialog-footer">
                <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={actionSubmitting}>
                  {actionSubmitting ? 'Scheduling...' : 'Schedule & Notify Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SEND OFFER LETTER MODAL */}
      {actionModal === 'offer' && actionTarget && (
        <div className="candidate-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="action-dialog-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="action-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send size={22} color="#16a34a" />
                <h3>Send Official Offer Letter</h3>
              </div>
              <button type="button" className="candidate-modal-close" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={submitStageAction} className="action-dialog-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
                Extend an official offer to <strong>{actionTarget.profiles?.full_name || 'Candidate'}</strong>. The candidate will inspect details and can accept or decline online.
              </p>
              <div className="dialog-form-grid">
                <div className="form-group">
                  <label>Offered Job Title *</label>
                  <input
                    type="text"
                    required
                    className="pro-dialog-input"
                    value={offerForm.jobTitle}
                    onChange={e => setOfferForm(p => ({ ...p, jobTitle: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Salary & Compensation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. $105,000 / year + health benefits"
                    className="pro-dialog-input"
                    value={offerForm.salary}
                    onChange={e => setOfferForm(p => ({ ...p, salary: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Proposed Start Date *</label>
                  <input
                    type="date"
                    required
                    className="pro-dialog-input"
                    value={offerForm.startDate}
                    onChange={e => setOfferForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Offer Expiration Date</label>
                  <input
                    type="date"
                    className="pro-dialog-input"
                    value={offerForm.expiryDate}
                    onChange={e => setOfferForm(p => ({ ...p, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Official Offer Document (PDF)</label>
                  <div className="file-attach-box">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      id="offer-doc-upload"
                      style={{ display: 'none' }}
                      onChange={handleOfferFileUpload}
                    />
                    <label htmlFor="offer-doc-upload" className="file-attach-btn">
                      <UploadCloud size={16} /> {offerForm.documentName ? offerForm.documentName : 'Upload Signed PDF Offer Letter'}
                    </label>
                    {offerForm.documentName && (
                      <span className="file-attach-status">✓ Attached</span>
                    )}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Custom Welcome Message *</label>
                  <textarea
                    required
                    className="pro-dialog-input pro-dialog-textarea"
                    placeholder="We are thrilled to welcome you to the team..."
                    value={offerForm.welcomeMessage}
                    onChange={e => setOfferForm(p => ({ ...p, welcomeMessage: e.target.value }))}
                  />
                </div>
              </div>
              <div className="action-dialog-footer">
                <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#16a34a' }} disabled={actionSubmitting}>
                  {actionSubmitting ? 'Sending...' : 'Dispatch Offer Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REJECT MODAL */}
      {actionModal === 'reject' && actionTarget && (
        <div className="candidate-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="action-dialog-card" onClick={e => e.stopPropagation()}>
            <div className="action-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <XCircle size={22} color="#dc2626" />
                <h3>Reject Application</h3>
              </div>
              <button type="button" className="candidate-modal-close" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={submitStageAction} className="action-dialog-body">
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
                Move <strong>{actionTarget.profiles?.full_name || 'Candidate'}</strong> to rejected status. You can provide constructive feedback.
              </p>
              <div className="form-group">
                <label>Polite Feedback Note (Optional):</label>
                <textarea
                  className="pro-dialog-input pro-dialog-textarea"
                  value={rejectFeedback}
                  onChange={e => setRejectFeedback(e.target.value)}
                  placeholder="Thank you for taking the time to apply. At this time we have decided to proceed with other candidates..."
                />
              </div>
              <div className="action-dialog-footer">
                <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#dc2626' }} disabled={actionSubmitting}>
                  {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

const candidatesModalCSS = `
  .candidate-name-btn { background: none; border: none; padding: 0; text-align: left; cursor: pointer; color: inherit; }
  .candidate-name-btn:hover strong { color: #2563eb; text-decoration: underline; }

  .portal-badge-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 2px 6px;
  }

  .candidate-portal-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #1e40af;
    background: #dbeafe;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    padding: 2px 8px;
  }

  /* CANDIDATE MODAL */
  .candidate-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; animation: fadeIn 0.2s ease-out; }
  .candidate-modal-card { background: #ffffff; border-radius: 16px; max-width: 760px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes modalPop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  .candidate-modal-header { padding: 22px 28px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: #f8fafc; }
  .candidate-applied-for { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #2563eb; letter-spacing: 0.05em; display: inline-block; }
  .candidate-modal-header h2 { margin: 0 0 4px 0; font-size: 1.45rem; font-weight: 700; color: #0f172a; }
  .candidate-headline { margin: 0; font-size: 0.95rem; color: #64748b; }
  .candidate-modal-close { background: transparent; border: 1px solid #cbd5e1; border-radius: 8px; width: 34px; height: 34px; display: grid; place-items: center; cursor: pointer; color: #64748b; transition: all 0.2s; }
  .candidate-modal-close:hover { background: #fee2e2; color: #e11d48; border-color: #fca5a5; }

  .candidate-status-bar { padding: 12px 28px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

  .candidate-stage-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .btn-stage-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-shortlist { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .btn-shortlist:hover { background: #dcfce7; }
  .btn-interview { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .btn-interview:hover { background: #dbeafe; }
  .btn-offer { background: #fefce8; color: #a16207; border-color: #fef08a; }
  .btn-offer:hover { background: #fef9c3; }
  .btn-reject { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .btn-reject:hover { background: #fee2e2; }

  .stage-info-banner { margin: 16px 28px 0; padding: 14px 18px; border-radius: 8px; display: flex; align-items: flex-start; gap: 12px; font-size: 0.88rem; }
  .stage-info-banner p { margin: 2px 0 0 0; color: #334155; }
  .banner-interview { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
  .banner-offer { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
  .banner-reject { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

  .candidate-modal-body { padding: 24px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; flex: 1; }
  .candidate-detail-block h3 { margin: 0 0 12px 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }

  .candidate-contact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; }
  .contact-item { display: flex; align-items: flex-start; gap: 12px; }
  .contact-icon { color: #2563eb; margin-top: 3px; flex-shrink: 0; }
  .contact-label { display: block; font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
  .contact-val { font-size: 0.95rem; color: #0f172a; word-break: break-all; }
  .contact-val a { color: #2563eb; text-decoration: none; }
  .contact-val a:hover { text-decoration: underline; }

  .candidate-skills-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .candidate-skill-chip { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.85rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; }

  .candidate-history-list { display: flex; flex-direction: column; gap: 12px; }
  .candidate-history-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
  .history-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .history-top h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
  .history-dates { font-size: 0.8rem; font-weight: 600; color: #64748b; }
  .history-company { margin: 4px 0 0 0; font-size: 0.9rem; color: #334155; font-weight: 500; }
  .history-desc { margin: 8px 0 0 0; font-size: 0.85rem; color: #64748b; line-height: 1.4; white-space: pre-wrap; }

  .candidate-cover-letter { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 0.9rem; color: #334155; line-height: 1.5; white-space: pre-wrap; }

  .candidate-resume-box { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
  .btn-resume-open { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: #ffffff; border: none; font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
  .btn-resume-open:hover { background: #1d4ed8; }

  .detail-empty { margin: 0; font-size: 0.9rem; color: #94a3b8; font-style: italic; }
  .candidate-modal-footer { padding: 16px 28px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc; }

  /* ACTION DIALOGS */
  .action-dialog-card { background: #ffffff; border-radius: 14px; max-width: 540px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .action-dialog-header { padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; }
  .action-dialog-header h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
  .action-dialog-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
  .action-dialog-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 16px; border-top: 1px solid #f1f5f9; }

  .dialog-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .dialog-form-grid .full-width { grid-column: 1 / -1; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 0.85rem; font-weight: 600; color: #334155; }
  .pro-dialog-input { width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; }
  .pro-dialog-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
  .pro-dialog-textarea { min-height: 85px; resize: vertical; line-height: 1.4; }

  .file-attach-box { display: flex; align-items: center; gap: 12px; }
  .file-attach-btn { display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #2563eb; cursor: pointer; }
  .file-attach-btn:hover { background: #eff6ff; border-color: #93c5fd; }
  .file-attach-status { font-size: 0.8rem; color: #16a34a; font-weight: 600; }

  @media (max-width: 640px) {
    .candidate-contact-grid { grid-template-columns: 1fr; }
    .dialog-form-grid { grid-template-columns: 1fr; }
  }
`;
