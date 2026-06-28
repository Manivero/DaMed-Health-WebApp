import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getDoctorById } from "../services/doctorService";
import { bookAppointment, payAndBook } from "../services/bookingService";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import apiClient from "../services/apiClient";
import Loader from "../components/Loader";

const TIMES = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];

// Форматирует Date в YYYY-MM-DD по локальному времени (не UTC!)
function toLocalISODate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextDays(n) {
  const days = [];
  const ruDay = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  const ruMon = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: ruDay[d.getDay()],
      num:   d.getDate(),
      mon:   ruMon[d.getMonth()],
      iso:   toLocalISODate(d),
    });
  }
  return days;
}

export default function Booking() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { showToast } = useToast();
  const [selDay,  setSelDay]  = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [takenSlots, setTakenSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const { data: doctor, loading, error } = useFetch(() => getDoctorById(id), [id]);
  const days = nextDays(8);
  const isPaid = !!doctor?.price;

  useEffect(() => {
    if (!selDay || !id) return;
    setSlotsLoading(true);
    setSelTime(null);
    const controller = new AbortController();
    apiClient
      .get(`/booking/slots/${id}?date=${selDay}`, { signal: controller.signal })
      .then((res) => {
        const taken = (res.data.takenSlots || []).map((dt) => {
          const d = new Date(dt);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        });
        setTakenSlots(taken);
      })
      .catch((err) => {
        if (err.name !== "CanceledError") setTakenSlots([]);
      })
      .finally(() => setSlotsLoading(false));
    return () => controller.abort();
  }, [selDay, id]);

  const handleBook = async () => {
    if (!selDay || !selTime) { showToast("Выберите дату и время"); return; }
    setSubmitting(true);
    // КРИТИЧНО: явно фиксируем смещение +05:00 (Asia/Almaty, без перехода на летнее время).
    // Без offset строка "2026-06-30T09:00:00" — ISO8601 date-time без зоны, которую
    // JS Date (и express-validator .toDate() на сервере) парсят как ЛОКАЛЬНОЕ время
    // процесса, читая process.env.TZ. Если сервер задеплоен с TZ=UTC (типично для
    // контейнеров/облака) — выбранные 09:00 по Алматы превращаются в 09:00 UTC =
    // 14:00 по Алматы, т.е. запись сдвигается на 5 часов от того, что выбрал пациент.
    // Эталонная зона приёма уже объявлена в Appointment.timezone (Asia/Almaty), но
    // это поле никогда не использовалось при разборе даты — фиксация смещения
    // должна происходить здесь, на входе, а не зависеть от окружения сервера.
    const payload = { doctorId: id, date: `${selDay}T${selTime}:00+05:00` };

    try {
      if (isPaid) {
        // Платный приём: создаём Stripe Checkout-сессию (слот резервируется на
        // сервере атомарно ДО редиректа) и уводим пользователя на страницу оплаты.
        const res = await payAndBook(payload);
        window.location.href = res.data.url;
        return; // уходим со страницы — дальше пользователь либо вернётся на /success, либо на /cancel
      }

      await bookAppointment(payload);
      setSuccess(true);
      showToast("Запись подтверждена! ✅");
      setTimeout(() => navigate("/appointments"), 2200);
    } catch (err) {
      showToast(err.response?.data?.message || "Ошибка записи");
      if (selDay) setSelDay((d) => d);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error)   return <div style={{ padding: "48px" }}><div className="alert alert-error">{error}</div></div>;

  const initials = (doctor?.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <h1>Запись на приём</h1>
        <p>Выберите удобное время и подтвердите запись</p>
      </div>

      {success ? (
        <div style={{ padding: "64px 48px", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 28, color: "var(--navy)", marginBottom: 8 }}>Запись подтверждена!</h2>
          <p style={{ color: "var(--muted)" }}>Переходим к вашим записям…</p>
        </div>
      ) : (
        <div className="booking-layout">
          <div className="form-card">
            <div className="form-card-title">Выберите дату</div>
            <p className="form-card-sub">Доступные даты на ближайшие 8 дней</p>
            <div className="date-grid" style={{ marginBottom: 28 }}>
              {days.map((d) => (
                <button key={d.iso} className={"date-btn" + (selDay === d.iso ? " active" : "")} onClick={() => setSelDay(d.iso)}>
                  <div className="date-btn-day">{d.label}</div>
                  <div className="date-btn-num">{d.num}</div>
                  <div style={{ fontSize: 10, opacity: .65, marginTop: 2 }}>{d.mon}</div>
                </button>
              ))}
            </div>

            <div className="form-card-title" style={{ fontSize: 18, marginBottom: 4 }}>Выберите время</div>
            <p className="form-card-sub">
              {slotsLoading ? "Загружаем доступность…" : "Серым отмечено занятое время"}
            </p>
            <div className="time-grid">
              {TIMES.map((t) => {
                const unavail = takenSlots.includes(t);
                return (
                  <button
                    key={t}
                    className={"time-btn" + (unavail ? " unavail" : "") + (selTime === t ? " active" : "")}
                    disabled={unavail || slotsLoading}
                    onClick={() => !unavail && setSelTime(t)}
                  >{t}</button>
                );
              })}
            </div>
          </div>

          <div className="booking-sidebar">
            <div className="side-card">
              <div className="side-card-title">Ваш врач</div>
              {doctor && (
                <div className="doc-mini">
                  <div className="doc-mini-av" style={{ background: "linear-gradient(135deg,#0FA58C,#4fc9b0)" }}>{initials}</div>
                  <div>
                    <div className="doc-mini-name">{doctor.name}</div>
                    <div className="doc-mini-spec">{doctor.specialty}</div>
                  </div>
                </div>
              )}
              <div className="sum-row"><span className="sum-lbl">Стоимость приёма</span><span className="sum-val">{isPaid ? `$${(doctor.price / 100).toFixed(0)}` : "Бесплатно"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Дата</span><span className="sum-val">{selDay || "—"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Время</span><span className="sum-val">{selTime || "—"}</span></div>
              <div className="sum-row"><span className="sum-lbl">Итого</span><span className="sum-val">{isPaid ? `$${(doctor.price / 100).toFixed(0)}` : "Бесплатно"}</span></div>
            </div>
            <div className="tip-card">
              <div className="tip-tag">Совет</div>
              <p className="tip-text">Подготовьте результаты предыдущих анализов и список принимаемых препаратов.</p>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              onClick={handleBook}
              disabled={submitting || !selDay || !selTime}
            >
              {submitting ? "Подтверждаем…" : isPaid ? "Перейти к оплате →" : "Подтвердить запись"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
