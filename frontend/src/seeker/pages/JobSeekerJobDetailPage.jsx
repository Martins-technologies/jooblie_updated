import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MonitorSmartphone,
  CheckCircle2,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  Send,
  Loader2,
  Users,
  Globe,
  Mail,
  ExternalLink,
  Bookmark,
  Linkedin,
  AlertTriangle,
  XCircle,
  FileCheck,
  ShieldCheck,
  Zap,
  Info,
  Check,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import useJobBookmark from '../../shared/hooks/useJobBookmark';
import ShareJobButton from '../../shared/components/ShareJobButton';
import { getJobById } from '../../shared/lib/data';
import { apiRequest } from '../../shared/lib/api';
import { formatSalary } from '../../shared/lib/format';
import { analyzeJobMatch } from '../../shared/lib/jobMatcher';

export default function JobSeekerJobDetailPage() {
  const { jobId } = useParams();
  const [state, setState] = useState({ loading: true, result: null, candidateProfile: null });
  const [application, setApplication] = useState({
    loading: false,
    success: false,
    error: '',
  });
  const [coverLetter, setCoverLetter] = useState('');
  const [acknowledgedMismatch, setAcknowledgedMismatch] = useState(false);
  const { saved: isSaved, loading: savingJob, error: saveError, toggleSaved } = useJobBookmark(jobId);

  useEffect(() => {
    let active = true;

    const loadJobAndApplicationStatus = async () => {
      try {
        const [jobResult, dashboardResult] = await Promise.all([
          getJobById(jobId),
          apiRequest('/job-seeker/dashboard', { auth: true }).catch(() => null),
        ]);

        if (active) {
          setState({
            loading: false,
            result: jobResult,
            candidateProfile: dashboardResult?.profile || null,
          });

          if (dashboardResult && dashboardResult.applications) {
            const alreadyApplied = dashboardResult.applications.some(
              (app) =>
                String(app.job_id) === String(jobId) ||
                String(app.jobs?.id) === String(jobId)
            );

            if (alreadyApplied) {
              setApplication({ loading: false, success: true, error: '' });
            }
          }
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, result: null, candidateProfile: null });
        }
      }
    };

    loadJobAndApplicationStatus();

    return () => {
      active = false;
    };
  }, [jobId]);

  const { job } = state.result || {};
  const candidateProfile = state.candidateProfile;

  // Run comprehensive matching analysis against candidate profile
  const matchAnalysis = useMemo(() => {
    if (!job) return null;
    return analyzeJobMatch(job, candidateProfile);
  }, [job, candidateProfile]);

  const applyWithJooblie = async (e) => {
    e.preventDefault();
    if (!matchAnalysis?.resume?.isPresent) {
      setApplication({
        loading: false,
        success: false,
        error: 'Resume Required: Please upload a resume to your profile before applying.',
      });
      return;
    }

    // Edge case gate: if domain or skill mismatch and not acknowledged
    if (
      (matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) &&
      !acknowledgedMismatch
    ) {
      setApplication({
        loading: false,
        success: false,
        error: 'Please acknowledge the requirements mismatch checkbox before submitting.',
      });
      return;
    }

    setApplication({ loading: true, success: false, error: '' });
    try {
      await apiRequest(`/job-seeker/jobs/${job.id}/apply`, {
        method: 'POST',
        auth: true,
        body: { cover_letter: coverLetter.trim() || null },
      });
      setApplication({ loading: false, success: true, error: '' });
    } catch (error) {
      if (error.message.toLowerCase().includes('already applied')) {
        setApplication({ loading: false, success: true, error: '' });
      } else {
        setApplication({ loading: false, success: false, error: error.message });
      }
    }
  };

  const renderDescription = (text) => {
    if (!text) return <p style={{ color: '#64748b' }}>No job description provided.</p>;
    const blocks = String(text)
      .split(/\n{2,}/)
      .filter(Boolean);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {blocks.map((block, index) => {
          const trimmed = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const isHeading =
            trimmed.startsWith('###') ||
            trimmed.startsWith('##') ||
            trimmed.endsWith(':') ||
            trimmed.length < 50 && (trimmed.includes('Overview') || trimmed.includes('Responsibilities') || trimmed.includes('Requirements') || trimmed.includes('Qualifications') || trimmed.includes('Offer'));

          if (isHeading) {
            return (
              <h4
                key={index}
                style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '16px 0 4px 0',
                  letterSpacing: '-0.01em',
                }}
              >
                {trimmed.replace(/^#+\s*/, '')}
              </h4>
            );
          }

          return (
            <p
              key={index}
              style={{
                margin: 0,
                lineHeight: '1.8',
                color: '#334155',
                fontSize: '1rem',
              }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  if (state.loading) {
    return (
      <DashboardLayout title="Job Details">
        <div style={{ width: '100%', padding: '24px 0' }}>
          <div
            style={{
              height: '40px',
              width: '180px',
              background: '#e2e8f0',
              borderRadius: '8px',
              marginBottom: '24px',
              animation: 'shimmer 1.5s infinite',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 360px',
              gap: '24px',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '36px',
                border: '1px solid #e2e8f0',
                height: '400px',
              }}
            />
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                height: '350px',
              }}
            />
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout title="Job Details">
        <div
          style={{
            padding: '80px 24px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800', marginBottom: '8px' }}>
            Job Not Found
          </h2>
          <p style={{ color: '#64748b', marginBottom: '28px' }}>
            The position you are looking for is either no longer active or does not exist.
          </p>
          <Link
            to="/dashboard/job-seeker/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#2557a7',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            <ArrowLeft size={18} /> Back to Job Search
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const salary = formatSalary(job);
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
  const daysAgo = Math.max(
    0,
    Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24))
  );

  const fitScore = matchAnalysis?.fitScore || 0;
  const isHighFit = fitScore >= 80;
  const isModerateFit = fitScore >= 50 && fitScore < 80;
  const isMismatch = fitScore < 50 || matchAnalysis?.isDomainMismatch;

  return (
    <DashboardLayout
      title="Job Details"
      subtitle="View verified employer specifications, requirements match, and submit application."
    >
      <div style={{ width: '100%', maxWidth: '100%', margin: '0', padding: '0 4px 60px 4px' }}>
        {/* Top Back Navigation Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <Link
            to="/dashboard/job-seeker/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#475569',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.92rem',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <ArrowLeft size={18} /> Back to Job Search
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                color: '#64748b',
                background: '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: '500',
              }}
            >
              <Info size={15} /> Job Reference: #{job.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* 2-COLUMN FULL-WIDTH GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 380px',
            gap: '24px',
            alignItems: 'start',
          }}
          className="job-details-grid-responsive"
        >
          {/* LEFT COLUMN: HERO, MATCH ANALYSIS, DESCRIPTION & COMPANY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            {/* HERO BANNER CARD */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '36px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '6px',
                  background: 'linear-gradient(90deg, #2557a7, #3b82f6, #06b6d4)',
                }}
              />

              {/* Badges Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  {job.categoryName || 'Software Development'}
                </span>

                <span
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {job.employmentType || 'Full-time'}
                </span>

                {daysAgo <= 5 && !isExpired && (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      border: '1px solid #a7f3d0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Sparkles size={14} /> New Opening
                  </span>
                )}

                {isExpired && (
                  <span
                    style={{
                      background: '#fef2f2',
                      color: '#b91c1c',
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      border: '1px solid #fecaca',
                    }}
                  >
                    Position Closed / Expired
                  </span>
                )}
              </div>

              {/* Title & Company Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #1e40af, #2557a7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '1.75rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(37, 87, 167, 0.25)',
                  }}
                >
                  {job.companyName?.charAt(0) || 'T'}
                </div>

                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h1
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '2.1rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      lineHeight: '1.25',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {job.title}
                  </h1>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      color: '#475569',
                      fontSize: '1.02rem',
                    }}
                  >
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>
                      {job.companyName}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#f0fdf4',
                        color: '#15803d',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <ShieldCheck size={14} /> Verified Employer
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      {job.employeesCount || '11-50'} employees
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Grid Chips */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #edf2f7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      color: '#2557a7',
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                      Location
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>
                      {job.location || `${job.city || 'Toronto'}, ${job.province || 'ON'}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      color: '#0891b2',
                    }}
                  >
                    <MonitorSmartphone size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                      Workplace Model
                    </div>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        textTransform: 'capitalize',
                      }}
                    >
                      {job.workplaceType || 'Hybrid'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      color: '#7c3aed',
                    }}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                      Seniority Required
                    </div>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        textTransform: 'capitalize',
                      }}
                    >
                      {job.experienceLevel || 'Senior'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      color: '#64748b',
                    }}
                  >
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                      Posted
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>
                      {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CANDIDATE ELIGIBILITY & EDGE-CASE VALIDATION ENGINE */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '32px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
              }}
            >
              {/* Header with Match Percentage */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#2557a7',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                    }}
                  >
                    <Zap size={16} /> Automated Fit & Eligibility Engine
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    Candidate Qualification Analysis
                  </h3>
                </div>

                {/* Score Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isHighFit
                      ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                      : isModerateFit
                      ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                      : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                    padding: '8px 18px',
                    borderRadius: '16px',
                    border: `1px solid ${
                      isHighFit ? '#a7f3d0' : isModerateFit ? '#bfdbfe' : '#fecaca'
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: '900',
                      color: isHighFit ? '#065f46' : isModerateFit ? '#1e40af' : '#991b1b',
                      lineHeight: '1',
                    }}
                  >
                    {fitScore}%
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        color: isHighFit ? '#047857' : isModerateFit ? '#1d4ed8' : '#b91c1c',
                      }}
                    >
                      Overall Match
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        color: isHighFit ? '#065f46' : isModerateFit ? '#1e3a8a' : '#7f1d1d',
                      }}
                    >
                      {isHighFit
                        ? 'Exceptional Fit'
                        : isModerateFit
                        ? 'Moderate Fit'
                        : 'Requirements Not Met'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DOMAIN MISMATCH CRITICAL BANNER (Cook / Electrician applying for Software Developer) */}
              {matchAnalysis?.isDomainMismatch && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: '0 0 6px 0',
                        color: '#991b1b',
                        fontSize: '1.05rem',
                        fontWeight: '800',
                      }}
                    >
                      Domain & Skill Mismatch Detected
                    </h4>
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        color: '#7f1d1d',
                        fontSize: '0.92rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {matchAnalysis.domainMismatchReason}
                    </p>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#991b1b',
                        background: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        display: 'inline-block',
                      }}
                    >
                      💡 <strong>Notice:</strong> Applications without core engineering skills are
                      routinely rejected during applicant screening. Please confirm you have relevant
                      qualifications before applying.
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS BANNER: PROFESSIONAL CANDIDATE MEETS ALL CHECKS */}
              {matchAnalysis?.allRequirementsFulfilled && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16a34a',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#166534', fontSize: '1rem' }}>
                      All Job Requirements Fulfilled!
                    </div>
                    <div style={{ color: '#15803d', fontSize: '0.88rem' }}>
                      Your skills, verified experience ({matchAnalysis.experience.candidateYears} yrs),
                      location, and active resume fully align with this employer&apos;s criteria.
                    </div>
                  </div>
                </div>
              )}

              {/* 4 CORE REQUIREMENT PILLARS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {/* 1. Skills Pillar */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: `1px solid ${
                      matchAnalysis?.skills?.matched?.length > 0 ? '#bbf7d0' : '#fed7aa'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Award size={18} color="#2557a7" /> Skills Alignment
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        background:
                          matchAnalysis?.skills?.matched?.length > 0 ? '#dcfce7' : '#ffedd5',
                        color:
                          matchAnalysis?.skills?.matched?.length > 0 ? '#166534' : '#9a3412',
                      }}
                    >
                      {matchAnalysis?.skills?.matched?.length || 0} /{' '}
                      {matchAnalysis?.skills?.jobSkills?.length || 0} Matched
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '12px' }}>
                    {matchAnalysis?.skills?.matched?.length > 0
                      ? 'Core required proficiencies identified in your profile.'
                      : 'None of the required technical skills found on your profile.'}
                  </div>

                  {/* Matched Skills Tags */}
                  {matchAnalysis?.skills?.matched?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {matchAnalysis.skills.matched.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={12} /> {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Missing Skills Tags */}
                  {matchAnalysis?.skills?.missing?.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#94a3b8',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        Missing Skills:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {matchAnalysis.skills.missing.slice(0, 6).map((s) => (
                          <span
                            key={s}
                            style={{
                              background: '#f1f5f9',
                              color: '#64748b',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: '500',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Experience Level Pillar */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: `1px solid ${
                      matchAnalysis?.experience?.isMatch ? '#bbf7d0' : '#fed7aa'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Briefcase size={18} color="#7c3aed" /> Experience Check
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        background: matchAnalysis?.experience?.isMatch ? '#dcfce7' : '#ffedd5',
                        color: matchAnalysis?.experience?.isMatch ? '#166534' : '#9a3412',
                      }}
                    >
                      {matchAnalysis?.experience?.isMatch ? 'Qualified' : 'Mismatch'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.5' }}>
                    {matchAnalysis?.experience?.reason}
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Role Level:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {matchAnalysis?.experience?.requiredLevel} ({matchAnalysis?.experience?.requiredYearsMin}+ yrs)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Your Profile:</span>
                    <span
                      style={{
                        fontWeight: '700',
                        color: matchAnalysis?.experience?.isMatch ? '#16a34a' : '#d97706',
                      }}
                    >
                      {matchAnalysis?.experience?.candidateYears} years recorded
                    </span>
                  </div>
                </div>

                {/* 3. Location Pillar */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: `1px solid ${
                      matchAnalysis?.location?.isMatch ? '#bbf7d0' : '#fed7aa'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <MapPin size={18} color="#0891b2" /> Workplace Location
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        background: matchAnalysis?.location?.isMatch ? '#dcfce7' : '#ffedd5',
                        color: matchAnalysis?.location?.isMatch ? '#166534' : '#9a3412',
                      }}
                    >
                      {matchAnalysis?.location?.isMatch ? 'Eligible' : 'Check Location'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.5' }}>
                    {matchAnalysis?.location?.reason}
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Office Site:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {matchAnalysis?.location?.jobLocation} ({matchAnalysis?.location?.workplaceType})
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Your Location:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {matchAnalysis?.location?.candidateLocation}
                    </span>
                  </div>
                </div>

                {/* 4. Resume & Profile Verification Pillar */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: `1px solid ${
                      matchAnalysis?.resume?.isPresent ? '#bbf7d0' : '#fca5a5'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <FileCheck size={18} color="#059669" /> Resume Status
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        background: matchAnalysis?.resume?.isPresent ? '#dcfce7' : '#fee2e2',
                        color: matchAnalysis?.resume?.isPresent ? '#166534' : '#b91c1c',
                      }}
                    >
                      {matchAnalysis?.resume?.isPresent ? 'Attached' : 'Missing'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.5' }}>
                    {matchAnalysis?.resume?.isPresent
                      ? 'Your registered profile resume is ready to attach automatically.'
                      : 'No default resume found on your account. A resume document is required.'}
                  </div>

                  {!matchAnalysis?.resume?.isPresent && (
                    <div style={{ marginTop: '12px' }}>
                      <Link
                        to="/dashboard/job-seeker/profile?tab=resume"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#2557a7',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                        }}
                      >
                        Upload Resume in Profile <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable profile enhancement shortcut */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '0.86rem', color: '#475569' }}>
                  Want to update your skills, headline, or location to improve this match score?
                </div>
                <Link
                  to="/dashboard/job-seeker/profile"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: '#2557a7',
                    textDecoration: 'none',
                    background: '#fff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  Edit Profile <ExternalLink size={14} />
                </Link>
              </div>
            </div>

            {/* JOB DESCRIPTION CARD */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '36px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Briefcase size={22} color="#2557a7" /> Role Overview & Requirements
              </h3>

              <div style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.8' }}>
                {renderDescription(job.description)}
              </div>

              {/* Required Skills Chips */}
              {job.skills?.length > 0 && (
                <div
                  style={{
                    marginTop: '36px',
                    paddingTop: '28px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '14px',
                    }}
                  >
                    Skills & Technologies Specified by Employer
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          background: '#f8fafc',
                          color: '#1e293b',
                          padding: '6px 16px',
                          borderRadius: '16px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ABOUT COMPANY CARD */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '36px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Building2 size={22} color="#2557a7" /> About {job.companyName}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Organization Size</div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {job.employeesCount || '11-50 Employees'}
                  </div>
                </div>

                {job.companyWebsite && (
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Corporate Website</div>
                    <a
                      href={job.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontWeight: '700',
                        color: '#2557a7',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      Visit site <ExternalLink size={14} />
                    </a>
                  </div>
                )}

                {job.companyLinkedin && (
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>LinkedIn Company Page</div>
                    <a
                      href={job.companyLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontWeight: '700',
                        color: '#0a66c2',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      View on LinkedIn <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY APPLICATION ACTION CARD */}
          <div
            style={{
              position: 'sticky',
              top: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Main Application Box */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 24px -2px rgba(15, 23, 42, 0.08)',
              }}
            >
              {/* Compensation */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                  Target Compensation
                </div>
                <div
                  style={{
                    fontSize: '1.85rem',
                    fontWeight: '900',
                    color: '#059669',
                    letterSpacing: '-0.02em',
                    lineHeight: '1.2',
                    marginTop: '2px',
                  }}
                >
                  {salary || 'Competitive Pay'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  {job.employmentType || 'Full-time'} • Based on experience
                </div>
              </div>

              {/* Already Applied State */}
              {application.success ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '14px',
                    padding: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}
                  >
                    <CheckCircle2 size={26} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#166534', fontWeight: '800' }}>
                    Application Submitted!
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#15803d' }}>
                    Your application and resume have been delivered to {job.companyName}.
                  </p>
                  <Link
                    to="/dashboard/job-seeker/applications"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#16a34a',
                      color: '#fff',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                    }}
                  >
                    Track in My Applications
                  </Link>
                </div>
              ) : (
                <form onSubmit={applyWithJooblie}>
                  {/* Missing Resume Gate */}
                  {!matchAnalysis?.resume?.isPresent && (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '700',
                          color: '#991b1b',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px',
                        }}
                      >
                        <AlertTriangle size={16} /> Resume Missing
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                        You must upload a resume before employers can accept your application.
                      </p>
                      <Link
                        to="/dashboard/job-seeker/profile?tab=resume"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#dc2626',
                          color: '#fff',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                        }}
                      >
                        Upload Resume in Profile
                      </Link>
                    </div>
                  )}

                  {/* Requirements Mismatch Edge Case Warning & Acknowledgement */}
                  {(matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) && (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '700',
                          color: '#92400e',
                          fontSize: '0.88rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '6px',
                        }}
                      >
                        <AlertTriangle size={16} color="#d97706" /> Requirements Warning
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#78350f', lineHeight: '1.4' }}>
                        Your profile does not match the required engineering skills. If you have transferable
                        experience, explain it in your cover letter below.
                      </p>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '0.78rem',
                          color: '#92400e',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={acknowledgedMismatch}
                          onChange={(e) => setAcknowledgedMismatch(e.target.checked)}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                        />
                        <span>
                          I acknowledge my profile does not meet the specified qualifications and wish to proceed anyway.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Cover Letter Field */}
                  <div style={{ marginBottom: '18px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label
                        htmlFor="coverLetter"
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: '700',
                          color: '#1e293b',
                        }}
                      >
                        Cover Letter <span style={{ fontWeight: '400', color: '#64748b' }}>(optional)</span>
                      </label>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {coverLetter.length}/10,000
                      </span>
                    </div>

                    <textarea
                      id="coverLetter"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Highlight relevant software projects, accomplishments, or reasons why you're a standout fit..."
                      maxLength={10000}
                      style={{
                        width: '100%',
                        minHeight: '110px',
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        outline: 'none',
                        background: '#f8fafc',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#2557a7';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      application.loading ||
                      !matchAnalysis?.resume?.isPresent ||
                      ((matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) &&
                        !acknowledgedMismatch)
                    }
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '1rem',
                      border: 'none',
                      cursor:
                        application.loading ||
                        !matchAnalysis?.resume?.isPresent ||
                        ((matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) &&
                          !acknowledgedMismatch)
                          ? 'not-allowed'
                          : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.25s ease',
                      background: !matchAnalysis?.resume?.isPresent
                        ? '#cbd5e1'
                        : (matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) &&
                          !acknowledgedMismatch
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #2557a7, #1d4a8f)',
                      color: '#ffffff',
                      boxShadow:
                        !matchAnalysis?.resume?.isPresent ||
                        ((matchAnalysis?.isDomainMismatch || matchAnalysis?.skills?.matched.length === 0) &&
                          !acknowledgedMismatch)
                          ? 'none'
                          : '0 4px 16px rgba(37, 87, 167, 0.35)',
                    }}
                  >
                    {application.loading ? (
                      <>
                        <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Apply with Jooblie
                      </>
                    )}
                  </button>

                  {application.error && (
                    <div
                      style={{
                        color: '#b91c1c',
                        fontSize: '0.82rem',
                        marginTop: '12px',
                        textAlign: 'center',
                        background: '#fef2f2',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      {application.error}
                    </div>
                  )}
                </form>
              )}

              {/* Action Secondary Buttons (Save & Share) */}
              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '18px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={toggleSaved}
                  disabled={savingJob || Boolean(saveError)}
                  aria-pressed={isSaved}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: isSaved ? '#eff6ff' : '#ffffff',
                    color: isSaved ? '#1d4ed8' : '#334155',
                    fontSize: '0.86rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Bookmark size={16} fill={isSaved ? '#1d4ed8' : 'none'} />
                  {savingJob ? 'Saving...' : isSaved ? 'Saved' : 'Save Job'}
                </button>
                <div style={{ flex: 1 }}>
                  <ShareJobButton job={job} />
                </div>
              </div>
            </div>

            {/* Quick Fact Sheet Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <h4
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Job Summary
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Employer</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{job.companyName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Experience</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>
                    {job.experienceLevel || 'Senior'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Workplace</span>
                  <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>
                    {job.workplaceType || 'Hybrid'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>City & Region</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {job.city || 'Toronto'}, {job.province || 'ON'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Portal Network</span>
                  <span style={{ fontWeight: '700', color: '#2557a7' }}>Jooblie Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 960px) {
          .job-details-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}