import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

// Products support an image upload, so build multipart only when a File is
// present; otherwise send JSON (the server accepts both).
function toProductBody(payload) {
  if (payload?.image instanceof File) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    return { body: form, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
  }
  return { body: payload, config: {} };
}

export const productApi = {
  list: (params = {}) => unwrap(api.get('/products', { params })),
  getOne: (id) => unwrap(api.get(`/products/${id}`)),
  create: (payload) => {
    const { body, config } = toProductBody(payload);
    return unwrap(api.post('/products', body, config));
  },
  update: (id, payload) => {
    const { body, config } = toProductBody(payload);
    return unwrap(api.put(`/products/${id}`, body, config));
  },
  remove: (id) => unwrap(api.delete(`/products/${id}`)),
};

export default productApi;
