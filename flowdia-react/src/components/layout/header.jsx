/**
 * @file header.jsx
 * @description The top action header bar for the Flowdia Vite SPA.
 * Contains notification center, sync stats button, and post creator trigger.
 *
 * Migrated from: components/layout/header.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive
 *   - Stripped TypeScript NotificationPermission type annotation
 */

import { Bell, Zap, XCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ManualPostCreator } from "@/components/manual-post-creator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { callApi } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

export function Header() {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('loading')
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const { session } = useAuth()

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    if (!session?.access_token) return
    try {
      setIsLoading(true)
      const data = await callApi('/notifications', {}, session)
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await callApi(`/notifications/${id}/read`, { method: 'PATCH' }, session)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await callApi('/notifications/mark-all-read', { method: 'PATCH' }, session)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission('denied')
    }

    if (session?.access_token) {
      fetchNotifications()
      // Optional: Poll every 2 minutes
      const interval = setInterval(fetchNotifications, 120000)
      return () => clearInterval(interval)
    }
  }, [session?.access_token])

  const handleEnableNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'success': return <CheckCircle2 className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getIconColor = (type) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-600'
      case 'warning': return 'bg-amber-100 text-amber-600'
      case 'success': return 'bg-emerald-100 text-emerald-600'
      default: return 'bg-blue-100 text-blue-600'
    }
  }

  const getBgColor = (type, isRead) => {
    if (isRead) return 'hover:bg-gray-50'
    switch (type) {
      case 'error': return 'bg-red-50/50 hover:bg-red-50'
      case 'warning': return 'bg-amber-50/30 hover:bg-amber-50'
      case 'success': return 'bg-emerald-50/30 hover:bg-emerald-50'
      default: return 'bg-blue-50/30 hover:bg-blue-50'
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* System Alerts Banner */}
      {(notificationPermission === 'default' || notificationPermission === 'denied') && (
        <div className="flex items-center justify-between bg-amber-50 px-6 py-2.5 border-b border-amber-200">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            Push notifications are disabled. Please check your Bell Icon regularly for notifications.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </Button>
        </div>
      )}

      {/* Top Action Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-4">
          {/* Page titles are handled by individual page components */}
        </div>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
                <Bell className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="flex flex-col max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500">No notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                      className={`flex items-start gap-4 p-4 border-b border-gray-100 transition-colors cursor-pointer ${getBgColor(notification.type, notification.is_read)}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getIconColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className={`text-sm leading-tight ${notification.is_read ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${
                            notification.type === 'error' ? 'text-red-600' : 
                            notification.type === 'warning' ? 'text-amber-600' : 
                            notification.type === 'success' ? 'text-emerald-600' : 
                            'text-blue-600'
                          }`}>
                            {notification.type} • {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {notification.action_url && (
                            <Button 
                              variant="link" 
                              className="h-auto p-0 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = notification.action_url
                              }}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="secondary" className="gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            Sync Stats
          </Button>

          <Button onClick={() => setIsCreatorOpen(true)}>
            Create Post
          </Button>
        </div>
      </header>

      {/* Manual Post Creator Modal */}
      <ManualPostCreator open={isCreatorOpen} onOpenChange={setIsCreatorOpen} />
    </div>
  )
}

