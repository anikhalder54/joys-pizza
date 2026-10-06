/**
 * Typed client for the Joy's Pizza ASP.NET Core Web API.
 * Base URL comes from VITE_API_URL (see .env.example); defaults to http://localhost:5080.
 */
import type {
  AuthResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  MenuItem,
  MenuItemInput,
  Order,
  OrderStatus,
  PublicConfig,
  PublicUser,
} from '../types';
import { db } from './storage';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5080';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Called when the API rejects our token (expired / revoked) so the app can sign out. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = db.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Is the API running?`);
  }

  if (res.status === 401 && token) onUnauthorized?.();

  if (!res.ok) {
    // ASP.NET Core returns RFC 7807 problem details: { title, detail, errors? }
    let message = res.statusText || 'Request failed';
    let fieldErrors: Record<string, string[]> | undefined;
    try {
      const problem = await res.json();
      fieldErrors = problem.errors;
      const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
      message = problem.detail ?? firstFieldError ?? problem.title ?? message;
    } catch {
      /* not JSON */
    }
    if (res.status === 429) message = 'Too many attempts. Please wait a minute and try again.';
    throw new ApiError(res.status, message, fieldErrors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b?: unknown) => request<T>('POST', p, b);
const put = <T,>(p: string, b?: unknown) => request<T>('PUT', p, b);
const patch = <T,>(p: string, b?: unknown) => request<T>('PATCH', p, b);
const del = <T,>(p: string) => request<T>('DELETE', p);

export const api = {
  config: () => get<PublicConfig>('/api/config'),

  auth: {
    login: (email: string, password: string) => post<AuthResponse>('/api/auth/login', { email, password }),
    register: (data: { name: string; email: string; phone?: string; password: string }) =>
      post<AuthResponse>('/api/auth/register', data),
    me: () => get<PublicUser>('/api/auth/me'),
  },

  menu: {
    list: (includeUnavailable = false) =>
      get<MenuItem[]>(`/api/menu${includeUnavailable ? '?includeUnavailable=true' : ''}`),
    create: (item: MenuItemInput) => post<MenuItem>('/api/menu', item),
    update: (id: string, item: MenuItemInput) => put<MenuItem>(`/api/menu/${encodeURIComponent(id)}`, item),
    setAvailability: (id: string, available: boolean) =>
      patch<MenuItem>(`/api/menu/${encodeURIComponent(id)}/availability`, { available }),
    remove: (id: string) => del<void>(`/api/menu/${encodeURIComponent(id)}`),
    reset: () => post<MenuItem[]>('/api/menu/reset'),
    uploadImage: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return post<{ url: string }>('/api/uploads', form);
    },
  },

  orders: {
    create: (req: CreateOrderRequest) => post<CreateOrderResponse>('/api/orders', req),
    confirmPayment: (id: string) => post<Order>(`/api/orders/${encodeURIComponent(id)}/confirm-payment`),
    mine: () => get<Order[]>('/api/orders/mine'),
    get: (id: string) => get<Order>(`/api/orders/${encodeURIComponent(id)}`),
  },

  admin: {
    orders: (days = 3) => get<Order[]>(`/api/admin/orders?days=${days}`),
    setStatus: (id: string, status: OrderStatus) =>
      patch<Order>(`/api/admin/orders/${encodeURIComponent(id)}/status`, { status }),
  },
};

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong.';
