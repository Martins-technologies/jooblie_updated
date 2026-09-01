import { supabase } from './supabase';
import { SITE_SLUG } from '../config/site';

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000/api/v1';
export const API_BASE_URL = rawBase.replace(/\/+$/, '');

export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', requestId = null, details = null } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

async function accessTokenFromSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = false,
    accessToken = null,
    headers = {},
    signal,
  } = options;

  const requestHeaders = {
    Accept: 'application/json',
    'X-Site-Slug': SITE_SLUG,
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = accessToken || await accessTokenFromSession();
    if (!token) {
      throw new ApiClientError('Authentication is required.', {
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    }
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiClientError('The Jooblie API could not be reached.', {
      code: 'API_UNAVAILABLE',
    });
  }

  const requestId = response.headers.get('x-request-id');
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message || 'The request could not be completed.',
      {
        status: response.status,
        code: payload?.error?.code || 'API_ERROR',
        requestId: payload?.error?.requestId || requestId,
        details: payload?.error?.details || null,
      },
    );
  }

  if (response.status === 204) return null;
  return payload;
}
