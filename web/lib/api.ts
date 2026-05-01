<<<<<<< HEAD
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Something went wrong');
  }
  return data;
=======
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
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?error=session_expired';
      }
    }
    throw new Error(response.status === 401 ? 'Session expired.' : 'Forbidden Access.');
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
    const errorMsg = json.error?.message || json.message || 'Something went wrong';
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
>>>>>>> feature/ux-login-role-test
}

export async function apiGet(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
<<<<<<< HEAD
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
=======
    credentials: 'include', // Support cookies alongside Bearer token
    headers: getHeaders(),
>>>>>>> feature/ux-login-role-test
  });
  return handleResponse(response);
}

export async function apiPost(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
<<<<<<< HEAD
    headers: {
      'Content-Type': 'application/json',
    },
=======
    headers: getHeaders('application/json'),
>>>>>>> feature/ux-login-role-test
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPatch(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
<<<<<<< HEAD
    headers: {
      'Content-Type': 'application/json',
    },
=======
    headers: getHeaders('application/json'),
>>>>>>> feature/ux-login-role-test
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
<<<<<<< HEAD
    headers: {
      'Content-Type': 'application/json',
    },
=======
    headers: getHeaders(),
>>>>>>> feature/ux-login-role-test
  });
  return handleResponse(response);
}
