import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AIStatusProvider } from './context/AIStatusContext'
import { AppProvider } from './context/AppContext'
import './i18n'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AIStatusProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AIStatusProvider>
    </BrowserRouter>
  </StrictMode>,
)
