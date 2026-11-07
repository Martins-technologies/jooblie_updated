import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolvePortalConfig } from './src/shared/config/portalConfig.js';

const publicEnvironment = [
  'VITE_ABORIGINAL_URL', 'VITE_API_BASE_URL', 'VITE_FARMERFREIGHT_URL',
  'VITE_HEALTH_CARE_URL', 'VITE_IT_JOBS_URL', 'VITE_NEWCOMERS_URL', 'VITE_OFFICE_JOBS_URL',
  'VITE_PORTAL_AGRICULTURE_URL', 'VITE_PORTAL_IT_SOFTWARE_URL', 'VITE_PORTAL_OFFICE_ADMIN_URL',
  'VITE_PORTAL_RESTAURANT_URL', 'VITE_PORTAL_TRUCKING_URL', 'VITE_PUBLIC_SITE_URL',
  'VITE_SERVICE_CARE_URL', 'VITE_SITE_NAME', 'VITE_SITE_SLUG', 'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL', 'VITE_SUPPORT_EMAIL',
];

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export default defineConfig(({ command, mode }) => {
  const portal = resolvePortalConfig({ ...loadEnv(mode, process.cwd(), 'VITE_'), PROD: command === 'build' });
  return {
    envPrefix: publicEnvironment,
    plugins: [react(), {
      name: 'portal-metadata',
      transformIndexHtml: (html) => html
        .replace(/<title>.*?<\/title>/, () => `<title>${escapeHtml(portal.name)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, (_, before, after) => `${before}${escapeHtml(portal.description)}${after}`),
    }],
    server: { port: 5173 },
  };
});

