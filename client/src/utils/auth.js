export const getAccessToken  = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
};

export const isLoggedIn = () => !!getAccessToken();
export const isAdmin    = () => getUser()?.role === "admin";

export const saveAuth = (data) => {
  localStorage.setItem("accessToken",  data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify({
    _id: data._id, email: data.email, role: data.role,
  }));
};

// Синхронная часть — всегда чистим локально
export const logout = () => {
  ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
};

// Полный logout — инвалидируем refresh-токен на сервере
export const logoutWithServer = async () => {
  const refreshToken = getRefreshToken();
  const accessToken  = getAccessToken();
  logout(); // сначала чистим локально, даже если запрос упадёт
  try {
    await fetch("/api/auth/logout", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // игнорируем — токены уже удалены локально
  }
};
