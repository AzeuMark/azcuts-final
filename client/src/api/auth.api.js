import api from '../config/axios';

// Thin wrappers over the server auth routes. Each resolves to the server envelope
// { success, message, data } — callers read `.data` for the payload.
const unwrap = (p) => p.then((r) => r.data);

export const authApi = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  refresh: () => unwrap(api.post('/auth/refresh')),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
};

export default authApi;
