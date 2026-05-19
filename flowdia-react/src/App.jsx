/**
 * @file App.jsx
 * @description Root application component for the Flowdia Vite SPA.
 * Sets up the BrowserRouter for client-side routing, wraps the app
 * in the MockDbProvider for state management, and defines the main
 * layout structure (Sidebar + Header + page content via Outlet).
 *
 * This replaces the Next.js App Router's layout.tsx and routing system.
 */

import { useEffect, useMemo, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Toaster } from "sonner"
import { Bot } from "lucide-react"

// Context Providers
import { AuthProvider, useAuth } from "@/context/auth-context"
import { MockDbProvider } from "@/context/mock-db-context"

// Layout Components
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Page Components
import Dashboard from "@/pages/Dashboard"
import TopicManager from "@/pages/TopicManager"
import Calendar from "@/pages/Calendar"
import History from "@/pages/History"
import AutomationSettings from "@/pages/AutomationSettings"
import Profile from "@/pages/Profile"
import Login from "@/pages/Login"
import FacebookCallback from "@/pages/FacebookCallback"

/**
 * @component ProtectedRoute
 * @description A wrapper for routes that require authentication.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // While auth state is initializing, keep a neutral loading screen.
  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  // Redirect anonymous users to the login page.
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
        {/* First-login onboarding is global and appears once after initial sign-in. */}
        <FirstLoginOnboarding />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * @component FirstLoginOnboarding
 * @description Shows onboarding once per authenticated user (persisted in localStorage).
 */
function FirstLoginOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Key is user-scoped so each account gets its own first-login onboarding.
  const storageKey = useMemo(() => {
    if (!user?.id) return null
    return `flowdia-onboarding-seen-${user.id}`
  }, [user?.id])

  // Open the modal only when no persisted "seen" marker exists.
  useEffect(() => {
    if (!storageKey) return
    const hasSeen = window.localStorage.getItem(storageKey) === "1"
    setOpen(!hasSeen)
  }, [storageKey])

  // Marks onboarding as seen and closes modal.
  const markSeen = (goToAutomation = false) => {
    if (storageKey) {
      window.localStorage.setItem(storageKey, "1")
    }
    setOpen(false)
    if (goToAutomation && location.pathname !== "/automation-settings") {
      navigate("/automation-settings")
    }
  }

  // Do not render dialog until we know the active user.
  if (!user?.id) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Closing manually should still mark onboarding as completed once.
        if (!nextOpen) {
          markSeen()
          return
        }
        setOpen(nextOpen)
      }}
    >
      <DialogContent className="max-w-md text-center p-8">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">Welcome to Flowdia</DialogTitle>
          <DialogDescription className="text-base text-gray-500 mb-6">
            Start by configuring your automation rules so topic generation and scheduling follow your workflow.
          </DialogDescription>
        </DialogHeader>
        <Button size="lg" className="w-full" onClick={() => markSeen(true)}>
          Let's Configure Automation
        </Button>
      </DialogContent>
    </Dialog>
  )
}

/**
 * @component App
 * @description The root component that assembles providers, routing, and layout.
 */
function App() {
  return (
    // BrowserRouter enables client-side navigation without full page reloads.
    <BrowserRouter>
      {/* AuthProvider exposes session and auth actions across the app. */}
      <AuthProvider>
        {/* MockDbProvider powers in-memory app data used by the demo pages. */}
        <MockDbProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/facebook/callback" element={<FacebookCallback />} />

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
          {/* Global toast notifications mount once at app root. */}
          <Toaster position="bottom-right" richColors closeButton />
        </MockDbProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
