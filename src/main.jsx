import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

registerSW({
  immediate: true,
  onNeedRefresh() {
    if (window.confirm('नयाँ संस्करण उपलब्ध छ। अहिले रिफ्रेश गर्नुहोस्?')) {
      window.location.reload();
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
