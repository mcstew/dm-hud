import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import App from './App.jsx'
import Auth from './components/Auth.jsx'
import Landing from './components/Landing.jsx'
import AdminPanel from './admin/AdminPanel.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/admin/*" element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } />
          <Route path="/app/*" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
