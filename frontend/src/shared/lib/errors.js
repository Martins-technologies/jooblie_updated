export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const labels = {
  registration_number: 'Registration / tax number', company_registration_number: 'Registration / tax number',
  name: 'Name', company_name: 'Company name', website: 'Website', company_website: 'Company website',
  full_name: 'Full name', email: 'Email', password: 'Password', category_id: 'Category',
  salary_min: 'Minimum salary', salary_max: 'Maximum salary', resume_path: 'Resume',
  title: 'Title', description: 'Description', employment_type: 'Employment type',
};
export function fieldLabel(field) {
  return labels[field] || String(field).replace(/[_.[\]]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().replace(/^./, c => c.toUpperCase());
}
function text(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  return /<!doctype|<html|\bat\s+\S+\s*\([^)]*:\d+:\d+\)/i.test(cleaned) ? '' : cleaned.slice(0, 600);
}
function validationText(value) {
  const message = text(value);
  let match = message.match(/String must contain at least (\d+) character/);
  if (match) return `Use at least ${match[1]} characters.`;
  match = message.match(/String must contain at most (\d+) character/);
  if (match) return `Use no more than ${match[1]} characters.`;
  if (/^Required$|^Invalid input: expected/i.test(message)) return 'This field is required.';
  if (/^Invalid url$/i.test(message)) return 'Enter a valid website URL.';
  if (/^Invalid email$/i.test(message)) return 'Enter a valid email address.';
  return message;
}
function messagesOf(value) { return [...new Set((Array.isArray(value) ? value : [value]).map(validationText).filter(Boolean))]; }
export function isAbortError(error) { return error?.name === 'AbortError' || error?.code === 'REQUEST_ABORTED' || error?.aborted === true; }
export function normalizeError(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const outer = error && typeof error === 'object' ? error : {};
  const source = outer.error && typeof outer.error === 'object' ? outer.error : outer.response?.data?.error || outer;
  const code = text(source.code || outer.code) || 'UNKNOWN_ERROR';
  const status = Number(outer.status || outer.statusCode || outer.response?.status || source.status || source.statusCode) || 0;
  const details = source.details ?? outer.details;
  const rawMessage = text(typeof error === 'string' ? error : source.message || (typeof outer.error === 'string' ? outer.error : ''));
  const fieldErrors = {};
  const rawFields = details?.fieldErrors || source.fieldErrors || {};
  if (rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
    Object.entries(rawFields).forEach(([field, values]) => {
      const messages = messagesOf(values);
      if (messages.length && !['__proto__', 'constructor', 'prototype'].includes(field)) fieldErrors[field] = messages;
    });
  }
  const messages = [...messagesOf(details?.formErrors || []), ...Object.entries(fieldErrors).flatMap(([field, values]) => values.map(value => `${fieldLabel(field)}: ${value}`))];
  let title = 'Unable to complete request';
  let message = rawMessage || text(fallback) || DEFAULT_ERROR_MESSAGE;
  const businessText = `${rawMessage} ${typeof details === 'string' ? details : ''}`;
  if (/company name cannot be changed|company_name_immutable/i.test(businessText)) {
    title = 'Company name is locked';
    message = 'Company name cannot be changed after creation. You can update the other company details.';
    fieldErrors.name = ['Company name cannot be changed after creation.'];
  } else if (code === 'VALIDATION_ERROR' || messages.length) {
    title = 'Check your details'; message = messages.length ? 'Review the highlighted details and try again.' : 'Check the submitted fields and try again.';
  } else if (code === 'SIGN_IN_FAILED' || /invalid login credentials|invalid email or password|invalid_credentials/i.test(businessText)) {
    title = 'Sign-in unsuccessful'; message = 'Incorrect email or password. Check your details and try again.';
  } else if (['AUTH_REQUIRED', 'INVALID_SESSION', 'SESSION_EXPIRED'].includes(code) || status === 401) {
    title = 'Please sign in again'; message = 'Your session has expired. Sign in again to continue.';
  } else if (code === 'EMAIL_ALREADY_REGISTERED' || /email.*already.*registered|user already registered|account.*already exists/i.test(businessText)) {
    message = 'An account with this email already exists. Please sign in instead.';
  } else if (status === 429 || /RATE_LIMIT|over_.*rate_limit/i.test(code) || /rate limit/i.test(rawMessage)) {
    title = 'Please wait a moment'; message = 'Too many requests. Wait a moment before trying again.';
  } else if (code === 'REQUEST_TIMEOUT' || [408, 504].includes(status)) {
    title = 'Request timed out'; message = 'The server took too long to respond. Check whether your changes were saved before trying again.';
  } else if (code === 'OFFLINE') {
    title = 'You are offline'; message = 'Reconnect to the internet, then try again.';
  } else if (code === 'API_UNAVAILABLE' || /failed to fetch|network error|could not be reached/i.test(rawMessage)) {
    title = 'Connection problem'; message = 'Unable to reach the server. Check your connection and try again.';
  } else if (status === 413) {
    title = 'File is too large'; message = 'Choose a smaller file within the size limit shown on the form.';
  } else if (status === 415) {
    title = 'Unsupported file'; message = 'Choose one of the file types accepted by this form.';
  } else if (status === 403) {
    title = 'Action not allowed'; message = 'You do not have permission to perform this action.';
  } else if (status === 404) {
    title = 'No longer available'; message = 'This item could not be found. Refresh the page and try again.';
  } else if (status === 409) {
    title = 'Changes need a refresh'; message = /duplicate key|SQLSTATE|violates/i.test(rawMessage) ? 'This item changed or already exists. Refresh before trying again.' : rawMessage || 'This item changed or already exists. Refresh before trying again.';
  } else if (code === 'INVALID_RESPONSE') {
    title = 'Unexpected server response'; message = 'The server returned an unreadable response. Please try again.';
  } else if (status >= 500) {
    title = 'Service temporarily unavailable'; message = 'We could not complete this request. Please try again shortly.';
  } else if (/SALARY_RANGE_INVALID/.test(businessText)) {
    message = 'Maximum salary must be greater than or equal to minimum salary.';
  } else if (/SITE_CATEGORY_MISMATCH/.test(businessText)) {
    message = 'Choose a category supported by this portal.';
  } else if (/AUDIENCE_SITE_INVALID/.test(businessText)) {
    message = 'One of the selected audience portals is unavailable. Update your selection and try again.';
  } else if (/JOB_FORBIDDEN|COMPANY_FORBIDDEN|ACTOR_INACTIVE/.test(businessText)) {
    message = 'This action is not available for your account or company.';
  } else if (/violates|SQLSTATE|duplicate key|foreign key|\bselect\b.+\bfrom\b|^[A-Z][A-Z_]{5,}$|permission denied for/i.test(message)) {
    message = text(fallback) || DEFAULT_ERROR_MESSAGE;
  }
  if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError) message = text(fallback) || DEFAULT_ERROR_MESSAGE;
  return { title, message, messages, fieldErrors, code, status, requestId: text(source.requestId || outer.requestId), retryAfter: outer.retryAfter ?? source.retryAfter ?? null, aborted: isAbortError(error) };
}
export function extractErrorMessage(error, fallback) { const result = normalizeError(error, fallback); return result.messages.length ? result.messages.join(' ').slice(0, 1200) : result.message; }
export function getFieldErrors(error) { return normalizeError(error).fieldErrors; }
