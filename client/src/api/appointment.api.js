import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const appointmentApi = {
  // Active staff roster for the StaffPicker (choose a specific barber or Auto).
  // Pass appointmentId to list only barbers free for that booking's block.
  bookableStaff: ({ appointmentId } = {}) =>
    unwrap(api.get('/appointments/staff', { params: { appointmentId } })),
  // Available slots — availability already accounts for selected extras (SERVER_PLAN §2.2).
  slots: ({ serviceId, date, extras = [], staffId } = {}) =>
    unwrap(api.get('/appointments/slots', { params: { serviceId, date, extras, staffId } })),
  create: (payload) => unwrap(api.post('/appointments', payload)),
  mine: ({ status, page } = {}) =>
    unwrap(api.get('/appointments/mine', { params: { status, page } })),
  getOne: (id) => unwrap(api.get(`/appointments/${id}`)),
  receipt: (id) => unwrap(api.get(`/appointments/${id}/receipt`)),
  cancel: (id, cancelReason) =>
    unwrap(api.patch(`/appointments/${id}/cancel`, { cancelReason })),
  rate: (id, { stars, comment }) =>
    unwrap(api.post(`/appointments/${id}/rate`, { stars, comment })),
  setStatus: (id, status) => unwrap(api.patch(`/appointments/${id}/status`, { status })),
  // Admin manual assign (school paper: "Assign available barber/stylist").
  assign: (id, staffId) => unwrap(api.patch(`/appointments/${id}/assign`, { staffId })),
};

export default appointmentApi;
