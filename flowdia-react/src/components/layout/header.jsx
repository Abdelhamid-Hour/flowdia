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

export function Header() {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('loading')

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission('denied')
    }
  }, [])

  const handleEnableNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
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
                <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                <Bell className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <button className="text-xs font-medium text-gray-500 hover:text-gray-900">Mark all as read</button>
              </div>
              <div className="flex flex-col max-h-[400px] overflow-y-auto">
                {/* Critical Notification */}
                <div className="flex items-start gap-4 p-4 border-b border-gray-100 bg-red-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 leading-tight">OAuth Token Expired for Facebook.</p>
                    <p className="text-xs text-gray-500">Flowdia can no longer publish to your Facebook page. Please reconnect immediately.</p>
                    <p className="text-[10px] font-medium text-red-600 mt-1 uppercase tracking-wider">Critical • 10m ago</p>
                  </div>
                </div>

                {/* Action Required Notification */}
                <div className="flex items-start gap-4 p-4 border-b border-gray-100 bg-amber-50/30 hover:bg-gray-50 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900 leading-tight">5 Daily Topics were scheduled.</p>
                      <p className="text-[10px] font-medium text-amber-600 mt-1 uppercase tracking-wider">Action Required • 2h ago</p>
                    </div>
                    <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs">View Topics</Button>
                  </div>
                </div>

                {/* System Info Notification */}
                <div className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 leading-tight">Flowdia drafted topics for next month!</p>
                    <p className="text-xs text-gray-500">The AI successfully completed its generation cycle based on your current settings.</p>
                    <p className="text-[10px] font-medium text-blue-600 mt-1 uppercase tracking-wider">System • 1d ago</p>
                  </div>
                </div>
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
