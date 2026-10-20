import { ApiErrorResponse } from './types';

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Returns a full absolute URL for images served by the backend uploads directory
 */
export function getFullImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach token if present in localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gym_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot connect to the GymCommunity API at ${API_BASE_URL}. Make sure the backend is running.`,
      0
    );
  }

  // Handle 401 Unauthorized: clear token and redirect to login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gym_token');
      const pathname = window.location.pathname;
      if (
        pathname !== '/login' &&
        pathname !== '/register' &&
        pathname !== '/leaderboard'
      ) {
        window.location.href = '/login';
      }
    }
  }

  if (response.status === 204) {
    return null as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg =
      (data as ApiErrorResponse)?.error ||
      `Request failed with status ${response.status}`;
    const details = (data as ApiErrorResponse)?.details;
    throw new ApiError(errorMsg, response.status, details);
  }

  return data as T;
}
