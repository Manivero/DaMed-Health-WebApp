import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyAppointments, getDoctorAppointments } from "../services/bookingService";
import { useFetch } from "../hooks/useFetch";
import { isDoctor } from "../utils/auth";
import { AppointmentSkeleton } from "../components/Skeleton";

const RU_MON = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

// Слот длится 30 минут (SLOT_DURATION_MIN в server/routes/booking.js); запись остаётся в списке
// ещё час после начала — иначе идущий прямо сейчас приём пропал бы из лобби ровно тогда, когда
// к нему нужно подключиться. Окно «за сколько минут ДО начала можно заходить» не вводится —
// продуктовое решение вне scope T020.
const JOINABLE_GRACE_MS = 60 * 60 * 1000;

// Лобби видеоконсультаций: список записей текущего пользователя с кнопкой «Подключиться».
// Сама видеосвязь — в ConsultationRoom (маршрут /consultation/:appointmentId).
export default function Consultation() {
  const doctor = isDoctor();
  const { data, loading, error } = useFetch(doctor ? getDoctorAppointments : getMyAppointments);

  const nowMs = Date.now();
  const joinable = (data || [])
    .filter((a) => a.status !== "cancelled" && new Date(a.date).getTime() + JOINABLE_GRACE_MS >= nowMs)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Для пациента собеседник — врач (populate doctorId), для врача — пациент (populate userId).
  const counterpart = (a) =>
    doctor
      ? { name: a.userId?.name || a.userId?.email || "Пациент", sub: a.userId?.phone || "" }
      : { name: a.doctorId?.name || "Врач", sub: a.doctorId?.specialty || "" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="appt-container">
        <div className="appt-header-row">
          <div>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--navy)", fontWeight: 400, marginBottom: 4 }}>
              Видеоконсультация
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Выберите запись, к которой хотите подключиться
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        {loading && (
          <div className="appt-list">
            {Array(3).fill(0).map((_, i) => <AppointmentSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && joinable.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎥</div>
            <p style={{ fontSize: 15, marginBottom: 16 }}>
              {doctor ? "Предстоящих записей нет" : "Нет предстоящих записей, к которым можно подключиться"}
            </p>
            {!doctor && <Link to="/doctors" className="btn btn-primary">Записаться на приём</Link>}
          </div>
        )}

        {!loading && joinable.length > 0 && (
          <div className="appt-list">
            {joinable.map((a, i) => {
              const d = new Date(a.date);
              const who = counterpart(a);
              return (
                <motion.div key={a._id} className="appt-card"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="appt-date">
                    <div className="appt-month">{RU_MON[d.getMonth()]}</div>
                    <div className="appt-day">{d.getDate()}</div>
                  </div>
                  <div className="appt-info">
                    <div className="appt-name">{who.name}</div>
                    <div className="appt-meta">
                      {who.sub && <><span>{who.sub}</span><span className="dot" /></>}
                      <span>{d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="appt-actions">
                    <Link to={`/consultation/${a._id}`} className="btn btn-primary btn-sm">
                      🎥 Подключиться
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
