import { demoStore, DEMO_TOKEN } from './demoStore';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith('/api/v1')
    ? rawApiUrl
    : `${rawApiUrl}/api/v1`
  : '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    const message =
      typeof data === 'string'
        ? data
        : data?.detail ||
          data?.message ||
          (typeof data === 'object' ? Object.values(data).flat().join(', ') : 'An API error occurred');
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mintly_token');
  const isDemoSession = token === DEMO_TOKEN;

  // If in demo mode, serve from demoStore
  if (isDemoSession) {
    try {
      const demoResult = demoStore.handleDemoRequest(endpoint, options);
      return demoResult as T;
    } catch (e: any) {
      throw new ApiError(400, { detail: e.message || 'Demo request failed' });
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // Detect if Vercel returned HTML SPA fallback (<!DOCTYPE html> or text/html)
    if (!isJson && contentType.includes('text/html')) {
      if (endpoint.startsWith('/auth/demo')) {
        return demoStore.initDemoSession() as unknown as T;
      }
      throw new ApiError(503, {
        detail: `Backend API server is not reachable at ${BASE_URL}. Ensure VITE_API_URL is configured in Vercel settings.`,
      });
    }

    let data: any = null;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (endpoint.startsWith('/auth/demo')) {
        return demoStore.initDemoSession() as unknown as T;
      }
      if (response.status === 401) {
        localStorage.removeItem('mintly_token');
      }
      throw new ApiError(response.status, data);
    }

    if (endpoint.startsWith('/auth/demo') && (!data || typeof data !== 'object' || !data.token)) {
      return demoStore.initDemoSession() as unknown as T;
    }

    return data as T;
  } catch (err: any) {
    if (endpoint.startsWith('/auth/demo')) {
      return demoStore.initDemoSession() as unknown as T;
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, {
      detail: err.message || 'Network error connecting to backend service.',
    });
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),

  upload: async <T>(endpoint: string, file: File, category: string = 'receipts'): Promise<T> => {
    const token = localStorage.getItem('mintly_token');
    if (token === DEMO_TOKEN) {
      return demoStore.handleDemoRequest('/storage/upload', {
        method: 'POST',
      }) as T;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(response.status, data);
    }
    return data as T;
  },
};
