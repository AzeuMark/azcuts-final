import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const appointmentApi = {
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
};

export default appointmentApi;
