const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const features = require('../config/features');
const Service = require('../models/Service');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { nextSaleNo } = require('../utils/saleNo');
const { applyChange } = require('./inventory.service');

// Resolve one line item to a price/name snapshot (live catalog lookup).
async function resolveItem({ kind, refId, qty = 1 }) {
  if (kind === 'service') {
    const service = await Service.findById(refId);
    if (!service) throw ApiError.notFound('Service not found');
    if (!service.isActive) throw ApiError.badRequest('Service is not available');
    return { kind, refId, name: service.name, qty, price: service.price };
  }
  const product = await Product.findById(refId);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.isActive) throw ApiError.badRequest('Product is not available');
  if (product.stockQuantity < qty) throw ApiError.badRequest(`Insufficient stock for ${product.name}`);
  return { kind, refId, name: product.name, qty, price: product.price };
}

// Record a sale (barber or admin). Product lines decrement stock through the
// inventory ledger with a back-reference to the sale. If a decrement loses a
// stock race after the sale row was written, the sale is removed again and the
// 400 surfaces — a sale must never exist without its stock movement.
async function recordSale({ items, customerId = null, barberId = null, recordedById, appointmentId = null }) {
  const resolved = [];
  for (const item of items) resolved.push(await resolveItem(item));

  const subtotal = resolved.reduce((sum, it) => sum + it.price * it.qty, 0);
  const sale = await Sale.create({
    saleNo: await nextSaleNo(),
    customer: customerId,
    barber: barberId,
    recordedBy: recordedById,
    appointment: appointmentId,
    items: resolved,
    subtotal,
    total: subtotal, // school mode: no discounts/tax (flags force 0)
    paymentMethod: 'cash',
  });

  try {
    for (const it of resolved) {
      if (it.kind !== 'product') continue;
      await applyChange({
        productId: it.refId,
        change: -it.qty,
        type: 'sale',
        byUser: recordedById,
        referenceSale: sale._id,
      });
    }
  } catch (err) {
    await Sale.findByIdAndDelete(sale._id);
    throw err;
  }

  return sale;
}

// Auto-create the service sale when an appointment flips to `done` (S4).
// Idempotent per appointment (appointment.saleId). A failure is logged but
// never breaks the done transition — the sale can be recorded manually after.
async function autoCreateServiceSale(appointment, actor) {
  if (!features.isEnabled('salesManagement.autoCreateSaleOnDone')) return null;
  if (appointment.saleId) return null;
  try {
    const service = appointment.service && appointment.service.name
      ? appointment.service
      : await Service.findById(appointment.service);
    const price = appointment.priceSnapshot?.base ?? service?.price ?? 0;
    const sale = await Sale.create({
      saleNo: await nextSaleNo(),
      customer: appointment.customer?._id || appointment.customer,
      barber: appointment.assignedStaff?._id || appointment.assignedStaff || null,
      recordedBy: actor?.id,
      appointment: appointment._id,
      items: [{ kind: 'service', refId: service._id, name: service.name, qty: 1, price }],
      subtotal: price,
      total: price,
      paymentMethod: 'cash',
    });
    appointment.saleId = sale._id;
    await appointment.save();
    return sale;
  } catch (err) {
    logger.error('autoCreateServiceSale failed:', err.message);
    return null;
  }
}

module.exports = { recordSale, autoCreateServiceSale };
