// Migrated from Next.js app/history/page.tsx to Vite SPA

// React hooks coordinate filtering, debounced search, and infinite scrolling.
import * as React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
// Icons used in search, rows, and action buttons.
import { Search, Image as ImageIcon, Eye, RefreshCw } from "lucide-react"
import { FaFacebook } from "react-icons/fa"
// Toasts for success/error feedback.
import { toast } from "sonner"
// Auth context for token.
import { useAuth } from "@/context/auth-context"

// UI primitives for table controls, tabs, and loading skeletons.
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

// Backend API base URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Local Component for Skeleton Loaders
function HistorySkeletonRows({ count }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`skel-${i}`} className="bg-white animate-in fade-in duration-500 ease-in-out">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-3 w-[60px]" />
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-10 w-10 rounded-md flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-slate-300/50" />
            </Skeleton>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-[300px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-6 w-[100px] rounded-full" />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right">
            <div className="flex justify-end">
              <Skeleton className="h-8 w-[100px] rounded-md flex items-center justify-center gap-2">
                <Eye className="h-3.5 w-3.5 text-slate-300/50" />
                <div className="h-2 w-10 bg-slate-300/50 rounded-sm"></div>
              </Skeleton>
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function History() {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState("published")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isRescheduling, setIsRescheduling] = useState(null)

  // Memoized auth headers
  const authHeaders = useMemo(() => {
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" }
  }, [session?.access_token])

  // Shared API wrapper
  const callApi = async (path, options = {}) => {
    if (!session?.access_token) throw new Error("You are not authenticated.")
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...authHeaders, ...(options.headers || {}) },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || payload.error || "Request failed.")
    return payload
  }

  // Fetch history data
  const fetchHistory = useCallback(async (isNewSearch = false) => {
    try {
      if (!session?.access_token) return
      setIsLoading(true)
      
      const status = activeTab === "published" ? "pushed" : "failed"
      const currentPage = isNewSearch ? 1 : page
      const url = `/history?status=${status}&search=${debouncedSearch}&page=${currentPage}&limit=10`
      
      const data = await callApi(url)
      
      setPosts(prev => isNewSearch ? data.posts : [...prev, ...data.posts])
      setHasMore(data.pagination.hasMore)
      if (isNewSearch) setPage(1)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.access_token, activeTab, debouncedSearch, page])

  // Reschedule failed post
  const handleReschedule = async (id) => {
    try {
      setIsRescheduling(id)
      const data = await callApi(`/history/${id}/reschedule`, { method: "POST" })
      setPosts(prev => prev.filter(p => p.id !== id))
      toast.success(data.message || "Post rescheduled for retry.")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRescheduling(null)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Initial load and tab/search switch
  useEffect(() => {
    if (!session?.access_token) return
    fetchHistory(true)
  }, [session?.access_token, activeTab, debouncedSearch])

  // Handle infinite scroll
  useEffect(() => {
    if (page > 1) {
      fetchHistory(false)
    }
  }, [page])

  const observer = useRef()
  const lastPostElementRef = useCallback(node => {
    if (isLoading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, hasMore])

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Post History & Logs</h1>
            <p className="text-sm text-gray-500">The immutable ledger of all your published and failed content.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search logs..." 
                className="pl-9 bg-gray-50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="published" className="data-[state=active]:text-emerald-700">🟢 Published</TabsTrigger>
                <TabsTrigger value="failed" className="data-[state=active]:text-red-700">🔴 Cancelled / Failed</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date & Time</th>
                      <th className="px-6 py-3 font-medium">Visual</th>
                      <th className="px-6 py-3 font-medium">Caption</th>
                      <th className="px-6 py-3 font-medium">Target</th>
                      <th className="px-6 py-3 font-medium">{activeTab === 'published' ? 'Status' : 'Error Reason'}</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {posts.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm mx-4 mb-4 animate-in fade-in zoom-in-95 duration-500">
                             <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-md">
                               <Search className="h-10 w-10 text-indigo-400" />
                             </div>
                             <h3 className="text-2xl font-bold text-slate-900 mb-3">No logs found</h3>
                             <p className="text-slate-500 max-w-md mx-auto text-base">
                               {searchQuery ? `We couldn't find any historical records matching your search.` : `No ${activeTab} posts history available.`}
                             </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {posts.map((post, index) => {
                          const isLast = index === posts.length - 1;
                          const dateObj = new Date(post.scheduled_publish_time)
                          const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

                          return (
                            <tr ref={isLast ? lastPostElementRef : null} key={post.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{dateStr}</div>
                                <div className="text-gray-500">{timeStr}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="h-10 w-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                  {post.image_url ? (
                                    <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-5 w-5" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-gray-600 line-clamp-2 max-w-md">{post.caption}</p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                              </td>
                              <td className="px-6 py-4">
                                {activeTab === 'published' ? (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Published Live
                                  </Badge>
                                ) : (
                                  <span className="text-red-600 font-medium font-mono text-xs bg-red-50 px-2 py-1 rounded">
                                    {post.error_log || 'Unknown Error'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                {activeTab === 'published' ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                                    onClick={() => post.native_post_id && window.open(`https://facebook.com/${post.native_post_id}`, '_blank')}
                                  >
                                    <Eye className="mr-2 h-4 w-4" /> View Live
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={isRescheduling === post.id}
                                    className="text-gray-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50"
                                    onClick={() => handleReschedule(post.id)}
                                  >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isRescheduling === post.id ? 'animate-spin' : ''}`} />
                                    {isRescheduling === post.id ? 'Rescheduling...' : 'Reschedule'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {isLoading && <HistorySkeletonRows count={3} />}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
