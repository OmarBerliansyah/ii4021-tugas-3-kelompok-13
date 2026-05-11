import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CryptoSessionProvider } from './contexts/CryptoContext'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CryptoSessionProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </CryptoSessionProvider>
  </StrictMode>,
)