const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get token from localStorage
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('access_token');
}

/**
 * Standard response handler with 401 redirect
 */
async function handleResponse(response: Response) {
  // Handle unauthorized - redirect to login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      
      // Prevent redirect loops if already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?error=session_expired';
      }
    }
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Something went wrong');
  }
  return data;
}

/**
 * Helper to generate headers with Authorization
 */
function getHeaders(contentType?: string) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function apiGet(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include', // Support cookies alongside Bearer token
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function apiPost(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders('application/json'),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPatch(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: getHeaders('application/json'),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
