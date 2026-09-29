import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async (path, opts = {}) => {
    const isForm = opts.body instanceof FormData;
    const token = await getToken();
    let res;
    try {
      res = await fetch(`${BASE}/api${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, ...(opts.body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
        body: opts.body && !isForm ? JSON.stringify(opts.body) : opts.body,
      });
    } catch { throw new Error('Cannot reach the server. Check your connection.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [getToken]);
}
