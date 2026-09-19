import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const productApi = {
  list: (params = {}) => unwrap(api.get('/products', { params })),
  getOne: (id) => unwrap(api.get(`/products/${id}`)),
};

export default productApi;
