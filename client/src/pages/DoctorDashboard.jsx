import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDoctorAppointments } from "../services/bookingService";
import { useFetch } from "../hooks/useFetch";
import { isDoctor } from "../utils/auth";
import { AppointmentSkeleton } from "../components/Skeleton";

const BADGE     = { pending: "badge-pending", confirmed: "badge-confirmed", cancelled: "badge-cancelled" };
const BADGE_LBL = { pending: "Ожидает", confirmed: "Подтверждено", cancelled: "Отменено" };
const RU_MON    = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

function DoctorDashboardInner() {
  const { data, loading, error } = useFetch(getDoctorAppointments);

  const now = new Date();
  const all = data || [];
  // Минимальный кабинет (см. T017): только предстоящие, без вкладок/истории —
  // расширение до полноценного расписания вне scope этой задачи.
  const upcoming = all
    .filter((a) => new Date(a.date) >= now && a.status !== "cancelled")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="appt-container">
        <div className="appt-header-row">
          <div>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--navy)", fontWeight: 400, marginBottom: 4 }}>
              Кабинет врача
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Ваши предстоящие записи на приём</p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        {loading && (
          <div className="appt-list">
            {Array(3).fill(0).map((_, i) => <AppointmentSkeleton key={i} />)}
          </div>
        )}

        {!loading && upcoming.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}
          >
            <div style={{ fontSize: 52, marginBottom: 12 }}>📅</div>
            <p style={{ fontSize: 15 }}>Предстоящих записей нет</p>
          </motion.div>
        )}

        {!loading && (
          <div className="appt-list">
            <AnimatePresence mode="popLayout">
              {upcoming.map((a, i) => {
                const d = new Date(a.date);
                return (
                  <motion.div key={a._id} className="appt-card" layout
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="appt-date">
                      <div className="appt-month">{RU_MON[d.getMonth()]}</div>
                      <div className="appt-day">{d.getDate()}</div>
                    </div>
                    <div className="appt-info">
                      <div className="appt-name">{a.userId?.name || a.userId?.email || "Пациент"}</div>
                      <div className="appt-meta">
                        <span>{a.userId?.phone || a.userId?.email || ""}</span>
                        <span className="dot" />
                        <span>{d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="dot" />
                        <span>{d.toLocaleDateString("ru-RU", { weekday: "short" })}</span>
                      </div>
                    </div>
                    <div className="appt-actions">
                      <span className={"badge " + (BADGE[a.status] || "badge-done")}>
                        {BADGE_LBL[a.status] || a.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Wrapper с проверкой роли до хуков — тот же паттерн, что и в Admin.jsx (T010/первичный аудит).
export default function DoctorDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isDoctor()) navigate("/", { replace: true });
  }, [navigate]);
  if (!isDoctor()) return null;
  return <DoctorDashboardInner />;
}
