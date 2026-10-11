const API = (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const SESSION_TOKEN_KEY = 'flotabus_session_token';
export const CSRF_TOKEN_KEY = 'flotabus_csrf_token';

export function clearAuthTokens() {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  } catch { /* Storage may be unavailable in privacy-restricted browsers. */ }
}

function storedToken(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function api(path: string, options: RequestInit = {}) {
  const csrf = storedToken(CSRF_TOKEN_KEY) || document.cookie.split('; ').find((cookie) => cookie.startsWith('flotabus_csrf='))?.split('=')[1];
  const token = storedToken(SESSION_TOKEN_KEY);
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrf && !['GET', 'HEAD'].includes(method)) headers.set('x-csrf-token', csrf);

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || 'No se pudo completar la solicitud.', response.status, data.code);
  }
  return data;
}
