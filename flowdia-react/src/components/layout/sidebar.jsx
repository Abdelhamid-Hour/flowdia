/**
 * @file sidebar.jsx
 * @description The main navigation sidebar for the Flowdia Vite SPA.
 * Renders primary and bottom navigation links with active state highlighting.
 * Supports collapse/expand toggle for a compact view.
 *
 * Migrated from: components/layout/sidebar.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive
 *   - Replaced `next/link` with `<Link>` from `react-router-dom`
 *   - Replaced `usePathname()` with `useLocation()` from `react-router-dom`
 *   - Changed `href` prop to `to` prop on all `<Link>` components
 *   - Stripped all TypeScript annotations
 */

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard, Settings, Hash, CalendarDays, History, UserCircle, ChevronLeft, ChevronRight, LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"

const topNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Topic Manager", href: "/topic-manager", icon: Hash },
  { name: "Editorial Calendar", href: "/calendar", icon: CalendarDays },
  { name: "History & Logs", href: "/history", icon: History },
  { name: "Automation Settings", href: "/automation-settings", icon: Settings },
]

const bottomNavigation = [
  { name: "Settings & Profile", href: "/profile", icon: UserCircle },
]

export function Sidebar() {
  const { signOut } = useAuth()
  // useLocation replaces Next.js usePathname for reading the current route
  const location = useLocation()
  const pathname = location.pathname
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-6 overflow-hidden">
        <span className={cn("text-xl font-bold tracking-tight text-gray-900 transition-opacity duration-300", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
          Flowdia
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors",
            isCollapsed && "mx-auto"
          )}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col px-4 py-4 overflow-y-auto overflow-x-hidden">
        {/* Top Navigation Group */}
        <div className="flex flex-col gap-1">
          {topNavigation.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard')
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Bottom Navigation Group */}
        <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-gray-100 mb-4">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
          
          <button
            onClick={() => signOut()}
            className={cn(
              "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors text-red-600 hover:bg-red-50",
              isCollapsed ? "justify-center" : "gap-3"
            )}
            title={isCollapsed ? "Log Out" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-400 group-hover:text-red-600" />
            {!isCollapsed && <span className="truncate">Log Out</span>}
          </button>
        </div>
      </nav>
    </div>
  )
}
