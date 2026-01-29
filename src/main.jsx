import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { CupomProvider } from './context/CupomContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CupomProvider>
      <App />
    </CupomProvider>
  </React.StrictMode>,
)