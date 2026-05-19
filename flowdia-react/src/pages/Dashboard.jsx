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

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { callApi } from "@/lib/api"
import { format, isToday, isTomorrow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarClock, Activity, Sparkles, ServerCrash, AlertTriangle, CheckCircle, TrendingUp, XCircle, Image as ImageIcon
} from "lucide-react"
import { FaFacebook } from "react-icons/fa"
import { toast } from "sonner"
import { Link } from "react-router"

export default function Dashboard() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!session?.access_token) return;
      try {
        const response = await callApi('/analytics/overview', {}, session);
        setData(response.data);
      } catch (error) {
        toast.error("Failed to load dashboard data: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [session]);

  const formatPostDate = (isoString) => {
    const d = new Date(isoString);
    let dayStr = format(d, 'MMM d');
    if (isToday(d)) dayStr = 'Today';
    else if (isTomorrow(d)) dayStr = 'Tomorrow';
    return `${dayStr} at ${format(d, 'HH:mm')}`;
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[200px] w-full" /></div>;
  }

  const kpis = data?.kpis || { scheduled: 0, pushed: 0, failed: 0, interactions: 0 };
  const connection = data?.connection || { active: false, pageName: 'Not Connected', isExpiringSoon: false };
  const upcomingPosts = data?.upcomingPosts || [];
  const recentWins = data?.recentWins || [];

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
            <div className="text-2xl font-bold">{kpis.scheduled}</div>
            <p className="text-xs text-gray-500">Upcoming in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Pulse</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.interactions.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Estimated Interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Published</CardTitle>
            <Sparkles className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pushed}</div>
            <p className="text-xs text-gray-500">Successfully sent to FB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <ServerCrash className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className={`flex h-3 w-3 rounded-full ring-4 ${connection.active ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-red-500 ring-red-500/20'}`} />
              {connection.active ? 'Active' : 'Offline'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Facebook: {connection.pageName}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Row 2 Left: Action Hub (60%) */}
        <div className="md:col-span-7 space-y-6">

          {/* Expiring Soon Banner */}
          {connection.isExpiringSoon && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 flex items-center justify-between sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800">
                    Your <span className="font-bold">Facebook connection</span> is expiring within 7 days.
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link to="/profile">
                    <Button size="sm" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white">Reconnect Now</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Needs Attention Banner */}
          {kpis.failed > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center justify-between sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">
                    <span className="font-bold">{kpis.failed} posts</span> failed to publish natively.
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link to="/history">
                    <Button size="sm" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">Review Errors</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Up Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Next Up</CardTitle>
              <CardDescription>Your Facebook scheduled posts timeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {upcomingPosts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border border-dashed rounded-lg">
                    No posts currently scheduled in the queue.
                  </div>
                ) : upcomingPosts.map((post, index) => (
                  <div key={post.id} className={`flex gap-4 items-start relative ${index !== upcomingPosts.length - 1 ? 'before:absolute before:left-5 before:top-10 before:h-[calc(100%-20px)] before:w-[2px] before:bg-gray-100' : ''}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white z-10">
                      <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                    </div>
                    <div className="flex-1 space-y-2 pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{formatPostDate(post.scheduled_publish_time)}</p>
                        <Badge variant="secondary" className="capitalize">{post.status}</Badge>
                      </div>
                      <div className="flex gap-3 rounded-lg border border-gray-100 p-3 bg-white">
                        <div className="h-12 w-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                          {post.image_url && post.image_url.startsWith('http') ? (
                            <img src={post.image_url} alt="Thumbnail" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
              <CardDescription>Your connected Facebook account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-md p-2 ${connection.active ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <FaFacebook className={`h-4 w-4 ${connection.active ? 'text-[#1877F2]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Facebook Page</p>
                    <p className="text-xs text-gray-500">{connection.pageName}</p>
                  </div>
                </div>
                {connection.active ? (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle className="h-4 w-4" /> Connected</div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-red-600"><XCircle className="h-4 w-4" /> Offline</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Wins */}
          <Card>
            <CardHeader>
              <CardTitle>Recent History</CardTitle>
              <CardDescription>Your latest published posts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWins.length === 0 ? (
                   <div className="text-center py-6 text-gray-500 border border-dashed rounded-lg text-sm">
                      No posts published yet.
                   </div>
                ) : recentWins.map((post) => (
                  <div key={post.id} className="flex items-start justify-between border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.caption}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500"><FaFacebook className="h-3 w-3 text-[#1877F2]" /> {format(new Date(post.scheduled_publish_time), 'MMM d, yyyy')}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><CheckCircle className="h-3 w-3" /> Sent</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
