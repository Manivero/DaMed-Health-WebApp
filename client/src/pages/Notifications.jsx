import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../context/NotificationsContext";

const ICONS = {
  confirm:  { icon: "✅", bg: "#e6fdf5", color: "#0a7c55" },
  reminder: { icon: "⏰", bg: "#fff8e6", color: "#a3650a" },
  review:   { icon: "⭐", bg: "#f0f0ff", color: "#6366f1" },
  promo:    { icon: "🎁", bg: "#fff0f5", color: "#be185d" },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

export default function Notifications() {
  const { notifs, unread, markRead, markAllRead } = useNotifications();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1>Уведомления</h1>
          <p>{unread > 0 ? `${unread} непрочитанных` : "Все уведомления прочитаны"}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Прочитать все
          </button>
        )}
      </div>

      <div style={{ padding: "0 48px 48px", display: "flex", flexDirection: "column", gap: 10 }}>
        {notifs.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <p>Уведомлений нет</p>
          </div>
        )}
        <AnimatePresence>
          {notifs.map((n, i) => {
            const style = ICONS[n.type] || ICONS.confirm;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(n.id)}
                style={{
                  background: "var(--surface)",
                  border: `1.5px solid ${n.read ? "var(--border2)" : "var(--teal-mid)"}`,
                  borderRadius: "var(--r-lg)",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  cursor: "pointer",
                  transition: "all .2s",
                  opacity: n.read ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: "var(--r-sm)",
                  background: style.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, flexShrink: 0,
                }}>{style.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    {n.title}
                    {!n.read && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "var(--text-light, #aaa)", marginTop: 6 }}>{timeAgo(n.time)}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
