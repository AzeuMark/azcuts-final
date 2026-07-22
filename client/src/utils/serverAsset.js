// Resolves a server-stored asset path (e.g. "/uploads/x.png") to an absolute URL
// against the API origin. Absolute URLs pass through unchanged.
// In production the API is same-origin (relative '/api'), so SERVER_ORIGIN is ''.
const API =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const SERVER_ORIGIN = API.replace(/\/api\/?$/, '');

export function serverAsset(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default serverAsset;
