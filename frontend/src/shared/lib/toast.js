import { toast } from 'react-toastify';

/**
 * Extracts a clear, user-friendly error message from various error types
 * (ApiClientError, Supabase error, Error instance, or plain string).
 */
export function extractErrorMessage(error, defaultMessage = 'An unexpected error occurred. Please try again.') {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;

  const code = error?.code || error?.error?.code;
  const message = error?.message || error?.error?.message;

  if (code === 'EMAIL_ALREADY_REGISTERED' || (message && /already exists|already registered/i.test(message))) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'SIGN_IN_FAILED' || (message && /invalid login credentials|invalid email or password/i.test(message))) {
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }
  if (code === 'AUTH_REQUIRED') {
    return 'Your session has expired. Please sign in again to continue.';
  }
  if (code === 'SIGN_UP_RATE_LIMITED' || (message && /rate limit/i.test(message))) {
    return 'Too many attempts. Please wait a few moments and try again.';
  }
  if (code === 'API_UNAVAILABLE' || (message && /failed to fetch|network error|could not be reached/i.test(message))) {
    return 'Unable to reach the Jooblie server. Please check your internet connection.';
  }

  return message || defaultMessage;
}

/**
 * Shows an error toast notification with intelligent message extraction.
 */
export function showErrorToast(error, defaultMessage) {
  const msg = extractErrorMessage(error, defaultMessage);
  return toast.error(msg, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
}

/**
 * Shows a success toast notification.
 */
export function showSuccessToast(message, options = {}) {
  return toast.success(message, {
    position: 'top-right',
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
}

/**
 * Shows an informative toast notification.
 */
export function showInfoToast(message, options = {}) {
  return toast.info(message, {
    position: 'top-right',
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
}

/**
 * Shows a warning toast notification.
 */
export function showWarningToast(message, options = {}) {
  return toast.warning(message, {
    position: 'top-right',
    autoClose: 4500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
}

export { toast };
