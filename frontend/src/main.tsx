import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CryptoSessionProvider } from './contexts/CryptoContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <CryptoSessionProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CryptoSessionProvider>
    </ToastProvider>
  </StrictMode>,
)