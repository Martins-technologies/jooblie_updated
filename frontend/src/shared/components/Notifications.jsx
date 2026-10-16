import { useEffect } from 'react';
import { ToastContainer, Slide } from 'react-toastify';
import { showErrorToast } from '../lib/toast';
import { installFormValidation } from '../lib/formValidation';
import '../styles/notifications.css';

export default function Notifications() {
  useEffect(() => {
    const removeValidation = installFormValidation(document);
    const rejection = event => { showErrorToast(event.reason, 'An unexpected problem occurred. Please try again.'); };
    window.addEventListener('unhandledrejection', rejection);
    return () => { removeValidation(); window.removeEventListener('unhandledrejection', rejection); };
  }, []);
  return <ToastContainer className="app-notifications" toastClassName="app-notice" position="top-right"
    theme="light" transition={Slide} limit={1} newestOnTop closeOnClick={false}
    pauseOnHover pauseOnFocusLoss draggable={false} hideProgressBar
    aria-label="Notifications. Press Alt+T to focus." />;
}
