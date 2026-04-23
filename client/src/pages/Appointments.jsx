import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { getMyAppointments, cancelAppointment } from "../services/bookingService";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import { AppointmentSkeleton } from "../components/Skeleton";

const TABS = [
  { label:"Предстоящие", icon:"📅" },
  { label:"Прошедшие",   icon:"📂" },
  { label:"Все",         icon:"📋" },
];
const BADGE    = { pending:"badge-pending", confirmed:"badge-confirmed", cancelled:"badge-cancelled", done:"badge-done" };
const BADGE_LBL= { pending:"Ожидает", confirmed:"Подтверждено", cancelled:"Отменено", done:"Завершено" };
const RU_MON   = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

export default function Appointments() {
  const [tab, setTab] = useState(0);
  const [cancelling, setCancelling] = useState(null);
  const { data, loading, error, refetch } = useFetch(getMyAppointments);
  const { showToast } = useToast();

  const now = new Date();
  const all = data || [];
  const upcoming  = all.filter(a => new Date(a.date) >= now && a.status !== "cancelled");
  const past      = all.filter(a => new Date(a.date) <  now || a.status === "cancelled");
  const lists     = [upcoming, past, all];
  const appts     = lists[tab];

  const handleCancel = async (id) => {
    if (!confirm("Отменить эту запись?")) return;
    setCancelling(id);
    try {
      await cancelAppointment(id);
      refetch();
      showToast("Запись отменена");
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка при отмене");
    } finally { setCancelling(null); }
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="appt-container">

        <div className="appt-header-row">
          <div>
            <h1 style={{ fontFamily:"var(--font-head)",fontSize:32,color:"var(--navy)",fontWeight:400,marginBottom:4 }}>Мои записи</h1>
            <p style={{ color:"var(--muted)",fontSize:14 }}>История ваших визитов к врачам</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div className="appt-tabs">
              {TABS.map((t,i) => (
                <div key={t.label} className={"appt-tab"+(tab===i?" active":"")} onClick={()=>setTab(i)}>
                  <span style={{ marginRight:5 }}>{t.icon}</span>
                  {t.label}
                  <span style={{
                    marginLeft:6, fontSize:11, fontWeight:700,
                    background: tab===i ? "var(--teal-l)" : "var(--border)",
                    color: tab===i ? "var(--teal)" : "var(--muted)",
                    padding:"2px 7px", borderRadius:999,
                  }}>{lists[i].length}</span>
                </div>
              ))}
            </div>
            <Link to="/doctors" className="btn btn-primary btn-sm">+ Записаться</Link>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:20 }}>{error}</div>}

        {/* Skeleton */}
        {loading && (
          <div className="appt-list">
            {Array(3).fill(0).map((_,i) => <AppointmentSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && appts.length === 0 && !error && (
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            style={{ textAlign:"center", padding:"64px 0", color:"var(--muted)" }}
          >
            <div style={{ fontSize:52, marginBottom:12 }}>{TABS[tab].icon}</div>
            <p style={{ fontSize:15, marginBottom:20 }}>
              {tab === 0 ? "Нет предстоящих записей" : tab === 1 ? "История визитов пуста" : "Записей нет"}
            </p>
            <Link to="/doctors" className="btn btn-primary">Найти врача</Link>
          </motion.div>
        )}

        {/* List */}
        {!loading && (
          <div className="appt-list">
            <AnimatePresence mode="popLayout">
              {appts.map((a, i) => {
                const d    = new Date(a.date);
                const isPast = d < now;
                const status = isPast && a.status === "confirmed" ? "done" : a.status;
                return (
                  <motion.div key={a._id} className="appt-card"
                    layout
                    initial={{ opacity:0, y:14 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, x:40, transition:{duration:.2} }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className={"appt-date" + (isPast ? " past" : "")}>
                      <div className="appt-month">{RU_MON[d.getMonth()]}</div>
                      <div className="appt-day">{d.getDate()}</div>
                    </div>
                    <div className="appt-info">
                      <div className="appt-name">{a.doctorId?.name || "Врач"}</div>
                      <div className="appt-meta">
                        <span>{a.doctorId?.specialty}</span>
                        <span className="dot"/>
                        <span>{d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</span>
                        <span className="dot"/>
                        <span>{d.toLocaleDateString("ru-RU",{weekday:"short"})}</span>
                      </div>
                    </div>
                    <div className="appt-actions">
                      <span className={"badge " + (BADGE[status]||"badge-done")}>
                        {BADGE_LBL[status] || status}
                      </span>
                      {a.status === "pending" || a.status === "confirmed" ? (
                        !isPast && (
                          <button
                            className="btn btn-sm"
                            style={{ background:"#fff5f5", color:"#dc2626", border:"1px solid #fecaca" }}
                            disabled={cancelling === a._id}
                            onClick={() => handleCancel(a._id)}
                          >
                            {cancelling === a._id ? "…" : "Отменить"}
                          </button>
                        )
                      ) : null}
                      <Link to={`/doctors/${a.doctorId?._id}`} className="btn btn-ghost btn-sm">
                        Врач →
                      </Link>
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
