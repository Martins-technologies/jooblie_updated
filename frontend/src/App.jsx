import {lazy,Suspense} from 'react';
import PageLoading from './shared/components/PageLoading';
import RouteMetadata from './shared/components/RouteMetadata';
import WorkspaceAccountPage from './shared/pages/WorkspaceAccountPage';
import WorkspaceHelpPage from './shared/pages/WorkspaceHelpPage';
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import SiteLayout from './shared/components/SiteLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import GuestOnlyRoute from './shared/components/GuestOnlyRoute';
import RouteErrorBoundary from './shared/components/RouteErrorBoundary';

// --- Public Pages ---
const HomePage = lazy(()=>import('./public/pages/HomePage'));
const JobsPage = lazy(()=>import('./public/pages/JobsPage'));
const JobDetailPage = lazy(()=>import('./public/pages/JobDetailPage'));
const CategoriesPage = lazy(()=>import('./public/pages/CategoriesPage'));
const CompaniesPage = lazy(()=>import('./public/pages/CompaniesPage'));
const CompanyDetailPage = lazy(()=>import('./public/pages/CompanyDetailPage'));
const ResourcesPage = lazy(()=>import('./public/pages/ResourcesPage'));

// --- Auth Pages ---
import SignInPage from './public/pages/SignInPage';
import RegisterPage from './public/pages/RegisterPage';
import ForgotPasswordPage from './public/pages/ForgotPasswordPage';
import ResetPasswordPage from './public/pages/ResetPasswordPage';

// --- General Pages ---
const AboutPage = lazy(()=>import('./public/pages/AboutPage'));
const ContactPage = lazy(()=>import('./public/pages/ContactPage'));
const HelpPage = lazy(()=>import('./public/pages/HelpPage'));
const PrivacyPage = lazy(()=>import('./public/pages/PrivacyPage'));
const TermsPage = lazy(()=>import('./public/pages/TermsPage'));

// --- Dashboards ---
const JobSeekerDashboardPage = lazy(()=>import('./seeker/pages/JobSeekerDashboardPage'));
// Naye Job Seeker Pages ke Imports:
const JobSeekerJobsPage = lazy(()=>import('./seeker/pages/JobSeekerJobsPage'));
const JobSeekerApplicationsPage = lazy(()=>import('./seeker/pages/JobSeekerApplicationsPage'));
const JobSeekerSavedJobsPage = lazy(()=>import('./seeker/pages/JobSeekerSavedJobsPage'));
const JobSeekerProfilePage = lazy(()=>import('./seeker/pages/JobSeekerProfilePage'));
const JobSeekerSettingsPage = lazy(()=>import('./seeker/pages/JobSeekerSettingsPage'));
const JobSeekerJobDetailPage = lazy(()=>import('./seeker/pages/JobSeekerJobDetailPage'));

const RecruiterDashboardPage = lazy(()=>import('./recruiter/pages/RecruiterDashboardPage'));
const AdminDashboardPage = lazy(()=>import('./admin/pages/AdminDashboardPage'));

// --- Recruiter Sub-Pages ---
const PostJobPage = lazy(()=>import('./recruiter/pages/PostJobPage'));
const MyJobsPage = lazy(()=>import('./recruiter/pages/MyJobsPage'));
const CandidatesPage = lazy(()=>import('./recruiter/pages/CandidatesPage'));
const CompanyProfilePage = lazy(()=>import('./recruiter/pages/CompanyProfilePage'));
const SettingsPage = lazy(()=>import('./recruiter/pages/SettingsPage'));

// --- Naye Admin Sub-Pages Imports ---
const AdminModerationPage = lazy(()=>import('./admin/pages/AdminModerationPage'));
const AdminUsersPage = lazy(()=>import('./admin/pages/AdminUsersPage'));
const AdminActivityPage = lazy(()=>import('./admin/pages/AdminActivityPage'));
const AdminDirectoryPage = lazy(()=>import('./admin/pages/AdminDirectoryPage'));
const AdminPortalDetailPage = lazy(()=>import('./admin/pages/AdminPortalDetailPage'));

const NotFoundPage = lazy(()=>import('./public/pages/NotFoundPage'));

export default function App() {
  return (
    <RouteErrorBoundary>
    <><RouteMetadata/><Suspense fallback={<PageLoading standalone />}><Routes>

      {/* =====================================================
          AUTH PAGES (STANDALONE - NO NAVBAR)
          🔥 YAHAN FIX HAI: Auth pages ko SiteLayout se bahar nikal diya hai!
      ====================================================== */}
      <Route path="sign-in" element={<GuestOnlyRoute><SignInPage /></GuestOnlyRoute>} />
      <Route path="login" element={<GuestOnlyRoute><SignInPage /></GuestOnlyRoute>} />
      <Route path="register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
      <Route path="forgot-password" element={<GuestOnlyRoute><ForgotPasswordPage /></GuestOnlyRoute>} />
      <Route path="reset-password" element={<ResetPasswordPage />} />


      {/* =====================================================
          PUBLIC WEBSITE
          Sirf public pages SiteLayout ke andar hain.
          Yahan Header + Footer aayega.
      ====================================================== */}
      <Route element={<SiteLayout />}>
        {/* HOME */}
        <Route index element={<HomePage />} />

        {/* JOBS */}
        <Route path="jobs" element={<JobsPage recentOnly />} />
        <Route path="all-jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />

        {/* CATEGORIES */}
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:categorySlug" element={<JobsPage />} />

        {/* COMPANIES */}
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:companyId" element={<CompanyDetailPage />} />

        {/* RESOURCES */}
        <Route path="resources" element={<ResourcesPage />} />

        {/* GENERAL PAGES */}
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="privacy-policy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Route>


      {/* =====================================================
          JOB SEEKER DASHBOARD & PAGES
      ====================================================== */}
      <Route
        path="dashboard/job-seeker"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/jobs"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/jobs/:jobId"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerJobDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/applications"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/saved"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerSavedJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/profile"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/job-seeker/settings"
        element={
          <ProtectedRoute roles={['job_seeker']}>
            <JobSeekerSettingsPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          RECRUITER DASHBOARD & PAGES
      ====================================================== */}
      
      {/* Main Dashboard Overview */}
      <Route
        path="dashboard/recruiter"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <RecruiterDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* My Jobs Page */}
      <Route
        path="my-jobs"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <MyJobsPage />
          </ProtectedRoute>
        }
      />

      {/* Candidates Page */}
      <Route
        path="candidates"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <CandidatesPage />
          </ProtectedRoute>
        }
      />

      {/* Company Profile Page */}
      <Route
        path="my-company"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <CompanyProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Post a Job Page */}
      <Route
        path="post-job"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <PostJobPage />
          </ProtectedRoute>
        }
      />

      <Route path="account/profile" element={<ProtectedRoute roles={['admin','recruiter','job_seeker']}><WorkspaceAccountPage/></ProtectedRoute>}/>
      <Route path="account/help" element={<ProtectedRoute roles={['admin','recruiter','job_seeker']}><WorkspaceHelpPage/></ProtectedRoute>}/>
      {/* Settings Page */}
      <Route
        path="settings"
        element={
          <ProtectedRoute roles={['recruiter', 'admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          ADMIN DASHBOARD & PAGES
      ====================================================== */}
      <Route
        path="dashboard/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="admin/jobs"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminModerationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="admin/portals/:slug"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminPortalDetailPage />
          </ProtectedRoute>
        }
      />

      {['portals','companies','applications','security'].map(type => <Route key={type} path={`admin/${type}`} element={<ProtectedRoute roles={['admin']}><AdminDirectoryPage type={type==='security'?'security-events':type}/></ProtectedRoute>}/>)}
      {/* Admin Moderation Page */}
      <Route
        path="admin/moderation"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminModerationPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Users Management Page */}
      <Route
        path="admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      {/* Admin System & Activity Page */}
      <Route
        path="admin/activity"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminActivityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="hire-talent"
        element={
          <ProtectedRoute roles={['recruiter']}>
            <PostJobPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          DASHBOARD & WORKSPACE URL REDIRECTS
      ====================================================== */}
      <Route
        path="dashboard"
        element={<Navigate to="/dashboard/job-seeker" replace />}
      />
      <Route
        path="workspace"
        element={<Navigate to="/dashboard" replace />}
      />


      {/* =====================================================
          404 NOT FOUND
      ====================================================== */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes></Suspense></>
    </RouteErrorBoundary>
  );
}
