import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { visibleHistoryState } from '../lib/accountHistory';

export default function useAccountHistory(path, pageSize = 25) {
  const auth = useAuth();
  const accountId = auth.user?.id || null;
  const accessToken = auth.session?.access_token;
  const [pagination, setPagination] = useState({ accountId, page: 1 });
  const page = pagination.accountId === accountId ? pagination.page : 1;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ accountId, items: [], total: 0, loading: true, error: '' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ accountId, items: [], total: 0, loading: Boolean(accountId && accessToken), error: '' });
    if (!accountId || !accessToken) return () => { active = false; controller.abort(); };
    apiRequest(`${path}?page=${page}&pageSize=${pageSize}`, { auth: true, accessToken, signal: controller.signal })
      .then((result) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage) {
          setPagination({ accountId, page: lastPage });
          return;
        }
        setState({ accountId, items: result.items || [], total: result.total || 0, loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setState({ accountId, items: [], total: 0, loading: false, error: error.message || 'Your history could not be loaded.' });
      });
    return () => { active = false; controller.abort(); };
  }, [path, page, pageSize, revision, accountId, accessToken]);

  return {
    ...visibleHistoryState(state, accountId), page, pageSize,
    setPage: (nextPage) => setPagination({ accountId, page: nextPage }),
    reload: () => setRevision((current) => current + 1),
  };
}
