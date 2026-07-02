import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </GoogleOAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
