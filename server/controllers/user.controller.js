const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Settings = require('../models/Settings');

// GET /users/profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, { user: user.toPublic() });
});

// PUT /users/profile — update own basic info.
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  // nickname is a staff-only field, and must be one of the configured options.
  if (req.body.nickname !== undefined) {
    if (user.role !== 'staff') {
      throw ApiError.badRequest('Only staff can set a nickname');
    }
    const settings = await Settings.findById('system');
    if (settings && !settings.nicknames.includes(req.body.nickname)) {
      throw ApiError.badRequest('Nickname must be one of the configured staff nicknames');
    }
    user.nickname = req.body.nickname;
  }

  ['fullName', 'username', 'address', 'phone', 'email'].forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });

  await user.save();
  return ok(res, { user: user.toPublic() }, 'Profile updated');
});

// PUT /users/password — change own password.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const match = await user.comparePassword(currentPassword);
  if (!match) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword; // hashed by the pre-save hook
  await user.save();
  return ok(res, null, 'Password changed');
});

// POST /users/avatar — upload a profile image (multipart field: "file").
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file uploaded');
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  user.avatar = `/uploads/${req.file.filename}`;
  await user.save();
  return ok(res, { avatar: user.avatar }, 'Avatar updated');
});

// PUT /users/theme — persist the user's preferred UI theme across devices.
const setTheme = asyncHandler(async (req, res) => {
  const { theme } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  user.theme = theme;
  await user.save();
  return ok(res, { user: user.toPublic() }, 'Theme saved');
});

module.exports = { getProfile, updateProfile, changePassword, uploadAvatar, setTheme };
