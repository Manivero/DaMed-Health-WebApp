import { useState, useEffect, useCallback, useRef } from "react";

export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchFn();
      if (mountedRef.current) setData(res.data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.message || "Ошибка загрузки");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
