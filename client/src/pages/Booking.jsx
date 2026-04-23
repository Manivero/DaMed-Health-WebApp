import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { getDoctorById } from "../services/doctorService";
import { bookAppointment } from "../services/bookingService";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import Loader from "../components/Loader";

const TIMES = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const UNAVAIL = ["11:00","13:00"];

function nextDays(n) {
  const days = [];
  const ruDay = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  const ruMon = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  for (let i = 1; i <= n; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    days.push({ label: ruDay[d.getDay()], num: d.getDate(), mon: ruMon[d.getMonth()], iso: d.toISOString().split("T")[0] });
  }
  return days;
}

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selDay,  setSelDay]  = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: doctor, loading, error } = useFetch(() => getDoctorById(id), [id]);
  const days = nextDays(8);

  const handleBook = async () => {
    if (!selDay || !selTime) { showToast("Выберите дату и время"); return; }
    setSubmitting(true);
    try {
      await bookAppointment({ doctorId: id, date: `${selDay}T${selTime}` });
      setSuccess(true);
      showToast("Запись подтверждена! ✅");
      setTimeout(() => navigate("/appointments"), 2200);
    } catch (err) {
      showToast(err.response?.data?.message || "Ошибка записи");
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loader />;
  if (error)   return <div style={{padding:"48px"}}><div className="alert alert-error">{error}</div></div>;

  const initials = (doctor?.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
      <div className="page-header">
        <h1>Запись на приём</h1>
        <p>Выберите удобное время и подтвердите запись</p>
      </div>

      {success ? (
        <div style={{padding:"64px 48px",textAlign:"center"}}>
          <div style={{fontSize:72,marginBottom:16}}>✅</div>
          <h2 style={{fontFamily:"var(--font-head)",fontSize:28,color:"var(--navy)",marginBottom:8}}>Запись подтверждена!</h2>
          <p style={{color:"var(--muted)"}}>Переходим к вашим записям…</p>
        </div>
      ) : (
        <div className="booking-layout">
          {/* FORM */}
          <div className="form-card">
            <div className="form-card-title">Выберите дату</div>
            <p className="form-card-sub">Доступные даты на ближайшие 8 дней</p>

            <div className="date-grid" style={{marginBottom:28}}>
              {days.map(d => (
                <button key={d.iso} className={"date-btn"+(selDay===d.iso?" active":"")} onClick={()=>setSelDay(d.iso)}>
                  <div className="date-btn-day">{d.label}</div>
                  <div className="date-btn-num">{d.num}</div>
                  <div style={{fontSize:10,opacity:.65,marginTop:2}}>{d.mon}</div>
                </button>
              ))}
            </div>

            <div className="form-card-title" style={{fontSize:18,marginBottom:4}}>Выберите время</div>
            <p className="form-card-sub">Серым отмечено занятое время</p>
            <div className="time-grid">
              {TIMES.map(t => (
                <button
                  key={t}
                  className={"time-btn"+(UNAVAIL.includes(t)?" unavail":"")+(selTime===t?" active":"")}
                  disabled={UNAVAIL.includes(t)}
                  onClick={()=>!UNAVAIL.includes(t)&&setSelTime(t)}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="booking-sidebar">
            <div className="side-card">
              <div className="side-card-title">Ваш врач</div>
              {doctor && (
                <div className="doc-mini">
                  <div className="doc-mini-av" style={{background:"linear-gradient(135deg,#0FA58C,#4fc9b0)"}}>{initials}</div>
                  <div>
                    <div className="doc-mini-name">{doctor.name}</div>
                    <div className="doc-mini-spec">{doctor.specialty}</div>
                  </div>
                </div>
              )}
              <div className="sum-row"><span className="sum-lbl">Стоимость приёма</span><span className="sum-val">{doctor?.price ? `$${(doctor.price/100).toFixed(0)}` : "По договорённости"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Дата</span><span className="sum-val">{selDay || "—"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Время</span><span className="sum-val">{selTime || "—"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Итого</span><span className="sum-val">{doctor?.price ? `$${(doctor.price/100).toFixed(0)}` : "—"}</span></div>
            </div>
            <div className="tip-card">
              <div className="tip-tag">Совет</div>
              <p className="tip-text">Подготовьте результаты предыдущих анализов и список принимаемых препаратов.</p>
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginTop:12}} onClick={handleBook} disabled={submitting||!selDay||!selTime}>
              {submitting ? "Подтверждаем…" : "Подтвердить запись"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
