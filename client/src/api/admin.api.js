import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const adminApi = {
  dashboard: () => unwrap(api.get('/admin/dashboard')),
  listUsers: ({ role, page, search } = {}) =>
    unwrap(api.get('/admin/users', { params: { role, page, search } })),
  createUser: (payload) => unwrap(api.post('/admin/users', payload)),
  updateUser: (id, payload) => unwrap(api.put(`/admin/users/${id}`, payload)),
  deleteUser: (id) => unwrap(api.delete(`/admin/users/${id}`)),
  setDiscount: (appointmentId, discountPercent) =>
    unwrap(api.patch(`/admin/appointments/${appointmentId}/discount`, { discountPercent })),
  historyStaff: ({ status, range, page } = {}) =>
    unwrap(api.get('/admin/history/staff', { params: { status, range, page } })),
  historyUsers: ({ status, range, page } = {}) =>
    unwrap(api.get('/admin/history/users', { params: { status, range, page } })),
};

export default adminApi;
