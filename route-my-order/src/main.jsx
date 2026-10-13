import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

const getBasename = () => {
  if (typeof window !== 'undefined') {
    if (window.location.pathname.includes('/demo/order-management/route-my-order')) {
      return '/demo/order-management/route-my-order'
    }
    if (window.location.pathname.includes('/route-my-order')) {
      return '/route-my-order'
    }
  }
  return '/'
}

const isHash = typeof window !== 'undefined' && window.location.hash.startsWith('#/')
const RouterComponent = isHash ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterComponent basename={isHash ? undefined : getBasename()}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </RouterComponent>
  </React.StrictMode>
)
