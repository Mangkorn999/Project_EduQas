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
  if (response.status === 401 || response.status === 403) {
    let message = response.status === 401 ? 'Session expired.' : 'Forbidden Access.';
    
    try {
      const json = await response.clone().json();
      const serverMsg = (typeof json.error === 'string' ? json.error : json.error?.message) || json.message;
      if (serverMsg) message = serverMsg;
    } catch (err) {
      // Fallback to default message
    }

    if (typeof window !== 'undefined') {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?error=session_expired';
        }
      }
    }
    throw new Error(message);
  }

  // Parse JSON response
  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new Error('Invalid JSON response from server');
  }

  // Handle API Errors
  if (!response.ok) {
    // Backend may send { error: 'string' } or { error: { message: '...' } } or { message: '...' }
    const errorMsg =
      (typeof json.error === 'string' ? json.error : json.error?.message) ||
      json.message ||
      'Something went wrong';
    throw new Error(errorMsg);
  }

  // Handle Success (Enforce NFR-API envelope if backend missed it)
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return json; // Already has { data: ... }
  } else {
    return { data: json }; // Wrap raw responses for consistency
  }
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
