import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const settingsApi = {
  // Public landing data: shopInfo, timezone, currency, systemMode, storeHours, services.
  getPublic: () => unwrap(api.get('/settings/public')),
  get: () => unwrap(api.get('/settings')),
  update: (payload) => unwrap(api.put('/settings', payload)),
  addNickname: (value) => unwrap(api.post('/settings/nicknames', { value })),
  updateNickname: (value, newValue) =>
    unwrap(api.put('/settings/nicknames', { value, newValue })),
  removeNickname: (value) =>
    unwrap(api.delete('/settings/nicknames', { data: { value } })),
};

export default settingsApi;
