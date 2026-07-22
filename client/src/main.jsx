import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Font (self-hosted variable Inter) + styles, imported once here.
import '@fontsource-variable/inter';
import './styles/theme.css';
import './styles/globals.css';

import App from './App';
import { queryClient } from './config/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <App />
              <Toaster
                position="top-right"
                containerStyle={{ zIndex: 1400 }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))',
                    borderRadius: '12px',
                    fontSize: '14px',
                    maxWidth: '380px',
                  },
                  success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
                }}
              />
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
