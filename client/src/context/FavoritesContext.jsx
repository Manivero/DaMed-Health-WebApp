import { createContext, useContext, useState, useCallback } from "react";

const KEY = "damumed_favorites";
const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch { return new Set(); }
  });

  const toggle = useCallback((id) => {
    setIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFav = useCallback((id) => ids.has(id), [ids]);

  return (
    <FavoritesContext.Provider value={{ ids, toggle, isFav, count: ids.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
