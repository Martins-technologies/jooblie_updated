import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import SiteLayout from './components/SiteLayout';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import ResourcesPage from './pages/ResourcesPage';

import PostJobPage from './pages/PostJobPage';

import SignInPage from './pages/SignInPage';
import RegisterPage from './pages/RegisterPage';

import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

import JobSeekerDashboardPage from './pages/JobSeekerDashboardPage';
import RecruiterDashboardPage from './pages/RecruiterDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import NotFoundPage from './pages/NotFoundPage';


export default function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC WEBSITE

          Sirf public pages SiteLayout ke andar hain.
          Yahan Header + Footer aayega.
      ====================================================== */}

      <Route element={<SiteLayout />}>

        {/* HOME */}
        <Route
          index
          element={<HomePage />}
        />


        {/* =================================================
            JOBS
        ================================================== */}

        <Route
          path="jobs"
          element={<JobsPage />}
        />

        <Route
          path="jobs/:jobId"
          element={<JobDetailPage />}
        />


        {/* =================================================
            CATEGORIES
        ================================================== */}

        <Route
          path="categories"
          element={<CategoriesPage />}
        />

        <Route
          path="categories/:categorySlug"
          element={<JobsPage />}
        />


        {/* =================================================
            COMPANIES
        ================================================== */}

        <Route
          path="companies"
          element={<CompaniesPage />}
        />

        <Route
          path="companies/:companyId"
          element={<CompanyDetailPage />}
        />


        {/* =================================================
            RESOURCES
        ================================================== */}

        <Route
          path="resources"
          element={<ResourcesPage />}
        />


        {/* =================================================
            AUTH
        ================================================== */}

        <Route
          path="sign-in"
          element={<SignInPage />}
        />

        <Route
          path="register"
          element={<RegisterPage />}
        />


        {/* =================================================
            GENERAL PAGES
        ================================================== */}

        <Route
          path="about"
          element={<AboutPage />}
        />

        <Route
          path="contact"
          element={<ContactPage />}
        />

        <Route
          path="help"
          element={<HelpPage />}
        />

        <Route
          path="privacy"
          element={<PrivacyPage />}
        />

        <Route
          path="terms"
          element={<TermsPage />}
        />

      </Route>


      {/* =====================================================
          JOB SEEKER DASHBOARD

          IMPORTANT:
          SiteLayout ke BAHAR hai.

          /* ka matlab:
          /dashboard/job-seeker
          /dashboard/job-seeker/jobs
          /dashboard/job-seeker/applications
          /dashboard/job-seeker/saved
          /dashboard/job-seeker/profile
          /dashboard/job-seeker/settings

          sab isi component mein handle honge.
      ====================================================== */}

      <Route
        path="dashboard/job-seeker/*"
        element={
          <ProtectedRoute
            roles={['job_seeker']}
          >
            <JobSeekerDashboardPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          RECRUITER DASHBOARD
      ====================================================== */}

      <Route
        path="dashboard/recruiter"
        element={
          <ProtectedRoute
            roles={['recruiter']}
          >
            <RecruiterDashboardPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          ADMIN DASHBOARD
      ====================================================== */}

      <Route
        path="dashboard/admin"
        element={
          <ProtectedRoute
            roles={['admin']}
          >
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          POST JOB

          Public SiteLayout se bahar rakha hai taake
          recruiter workspace clean rahe.
      ====================================================== */}

      <Route
        path="post-job"
        element={
          <ProtectedRoute
            roles={[
              'recruiter',
              'admin',
            ]}
          >
            <PostJobPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="hire-talent"
        element={
          <ProtectedRoute
            roles={[
              'recruiter',
              'admin',
            ]}
          >
            <PostJobPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          OLD /dashboard URL

          Agar koi sirf /dashboard open kare to
          ab 404 ki jagah safe redirect.
      ====================================================== */}

      <Route
        path="dashboard"
        element={
          <Navigate
            to="/dashboard/job-seeker"
            replace
          />
        }
      />


      {/* =====================================================
          404

          Sabse end mein rehna chahiye.
      ====================================================== */}

      <Route
        path="*"
        element={<NotFoundPage />}
      />

    </Routes>
  );
}