import api from '../config/axios';

const unwrap = (p) => p.then((r) => r.data);

export const analyticsApi = {
  summary: (range = 'monthly') => unwrap(api.get('/analytics/summary', { params: { range } })),
  sales: (range = 'monthly') => unwrap(api.get('/analytics/sales', { params: { range } })),
  // format = 'json' | 'csv'. CSV comes back as a blob for download.
  report: (range = 'monthly', format = 'json') =>
    format === 'csv'
      ? api
          .get('/analytics/report', { params: { range, format }, responseType: 'blob' })
          .then((r) => r.data)
      : unwrap(api.get('/analytics/report', { params: { range, format } })),
};

export default analyticsApi;
