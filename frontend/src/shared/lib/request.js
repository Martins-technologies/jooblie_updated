import { extractErrorMessage } from './errors.js';

export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', requestId = null, details = null, retryAfter = null } = {}) {
    super(message); Object.assign(this, { name: 'ApiClientError', status, code, requestId, details, retryAfter });
  }
}
const aborted = () => new DOMException('Request cancelled.', 'AbortError');
export function createApiRequester({ baseUrl, siteSlug, getAccessToken, reportError = () => {}, fetchImpl = (...args) => fetch(...args), isOnline = () => globalThis.navigator?.onLine !== false }) {
  return async function request(path, options = {}) {
    const { method = 'GET', body, auth = false, accessToken, headers = {}, signal, notifyError = true, timeoutMs = 20000 } = options;
    const controller = new AbortController();
    let timedOut = false;
    let timer;
    const cancel = () => controller.abort();
    try {
      if (signal?.aborted) throw aborted();
      signal?.addEventListener('abort', cancel, { once: true });
      const requestHeaders = { Accept: 'application/json', 'X-Site-Slug': siteSlug, ...headers };
      if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
      if (auth) {
        const token = accessToken || await getAccessToken?.();
        if (!token) throw new ApiClientError('Authentication is required.', { status: 401, code: 'AUTH_REQUIRED' });
        requestHeaders.Authorization = `Bearer ${token}`;
      }
      if (signal?.aborted) throw aborted();
      let serialized;
      try { serialized = body === undefined ? undefined : JSON.stringify(body); }
      catch { throw new ApiClientError('The submitted data could not be read.', { code: 'INVALID_REQUEST' }); }
      if (timeoutMs > 0) timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      let response;
      try { response = await fetchImpl(`${baseUrl}${path}`, { method, headers: requestHeaders, body: serialized, signal: controller.signal }); }
      catch (error) {
        if (signal?.aborted || (!timedOut && error?.name === 'AbortError')) throw aborted();
        if (timedOut) throw new ApiClientError('Request timed out.', { status: 408, code: 'REQUEST_TIMEOUT' });
        throw new ApiClientError('The API could not be reached.', { code: isOnline() ? 'API_UNAVAILABLE' : 'OFFLINE' });
      }
      if (signal?.aborted) throw aborted();
      if (timedOut) throw new ApiClientError('Request timed out.', { status: 408, code: 'REQUEST_TIMEOUT' });
      if (response.ok && (response.status === 204 || response.status === 205 || method.toUpperCase() === 'HEAD')) return null;
      let raw;
      try { raw = await response.text(); }
      catch {
        if (signal?.aborted) throw aborted();
        if (timedOut) throw new ApiClientError('Request timed out.', { status: 408, code: 'REQUEST_TIMEOUT' });
        throw new ApiClientError('The response could not be read.', { code: 'INVALID_RESPONSE', status: response.status });
      }
      let payload = null;
      let validJson = false;
      try { payload = JSON.parse(raw); validJson = true; } catch { /* never show HTML proxy/server errors */ }
      if (signal?.aborted) throw aborted();
      const errorPayload = payload?.error;
      if (!response.ok || errorPayload) {
        const error = errorPayload && typeof errorPayload === 'object' ? errorPayload : {};
        const retryHeader = response.headers.get('retry-after');
        const retryAfter = retryHeader && (/^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.max(0, Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000)));
        throw new ApiClientError(error.message || (typeof errorPayload === 'string' ? errorPayload : 'The request could not be completed.'), {
          status: response.status, code: error.code || 'API_ERROR', requestId: error.requestId || response.headers.get('x-request-id'),
          details: error.details ?? null, retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
        });
      }
      if (!validJson || payload === null || typeof payload !== 'object') throw new ApiClientError('The server returned an unreadable response.', { code: 'INVALID_RESPONSE', status: response.status });
      return payload;
    } catch (error) {
      if (error instanceof ApiClientError) error.message = extractErrorMessage(error);
      if (notifyError && error?.name !== 'AbortError') { try { reportError(error, { form: options.form || null, method, path }); } catch { /* keep the original error */ } }
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}
