import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const staffApi = {
  // scope = 'incoming' (pending pool + routed to me) | 'mine' (my accepted queue)
  appointments: (scope = 'incoming') =>
    unwrap(api.get('/staff/appointments', { params: { scope } })),
  accept: (id) => unwrap(api.patch(`/staff/appointments/${id}/accept`)),
  reject: (id, reason) => unwrap(api.patch(`/staff/appointments/${id}/reject`, { reason })),
  history: (filter) => unwrap(api.get('/staff/history', { params: { filter } })),
  setShift: (status) => unwrap(api.patch('/staff/shift', { status })),
};

export default staffApi;
