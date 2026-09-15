import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Safely register Service Worker without blocking rendering
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    try {
      registerSW({ immediate: true });
    } catch (err) {
      console.warn('Service Worker registration deferred:', err);
    }
  }).catch(() => {
    // PWA SW not available in non-PWA dev builds
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
