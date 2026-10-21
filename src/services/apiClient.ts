const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ApiError {
  message: string;
  status?: number;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error || errorJson.message) {
          errorMessage = errorJson.error || errorJson.message;
        }
      } catch {
        // Ignore json parse error on non-json error responses
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    console.error(`API Error on ${options.method || 'GET'} ${url}:`, error);
    throw error;
  }
}
