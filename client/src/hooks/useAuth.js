import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/authService";
import { saveAuth, logoutWithServer, getUser, isLoggedIn } from "../utils/auth";
import { useNotifications } from "../context/NotificationsContext";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();
  const { refresh: refreshNotifications } = useNotifications();

  const handleLogin = useCallback(async (email, password, redirectTo = "/") => {
    setError(""); setLoading(true);
    try {
      const res = await login({ email, password });
      saveAuth(res.data);
      refreshNotifications(); // гость → пользователь: подтягиваем реальные уведомления сразу
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || { key: "authPage.loginFailed" });
    } finally { setLoading(false); }
  }, [navigate, refreshNotifications]);

  const handleRegister = useCallback(async (email, password) => {
    setError(""); setLoading(true);
    try {
      const res = await register({ email, password });
      saveAuth(res.data);
      refreshNotifications();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || { key: "authPage.registerFailed" });
    } finally { setLoading(false); }
  }, [navigate, refreshNotifications]);

  const handleLogout = useCallback(async () => {
    await logoutWithServer();
    navigate("/login", { replace: true });
  }, [navigate]);

  return {
    loading, error, setError,
    handleLogin, handleRegister, handleLogout,
    user: getUser(),
    isLoggedIn: isLoggedIn(),
  };
}
