import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  data: any;
  timestamp: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const queueOfflineRequest = (config: any) => {
  const queue: OfflineRequest[] = JSON.parse(localStorage.getItem('sh_offline_queue') || '[]');
  
  let parsedData = null;
  if (config.data) {
    try {
      parsedData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    } catch {
      parsedData = config.data;
    }
  }

  const newReq: OfflineRequest = {
    id: Math.random().toString(36).substring(2, 9),
    url: config.url || '',
    method: config.method || 'post',
    data: parsedData,
    timestamp: Date.now()
  };
  
  queue.push(newReq);
  localStorage.setItem('sh_offline_queue', JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: queue.length }));
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;
  const queue: OfflineRequest[] = JSON.parse(localStorage.getItem('sh_offline_queue') || '[]');
  if (queue.length === 0) return;
  
  localStorage.setItem('sh_offline_queue', '[]');
  const failed: OfflineRequest[] = [];
  
  for (const req of queue) {
    try {
      await api({
        url: req.url,
        method: req.method,
        data: req.data
      });
    } catch (err) {
      console.error(`Failed to sync offline transaction to ${req.url}:`, err);
      failed.push(req);
    }
  }
  
  if (failed.length > 0) {
    localStorage.setItem('sh_offline_queue', JSON.stringify(failed));
  }
  
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: failed.length }));
  if (failed.length === 0) {
    alert('Connection restored. Local offline actions successfully synchronized with database!');
    window.location.reload();
  }
};

window.addEventListener('online', syncOfflineQueue);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sh_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config } = error;
    
    // Check if network error (offline)
    if (!error.response && config && ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
      queueOfflineRequest(config);
      alert('Network unavailable. Your request has been saved to the offline queue and will sync automatically when back online.');
      return Promise.resolve({ data: { message: "Queued offline", status: "queued", id: 0 } } as any);
    }

    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('sh_token');
        localStorage.removeItem('sh_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
