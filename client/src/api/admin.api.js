import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const adminApi = {
  dashboard: () => unwrap(api.get('/admin/dashboard')),
  listUsers: ({ role, status, search, sort, page, limit } = {}) =>
    unwrap(api.get('/admin/users', { params: { role, status, search, sort, page, limit } })),
  createUser: (payload) => unwrap(api.post('/admin/users', payload)),
  updateUser: (id, payload) => unwrap(api.put(`/admin/users/${id}`, payload)),
  deleteUser: (id) => unwrap(api.delete(`/admin/users/${id}`)),
  setDiscount: (appointmentId, discountPercent) =>
    unwrap(api.patch(`/admin/appointments/${appointmentId}/discount`, { discountPercent })),
  // Unified booking history (replaces historyStaff/historyUsers).
  history: ({ status, range, assignment, search, sort, page, limit } = {}) =>
    unwrap(
      api.get('/admin/history', {
        params: { status, range, assignment, search, sort, page, limit },
      })
    ),
};

export default adminApi;
