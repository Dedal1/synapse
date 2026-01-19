import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import Success from './Success.jsx'
import ResourcePage from './ResourcePage.jsx'
import PrivacyPolicy from './PrivacyPolicy.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/resource/:id" element={<ResourcePage />} />
          <Route path="/success" element={<Success />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
