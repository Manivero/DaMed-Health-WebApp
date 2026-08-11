import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Ответ сервера намеренно одинаков независимо от того, существует email или
      // нет (защита от перебора зарегистрированных адресов) — показываем как есть,
      // не пытаемся угадать/интерпретировать результат.
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Не удалось отправить запрос. Попробуйте ещё раз позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <motion.div className="auth-left" initial={{ opacity:0,x:-30 }} animate={{ opacity:1,x:0 }} transition={{ duration:.5 }}>
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="logo-mark" style={{ width:44,height:44,borderRadius:13 }}>
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
            </div>
            <span style={{ fontFamily:"var(--font-head)",fontSize:22,color:"#fff" }}>Damu<span style={{color:"var(--teal)"}}>Med</span></span>
          </div>
          <h1 className="auth-left-title">Медицина нового поколения</h1>
          <p className="auth-left-sub">Записывайтесь к лучшим специалистам онлайн. Ваше здоровье — наш приоритет.</p>
          <div className="auth-features">
            {["🔒 Безопасное хранение данных","⚡ Запись за 2 минуты","🤖 AI-ассистент 24/7","💊 50+ проверенных врачей"].map(f => (
              <div key={f} className="auth-feature-item">{f}</div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div className="auth-right" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:.4, delay:.1 }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom:32 }}>
            <h2 className="auth-title">Восстановление пароля</h2>
            <p className="auth-subtitle">Укажите email — пришлём ссылку для сброса пароля</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom:20 }}>{error}</div>}

          {sent ? (
            <div className="alert alert-success" style={{ marginBottom:20 }}>
              Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля.
              Проверьте почту (в том числе папку «Спам») — ссылка действует 30 минут.
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" placeholder="you@example.com"
                  value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop:8,padding:"13px" }} disabled={loading}>
                {loading ? <><span className="loader-ring" style={{width:18,height:18,borderWidth:2,marginRight:8}}/>Отправляем…</> : "Отправить ссылку →"}
              </button>
            </form>
          )}

          <div className="auth-divider"><span>или</span></div>
          <p className="auth-switch"><Link to="/login">← Вернуться ко входу</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
