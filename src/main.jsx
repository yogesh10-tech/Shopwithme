import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Service worker is registered by vite-plugin-pwa (registerSW.js in built index.html)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
