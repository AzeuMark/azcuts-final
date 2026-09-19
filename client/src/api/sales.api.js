import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const salesApi = {
  // Staff records a service/product sale (prices resolved server-side).
  record: (payload) => unwrap(api.post('/sales', payload)),
  // Calling staff's relevant sales records.
  mine: (params = {}) => unwrap(api.get('/sales/mine', { params })),
  // Admin review/monitor (S8).
  list: (params = {}) => unwrap(api.get('/sales', { params })),
};

export default salesApi;
