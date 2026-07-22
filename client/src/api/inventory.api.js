import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

// Services support an image upload, so build multipart only when a File is present;
// otherwise send JSON (the server accepts both).
function toServiceBody(payload) {
  if (payload?.image instanceof File) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    return { body: form, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
  }
  return { body: payload, config: {} };
}

export const inventoryApi = {
  // Public GETs return active-only for anonymous callers (server visibility rule).
  listServices: (params = {}) => unwrap(api.get('/services', { params })),
  getService: (id) => unwrap(api.get(`/services/${id}`)),
  createService: (payload) => {
    const { body, config } = toServiceBody(payload);
    return unwrap(api.post('/services', body, config));
  },
  updateService: (id, payload) => {
    const { body, config } = toServiceBody(payload);
    return unwrap(api.put(`/services/${id}`, body, config));
  },
  deleteService: (id) => unwrap(api.delete(`/services/${id}`)),

  listExtras: (params = {}) => unwrap(api.get('/extras', { params })),
  getExtra: (id) => unwrap(api.get(`/extras/${id}`)),
  createExtra: (payload) => unwrap(api.post('/extras', payload)),
  updateExtra: (id, payload) => unwrap(api.put(`/extras/${id}`, payload)),
  deleteExtra: (id) => unwrap(api.delete(`/extras/${id}`)),
};

export default inventoryApi;
