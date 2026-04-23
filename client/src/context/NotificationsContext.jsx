import { createContext, useContext, useState, useCallback } from "react";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const [notifs, setNotifs] = useState([
    { id: 1, type: "confirm", title: "Запись подтверждена", body: "Ваш приём у Алии Сейткали — завтра в 12:00", time: new Date(Date.now() - 3600000), read: false },
    { id: 2, type: "reminder", title: "Напоминание о приёме", body: "Не забудьте взять результаты анализов", time: new Date(Date.now() - 7200000), read: false },
    { id: 3, type: "review", title: "Оставьте отзыв", body: "Как прошёл приём у Бауыржана Жаксыбекова?", time: new Date(Date.now() - 86400000), read: true },
    { id: 4, type: "promo", title: "Акция DamuMed", body: "Первая консультация кардиолога — бесплатно до конца месяца", time: new Date(Date.now() - 172800000), read: true },
  ]);

  const unread = notifs.filter(n => !n.read).length;

  const markRead = useCallback((id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addNotif = useCallback((notif) => {
    setNotifs(prev => [{ ...notif, id: Date.now(), time: new Date(), read: false }, ...prev]);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifs, unread, markRead, markAllRead, addNotif }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
