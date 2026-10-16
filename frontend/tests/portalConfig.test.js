import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePortalConfig } from '../src/shared/config/portalConfig.js';

test('each configured specialty portal has its own display name', () => {
  assert.equal(resolvePortalConfig({ VITE_SITE_SLUG: 'aboriginal' }).name, 'Aboriginal Jobline');
  assert.equal(resolvePortalConfig({ VITE_SITE_SLUG: 'it-jobs' }).name, 'IT Jobs Jobline');
  assert.equal(resolvePortalConfig({}).name, 'Jooblie');
});

test('production requires explicit slug and API endpoint instead of silently selecting Jooblie', () => {
  assert.throws(() => resolvePortalConfig({ PROD: true }), /VITE_SITE_SLUG/);
  assert.throws(() => resolvePortalConfig({ PROD: true, VITE_SITE_SLUG: 'it-jobs' }), /VITE_API_BASE_URL/);
  assert.throws(() => resolvePortalConfig({ VITE_SITE_SLUG: 'IT Jobs' }), /canonical lowercase/);
  assert.throws(() => resolvePortalConfig({ VITE_API_BASE_URL: 'javascript:alert(1)' }), /HTTP or HTTPS/);
});

test('custom slugs require a display name and accept a valid shared API URL', () => {
  assert.throws(() => resolvePortalConfig({ VITE_SITE_SLUG: 'new-portal' }), /VITE_SITE_NAME/);
  const config = resolvePortalConfig({ PROD: true, VITE_SITE_SLUG: 'new-portal', VITE_SITE_NAME: 'New Portal', VITE_API_BASE_URL: 'https://api.example.test/api/v1' });
  assert.equal(config.name, 'New Portal');
});
