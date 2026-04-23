import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/authService";
import { saveAuth, logout as logoutUtil, getUser, isLoggedIn } from "../utils/auth";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  const handleLogin = useCallback(async (email, password, redirectTo = "/") => {
    setError(""); setLoading(true);
    try {
      const res = await login({ email, password });
      saveAuth(res.data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка входа");
    } finally { setLoading(false); }
  }, [navigate]);

  const handleRegister = useCallback(async (email, password) => {
    setError(""); setLoading(true);
    try {
      const res = await register({ email, password });
      saveAuth(res.data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка регистрации");
    } finally { setLoading(false); }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logoutUtil();
    navigate("/login", { replace: true });
  }, [navigate]);

  return {
    loading, error, setError,
    handleLogin, handleRegister, handleLogout,
    user: getUser(),
    isLoggedIn: isLoggedIn(),
  };
}
