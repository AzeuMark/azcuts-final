const Settings = require('../models/Settings');

// Assemble the canonical receipt JSON (SERVER_PLAN 2.6). The client renders the
// PNG (html2canvas); the server just guarantees the numbers are correct.
// `appointment` must be populated with customer, service, assignedStaff, extras.
async function buildReceipt(appointment) {
  const settings = await Settings.findById('system');
  const shop = settings?.shopInfo || {};
  const snap = appointment.priceSnapshot || {};

  const customer = appointment.customer || {};
  const staff = appointment.assignedStaff || null;
  const service = appointment.service || {};

  return {
    shop: {
      name: shop.name || 'AzCuts',
      address: shop.address || '',
      phone: shop.phone || '',
      email: shop.email || '',
    },
    receiptNo: appointment.receiptNo,
    issuedAt: appointment.createdAt,
    timezone: settings?.timezone || 'Asia/Manila',
    customer: {
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    },
    staff: staff ? { name: staff.fullName, nickname: staff.nickname } : null,
    service: { name: service.name, price: snap.base },
    extras: snap.extras || [],
    schedule: {
      start: appointment.scheduledStart,
      end: appointment.scheduledEnd,
    },
    totals: {
      subtotal: snap.subtotal,
      discountPercent: snap.discountPercent,
      discountAmount: snap.discountAmount,
      taxRate: snap.taxRate,
      taxAmount: snap.taxAmount,
      total: snap.total,
      currency: snap.currency,
    },
    payment: {
      method: appointment.paymentMethod,
      status: appointment.paymentStatus,
    },
    status: appointment.status,
  };
}

module.exports = { buildReceipt };
