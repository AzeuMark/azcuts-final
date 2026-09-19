const express = require('express');

const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const requireRole = require('../middleware/roles');
const requireFeature = require('../middleware/requireFeature');
const validate = require('../middleware/validate');
const uploadImage = require('../middleware/uploadImage');
const ctrl = require('../controllers/product.controller');
const V = require('../validators/product.validator');

const router = express.Router();

// ---- Products (GET is public; writes are admin-only, gated by flag) ----
router.get('/products', optionalAuth, ctrl.listProducts);
router.get('/products/:id/image', ctrl.getProductImage); // public image stream
router.get('/products/:id', optionalAuth, ctrl.getProduct);
router.post(
  '/products',
  auth,
  requireRole('admin'),
  requireFeature('productManagement.addProduct'),
  uploadImage.single('image'),
  V.createProductRules,
  validate,
  ctrl.createProduct
);
router.put(
  '/products/:id',
  auth,
  requireRole('admin'),
  requireFeature('productManagement.addProduct'),
  uploadImage.single('image'),
  V.updateProductRules,
  validate,
  ctrl.updateProduct
);
router.delete(
  '/products/:id',
  auth,
  requireRole('admin'),
  requireFeature('productManagement.addProduct'),
  ctrl.deleteProduct
);

module.exports = router;
