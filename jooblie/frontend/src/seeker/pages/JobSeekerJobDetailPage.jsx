import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MonitorSmartphone,
  CheckCircle2,
  Building2,
  Briefcase,
  Clock,
  Award,
  Sparkles,
  Send,
  Loader2,
  Eye,
  Users,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Share2,
  Bookmark,
  Linkedin,
} from 'lucide-react';
import DashboardLayout from '../../shared/components/DashboardLayout';
import { getJobById } from '../../shared/lib/data';
import { apiRequest } from '../../shared/lib/api';
import { formatSalary, formatDate } from '../../shared/lib/format';

export default function JobSeekerJobDetailPage() {
  const { jobId } = useParams();
  const [state, setState] = useState({ loading: true, result: null });
  const [application, setApplication] = useState({
    loading: false,
    success: false,
    error: '',
  });
  const [coverLetter, setCoverLetter] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadJobAndApplicationStatus = async () => {
      try {
        const [jobResult, dashboardResult] = await Promise.all([
          getJobById(jobId),
          apiRequest('/job-seeker/dashboard', { auth: true }).catch(() => null),
        ]);

        if (active) {
          setState({ loading: false, result: jobResult });

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
          setState({ loading: false, result: null });
        }
      }
    };

    loadJobAndApplicationStatus();

    return () => {
      active = false;
    };
  }, [jobId]);

  const applyWithJooblie = async (e) => {
    e.preventDefault();
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
    if (!text) return <p>No description provided.</p>;
    const blocks = String(text)
      .split(/\n{2,}/)
      .filter(Boolean);
    return (
      <>
        {blocks.map((block, index) => (
          <p
            key={index}
            style={{
              marginBottom: '16px',
              lineHeight: '1.8',
              color: '#374151',
              fontSize: '1rem',
            }}
          >
            {block
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()}
          </p>
        ))}
      </>
    );
  };

  if (state.loading) {
    return (
      <DashboardLayout title="Job Details">
        <div style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div
                style={{
                  height: '40px',
                  width: '160px',
                  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                  backgroundSize: '200% 100%',
                  borderRadius: '8px',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
              <div
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '40px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    height: '32px',
                    width: '120px',
                    background: '#e5e7eb',
                    borderRadius: '20px',
                    marginBottom: '16px',
                  }}
                />
                <div
                  style={{
                    height: '40px',
                    width: '70%',
                    background: '#e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                />
                <div
                  style={{
                    height: '28px',
                    width: '40%',
                    background: '#e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '24px',
                  }}
                />
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: '20px',
                        width: '140px',
                        background: '#e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  const { job } = state.result || {};
  if (!job) {
    return (
      <DashboardLayout title="Job Details">
        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              marginBottom: '16px',
              opacity: 0.5,
            }}
          >
            🔍
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>
            Job Not Found
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            The job you're looking for doesn't exist or has been removed.
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
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4a8f')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2557a7')}
          >
            <ArrowLeft size={18} /> Back to Jobs
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const salary = formatSalary(job);
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
  const daysAgo = Math.floor(
    (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)
  );

  return (
    <DashboardLayout
      title="Job Details"
      subtitle="View requirements and apply for this role."
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            paddingBottom: '60px',
          }}
        >
          {/* Back Button */}
          <div>
            <Link
              to="/dashboard/job-seeker/jobs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.95rem',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#f9fafb',
                transition: 'all 0.2s',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <ArrowLeft size={18} /> Back to Search
            </Link>
          </div>

          {/* Main Job Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '40px',
              border: '1px solid #f0f0f0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.3s',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '32px',
                alignItems: 'start',
              }}
            >
              {/* Left Column - Job Info */}
              <div>
                {/* Badge Row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '16px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #eef2f9, #e0e7f5)',
                      color: '#2557a7',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {job.categoryName || 'General'}
                  </span>
                  {isExpired && (
                    <span
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        padding: '4px 16px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                      }}
                    >
                      Expired
                    </span>
                  )}
                  {daysAgo <= 3 && !isExpired && (
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        padding: '4px 16px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={14} /> New
                    </span>
                  )}
                </div>

                <h1
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '2rem',
                    color: '#111827',
                    fontWeight: '800',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {job.title}
                </h1>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.1rem',
                      color: '#4b5563',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Building2 size={20} color="#6b7280" />
                    {job.companyName}
                  </span>
                  <span
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#d1d5db',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Users size={16} />
                    {job.employeesCount || '11-50'} employees
                  </span>
                </div>

                {/* Meta Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px 24px',
                    padding: '16px 0 20px 0',
                    borderTop: '1px solid #f3f4f6',
                    borderBottom: '1px solid #f3f4f6',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#4b5563',
                      fontSize: '0.9rem',
                    }}
                  >
                    <MapPin size={18} color="#6b7280" />
                    {job.location || 'Remote'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#4b5563',
                      fontSize: '0.9rem',
                    }}
                  >
                    <MonitorSmartphone size={18} color="#6b7280" />
                    {job.workplaceType || 'On-site'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#4b5563',
                      fontSize: '0.9rem',
                    }}
                  >
                    <CalendarDays size={18} color="#6b7280" />
                    Posted {daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago
                  </div>
                  {job.employmentType && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#4b5563',
                        fontSize: '0.9rem',
                      }}
                    >
                      <Briefcase size={18} color="#6b7280" />
                      {job.employmentType}
                    </div>
                  )}
                </div>

                {/* Skills Tags */}
                {job.skills?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      {job.skills.slice(0, 8).map((skill) => (
                        <span
                          key={skill}
                          style={{
                            background: '#f3f4f6',
                            color: '#374151',
                            padding: '4px 14px',
                            borderRadius: '16px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 8 && (
                        <span
                          style={{
                            background: '#f3f4f6',
                            color: '#6b7280',
                            padding: '4px 14px',
                            borderRadius: '16px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                          }}
                        >
                          +{job.skills.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Apply Card (Sticky) */}
              <div
                style={{
                  minWidth: '280px',
                  maxWidth: '340px',
                  width: '100%',
                  position: 'sticky',
                  top: '24px',
                  alignSelf: 'start',
                }}
              >
                <div
                  style={{
                    background: '#fafbfc',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #edf2f7',
                  }}
                >
                  {salary && (
                    <div
                      style={{
                        fontSize: '1.6rem',
                        fontWeight: '800',
                        color: '#059669',
                        marginBottom: '4px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {salary}
                    </div>
                  )}
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      margin: '0 0 20px 0',
                    }}
                  >
                    {job.salaryType || 'Full-time'}
                  </p>

                  {!application.success && (
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        htmlFor="coverLetter"
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Cover Letter <span style={{ fontWeight: '400', color: '#6b7280' }}>(optional)</span>
                      </label>
                      <textarea
                        id="coverLetter"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Tell the employer why you're a great fit..."
                        maxLength={10000}
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '12px 14px',
                          border: '1px solid #d1d5db',
                          borderRadius: '10px',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          outline: 'none',
                          background: '#fff',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#2557a7';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,87,167,0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          textAlign: 'right',
                          marginTop: '4px',
                        }}
                      >
                        {coverLetter.length}/10,000
                      </div>
                    </div>
                  )}

                  <button
                    onClick={applyWithJooblie}
                    disabled={application.loading || application.success}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '1rem',
                      border: 'none',
                      cursor: application.success ? 'default' : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.25s ease',
                      background: application.success
                        ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                        : 'linear-gradient(135deg, #2557a7, #1d4a8f)',
                      color: application.success ? '#065f46' : '#fff',
                      boxShadow: application.success
                        ? 'none'
                        : '0 4px 14px rgba(37,87,167,0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      if (!application.loading && !application.success) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,87,167,0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!application.loading && !application.success) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,87,167,0.3)';
                      }
                    }}
                  >
                    {application.success ? (
                      <>
                        <CheckCircle2 size={20} />
                        Applied Successfully
                      </>
                    ) : application.loading ? (
                      <>
                        <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Apply with Jooblie
                      </>
                    )}
                  </button>

                  {application.error && (
                    <p
                      style={{
                        color: '#dc2626',
                        fontSize: '0.85rem',
                        margin: '12px 0 0 0',
                        textAlign: 'center',
                      }}
                    >
                      {application.error}
                    </p>
                  )}

                  {/* Removed the success banner as requested */}

                  <div
                    style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #edf2f7',
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      onClick={() => setIsSaved(!isSaved)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: isSaved ? '#eef2f9' : '#fff',
                        color: isSaved ? '#2557a7' : '#4b5563',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSaved) {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSaved) {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <Bookmark size={16} fill={isSaved ? '#2557a7' : 'none'} />
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#4b5563',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <Share2 size={16} />
                      Share
                    </button>
                  </div>
                </div>

                {/* Company Mini Card - now with LinkedIn and website */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px 20px',
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #edf2f7',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #eef2f9, #e0e7f5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '1.2rem',
                        color: '#2557a7',
                        flexShrink: 0,
                      }}
                    >
                      {job.companyName?.charAt(0) || 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: '600',
                          color: '#111827',
                          fontSize: '0.95rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {job.companyName}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '2px',
                        }}
                      >
                        {job.companyWebsite && (
                          <a
                            href={job.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#2557a7',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Globe size={14} /> Website
                          </a>
                        )}
                        {job.companyLinkedin && (
                          <a
                            href={job.companyLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#0a66c2',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Linkedin size={14} /> LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Details Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '40px',
              border: '1px solid #f0f0f0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}
          >
            <h2
              style={{
                fontSize: '1.4rem',
                color: '#111827',
                margin: '0 0 8px 0',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Briefcase size={24} color="#2557a7" />
              Job Description
            </h2>
            <div
              style={{
                color: '#4b5563',
                lineHeight: '1.8',
                fontSize: '0.95rem',
              }}
            >
              {renderDescription(job.description)}
            </div>

            {/* Job Highlights */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid #f3f4f6',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
              }}
            >
              {job.employmentType && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                  }}
                >
                  <Briefcase size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>
                      Employment Type
                    </div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>
                      {job.employmentType}
                    </div>
                  </div>
                </div>
              )}
              {job.experienceLevel && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                  }}
                >
                  <Award size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>
                      Experience Level
                    </div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>
                      {job.experienceLevel}
                    </div>
                  </div>
                </div>
              )}
              {job.workplaceType && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                  }}
                >
                  <MonitorSmartphone size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>
                      Workplace Type
                    </div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>
                      {job.workplaceType}
                    </div>
                  </div>
                </div>
              )}
              {job.location && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                  }}
                >
                  <MapPin size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>
                      Location
                    </div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>
                      {job.location}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills Section */}
            {job.skills?.length > 0 && (
              <div
                style={{
                  marginTop: '32px',
                  paddingTop: '32px',
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.2rem',
                    color: '#111827',
                    margin: '0 0 16px 0',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Award size={22} color="#2557a7" />
                  Skills Required
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: 'linear-gradient(135deg, #f3f4f6, #eef2f9)',
                        color: '#1f2937',
                        padding: '8px 18px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Company Info Section - now with LinkedIn and website */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  color: '#111827',
                  margin: '0 0 16px 0',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Building2 size={22} color="#2557a7" />
                About {job.companyName}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Users size={18} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Company Size</div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>
                      {job.employeesCount || '11-50'}
                    </div>
                  </div>
                </div>

                {job.companyWebsite && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Globe size={18} color="#6b7280" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Website</div>
                      <a
                        href={job.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontWeight: '600',
                          color: '#2557a7',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Visit <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {job.companyLinkedin && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Linkedin size={18} color="#0a66c2" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>LinkedIn</div>
                      <a
                        href={job.companyLinkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontWeight: '600',
                          color: '#0a66c2',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Profile <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {job.companyEmail && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Mail size={18} color="#6b7280" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Email</div>
                      <a
                        href={`mailto:${job.companyEmail}`}
                        style={{
                          fontWeight: '600',
                          color: '#2557a7',
                          textDecoration: 'none',
                        }}
                      >
                        {job.companyEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Similar Jobs CTA */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8faff, #eef2f9)',
              borderRadius: '16px',
              padding: '32px 40px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h3
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '1.1rem',
                  color: '#111827',
                  fontWeight: '700',
                }}
              >
                <Eye size={20} style={{ display: 'inline', marginRight: '8px' }} />
                Looking for more opportunities?
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                Explore other jobs that match your skills.
              </p>
            </div>
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
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(37,87,167,0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4a8f';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,87,167,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2557a7';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,87,167,0.25)';
              }}
            >
              Browse All Jobs <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}