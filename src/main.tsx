import React from 'react'
import ReactDOM from 'react-dom/client'
import { DesignSystemDemoPage } from './components/DesignSystemDemoPage'
import { DesignSystemProvider } from './contexts/DesignSystemContext'
import './styles/index.css'
import './styles/design-system.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesignSystemProvider>
      <DesignSystemDemoPage />
    </DesignSystemProvider>
  </React.StrictMode>,
)

