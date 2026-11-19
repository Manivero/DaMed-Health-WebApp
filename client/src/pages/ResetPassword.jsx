import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { errorText } from "../utils/errorText";
import { resetPassword } from "../services/authService";

export default function ResetPassword() {
  const { t } = useTranslation();
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
      setError({ key: "authPage.reset.passwordTooShort" });
      return;
    }
    if (password !== confirm) {
      setError({ key: "authPage.passwordsMismatch" });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || { key: "authPage.reset.invalidToken" });
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
          <h1 className="auth-left-title">{t("authPage.brandTitle")}</h1>
          <p className="auth-left-sub">{t("authPage.brandSub")}</p>
        </div>
      </motion.div>

      <motion.div className="auth-right" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:.4, delay:.1 }}>
        <div className="auth-form-wrap">
          <div style={{ marginBottom:32 }}>
            <h2 className="auth-title">{t("authPage.reset.title")}</h2>
            <p className="auth-subtitle">{t("authPage.reset.subtitle")}</p>
          </div>

          {missingParams && !success && (
            <div className="alert alert-error" style={{ marginBottom:20 }}>
              {t("authPage.reset.brokenLink")}
            </div>
          )}
          {error && <div className="alert alert-error" style={{ marginBottom:20 }}>{errorText(error, t)}</div>}

          {success ? (
            <div className="alert alert-success" style={{ marginBottom:20 }}>
              {t("authPage.reset.success")}
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="pass">{t("authPage.reset.label")}</label>
                <input id="pass" type="password" placeholder={t("authPage.passwordPlaceholder")}
                  value={password} onChange={e=>setPassword(e.target.value)}
                  autoComplete="new-password" required disabled={missingParams} />
              </div>
              <div className="field">
                <label htmlFor="conf">{t("authPage.reset.confirmLabel")}</label>
                <input id="conf" type="password" placeholder={t("authPage.confirmPlaceholder")}
                  value={confirm} onChange={e=>setConfirm(e.target.value)}
                  autoComplete="new-password" required disabled={missingParams} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop:8,padding:"13px" }}
                disabled={loading || missingParams}>
                {loading ? <><span className="loader-ring" style={{width:18,height:18,borderWidth:2,marginRight:8}}/>{t("authPage.reset.loading")}</> : t("authPage.reset.submit")}
              </button>
            </form>
          )}

          <div className="auth-divider"><span>{t("authPage.or")}</span></div>
          <p className="auth-switch">
            <Link to="/forgot-password">{t("authPage.reset.requestAgain")}</Link> · <Link to="/login">{t("authPage.reset.backToLogin")}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
