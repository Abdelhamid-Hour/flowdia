/**
 * @file Dashboard.jsx
 * @description The main dashboard page for the Flowdia Vite SPA.
 * Displays KPI cards, action hub banners, scheduled posts timeline,
 * platform connection status, and recent performance wins.
 *
 * Migrated from: app/dashboard/page.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive
 *   - Removed `export default` function declaration style → kept as default export
 *   - Updated file header to reflect Vite SPA role
 */

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarClock, Activity, Sparkles, ServerCrash, AlertTriangle, CheckCircle, XCircle, TrendingUp
} from "lucide-react"
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa"

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">

      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <CalendarClock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-500">Next 7 Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Pulse</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-gray-500">Total Interactions (Last 7 Days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Credit Usage</CardTitle>
            <Sparkles className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45<span className="text-lg text-gray-500 font-normal">/100</span></div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: "45%" }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <ServerCrash className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              Active
            </div>
            <p className="text-xs text-gray-500 mt-1">Connections: 3/3 Active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Row 2 Left: Action Hub (60%) */}
        <div className="md:col-span-7 space-y-6">

          {/* Needs Attention Banner */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between sm:flex-row flex-col gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  <span className="font-bold">2 upcoming posts</span> were scheduled.
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-white border-amber-200 text-amber-700 hover:bg-amber-100">Keep</Button>
                <Button size="sm" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">View Topics</Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Up Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Next Up</CardTitle>
              <CardDescription>Your scheduled posts timeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Timeline Item 1 */}
                <div className="flex gap-4 items-start relative before:absolute before:left-5 before:top-10 before:h-[calc(100%-20px)] before:w-[2px] before:bg-gray-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white z-10">
                    <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                  </div>
                  <div className="flex-1 space-y-2 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Today at 18:00</p>
                      <Badge variant="secondary">Scheduled</Badge>
                    </div>
                    <div className="flex gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="h-12 w-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-500">Img</div>
                      <p className="text-sm text-gray-600 line-clamp-2">Excited to announce our new SaaS features dropping next week! We've listened to your feedback and built something amazing. 🚀 #SaaS #Tech</p>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="flex gap-4 items-start relative before:absolute before:left-5 before:top-10 before:h-[calc(100%-20px)] before:w-[2px] before:bg-gray-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 ring-4 ring-white z-10">
                    <FaInstagram className="h-5 w-5 text-[#E4405F]" />
                  </div>
                  <div className="flex-1 space-y-2 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Tomorrow at 12:00</p>
                      <Badge variant="secondary">Scheduled</Badge>
                    </div>
                    <div className="flex gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="h-12 w-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-500">Vid</div>
                      <p className="text-sm text-gray-600 line-clamp-2">Behind the scenes at Flowdia HQ! Building the future of social automation. ✨</p>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 3 */}
                <div className="flex gap-4 items-start relative">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 ring-4 ring-white z-10">
                    <FaYoutube className="h-5 w-5 text-[#FF0000]" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Thursday at 15:30</p>
                      <Badge variant="outline">Draft</Badge>
                    </div>
                    <div className="flex gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="h-12 w-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-500">Thumb</div>
                      <p className="text-sm text-gray-600 line-clamp-2">Full Tutorial: How to 10x your social reach using AI automation workflows. Don't miss this one! 📈</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 Right: Health & Performance (40%) */}
        <div className="md:col-span-5 space-y-6">

          {/* Platform Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Status</CardTitle>
              <CardDescription>Your connected social accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-50 p-2"><FaFacebook className="h-4 w-4 text-[#1877F2]" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Facebook Page</p>
                    <p className="text-xs text-gray-500">Flowdia Official</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle className="h-4 w-4" /> Connected</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-pink-50 p-2"><FaInstagram className="h-4 w-4 text-[#E4405F]" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Instagram</p>
                    <p className="text-xs text-gray-500">@flowdia_app</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle className="h-4 w-4" /> Connected</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-red-50 p-2"><FaYoutube className="h-4 w-4 text-[#FF0000]" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">YouTube Channel</p>
                    <p className="text-xs text-gray-500">Flowdia App</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">Reconnect</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Wins */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Wins</CardTitle>
              <CardDescription>Top performing posts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">"5 Ways AI saves you 10 hours a week..."</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500"><FaFacebook className="h-3 w-3 text-[#1877F2]" /> 2 days ago</div>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><TrendingUp className="h-3 w-3" /> +45%</div>
                </div>
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">"Feature update: Auto-sync is live!"</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500"><FaInstagram className="h-3 w-3 text-[#E4405F]" /> 5 days ago</div>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><TrendingUp className="h-3 w-3" /> +22%</div>
                </div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">"How we built Flowdia in 30 days"</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500"><FaYoutube className="h-3 w-3 text-[#FF0000]" /> 1 week ago</div>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><TrendingUp className="h-3 w-3" /> +18%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
