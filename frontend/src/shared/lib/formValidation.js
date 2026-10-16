import { getFieldErrors } from './errors.js';

const fieldStates = new WeakMap();
const wrapperSelector = '.app-select, .job-field-control, .jb-control-wrap, .input-wrapper, .password-input-wrapper';
let nextErrorId = 0;
let submittedForm = null;
let submittedAt = 0;

function isControl(field) {
  return field && /^(INPUT|SELECT|TEXTAREA)$/.test(field.tagName || '');
}

/** Native constraints also apply to values set by React or loaded from the API. */
export function getFieldValidationMessage(field) {
  if (!isControl(field) || field.disabled || field.readOnly || field.willValidate === false || field.getAttribute?.('data-skip-validation') === 'true') return '';
  const value = String(field.value ?? '');
  const trimmed = value.trim();
  const validity = field.validity || {};
  const type = String(field.type || '').toLowerCase();
  const password = type === 'password' || /password/i.test(`${field.name || ''} ${field.id || ''} ${field.autocomplete || field.getAttribute?.('autocomplete') || ''}`);
  const content = password ? value : trimmed;
  if (validity.badInput) return type === 'number' ? 'Enter a valid number.' : 'Enter a valid value.';
  if (validity.valueMissing || (field.required && !['checkbox', 'radio', 'file'].includes(type) && !content)) return 'This field is required.';
  if (field.required && type === 'file' && !field.files?.length) return 'Choose a file.';
  if (validity.typeMismatch) return type === 'email' ? 'Enter a valid email address.' : 'Enter a valid URL including https://.';
  if (validity.patternMismatch) return field.getAttribute?.('data-validation-message') || 'Use the requested format.';
  const minLength = Number(field.minLength);
  const maxLength = Number(field.maxLength);
  if (content && Number.isFinite(minLength) && minLength > 0 && content.length < minLength) return `Use at least ${minLength} characters.`;
  if (Number.isFinite(maxLength) && maxLength > -1 && value.length > maxLength) return `Use no more than ${maxLength} characters.`;
  if (validity.rangeUnderflow) return `Enter ${field.min} or more.`;
  if (validity.rangeOverflow) return `Enter ${field.max} or less.`;
  if (validity.stepMismatch) return 'Use a value that matches the allowed increment.';
  if (validity.customError) return field.validationMessage || 'Check this field.';
  if (validity.valid === false) return 'Check this field.';
  return '';
}

function describedErrors(field) {
  return String(field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
    .map(id => field.ownerDocument.getElementById(id))
    .filter(node => node && !node.hasAttribute('data-app-field-error') && node.textContent.trim()
      && (node.classList.contains('field-error') || node.getAttribute('role') === 'alert' || node.id.includes('error')));
}

function focusField(field, retry = true) {
  if (!field?.isConnected || field.type === 'hidden') return;
  if (field.disabled || field.matches?.(':disabled')) {
    // Submit handlers often re-enable their fieldset in finally after displaying errors.
    if (retry) field.ownerDocument?.defaultView?.requestAnimationFrame?.(() => focusField(field, false));
    return;
  }
  const focusTarget = field.matches?.('select[data-ui-select]') ? field.closest('.app-select')?.querySelector('[role=combobox]') || field : field;
  focusTarget.focus?.({ preventScroll: true });
  const rect = field.getBoundingClientRect?.();
  const view = field.ownerDocument?.defaultView;
  if (rect && view && (rect.top < 70 || rect.bottom > view.innerHeight - 32)) field.scrollIntoView?.({ block: 'center', behavior: 'instant' });
}

function showFieldError(field, message, source = 'client') {
  if (!isControl(field) || !message) return;
  let state = fieldStates.get(field);
  if (!state) {
    state = { previousInvalid: field.getAttribute('aria-invalid'), node: null };
    fieldStates.set(field, state);
  }
  state.source = source;
  state.value = field.value;
  state.message = message;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('data-app-invalid', 'true');

  // React forms may already render their own accessible error. Never duplicate it.
  if (describedErrors(field).length) {
    if (state.node) {
      const tokens = String(field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== state.node.id);
      if (tokens.length) field.setAttribute('aria-describedby', tokens.join(' '));
      else field.removeAttribute('aria-describedby');
      state.node.remove();
      state.node = null;
    }
    return;
  }
  if (!state.node) {
    state.node = field.ownerDocument.createElement('span');
    state.node.id = `app-field-error-${++nextErrorId}`;
    state.node.className = 'field-error app-field-error';
    state.node.setAttribute('data-app-field-error', 'true');
    state.node.setAttribute('aria-live', 'polite');
  }
  state.node.textContent = message;
  if (!state.node.isConnected) {
    const wrapper = field.closest(wrapperSelector);
    const anchor = wrapper && wrapper.contains(field) ? wrapper : field;
    anchor.insertAdjacentElement('afterend', state.node);
  }
  const describedBy = new Set(String(field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  describedBy.add(state.node.id);
  field.setAttribute('aria-describedby', [...describedBy].join(' '));
}

/** Removes only attributes and error nodes owned by this validation bridge. */
export function clearFieldError(field) {
  const state = fieldStates.get(field);
  if (!state) return;
  if (state.node) {
    const tokens = String(field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== state.node.id);
    if (tokens.length) field.setAttribute('aria-describedby', tokens.join(' '));
    else field.removeAttribute('aria-describedby');
    state.node.remove();
  }
  if (!describedErrors(field).length) {
    if (state.previousInvalid !== null && state.previousInvalid !== 'true') field.setAttribute('aria-invalid', state.previousInvalid);
    else field.removeAttribute('aria-invalid');
  }
  field.removeAttribute('data-app-invalid');
  fieldStates.delete(field);
}

export function validateForm(form, { focus = true } = {}) {
  if (!form?.elements) return true;
  let firstInvalid = null;
  const radios = new Set();
  for (const field of Array.from(form.elements)) {
    if (!isControl(field)) continue;
    if (field.disabled) { clearFieldError(field); continue; }
    if (field.type === 'radio' && field.name) {
      if (radios.has(field.name)) continue;
      radios.add(field.name);
    }
    const message = getFieldValidationMessage(field);
    if (message) {
      showFieldError(field, message);
      firstInvalid ||= field;
    } else {
      const state = fieldStates.get(field);
      // A server error remains until the user changes that value.
      if (state?.source === 'server' && state.value === field.value && !field.disabled && !field.readOnly && field.getAttribute('data-skip-validation') !== 'true') {
        showFieldError(field, state.message, 'server');
        firstInvalid ||= field;
      } else clearFieldError(field);
    }
  }
  if (firstInvalid && focus) focusField(firstInvalid);
  return !firstInvalid;
}

function fieldKeys(field) {
  const values = [field.name, field.id, field.getAttribute('data-field')].filter(Boolean);
  for (const id of values) {
    for (const prefix of ['company-', 'signin-', 'signup-', 'reg-', 'profile-', 'job-']) {
      if (id.startsWith(prefix)) values.push(id.slice(prefix.length));
    }
  }
  return values;
}

/** Attach structured API field errors to this form; false lets the caller show a compact toast. */
export function applyFormErrors(form, error, { focus = true } = {}) {
  if (!form?.elements || form.isConnected === false) return false;
  const errors = getFieldErrors(error);
  const entries = Object.entries(errors);
  if (!entries.length) return false;
  let firstInvalid = null;
  let matched = 0;
  for (const [key, messages] of entries) {
    const field = Array.from(form.elements).find(item => isControl(item) && !item.disabled && fieldKeys(item).includes(key));
    if (!field) continue;
    showFieldError(field, messages.join(' '), 'server');
    firstInvalid ||= field;
    matched++;
  }
  if (firstInvalid && focus) focusField(firstInvalid);
  // A partial match must still let the caller explain the unbound error.
  return matched === entries.length;
}

export function getSubmittedForm() {
  if (!submittedForm?.isConnected || Date.now() - submittedAt > 30000) return null;
  return submittedForm;
}

/** One delegated bridge covers new routes and dynamically added form rows. */
export function installFormValidation(doc) {
  const originalForms = new Map();
  const prepare = form => {
    if (!form || form.tagName !== 'FORM' || originalForms.has(form)) return;
    originalForms.set(form, form.noValidate);
    form.noValidate = true;
  };
  const scan = root => {
    if (root.tagName === 'FORM') prepare(root);
    root.querySelectorAll?.('form').forEach(prepare);
  };
  scan(doc);
  const Observer = doc.defaultView?.MutationObserver;
  const observer = Observer ? new Observer(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
    for (const form of originalForms.keys()) if (!form.isConnected) originalForms.delete(form);
    if (submittedForm && !submittedForm.isConnected) submittedForm = null;
  }) : null;
  observer?.observe(doc.documentElement, { childList: true, subtree: true });

  const click = event => {
    const button = event.target?.closest?.('button, input[type="submit"], input[type="image"]');
    if (button && (button.type === 'submit' || button.type === 'image')) prepare(button.form);
  };
  const keydown = event => { if (event.key === 'Enter') prepare(event.target?.form); };
  const submit = event => {
    const form = event.target;
    if (form?.tagName !== 'FORM') return;
    submittedForm = form;
    submittedAt = Date.now();
    prepare(form);
    if (event.submitter?.formNoValidate) return;
    if (!validateForm(form)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  let invalidFocusQueued = false;
  let firstNativeInvalid = null;
  const invalid = event => {
    const field = event.target;
    if (!isControl(field)) return;
    event.preventDefault();
    showFieldError(field, getFieldValidationMessage(field) || 'Check this field.');
    firstNativeInvalid ||= field;
    if (!invalidFocusQueued) {
      invalidFocusQueued = true;
      queueMicrotask(() => { focusField(firstNativeInvalid); firstNativeInvalid = null; invalidFocusQueued = false; });
    }
  };
  const edited = event => {
    const field = event.target;
    const state = isControl(field) ? fieldStates.get(field) : null;
    if (!state) return;
    const message = getFieldValidationMessage(field);
    if (message) showFieldError(field, message);
    else if (state.source !== 'server' || state.value !== field.value || field.disabled) clearFieldError(field);
  };
  const reset = event => queueMicrotask(() => {
    for (const field of Array.from(event.target?.elements || [])) if (isControl(field)) clearFieldError(field);
  });
  doc.addEventListener('click', click, true);
  doc.addEventListener('keydown', keydown, true);
  doc.addEventListener('submit', submit, true);
  doc.addEventListener('invalid', invalid, true);
  doc.addEventListener('input', edited, true);
  doc.addEventListener('change', edited, true);
  doc.addEventListener('blur', edited, true);
  doc.addEventListener('reset', reset, true);
  return () => {
    observer?.disconnect();
    for (const [form, noValidate] of originalForms) {
      form.noValidate = noValidate;
      for (const field of Array.from(form.elements)) if (isControl(field)) clearFieldError(field);
    }
    originalForms.clear();
    for (const [name, handler] of [['click', click], ['keydown', keydown], ['submit', submit], ['invalid', invalid], ['input', edited], ['change', edited], ['blur', edited], ['reset', reset]]) doc.removeEventListener(name, handler, true);
    submittedForm = null;
  };
}
