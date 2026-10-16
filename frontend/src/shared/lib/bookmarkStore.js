export function createBookmarkStore(request) {
  const accounts = new Map();
  let scheduled = false;

  function entryFor(accountId, jobId) {
    if (!accounts.has(accountId)) accounts.set(accountId, new Map());
    const entries = accounts.get(accountId);
    const key = String(jobId);
    if (!entries.has(key)) entries.set(key, {
      state: { saved: false, loading: true, error: null }, listeners: new Set(), pending: false, inFlight: false,
    });
    return entries.get(key);
  }

  function publish(entry, values) {
    entry.state = { ...entry.state, ...values };
    entry.listeners.forEach((listener) => listener(entry.state));
  }

  async function flush() {
    scheduled = false;
    for (const entries of accounts.values()) {
      const pending = [...entries].filter(([, entry]) => entry.pending);
      for (let offset = 0; offset < pending.length; offset += 100) {
        const batch = pending.slice(offset, offset + 100);
        batch.forEach(([, entry]) => { entry.pending = false; entry.inFlight = true; });
        try {
          const params = new URLSearchParams({ jobIds: batch.map(([id]) => id).join(',') });
          const result = await request(`/job-seeker/saved-jobs/status?${params}`, {
            auth: true, accessToken: batch[0][1].accessToken,
          });
          const savedIds = new Set((result.savedJobIds || []).map(String));
          batch.forEach(([id, entry]) => {
            entry.inFlight = false;
            publish(entry, { saved: savedIds.has(id), loading: false, error: null });
          });
        } catch (error) {
          batch.forEach(([, entry]) => {
            entry.inFlight = false;
            publish(entry, { loading: false, error });
          });
        }
      }
    }
  }

  return {
    subscribe(accountId, jobId, listener, accessToken) {
      const entry = entryFor(accountId, jobId);
      entry.accessToken = accessToken;
      entry.listeners.add(listener);
      listener(entry.state);
      if (!entry.pending && !entry.inFlight) {
        entry.pending = true;
        publish(entry, { loading: true, error: null });
      }
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
      return () => entry.listeners.delete(listener);
    },
    async toggle(accountId, jobId) {
      const entry = entryFor(accountId, jobId);
      if (entry.state.loading || entry.state.error) return;
      const saved = !entry.state.saved;
      entry.inFlight = true;
      publish(entry, { loading: true, error: null });
      try {
        await request(`/job-seeker/jobs/${encodeURIComponent(jobId)}/save`, {
          method: saved ? 'POST' : 'DELETE', auth: true, accessToken: entry.accessToken,
        });
        publish(entry, { saved, loading: false, error: null });
      } catch (error) {
        publish(entry, { loading: false });
        throw error;
      } finally {
        entry.inFlight = false;
      }
    },
  };
}
