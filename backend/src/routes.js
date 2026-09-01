import { Router } from 'express';
import { authLimiter, writeLimiter } from './middleware/security.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { siteContext } from './middleware/siteContext.js';
import { validate } from './middleware/validate.js';
import {
  applicationSchema,
  applicationStatusSchema,
  profileSchema,
  companySchema,
  jobCreateSchema,
  jobUpdateSchema,
  adminJobStatusSchema,
  adminRoleSchema,
  authSignInSchema,
  authSignUpSchema,
} from './schemas.js';
import * as publicController from './controllers/public.controller.js';
import * as authController from './controllers/auth.controller.js';
import * as seekerController from './controllers/jobSeeker.controller.js';
import * as recruiterController from './controllers/recruiter.controller.js';
import * as adminController from './controllers/admin.controller.js';
import { publicDb } from './config/supabase.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'jooblie-shared-backend',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res, next) => {
  try {
    const { error } = await publicDb.from('sites').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw error;
    res.json({ ok: true, database: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

const publicRouter = Router();
publicRouter.use(siteContext);
publicRouter.get('/dataset', publicController.getDataset);
publicRouter.get('/jobs', publicController.listJobs);
publicRouter.get('/jobs/:jobId', publicController.getJob);
publicRouter.get('/companies', publicController.listCompanies);
publicRouter.get('/companies/:companyId', publicController.getCompany);
publicRouter.get('/categories', publicController.listCategories);
router.use('/public', publicRouter);

router.post('/auth/sign-in', authLimiter, siteContext, validate(authSignInSchema), authController.signIn);
router.post('/auth/sign-up', authLimiter, siteContext, validate(authSignUpSchema), authController.signUp);
router.get('/auth/me', requireAuth, authController.me);
router.patch('/auth/profile', requireAuth, writeLimiter, validate(profileSchema), authController.updateProfile);

const seeker = Router();
seeker.use(requireAuth, requireRole('job_seeker'));
seeker.use(siteContext);
seeker.get('/dashboard', seekerController.dashboard);
seeker.get('/recommended-jobs', seekerController.recommendedJobs);
seeker.post('/jobs/:jobId/save', writeLimiter, seekerController.saveJob);
seeker.delete('/jobs/:jobId/save', writeLimiter, seekerController.unsaveJob);
seeker.post('/jobs/:jobId/apply', writeLimiter, validate(applicationSchema), seekerController.applyToJob);
router.use('/job-seeker', seeker);

const recruiter = Router();
recruiter.use(requireAuth, requireRole('recruiter', 'admin'));
recruiter.use(siteContext);
recruiter.get('/dashboard', recruiterController.dashboard);
recruiter.get('/companies', recruiterController.listCompanies);
recruiter.post('/companies', writeLimiter, validate(companySchema), recruiterController.createCompany);
recruiter.post('/jobs', writeLimiter, validate(jobCreateSchema), recruiterController.createJob);
recruiter.patch('/jobs/:jobId', writeLimiter, validate(jobUpdateSchema), recruiterController.updateJob);
recruiter.get('/jobs/:jobId/applications', recruiterController.listApplications);
recruiter.patch('/applications/:applicationId', writeLimiter, validate(applicationStatusSchema), recruiterController.updateApplication);
router.use('/recruiter', recruiter);

const admin = Router();
admin.use(requireAuth, requireRole('admin'));
admin.get('/dashboard', adminController.dashboard);
admin.get('/users', adminController.listUsers);
admin.patch('/users/:userId/role', writeLimiter, validate(adminRoleSchema), adminController.changeUserRole);
admin.patch('/jobs/:jobId/status', writeLimiter, validate(adminJobStatusSchema), adminController.moderateJob);
admin.get('/audit-logs', adminController.listAuditLogs);
admin.get('/security-events', adminController.listSecurityEvents);
router.use('/admin', admin);

export default router;
