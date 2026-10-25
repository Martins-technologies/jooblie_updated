import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safePortalWebsite } from '../src/admin/utils/presentation.js';

test('portal links reject placeholder domains and preserve configured public destinations', () => {
  for (const value of ['', null, 'it.placeholder.jooblie.com', 'placeholder.jooblie.com', 'https://fake.invalid', 'javascript:alert(1)', 'https://user:pass@example.com']) assert.equal(safePortalWebsite(value), null);
  assert.equal(safePortalWebsite('https://office-jobline.vercel.app'), 'https://office-jobline.vercel.app/');
  assert.equal(safePortalWebsite('www.jooblie.com'), 'https://www.jooblie.com/');
});
