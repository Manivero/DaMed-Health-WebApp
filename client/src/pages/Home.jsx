import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { isLoggedIn } from "../utils/auth";
import { getDoctors } from "../services/doctorService";
import { useFavorites } from "../context/FavoritesContext";

// Animated counter
function Counter({ target, suffix="" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const num = parseInt(target);
    const dur = 1200;
    const steps = 40;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVal(Math.round((num * i) / steps));
      if (i >= steps) clearInterval(t);
    }, dur / steps);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const FEATURES = [
  { icon:"🔒", title:"Безопасно",          text:"AES-256 шифрование. Соответствие МЗРК и GDPR." },
  { icon:"⚡", title:"Быстро",             text:"Запись за 2 минуты без очередей и звонков." },
  { icon:"✅", title:"Качество",           text:"Проверенные специалисты с реальными отзывами." },
  { icon:"🎥", title:"Онлайн-консультации",text:"Видеоприёмы из любой точки Казахстана." },
  { icon:"🤖", title:"AI-ассистент",       text:"Умный помощник 24/7 — выберет врача и ответит на вопрос." },
  { icon:"💲", title:"Прозрачные цены",    text:"Стоимость указана заранее, никаких скрытых платежей." },
];
const STATS = [
  { num:"50",  suffix:"+",  lbl:"Специалистов"   },
  { num:"12000",suffix:"+", lbl:"Пациентов"       },
  { num:"98",  suffix:"%",  lbl:"Довольных"       },
  { num:"4",   suffix:".9★",lbl:"Средний рейтинг" },
];
const TRUST_COLORS = ["linear-gradient(135deg,#00C9A7,#00E5C0)","linear-gradient(135deg,#3B82F6,#60a5fa)","linear-gradient(135deg,#8B5CF6,#a78bfa)","linear-gradient(135deg,#EC4899,#f472b6)"];
const SLOTS = ["09:00","10:30","12:00","14:00","15:30"];
function selSlot(e) { e.currentTarget.closest(".slot-row")?.querySelectorAll(".slot").forEach(s=>s.classList.remove("sel")); e.currentTarget.classList.add("sel"); }

const fadeUp = { hidden:{opacity:0,y:30}, show:{opacity:1,y:0,transition:{duration:.5}} };
const stagger = { show:{ transition:{ staggerChildren:.1 } } };

export default function Home() {
  const sectRef = useRef(null);
  const sectInView = useInView(sectRef, { once:true, margin:"-80px" });
  const featRef = useRef(null);
  const featInView = useInView(featRef, { once:true, margin:"-80px" });

  return (
    <motion.div initial="hidden" animate="show" variants={stagger}>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-orb hero-orb-1"/>
        <div className="hero-orb hero-orb-2"/>
        <div className="hero-orb hero-orb-3"/>
        <motion.div variants={fadeUp}>
          <div className="hero-eyebrow"><span className="hero-eyebrow-dot"/>Онлайн медицина · Казахстан</div>
          <h1>Ваше здоровье —<em>наш приоритет</em></h1>
          <p className="hero-sub">Записывайтесь к лучшим специалистам онлайн. Без очередей и звонков — быстро, удобно и надёжно.</p>
          <div className="hero-actions">
            <Link to="/doctors" className="btn btn-white btn-lg">🔍 Найти врача</Link>
            <Link to="/consultation" className="btn btn-outline-navy btn-lg">🎥 Онлайн-приём</Link>
          </div>
          <div className="hero-trust">
            <div className="trust-avatars">
              {["АС","БЖ","АН","ДА"].map((a,i)=>(
                <div key={a} className="trust-av" style={{background:TRUST_COLORS[i]}}>{a}</div>
              ))}
            </div>
            <div className="trust-text">Более <strong>12 000 пациентов</strong> доверяют нам</div>
          </div>
        </motion.div>

        <motion.div className="hero-preview" variants={fadeUp}>
          <div className="float-stat float-stat-1">
            <div className="float-stat-icon green">⭐</div>
            <div><div className="float-stat-num">4.9★</div><div className="float-stat-label">Средний рейтинг</div></div>
          </div>
          <div className="float-stat float-stat-2">
            <div className="float-stat-icon amber">⏱</div>
            <div><div className="float-stat-num">~2 мин</div><div className="float-stat-label">Время записи</div></div>
          </div>
          <div className="doc-preview-card">
            <div className="dpc-header">
              <div className="dpc-av">АС</div>
              <div><div className="dpc-name">Алия Сейткали</div><div className="dpc-spec">Кардиолог · 12 лет</div></div>
              <div className="online-dot"/>
            </div>
            <div className="dpc-body">
              <div className="rating-bar"><span className="stars">★★★★★</span><span className="rat-num">4.9</span><span className="rat-cnt">(247 отзывов)</span></div>
              <div className="avail-title">Доступное время сегодня</div>
              <div className="slot-row">{SLOTS.map(t=><span key={t} className={"slot"+(t==="12:00"?" sel":"")} onClick={selSlot}>{t}</span>)}</div>
              <Link to="/doctors" className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}>Записаться на приём →</Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" ref={featRef}>
        <motion.div initial="hidden" animate={featInView?"show":"hidden"} variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="section-eyebrow">Почему DamuMed</div>
            <div className="section-title">Медицина нового поколения</div>
            <p className="section-sub">Мы создали сервис, который ставит пациента на первое место.</p>
          </motion.div>
          <div className="features-grid">
            {FEATURES.map((f,i)=>(
              <motion.div key={f.title} className="feat" variants={fadeUp} custom={i}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <p className="feat-text">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── STATS (animated counters) ── */}
      <section className="stats-section" ref={sectRef}>
        <motion.div initial="hidden" animate={sectInView?"show":"hidden"} variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="section-eyebrow">Доверяют тысячи</div>
            <div className="section-title">Цифры говорят сами</div>
          </motion.div>
          <div className="stats-grid" style={{marginTop:32}}>
            {STATS.map(s=>(
              <motion.div key={s.lbl} className="stat-item" variants={fadeUp}>
                <div className="stat-num"><Counter target={s.num} suffix={s.suffix}/></div>
                <div className="stat-lbl">{s.lbl}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <motion.div className="cta-section" variants={fadeUp}>
        <div className="cta-text">
          <h2>Готовы позаботиться о здоровье?</h2>
          <p>Более 50 специалистов готовы принять вас уже сегодня</p>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",zIndex:1}}>
          <Link to="/doctors"      className="btn btn-white btn-lg">Выбрать врача →</Link>
          <Link to="/consultation" className="btn btn-outline-navy btn-lg">🎥 Онлайн-приём</Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
