// ══════════════════════════════════════════════════
// BASE API CLIENT — Frontend ↔ Backend Connection
// All requests go through /api prefix on port 4000
// ══════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const token = this.getToken();

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401 && !isRetry) {
      // Try refresh token once — isRetry=true prevents infinite recursion
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(endpoint, options, true); // Retry once only
      }
      // Token refresh failed — clear storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API Error');
    }

    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // ── HTTP Methods ──
  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ── Upload with progress tracking (for file uploads) ──
  uploadWithProgress<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const token = this.getToken();
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress?.(percent);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data as T);
          } else {
            reject(new Error(data.message || 'Upload gagal'));
          }
        } catch {
          reject(new Error('Upload gagal — response tidak valid'));
        }
      };

      xhr.onerror = () => reject(new Error('Upload gagal — koneksi terputus'));
      xhr.ontimeout = () => reject(new Error('Upload gagal — waktu habis'));

      xhr.open('POST', `${API_BASE}${endpoint}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 5 * 60 * 1000; // 5 minutes timeout for large files
      xhr.send(formData);
    });
  }
}

export const api = new ApiClient();
