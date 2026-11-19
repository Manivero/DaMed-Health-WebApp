import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
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
  { icon:"🔒", id:"secure"  },
  { icon:"⚡", id:"fast"    },
  { icon:"✅", id:"quality" },
  { icon:"🎥", id:"online"  },
  { icon:"🤖", id:"ai"      },
  { icon:"💲", id:"prices"  },
];
const STATS = [
  { num:"50",   suffix:"+",   id:"specialists" },
  { num:"12000",suffix:"+",   id:"patients"    },
  { num:"98",   suffix:"%",   id:"satisfied"   },
  { num:"4",    suffix:".9★", id:"rating"      },
];
const TRUST_COLORS = ["linear-gradient(135deg,#00C9A7,#00E5C0)","linear-gradient(135deg,#3B82F6,#60a5fa)","linear-gradient(135deg,#8B5CF6,#a78bfa)","linear-gradient(135deg,#EC4899,#f472b6)"];
const SLOTS = ["09:00","10:30","12:00","14:00","15:30"];
function selSlot(e) { e.currentTarget.closest(".slot-row")?.querySelectorAll(".slot").forEach(s=>s.classList.remove("sel")); e.currentTarget.classList.add("sel"); }

const fadeUp = { hidden:{opacity:0,y:30}, show:{opacity:1,y:0,transition:{duration:.5}} };
const stagger = { show:{ transition:{ staggerChildren:.1 } } };

export default function Home() {
  const { t } = useTranslation();
  const trustInitials = t("landing.trustInitials", { returnObjects: true });
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
          <div className="hero-eyebrow"><span className="hero-eyebrow-dot"/>{t("landing.eyebrow")}</div>
          <h1><Trans i18nKey="landing.heroTitle" components={{ em: <em /> }} /></h1>
          <p className="hero-sub">{t("landing.heroSub")}</p>
          <div className="hero-actions">
            <Link to="/doctors" className="btn btn-white btn-lg">🔍 {t("landing.findDoctor")}</Link>
            <Link to="/consultation" className="btn btn-outline-navy btn-lg">🎥 {t("landing.onlineVisit")}</Link>
          </div>
          <div className="hero-trust">
            <div className="trust-avatars">
              {(Array.isArray(trustInitials) ? trustInitials : []).map((a,i)=>(
                <div key={a} className="trust-av" style={{background:TRUST_COLORS[i]}}>{a}</div>
              ))}
            </div>
            <div className="trust-text"><Trans i18nKey="landing.trust" components={{ strong: <strong /> }} /></div>
          </div>
        </motion.div>

        <motion.div className="hero-preview" variants={fadeUp}>
          <div className="float-stat float-stat-1">
            <div className="float-stat-icon green">⭐</div>
            <div><div className="float-stat-num">4.9★</div><div className="float-stat-label">{t("landing.floatRating")}</div></div>
          </div>
          <div className="float-stat float-stat-2">
            <div className="float-stat-icon amber">⏱</div>
            <div><div className="float-stat-num">{t("landing.floatBookingTime")}</div><div className="float-stat-label">{t("landing.floatBookingLabel")}</div></div>
          </div>
          <div className="doc-preview-card">
            <div className="dpc-header">
              <div className="dpc-av">{t("landing.preview.initials")}</div>
              <div><div className="dpc-name">{t("landing.preview.name")}</div><div className="dpc-spec">{t("landing.preview.spec")}</div></div>
              <div className="online-dot"/>
            </div>
            <div className="dpc-body">
              <div className="rating-bar"><span className="stars">★★★★★</span><span className="rat-num">4.9</span><span className="rat-cnt">{t("landing.preview.reviews")}</span></div>
              <div className="avail-title">{t("landing.preview.availToday")}</div>
              <div className="slot-row">{SLOTS.map(slot=><span key={slot} className={"slot"+(slot==="12:00"?" sel":"")} onClick={selSlot}>{slot}</span>)}</div>
              <Link to="/doctors" className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}>{t("landing.preview.book")}</Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" ref={featRef}>
        <motion.div initial="hidden" animate={featInView?"show":"hidden"} variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="section-eyebrow">{t("landing.features.eyebrow")}</div>
            <div className="section-title">{t("landing.features.title")}</div>
            <p className="section-sub">{t("landing.features.sub")}</p>
          </motion.div>
          <div className="features-grid">
            {FEATURES.map((f,i)=>(
              <motion.div key={f.id} className="feat" variants={fadeUp} custom={i}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{t(`landing.features.${f.id}.title`)}</div>
                <p className="feat-text">{t(`landing.features.${f.id}.text`)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── STATS (animated counters) ── */}
      <section className="stats-section" ref={sectRef}>
        <motion.div initial="hidden" animate={sectInView?"show":"hidden"} variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="section-eyebrow">{t("landing.stats.eyebrow")}</div>
            <div className="section-title">{t("landing.stats.title")}</div>
          </motion.div>
          <div className="stats-grid" style={{marginTop:32}}>
            {STATS.map(s=>(
              <motion.div key={s.id} className="stat-item" variants={fadeUp}>
                <div className="stat-num"><Counter target={s.num} suffix={s.suffix}/></div>
                <div className="stat-lbl">{t(`landing.stats.${s.id}`)}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <motion.div className="cta-section" variants={fadeUp}>
        <div className="cta-text">
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.sub")}</p>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",zIndex:1}}>
          <Link to="/doctors"      className="btn btn-white btn-lg">{t("landing.cta.choose")}</Link>
          <Link to="/consultation" className="btn btn-outline-navy btn-lg">🎥 {t("landing.onlineVisit")}</Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
