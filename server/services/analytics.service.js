const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { rangeBounds, DEFAULT_TZ } = require('../utils/datetime');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Build a date-range $match fragment for a field (empty for the 'all' range).
function dateMatch(field, bounds) {
  return bounds ? { [field]: { $gte: bounds.start, $lte: bounds.end } } : {};
}

async function getTz() {
  const s = await Settings.findById('system');
  return s?.timezone || DEFAULT_TZ;
}

// $dateToString bucket format per range (grouping key for the time-series).
const BUCKET_FORMAT = {
  daily: '%Y-%m-%d %H:00',
  weekly: '%Y-%m-%d',
  monthly: '%Y-%m-%d',
  yearly: '%Y-%m',
  all: '%Y-%m',
};

// KPIs for the admin dashboard/analytics page.
async function summary(range = 'all') {
  const tz = await getTz();
  const bounds = rangeBounds(range, tz);

  const createdMatch = dateMatch('createdAt', bounds);
  const doneMatch = { status: 'done', ...dateMatch('finishedAt', bounds) };
  const cancelledMatch = { status: 'cancelled', ...dateMatch('cancelledAt', bounds) };

  const [bookings, statusAgg, revenueAgg, cancelled, newCustomers, topServices, topStaff] =
    await Promise.all([
      Appointment.countDocuments(createdMatch),
      Appointment.aggregate([{ $match: createdMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $match: doneMatch },
        { $group: { _id: null, revenue: { $sum: '$priceSnapshot.total' }, count: { $sum: 1 } } },
      ]),
      Appointment.countDocuments(cancelledMatch),
      User.countDocuments({ role: 'user', ...dateMatch('createdAt', bounds) }),
      Appointment.aggregate([
        { $match: doneMatch },
        { $group: { _id: '$service', count: { $sum: 1 }, revenue: { $sum: '$priceSnapshot.total' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, serviceId: '$_id', name: '$service.name', count: 1, revenue: 1 } },
      ]),
      Appointment.aggregate([
        { $match: { ...doneMatch, assignedStaff: { $ne: null } } },
        { $group: { _id: '$assignedStaff', count: { $sum: 1 }, revenue: { $sum: '$priceSnapshot.total' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
        { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, staffId: '$_id', name: '$staff.fullName', avgRating: '$staff.avgRating', count: 1, revenue: 1 } },
      ]),
    ]);

  const statusBreakdown = { pending: 0, accepted: 0, in_service: 0, done: 0, cancelled: 0 };
  statusAgg.forEach((s) => {
    if (s._id in statusBreakdown) statusBreakdown[s._id] = s.count;
  });

  const revenue = round2(revenueAgg[0]?.revenue || 0);
  const completed = revenueAgg[0]?.count || 0;
  const avgTicket = completed ? round2(revenue / completed) : 0;

  return {
    range,
    tz,
    bookings,
    completed,
    cancelled,
    revenue,
    avgTicket,
    newCustomers,
    statusBreakdown,
    topServices,
    topStaff,
  };
}

// Revenue/booking time-series for charts (completed appointments by bucket).
async function salesSeries(range = 'all') {
  const tz = await getTz();
  const bounds = rangeBounds(range, tz);
  const format = BUCKET_FORMAT[range] || '%Y-%m-%d';

  const series = await Appointment.aggregate([
    { $match: { status: 'done', ...dateMatch('finishedAt', bounds) } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$finishedAt', timezone: tz } },
        revenue: { $sum: '$priceSnapshot.total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: '$_id', revenue: 1, count: 1 } },
  ]);

  return { range, tz, bucket: format, series };
}

// Column order for exported reports.
const REPORT_COLUMNS = [
  'receiptNo',
  'createdAt',
  'scheduledStart',
  'status',
  'customer',
  'service',
  'staff',
  'subtotal',
  'discountPercent',
  'discountAmount',
  'taxAmount',
  'total',
  'currency',
  'paymentMethod',
  'paymentStatus',
];

// Detailed per-appointment rows for export + the KPI summary.
async function report(range = 'all') {
  const tz = await getTz();
  const bounds = rangeBounds(range, tz);

  const appts = await Appointment.find(dateMatch('createdAt', bounds))
    .sort({ createdAt: -1 })
    .populate(['service', 'assignedStaff', 'customer']);

  const rows = appts.map((a) => ({
    receiptNo: a.receiptNo,
    createdAt: a.createdAt ? a.createdAt.toISOString() : '',
    scheduledStart: a.scheduledStart ? a.scheduledStart.toISOString() : '',
    status: a.status,
    customer: a.customer?.fullName || '',
    service: a.service?.name || '',
    staff: a.assignedStaff?.fullName || '',
    subtotal: a.priceSnapshot?.subtotal ?? '',
    discountPercent: a.priceSnapshot?.discountPercent ?? '',
    discountAmount: a.priceSnapshot?.discountAmount ?? '',
    taxAmount: a.priceSnapshot?.taxAmount ?? '',
    total: a.priceSnapshot?.total ?? '',
    currency: a.priceSnapshot?.currency || '',
    paymentMethod: a.paymentMethod,
    paymentStatus: a.paymentStatus,
  }));

  const kpis = await summary(range);
  return { range, tz, generatedAt: new Date().toISOString(), summary: kpis, rows };
}

module.exports = { summary, salesSeries, report, REPORT_COLUMNS };
