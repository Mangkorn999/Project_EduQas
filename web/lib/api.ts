const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Something went wrong');
  }
  return data;
}

export async function apiGet(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}

export async function apiPost(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPatch(path: string, body: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
}
