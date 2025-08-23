const BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:5001'
  : ''; // Flask + React share origin in prod


export function getBaseUrl(path) {
  return `${BASE_URL}/copelands/${path.replace(/^\/+/, '')}`;
}