const path = require('path');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const Service = require('../models/Service');
const Extra = require('../models/Extra');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Servable URL for a DB-stored image. Cache-busted with the write time so the
// browser refetches after an admin swaps the picture.
function dbImageUrl(service) {
  return `/api/services/${service._id}/image?v=${Date.now()}`;
}

// Copy an uploaded (in-memory) image onto the service document.
function applyImage(service, file) {
  service.imageData = file.buffer;
  service.imageType = file.mimetype;
}

// Best-effort removal of a previously uploaded LEGACY disk image (only touches
// /uploads; DB-stored images go away with the document).
function deleteUploadIfLocal(imagePath) {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const full = path.join(UPLOADS_DIR, path.basename(imagePath));
    fs.promises.unlink(full).catch(() => {});
  }
}

const isAdmin = (req) => req.user?.role === 'admin';

// ---------------------------------------------------------------- SERVICES
const listServices = asyncHandler(async (req, res) => {
  const filter = {};
  // Public callers only ever see active items; admins see everything (and may
  // filter by isActive explicitly for the management table).
  if (!isAdmin(req)) filter.isActive = true;
  else if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  if (req.query.category) filter.category = req.query.category;

  const services = await Service.find(filter).sort({ category: 1, name: 1 });
  return ok(res, { services }, 'OK');
});

const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');
  if (!service.isActive && !isAdmin(req)) throw ApiError.notFound('Service not found');
  return ok(res, { service }, 'OK');
});

const createService = asyncHandler(async (req, res) => {
  const { name, category, description, price, durationMinutes, isActive } = req.body;
  const service = new Service({
    name,
    category,
    description,
    price,
    durationMinutes,
    isActive: isActive !== undefined ? isActive : true,
  });

  if (req.file) applyImage(service, req.file);
  await service.save(); // assigns _id (needed to build the image URL)

  if (req.file) {
    service.image = dbImageUrl(service);
    await service.save();
  }

  // Never ship the raw bytes back in JSON.
  const json = service.toObject();
  delete json.imageData;
  delete json.imageType;
  return created(res, { service: json }, 'Service created');
});

const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  ['name', 'category', 'description', 'price', 'durationMinutes', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) service[f] = req.body[f];
  });

  if (req.file) {
    deleteUploadIfLocal(service.image); // clean up any legacy disk file
    applyImage(service, req.file);
    service.image = dbImageUrl(service);
  }

  await service.save();

  const json = service.toObject();
  delete json.imageData;
  delete json.imageType;
  return ok(res, { service: json }, 'Service updated');
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');
  deleteUploadIfLocal(service.image);
  return ok(res, { id: req.params.id }, 'Service deleted');
});

// GET /services/:id/image — stream the DB-stored image bytes (public).
const getServiceImage = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).select('+imageData +imageType');
  if (!service || !service.imageData) throw ApiError.notFound('Image not found');

  res.set('Content-Type', service.imageType || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(service.imageData);
});

// ------------------------------------------------------------------ EXTRAS
const listExtras = asyncHandler(async (req, res) => {
  const filter = {};
  if (!isAdmin(req)) filter.isActive = true;
  else if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const extras = await Extra.find(filter).sort({ name: 1 });
  return ok(res, { extras }, 'OK');
});

const getExtra = asyncHandler(async (req, res) => {
  const extra = await Extra.findById(req.params.id);
  if (!extra) throw ApiError.notFound('Extra not found');
  if (!extra.isActive && !isAdmin(req)) throw ApiError.notFound('Extra not found');
  return ok(res, { extra }, 'OK');
});

const createExtra = asyncHandler(async (req, res) => {
  const { name, price, durationMinutes, isActive } = req.body;
  const extra = await Extra.create({
    name,
    price,
    durationMinutes,
    isActive: isActive !== undefined ? isActive : true,
  });
  return created(res, { extra }, 'Extra created');
});

const updateExtra = asyncHandler(async (req, res) => {
  const extra = await Extra.findById(req.params.id);
  if (!extra) throw ApiError.notFound('Extra not found');

  ['name', 'price', 'durationMinutes', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) extra[f] = req.body[f];
  });

  await extra.save();
  return ok(res, { extra }, 'Extra updated');
});

const deleteExtra = asyncHandler(async (req, res) => {
  const extra = await Extra.findByIdAndDelete(req.params.id);
  if (!extra) throw ApiError.notFound('Extra not found');
  return ok(res, { id: req.params.id }, 'Extra deleted');
});

module.exports = {
  listServices,
  getService,
  getServiceImage,
  createService,
  updateService,
  deleteService,
  listExtras,
  getExtra,
  createExtra,
  updateExtra,
  deleteExtra,
};
