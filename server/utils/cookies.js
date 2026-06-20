const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  path:     "/api/auth", // cookie уходит только на auth-эндпоинты, не на весь /api
  maxAge:   7 * 24 * 60 * 60 * 1000, // должно соответствовать JWT_REFRESH_EXPIRES_IN
});

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
};

module.exports = { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie };
