import { createElement } from 'react';
import { toast } from 'react-toastify';
import ToastContent from '../components/ToastContent';
import { normalizeError, isAbortError } from './errors.js';
import { applyFormErrors, getSubmittedForm } from './formValidation.js';
export { extractErrorMessage } from './errors.js';

const reported = new WeakSet();
const recent = new Map();
const NOTICE_ID = 'app-notification';

function notice(type, content, options = {}) {
  const key = `${type}:${content.title}:${content.message}:${(content.messages || []).join('|')}`;
  const now = Date.now();
  for (const [id, time] of recent) if (now - time > 2000) recent.delete(id);
  if (recent.has(key)) return NOTICE_ID;
  recent.set(key, now);
  const settings = {
    toastId: NOTICE_ID,
    autoClose: type === 'error' ? 4500 : 2600,
    role: type === 'error' || type === 'warning' ? 'alert' : 'status',
    ariaLabel: content.message,
    ...options,
  };
  const render = createElement(ToastContent, content);
  toast.clearWaitingQueue();
  if (toast.isActive(NOTICE_ID)) {
    toast.update(NOTICE_ID, { ...settings, render, type });
    return NOTICE_ID;
  }
  return toast[type](render, settings);
}

/**
 * API and local catches can report the same failure safely without duplicate notices.
 */
export function showErrorToast(error, defaultMessage, options = {}) {
  if (isAbortError(error)) return null;
  if (error && typeof error === 'object') {
    if (reported.has(error)) return null;
    reported.add(error);
  }
  const content = normalizeError(error, defaultMessage);
  if (Object.keys(content.fieldErrors).length && applyFormErrors(options.form || getSubmittedForm(), error)) return null;
  // A notice is only a short fallback; individual validation messages belong at the inputs.
  if (content.code === 'VALIDATION_ERROR' || content.messages.length) content.message = 'Please review the form details.';
  if (content.retryAfter > 0) content.message = `Too many requests. Try again in ${Math.ceil(content.retryAfter)} seconds.`;
  return notice('error', content, options);
}

/**
 * Shows a success toast notification.
 */
export function showSuccessToast(message, options = {}) {
  return notice('success', { title: 'All done', message }, options);
}

/**
 * Shows an informative toast notification.
 */
export function showInfoToast(message, options = {}) {
  return notice('info', { title: 'Good to know', message }, options);
}

/**
 * Shows a warning toast notification.
 */
export function showWarningToast(message, options = {}) {
  return notice('warning', { title: 'Please check', message }, options);
}

export { toast };
