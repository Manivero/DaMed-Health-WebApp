import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { isLoggedIn } from "../utils/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  // Нормализация формы API (_id/createdAt) под форму, которую уже ожидает Notifications.jsx —
  // так публичный интерфейс хука не меняется для потребителей (TopNav/BottomNav используют
  // только unread; Notifications.jsx — notifs/markRead/markAllRead, без изменений их кода).
  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
      setNotifs([]);
      setUnread(0);
      return;
    }
    try {
      const res = await listNotifications({ limit: 50 });
      const mapped = (res.data.notifications || []).map((n) => ({
        id:    n._id,
        type:  n.type,
        title: n.title,
        body:  n.body,
        time:  n.createdAt,
        read:  n.read,
      }));
      setNotifs(mapped);
      setUnread(res.data.unreadCount || 0);
    } catch {
      // Уведомления не критичны для остального функционала — молча оставляем как есть,
      // не показываем ошибку поверх всего приложения из-за второстепенной фичи.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id) => {
      const target = notifs.find((n) => n.id === id);
      if (!target || target.read) return; // уже прочитано или не найдено — нечего делать

      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(id);
      } catch {
        refresh(); // расхождение с сервером — откатываемся к реальному состоянию
      }
    },
    [notifs, refresh]
  );

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  }, [unread, refresh]);

  return (
    <NotificationsContext.Provider value={{ notifs, unread, markRead, markAllRead, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
