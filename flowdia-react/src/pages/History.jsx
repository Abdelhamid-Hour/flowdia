// Migrated from Next.js app/history/page.tsx to Vite SPA

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Image as ImageIcon, Eye, RefreshCw } from "lucide-react"
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

// Mock Data
const publishedPosts = [
  { id: 1, date: "Apr 22, 2026", time: "18:00", caption: "Excited to announce our new SaaS features dropping next week! 🚀 #SaaS", platform: "FB", status: "Published Live" },
  { id: 2, date: "Apr 21, 2026", time: "12:00", caption: "Behind the scenes at Flowdia HQ! ✨", platform: "IG", status: "Published Live" },
  { id: 3, date: "Apr 19, 2026", time: "09:00", caption: "Full tutorial on mastering the calendar module.", platform: "YT", status: "Deleted Externally" },
]

const failedPosts = [
  { id: 4, date: "Apr 20, 2026", time: "15:00", caption: "Don't miss our Q&A session tomorrow!", platform: "FB", error: "OAuth Token Expired" },
  { id: 5, date: "Apr 18, 2026", time: "10:30", caption: "5 Ways AI saves you 10 hours a week...", platform: "IG", error: "Rate Limit Exceeded" },
]

export default function History() {
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [isSearching, setIsSearching] = useState(false)
  const [displayedPosts, setDisplayedPosts] = useState(publishedPosts)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Business Logic: Intersection Observer for infinite scrolling
  const observer = useRef()
  const lastPostElementRef = useCallback(node => {
    if (isLoading) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    
    if (node) observer.current.observe(node)
  }, [isLoading, hasMore])

  // Business Logic: Simulate paginated network fetching
  useEffect(() => {
    if (page === 1) return // Skip initial render since data is preloaded

    setIsLoading(true)
    
    // Simulate network latency
    const timer = setTimeout(() => {
      const newPosts = []
      // Generate a mock chunk of 5 past posts
      for (let i = 1; i <= 5; i++) {
        const idOffset = displayedPosts.length + i
        newPosts.push({
          id: `hist-${Date.now()}-${i}`,
          date: `Mar ${Math.max(1, 30 - idOffset)}, 2026`,
          time: "10:00",
          caption: `Historically loaded post from archive block #${page}...`,
          platform: ["FB", "IG", "YT"][Math.floor(Math.random() * 3)],
          status: "Published Live"
        })
      }

      setDisplayedPosts(prev => [...prev, ...newPosts])
      setIsLoading(false)
      
      // Arbitrary limit for the mock behavior
      if (page >= 3) setHasMore(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [page])

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1)
  }, [platformFilter, searchQuery])

  // Business Logic: Debounce search input to display skeleton loading state
  useEffect(() => {
    if (searchQuery.length > 0) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Business Logic: Filter the posts based on the search query string and platform
  const filteredPublishedPosts = displayedPosts.filter(post => {
    const matchesSearch = post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.platform.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === "all" || post.platform === platformFilter
    return matchesSearch && matchesPlatform
  })

  const filteredFailedPosts = failedPosts.filter(post => {
    const matchesSearch = post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.error.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.platform.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === "all" || post.platform === platformFilter
    return matchesSearch && matchesPlatform
  })

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
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px] bg-gray-50">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="FB">Facebook</SelectItem>
                <SelectItem value="IG">Instagram</SelectItem>
                <SelectItem value="YT">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-6xl">
          <Tabs defaultValue="published" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="published" className="data-[state=active]:text-emerald-700">🟢 Published</TabsTrigger>
                <TabsTrigger value="failed" className="data-[state=active]:text-red-700">🔴 Cancelled / Failed</TabsTrigger>
              </TabsList>
            </div>

            {/* Published Tab */}
            <TabsContent value="published" className="mt-0">
              <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date & Time</th>
                      <th className="px-6 py-3 font-medium">Visual</th>
                      <th className="px-6 py-3 font-medium">Caption</th>
                      <th className="px-6 py-3 font-medium">Target</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {isSearching ? (
                      <HistorySkeletonRows count={3} />
                    ) : filteredPublishedPosts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm mx-4 mb-4 animate-in fade-in zoom-in-95 duration-500">
                             <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-md">
                               <Search className="h-10 w-10 text-indigo-400" />
                             </div>
                             <h3 className="text-2xl font-bold text-slate-900 mb-3">No logs found</h3>
                             <p className="text-slate-500 max-w-md mx-auto text-base">
                               {searchQuery || platformFilter !== "all" ? `We couldn't find any historical records matching your filters.` : "No published posts history available."}
                             </p>
                             {(searchQuery || platformFilter !== "all") && (
                               <Button 
                                 variant="outline" 
                                 className="mt-8 border-slate-300 hover:bg-slate-100 px-6 h-10 shadow-sm"
                                 onClick={() => {
                                   setSearchQuery("")
                                   setPlatformFilter("all")
                                 }}
                               >
                                 Clear Filters
                               </Button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filteredPublishedPosts.map((post, index) => {
                          const isLast = index === filteredPublishedPosts.length - 1;
                          return (
                        <tr ref={isLast ? lastPostElementRef : null} key={post.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{post.date}</div>
                            <div className="text-gray-500">{post.time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-600 line-clamp-2 max-w-md">{post.caption}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {post.platform === "FB" && <FaFacebook className="h-5 w-5 text-[#1877F2]" />}
                            {post.platform === "IG" && <FaInstagram className="h-5 w-5 text-[#E4405F]" />}
                            {post.platform === "YT" && <FaYoutube className="h-5 w-5 text-[#FF0000]" />}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className={post.status === 'Published Live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                              {post.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button variant="outline" size="sm" className="text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50">
                              <Eye className="mr-2 h-4 w-4" /> View Live
                            </Button>
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

            {/* Failed Tab */}
            <TabsContent value="failed" className="mt-0">
              <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-medium">Original Date</th>
                      <th className="px-6 py-3 font-medium">Visual</th>
                      <th className="px-6 py-3 font-medium">Caption</th>
                      <th className="px-6 py-3 font-medium">Target</th>
                      <th className="px-6 py-3 font-medium">Error Reason</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {isSearching ? (
                      <HistorySkeletonRows count={3} />
                    ) : filteredFailedPosts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm mx-4 mb-4 animate-in fade-in zoom-in-95 duration-500">
                             <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-md">
                               <Search className="h-10 w-10 text-indigo-400" />
                             </div>
                             <h3 className="text-2xl font-bold text-slate-900 mb-3">No logs found</h3>
                             <p className="text-slate-500 max-w-md mx-auto text-base">
                               {searchQuery || platformFilter !== "all" ? `We couldn't find any historical records matching your filters.` : "No failed posts history available."}
                             </p>
                             {(searchQuery || platformFilter !== "all") && (
                               <Button 
                                 variant="outline" 
                                 className="mt-8 border-slate-300 hover:bg-slate-100 px-6 h-10 shadow-sm"
                                 onClick={() => {
                                   setSearchQuery("")
                                   setPlatformFilter("all")
                                 }}
                               >
                                 Clear Filters
                               </Button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filteredFailedPosts.map((post) => (
                          <tr key={post.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{post.date}</div>
                          <div className="text-gray-500">{post.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 line-clamp-2 max-w-md">{post.caption}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {post.platform === "FB" && <FaFacebook className="h-5 w-5 text-[#1877F2]" />}
                          {post.platform === "IG" && <FaInstagram className="h-5 w-5 text-[#E4405F]" />}
                          {post.platform === "YT" && <FaYoutube className="h-5 w-5 text-[#FF0000]" />}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-red-600 font-medium font-mono text-xs bg-red-50 px-2 py-1 rounded">{post.error}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button variant="outline" size="sm" className="text-gray-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50">
                            <RefreshCw className="mr-2 h-4 w-4" /> Reschedule
                          </Button>
                        </td>
                          </tr>
                        ))}
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
