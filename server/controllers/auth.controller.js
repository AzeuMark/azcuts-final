const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const authService = require('../services/auth.service');
const User = require('../models/User');

const REFRESH_COOKIE = 'refreshToken';
// Scope the cookie to the auth routes only — that's where refresh/logout read it.
const COOKIE_PATH = '/api/auth';

function baseCookieOptions() {
  return {
    httpOnly: true, // not readable by JS (XSS protection)
    secure: env.isProd, // HTTPS-only in production
    sameSite: env.isProd ? 'none' : 'lax', // 'none' needed for cross-site prod
    path: COOKIE_PATH,
  };
}

function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, { ...baseCookieOptions(), expires: expiresAt });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, refreshExpiresAt } =
    await authService.register(req.body);
  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return created(res, { user, accessToken }, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken, refreshExpiresAt } =
    await authService.login(email, password);
  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return ok(res, { user, accessToken }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token provided');
  const { accessToken, refreshToken, refreshExpiresAt } =
    await authService.rotateRefreshToken(token);
  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return ok(res, { accessToken }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(token);
  clearRefreshCookie(res);
  return ok(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, { user: user.toPublic() }, 'OK');
});

module.exports = { register, login, refresh, logout, me };
