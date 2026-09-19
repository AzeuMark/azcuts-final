import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const analyticsApi = {
  summary: (range = 'monthly', source) =>
    unwrap(api.get('/analytics/summary', { params: { range, source } })),
  sales: (range = 'monthly') => unwrap(api.get('/analytics/sales', { params: { range } })),
  // kind = 'appointments' | 'sales' | 'inventory'; format = 'json' | 'csv'.
  // CSV comes back as a blob for download.
  report: (range = 'monthly', format = 'json', kind = 'appointments') =>
    format === 'csv'
      ? api
          .get('/analytics/report', { params: { range, format, kind }, responseType: 'blob' })
          .then((r) => r.data)
      : unwrap(api.get('/analytics/report', { params: { range, format, kind } })),
};

export default analyticsApi;
