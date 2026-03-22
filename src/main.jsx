import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
