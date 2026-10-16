import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { createBookmarkStore } from '../lib/bookmarkStore';
import { showErrorToast } from '../lib/toast';

const bookmarks = createBookmarkStore(apiRequest);
const guestStorageKey = 'jooblie:saved-jobs';
const guestChangedEvent = 'jooblie:guest-bookmarks-changed';

function guestSavedIds() {
  try { return JSON.parse(localStorage.getItem(guestStorageKey) || '[]').map(String); }
  catch { return []; }
}

export default function useJobBookmark(jobId) {
  const auth = useAuth();
  const accountId = auth.role === 'job_seeker' ? auth.user?.id : null;
  const [state, setState] = useState({ saved: false, loading: true, error: null });

  useEffect(() => {
    if (auth.loading) return;
    if (accountId) return bookmarks.subscribe(accountId, jobId, setState, auth.session?.access_token);
    const refresh = () => setState({ saved: guestSavedIds().includes(String(jobId)), loading: false, error: null });
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(guestChangedEvent, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(guestChangedEvent, refresh);
    };
  }, [accountId, jobId, auth.loading, auth.session?.access_token]);

  async function toggleSaved(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (auth.loading || state.loading) return;
    try {
      if (accountId) {
        await bookmarks.toggle(accountId, jobId);
      } else {
        const id = String(jobId);
        const ids = guestSavedIds();
        const next = ids.includes(id) ? ids.filter((savedId) => savedId !== id) : [...ids, id];
        localStorage.setItem(guestStorageKey, JSON.stringify(next));
        window.dispatchEvent(new Event(guestChangedEvent));
      }
    } catch (error) {
      showErrorToast(error, 'The saved job could not be updated.');
    }
  }

  return { ...state, loading: auth.loading || state.loading, toggleSaved };
}
