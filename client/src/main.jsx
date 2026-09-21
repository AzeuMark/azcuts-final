import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

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
                position="bottom-right"
                containerStyle={{ zIndex: 1400 }}
                toastOptions={{
                  duration: 5000,
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
              >
                {(t) => (
                  <ToastBar toast={t}>
                    {({ icon, message }) => (
                      <span className="flex w-full items-center gap-2">
                        {icon}
                        <span className="min-w-0 flex-1">{message}</span>
                        <button
                          type="button"
                          onClick={() => toast.dismiss(t.id)}
                          aria-label="Dismiss notification"
                          className="shrink-0 rounded-md p-1 text-danger/70 transition-colors hover:bg-surface-2 hover:text-danger focus-ring"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </ToastBar>
                )}
              </Toaster>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
