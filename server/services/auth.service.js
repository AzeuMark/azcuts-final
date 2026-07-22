const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const { isAllowed, messageFor } = require('../middleware/systemMode');

// We store only a SHA-256 hash of each refresh token (never the raw token).
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user) {
  // A unique jti guarantees every refresh token (and thus its stored hash) is
  // distinct, even when two are issued within the same second (e.g. login then
  // an immediate refresh) — otherwise identical payloads collide on the unique index.
  return jwt.sign(
    { sub: user._id.toString(), jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL }
  );
}

// Issue a fresh access+refresh pair and persist the (hashed) refresh token.
async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const decoded = jwt.decode(refreshToken); // { sub, iat, exp }
  const refreshExpiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({
    token: hashToken(refreshToken),
    user: user._id,
    expiresAt: refreshExpiresAt,
  });

  return { accessToken, refreshToken, refreshExpiresAt };
}

async function register({ fullName, email, phone, password }) {
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw ApiError.conflict('Email is already registered');

  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    role: 'user', // customers can only ever self-register as `user`
  });

  const tokens = await issueTokens(user);
  return { user: user.toPublic(), ...tokens };
}

async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+password'
  );
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.status === 'inactive') {
    throw ApiError.forbidden('This account is disabled');
  }

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Invalid email or password');

  // System-mode gate (2.5): checked AFTER credentials so the right roles can
  // still log in during maintenance/offline.
  const settings = await Settings.findById('system').select('systemMode');
  const mode = settings?.systemMode || 'online';
  if (!isAllowed(mode, user.role)) {
    throw new ApiError(503, messageFor(mode));
  }

  const tokens = await issueTokens(user);
  return { user: user.toPublic(), ...tokens };
}

// Rotate a refresh token: verify -> check store -> revoke old -> issue new.
async function rotateRefreshToken(oldToken) {
  let payload;
  try {
    payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ token: hashToken(oldToken) });

  // Valid signature but missing from the store or already used => reuse/theft.
  // Defensive response: revoke every token for that user.
  if (!stored || stored.revoked) {
    await RefreshToken.updateMany({ user: payload.sub }, { revoked: true });
    throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.');
  }

  stored.revoked = true;
  await stored.save();

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const tokens = await issueTokens(user);
  return { user: user.toPublic(), ...tokens };
}

async function logout(oldToken) {
  if (!oldToken) return;
  await RefreshToken.updateOne(
    { token: hashToken(oldToken) },
    { revoked: true }
  );
}

module.exports = {
  register,
  login,
  rotateRefreshToken,
  logout,
  signAccessToken,
  signRefreshToken,
};
