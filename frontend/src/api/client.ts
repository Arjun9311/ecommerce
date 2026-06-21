import axios from 'axios';

// Ensure a persistent guest session ID exists
if (!localStorage.getItem('valkey_guest_session_id')) {
  // Generate random UUID-like string for guest tracking
  const randId = 'guest:' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('valkey_guest_session_id', randId);
}

export const getGuestSessionId = () => {
  return localStorage.getItem('valkey_guest_session_id') || 'guest:anonymous';
};

export const api = axios.create({
  baseURL: '', // Proxied via Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token and Guest Session ID
api.interceptors.request.use((req) => {
  const token = localStorage.getItem('valkey_access_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach guest session id for cart tracking
  req.headers['x-guest-session-id'] = getGuestSessionId();
  return req;
});

// Response Interceptor: Automatically try to refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const rToken = localStorage.getItem('valkey_refresh_token');
      
      if (rToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken: rToken });
          const { accessToken, refreshToken } = res.data;
          
          localStorage.setItem('valkey_access_token', accessToken);
          localStorage.setItem('valkey_refresh_token', refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Clear credentials and logout
          localStorage.removeItem('valkey_access_token');
          localStorage.removeItem('valkey_refresh_token');
          window.dispatchEvent(new Event('valkey_logout'));
        }
      }
    }
    
    return Promise.reject(error);
  }
);
