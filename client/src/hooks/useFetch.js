import { useState, useEffect, useCallback } from "react";

export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const execute = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchFn();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}
