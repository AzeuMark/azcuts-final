const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const Settings = require('../models/Settings');
const Service = require('../models/Service');
const User = require('../models/User');

async function getSingleton() {
  let settings = await Settings.findById('system');
  if (!settings) settings = await Settings.create({ _id: 'system' });
  return settings;
}

// GET /settings/public — landing-page data (no auth).
const getPublic = asyncHandler(async (req, res) => {
  const settings = await getSingleton();
  const [services, staff] = await Promise.all([
    Service.find({ isActive: true }).sort({ category: 1, name: 1 }),
    // Public "meet the barbers" roster: active staff with only display-safe fields.
    User.find({ role: 'staff', status: { $in: ['active', 'in_service'] } })
      .select('fullName nickname avatar avgRating ratingCount')
      .sort({ totalServed: -1, fullName: 1 }),
  ]);
  return ok(res, {
    shopInfo: settings.shopInfo,
    timezone: settings.timezone,
    currency: settings.currency,
    systemMode: settings.systemMode, // lets the client show a maintenance/offline banner
    storeHours: settings.storeHours,
    nicknames: settings.nicknames, // staff Settings needs the allowed nickname options
    services,
    staff,
  });
});

// GET /settings — full config (admin).
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getSingleton();
  return ok(res, { settings });
});

// PUT /settings — update system config (admin).
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getSingleton();

  ['systemMode', 'timezone', 'region', 'country', 'currency', 'taxRate', 'slotStepMinutes'].forEach(
    (f) => {
      if (req.body[f] !== undefined) settings[f] = req.body[f];
    }
  );

  if (req.body.shopInfo && typeof req.body.shopInfo === 'object') {
    Object.assign(settings.shopInfo, req.body.shopInfo);
    settings.markModified('shopInfo');
  }

  if (req.body.storeHours && typeof req.body.storeHours === 'object') {
    for (const [day, val] of Object.entries(req.body.storeHours)) {
      if (settings.storeHours[day]) Object.assign(settings.storeHours[day], val);
      else settings.storeHours[day] = val;
    }
    settings.markModified('storeHours');
  }

  await settings.save();
  return ok(res, { settings }, 'Settings updated');
});

// POST /settings/nicknames — add a staff nickname option.
const addNickname = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const settings = await getSingleton();
  if (settings.nicknames.includes(value)) {
    throw ApiError.conflict('That nickname already exists');
  }
  settings.nicknames.push(value);
  await settings.save();
  return created(res, { nicknames: settings.nicknames }, 'Nickname added');
});

// PUT /settings/nicknames — rename an existing option.
const updateNickname = asyncHandler(async (req, res) => {
  const { value, newValue } = req.body;
  const settings = await getSingleton();
  const idx = settings.nicknames.indexOf(value);
  if (idx === -1) throw ApiError.notFound('Nickname not found');
  if (settings.nicknames.includes(newValue)) throw ApiError.conflict('That nickname already exists');
  settings.nicknames[idx] = newValue;
  settings.markModified('nicknames');
  await settings.save();
  return ok(res, { nicknames: settings.nicknames }, 'Nickname updated');
});

// DELETE /settings/nicknames — remove an option.
const removeNickname = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const settings = await getSingleton();
  if (!settings.nicknames.includes(value)) throw ApiError.notFound('Nickname not found');
  settings.nicknames = settings.nicknames.filter((n) => n !== value);
  await settings.save();
  return ok(res, { nicknames: settings.nicknames }, 'Nickname removed');
});

module.exports = {
  getPublic,
  getSettings,
  updateSettings,
  addNickname,
  updateNickname,
  removeNickname,
};
