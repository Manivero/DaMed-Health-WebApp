import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "../services/authService";

export default function ResetPassword() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get("token")  || "";
  const email     = params.get("email")  || "";

  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState(false);

  const missingParams = !token || !email;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Токен недействителен или истёк. Запросите ссылку заново.");
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
        </div>
      </motion.div>

      <motion.div className="auth-right" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:.4, delay:.1 }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom:32 }}>
            <h2 className="auth-title">Новый пароль</h2>
            <p className="auth-subtitle">Придумайте новый пароль для входа</p>
          </div>

          {missingParams && !success && (
            <div className="alert alert-error" style={{ marginBottom:20 }}>
              Ссылка повреждена или неполная. Запросите восстановление пароля заново.
            </div>
          )}
          {error && <div className="alert alert-error" style={{ marginBottom:20 }}>{error}</div>}

          {success ? (
            <div className="alert alert-success" style={{ marginBottom:20 }}>
              Пароль успешно изменён. Сейчас вы будете перенаправлены на страницу входа…
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="pass">Новый пароль</label>
                <input id="pass" type="password" placeholder="Минимум 6 символов"
                  value={password} onChange={e=>setPassword(e.target.value)}
                  autoComplete="new-password" required disabled={missingParams} />
              </div>
              <div className="field">
                <label htmlFor="conf">Повторите пароль</label>
                <input id="conf" type="password" placeholder="Повторите пароль"
                  value={confirm} onChange={e=>setConfirm(e.target.value)}
                  autoComplete="new-password" required disabled={missingParams} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop:8,padding:"13px" }}
                disabled={loading || missingParams}>
                {loading ? <><span className="loader-ring" style={{width:18,height:18,borderWidth:2,marginRight:8}}/>Сохраняем…</> : "Сохранить новый пароль"}
              </button>
            </form>
          )}

          <div className="auth-divider"><span>или</span></div>
          <p className="auth-switch">
            <Link to="/forgot-password">Запросить ссылку заново</Link> · <Link to="/login">Вернуться ко входу</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
