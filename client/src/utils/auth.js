export const getAccessToken = () => localStorage.getItem("accessToken");

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
};

export const isLoggedIn = () => !!getAccessToken();
export const isAdmin    = () => getUser()?.role === "admin";

// refreshToken больше не передаётся сюда и не хранится в localStorage — сервер
// выставляет его как httpOnly+Secure+SameSite cookie, недоступную для JS.
// Это устраняет риск кражи 7-дневного refresh-токена через XSS.
export const saveAuth = (data) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify({
    _id: data._id, email: data.email, role: data.role,
  }));
};

// Синхронная часть — всегда чистим локально
export const logout = () => {
  ["accessToken", "user"].forEach((k) => localStorage.removeItem(k));
};

// Полный logout — инвалидируем refresh-токен на сервере.
// refreshToken не передаём явно — браузер сам приложит httpOnly cookie
// (apiClient настроен с withCredentials: true).
export const logoutWithServer = async () => {
  const accessToken = getAccessToken();
  logout(); // сначала чистим локально, даже если запрос упадёт
  try {
    await fetch("/api/auth/logout", {
      method:      "POST",
      credentials: "include",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });
  } catch {
    // игнорируем — токены уже удалены локально
  }
};
