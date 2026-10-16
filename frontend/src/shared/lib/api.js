import { supabase } from './supabase';
import { SITE_SLUG } from '../config/site';
import { createApiRequester } from './request.js';
import { showErrorToast } from './toast';
import { getSubmittedForm } from './formValidation.js';
export { ApiClientError } from './request.js';

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000/api/v1';
export const API_BASE_URL = rawBase.replace(/\/+$/, '');

const request = createApiRequester({
  baseUrl: API_BASE_URL,
  siteSlug: SITE_SLUG,
  getAccessToken: async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.access_token || null;
  },
  reportError: (error, context) => showErrorToast(error, undefined, { form: context.form }),
});

export function apiRequest(path, options = {}) {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase());
  return request(path, { ...options, form: options.form || (mutation ? getSubmittedForm() : null) });
}
