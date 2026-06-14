import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import { DataProvider } from './context/DataContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <DataProvider>
          {/* reducedMotion="user" makes every Framer Motion component respect the
              OS "reduce motion" setting: transform/layout movement is dropped,
              opacity fades are kept. */}
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </DataProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
