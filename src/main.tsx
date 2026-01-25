import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './components/App'
import { DesignSystemProvider } from './contexts/DesignSystemContext'
import { AuthProvider } from './contexts/AuthContext'
import './styles/index.css'
import './styles/design-system.css'
import './styles/calendar.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
    </AuthProvider>
  </React.StrictMode>,
)

