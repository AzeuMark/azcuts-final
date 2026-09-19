import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const stockApi = {
  levels: (params = {}) => unwrap(api.get('/inventory/levels', { params })),
  movements: (params = {}) => unwrap(api.get('/inventory/movements', { params })),
  // { productId, change, type, reason? } — server validates + guards stock access.
  update: (payload) => unwrap(api.patch('/inventory/update', payload)),
};

export default stockApi;
