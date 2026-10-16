import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolvePortalConfig } from './src/shared/config/portalConfig.js';

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export default defineConfig(({ command, mode }) => {
  const portal = resolvePortalConfig({ ...loadEnv(mode, process.cwd(), 'VITE_'), PROD: command === 'build' });
  return {
    plugins: [react(), {
      name: 'portal-metadata',
      transformIndexHtml: (html) => html
        .replace(/<title>.*?<\/title>/, () => `<title>${escapeHtml(portal.name)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, (_, before, after) => `${before}${escapeHtml(portal.description)}${after}`),
    }],
    server: { port: 5173 },
  };
});
