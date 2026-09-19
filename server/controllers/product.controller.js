const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const Product = require('../models/Product');

// Products backend (S2, school paper `Products`). Mirrors the services
// controller pattern: public active-only reads, admin writes with image
// upload, DB-stored image bytes streamed from /products/:id/image.
//
// Stock rule: this controller never writes `stockQuantity` — stock moves only
// through PATCH /inventory/update (S3), which keeps the ledger consistent.

function dbImageUrl(product) {
  return `/api/products/${product._id}/image?v=${Date.now()}`;
}

function applyImage(product, file) {
  product.imageData = file.buffer;
  product.imageType = file.mimetype;
}

function stripBytes(doc) {
  const json = doc.toObject();
  delete json.imageData;
  delete json.imageType;
  return json;
}

const isAdmin = (req) => req.user?.role === 'admin';

const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  // Public callers only ever see active items; admins see everything (and may
  // filter by isActive explicitly for the management table).
  if (!isAdmin(req)) filter.isActive = true;
  else if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const products = await Product.find(filter).sort({ name: 1 });
  return ok(res, { products }, 'OK');
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.isActive && !isAdmin(req)) throw ApiError.notFound('Product not found');
  return ok(res, { product: stripBytes(product) }, 'OK');
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, lowStockThreshold, isActive } = req.body;
  const product = new Product({
    name,
    description,
    price,
    lowStockThreshold,
    isActive: isActive !== undefined ? isActive : true,
  });

  if (req.file) applyImage(product, req.file);
  else if (req.body.image) product.image = req.body.image; // external image URL
  await product.save(); // assigns _id (needed to build the image URL)

  if (req.file) {
    product.image = dbImageUrl(product);
    await product.save();
  }

  return created(res, { product: stripBytes(product) }, 'Product created');
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  ['name', 'description', 'price', 'lowStockThreshold', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) product[f] = req.body[f];
  });

  if (req.file) {
    applyImage(product, req.file);
    product.image = dbImageUrl(product);
  } else if (req.body.image) {
    // Switch to an external image URL: drop any DB-stored bytes.
    product.image = req.body.image;
    product.imageData = undefined;
    product.imageType = undefined;
  }

  await product.save();
  return ok(res, { product: stripBytes(product) }, 'Product updated');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, { id: req.params.id }, 'Product deleted');
});

// GET /products/:id/image — stream the DB-stored image bytes (public).
const getProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('+imageData +imageType');
  if (!product || !product.imageData) throw ApiError.notFound('Image not found');

  res.set('Content-Type', product.imageType || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(product.imageData);
});

module.exports = {
  listProducts,
  getProduct,
  getProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
};
