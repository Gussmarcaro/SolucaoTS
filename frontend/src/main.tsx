import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissoesProvider } from '@/contexts/PermissoesContext';
import App from '@/App';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        {/* Dentro do Auth: a consulta das permissões precisa do token. */}
        <PermissoesProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PermissoesProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
