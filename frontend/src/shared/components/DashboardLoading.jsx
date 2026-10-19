import DashboardLayout from './DashboardLayout';
import SkeletonContent, { Skeleton } from './Skeleton';
import '../styles/skeleton.css';

const titles = {
  '/dashboard/admin': 'Network overview',
  '/dashboard/recruiter': 'Hiring overview',
  '/dashboard/job-seeker': 'Overview',
  '/admin/jobs': 'Job management',
  '/admin/moderation': 'Job review queue',
  '/admin/users': 'People & access',
  '/admin/companies': 'Company directory',
  '/admin/portals': 'Portal directory',
  '/admin/applications': 'Applications',
  '/admin/activity': 'Activity log',
  '/admin/security': 'Security events',
  '/my-jobs': 'Your opportunities',
  '/candidates': 'Candidates',
  '/post-job': 'Post a job',
  '/my-company': 'Company profile',
  '/settings': 'Account settings',
  '/dashboard/job-seeker/settings': 'Account settings',
  '/dashboard/job-seeker/profile': 'My profile',
  '/account/profile': 'My profile',
};

export default function DashboardLoading({ pathname = '', role }) {
  const resolvedRole = role || (
    pathname.startsWith('/admin') ? 'admin' :
    (pathname.startsWith('/dashboard/recruiter') || ['/my-jobs', '/candidates', '/post-job', '/my-company'].some(p => pathname.startsWith(p))) ? 'recruiter' :
    'job_seeker'
  );

  const title = titles[pathname] || (
    pathname.includes('applications') ? 'My applications' :
    pathname.includes('saved') ? 'Saved jobs' :
    pathname.includes('profile') ? 'My profile' :
    pathname.includes('jobs') ? 'Find jobs' :
    'Workspace'
  );

  const overview = /^\/dashboard\/(admin|recruiter|job-seeker)$/.test(pathname);
  const form = /settings|profile|my-company|post-job|hire-talent/.test(pathname);
  const cards = pathname === '/dashboard/job-seeker/jobs';
  const detail = /\/jobs\//.test(pathname) || /\/admin\/portals\//.test(pathname);
  const admin = resolvedRole === 'admin';

  return (
    <DashboardLayout title={title} overrideRole={resolvedRole}>
      <div className="content-api-loader fade-in" role="status" aria-busy="true">
        <span className="sr-only">Loading {title}...</span>
        
        <div className="content-api-loader__status" aria-hidden="true">
          <span className="content-api-loader__spinner" />
          <span className="content-api-loader__text">Loading latest data...</span>
        </div>

        {overview ? (
          <SkeletonContent variant={admin ? 'admin-dashboard' : 'dashboard'} metrics={resolvedRole === 'recruiter' ? 5 : 4} rows={4} label="" />
        ) : form ? (
          <div className="workspace-panel content-api-loader__panel">
            <SkeletonContent variant="form" rows={3} label="" />
          </div>
        ) : detail ? (
          <div className="workspace-panel content-api-loader__panel">
            <SkeletonContent variant="form" rows={2} label="" />
          </div>
        ) : cards ? (
          <SkeletonContent variant="cards" rows={6} label="" />
        ) : (
          <div className="workspace-panel content-api-loader__panel">
            <div className="content-api-loader__toolbar" aria-hidden="true">
              <Skeleton width="34%" height={38} />
              <Skeleton width={130} height={38} />
            </div>
            <SkeletonContent variant="table" rows={6} columns={admin ? 6 : 5} label="" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
