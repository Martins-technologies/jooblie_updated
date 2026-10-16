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
import HomePage from './public/pages/HomePage';
import JobsPage from './public/pages/JobsPage';
import JobDetailPage from './public/pages/JobDetailPage';
import CategoriesPage from './public/pages/CategoriesPage';
import CompaniesPage from './public/pages/CompaniesPage';
import CompanyDetailPage from './public/pages/CompanyDetailPage';
import ResourcesPage from './public/pages/ResourcesPage';

// --- Auth Pages ---
import SignInPage from './public/pages/SignInPage';
import RegisterPage from './public/pages/RegisterPage';
import ForgotPasswordPage from './public/pages/ForgotPasswordPage';
import ResetPasswordPage from './public/pages/ResetPasswordPage';

// --- General Pages ---
import AboutPage from './public/pages/AboutPage';
import ContactPage from './public/pages/ContactPage';
import HelpPage from './public/pages/HelpPage';
import PrivacyPage from './public/pages/PrivacyPage';
import TermsPage from './public/pages/TermsPage';

// --- Dashboards ---
import JobSeekerDashboardPage from './seeker/pages/JobSeekerDashboardPage';
// Naye Job Seeker Pages ke Imports:
import JobSeekerJobsPage from './seeker/pages/JobSeekerJobsPage';
import JobSeekerApplicationsPage from './seeker/pages/JobSeekerApplicationsPage';
import JobSeekerSavedJobsPage from './seeker/pages/JobSeekerSavedJobsPage';
import JobSeekerProfilePage from './seeker/pages/JobSeekerProfilePage';
import JobSeekerSettingsPage from './seeker/pages/JobSeekerSettingsPage';
import JobSeekerJobDetailPage from './seeker/pages/JobSeekerJobDetailPage';

import RecruiterDashboardPage from './recruiter/pages/RecruiterDashboardPage';
import AdminDashboardPage from './admin/pages/AdminDashboardPage';

// --- Recruiter Sub-Pages ---
import PostJobPage from './recruiter/pages/PostJobPage';
import MyJobsPage from './recruiter/pages/MyJobsPage';
import CandidatesPage from './recruiter/pages/CandidatesPage';
import CompanyProfilePage from './recruiter/pages/CompanyProfilePage';
import SettingsPage from './recruiter/pages/SettingsPage';

// --- Naye Admin Sub-Pages Imports ---
import AdminModerationPage from './admin/pages/AdminModerationPage';
import AdminUsersPage from './admin/pages/AdminUsersPage';
import AdminActivityPage from './admin/pages/AdminActivityPage';
import AdminDirectoryPage from './admin/pages/AdminDirectoryPage';
import AdminPortalDetailPage from './admin/pages/AdminPortalDetailPage';

import NotFoundPage from './public/pages/NotFoundPage';

export default function App() {
  return (
    <RouteErrorBoundary>
    <Routes>

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
          OLD /dashboard URL REDIRECT
      ====================================================== */}
      <Route
        path="dashboard"
        element={<Navigate to="/dashboard/job-seeker" replace />}
      />


      {/* =====================================================
          404 NOT FOUND
      ====================================================== */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
    </RouteErrorBoundary>
  );
}
