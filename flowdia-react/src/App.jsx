/**
 * @file App.jsx
 * @description Root application component for the Flowdia Vite SPA.
 * Sets up the BrowserRouter for client-side routing, wraps the app
 * in the MockDbProvider for state management, and defines the main
 * layout structure (Sidebar + Header + page content via Outlet).
 *
 * This replaces the Next.js App Router's layout.tsx and routing system.
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { Toaster } from "sonner"

// Context Providers
import { AuthProvider, useAuth } from "@/context/auth-context"
import { MockDbProvider } from "@/context/mock-db-context"

// Layout Components
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

// Page Components
import Dashboard from "@/pages/Dashboard"
import TopicManager from "@/pages/TopicManager"
import Calendar from "@/pages/Calendar"
import History from "@/pages/History"
import AutomationSettings from "@/pages/AutomationSettings"
import Profile from "@/pages/Profile"
import Login from "@/pages/Login"

/**
 * @component ProtectedRoute
 * @description A wrapper for routes that require authentication.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

/**
 * @component Layout
 * @description The shell layout that wraps all authenticated pages.
 */
function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * @component App
 * @description The root component that assembles providers, routing, and layout.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MockDbProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/topic-manager" element={<TopicManager />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/history" element={<History />} />
              <Route path="/automation-settings" element={<AutomationSettings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          <Toaster position="bottom-right" richColors closeButton />
        </MockDbProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
