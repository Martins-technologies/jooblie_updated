import { useEffect, useState } from 'react';
import { getPublicDataset } from '../lib/data';

let cache = null;
let pending = null;

export function clearPublicDataCache() {
  cache = null;
  pending = null;
}

export default function usePublicData() {
  const [state, setState] = useState(() => ({
    loading: !cache,
    data: cache || { jobs: [], companies: [], categories: [], configured: true, errors: [] },
  }));

  useEffect(() => {
    let active = true;
    if (cache) {
      setState({ loading: false, data: cache });
      return () => { active = false; };
    }
    if (!pending) pending = getPublicDataset();
    pending.then((data) => {
      cache = data;
      pending = null;
      if (active) setState({ loading: false, data });
    }).catch(() => {
      pending = null;
      if (active) setState({ loading: false, data: { jobs: [], companies: [], categories: [], configured: true, errors: [] } });
    });
    return () => { active = false; };
  }, []);

  return state;
}
