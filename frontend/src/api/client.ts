/**
 * Desktop-class API Client with JWT Bearer injection and automatic refresh rotation.
 */

const API_BASE_URL = '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private getAccessToken(): string | null {
    return localStorage.getItem('intelliresearch_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('intelliresearch_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('intelliresearch_access_token', accessToken);
    localStorage.setItem('intelliresearch_refresh_token', refreshToken);
  }

  public clearTokens(): void {
    localStorage.removeItem('intelliresearch_access_token');
    localStorage.removeItem('intelliresearch_refresh_token');
  }

  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});

    // Set JSON content type if payload is not FormData
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized for refresh token rotation
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (refreshResp.ok) {
              const data = await refreshResp.json();
              this.setTokens(data.access_token, data.refresh_token);
              this.isRefreshing = false;
              this.onTokenRefreshed(data.access_token);

              // Retry original request with new token
              headers.set('Authorization', `Bearer ${data.access_token}`);
              const retryResp = await fetch(url, { ...options, headers });
              if (!retryResp.ok) {
                const errData = await retryResp.json().catch(() => ({}));
                throw new Error(errData?.error?.message || 'Request failed');
              }
              if (retryResp.status === 204) return {} as T;
              return retryResp.json();
            } else {
              this.clearTokens();
              this.isRefreshing = false;
              window.location.href = '/login';
              throw new Error('Session expired. Please log in again.');
            }
          } catch (e) {
            this.clearTokens();
            this.isRefreshing = false;
            window.location.href = '/login';
            throw e;
          }
        } else {
          // Wait for the active refresh to complete
          return new Promise<T>((resolve, reject) => {
            this.addRefreshSubscriber(async (newToken: string) => {
              headers.set('Authorization', `Bearer ${newToken}`);
              try {
                const retryResp = await fetch(url, { ...options, headers });
                if (!retryResp.ok) throw new Error('Retry request failed');
                if (retryResp.status === 204) resolve({} as T);
                else resolve(await retryResp.json());
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error (${response.status})`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }
}

export const api = new ApiClient();
