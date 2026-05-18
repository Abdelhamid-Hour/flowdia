/**
 * @file Topic Manager Page
 * @description The core interface for managing the AI-generated content roadmap. 
 * Architecturally, this acts as the "Brain" of Flowdia, where users review, approve, and sequence topics.
 * It connects to the global MockDbContext for state persistence and utilizes @dnd-kit for drag-and-drop timeline management.
 * The page unifies future planning (drag-and-drop) with historical versioning (archived topics).
 */

// Migrated from Next.js app/topic-manager/page.tsx to Vite SPA

import * as React from "react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Search, Sparkles, CheckCircle2, Calendar as CalendarIcon, Trash2, AlertTriangle, Lock, Star, GripVertical, Rocket } from "lucide-react"
import { toast } from "sonner"
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format, startOfWeek, endOfWeek, isWithinInterval, isSameDay, isSameMonth } from "date-fns"

import { useMockDb } from "@/context/mock-db-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// --- Local Skeleton Component ---
function TopicSkeletonRow() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm animate-in fade-in duration-500 ease-in-out mb-4">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center pt-1 text-slate-300/30">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
             <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-24 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
             </div>
             <Skeleton className="h-5 w-[60%] rounded-md" />
             <div className="space-y-1.5 mt-3">
               <Skeleton className="h-4 w-full rounded-sm" />
               <Skeleton className="h-4 w-[80%] rounded-sm" />
             </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0 items-end">
             <Skeleton className="h-8 w-8 rounded-full" />
             <Skeleton className="h-7 w-20 rounded-md mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Status badge config ---
/**
 * UI configuration map for Topic statuses. Centralizes styling for consistency.
 */
const statusConfig = {
  scheduled: { label: "Scheduled", className: "bg-amber-100 text-amber-800 border-amber-200" },
  in_use: { label: "In Use", className: "bg-blue-100 text-blue-800 border-blue-200" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-200" },
}

// --- Grouping helpers ---

/**
 * Calculates the label for a weekly group based on a date.
 * @param {string} dateStr - The target date string (YYYY-MM-DD).
 * @returns {string} Formatted label (e.g., "Week of April 20").
 */
function getWeekLabel(dateStr) {
  // Parse date safely at midnight to avoid timezone shifts
  const date = new Date(dateStr + "T00:00:00")
  const day = date.getDay()
  const monday = new Date(date)
  // Calculate the most recent Monday to act as the week's anchor
  monday.setDate(date.getDate() - ((day + 6) % 7))
  return `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
}

/**
 * Calculates a unique, sortable key for a weekly group.
 * @param {string} dateStr - The target date string (YYYY-MM-DD).
 * @returns {string} The ISO date string of the week's Monday.
 */
function getWeekKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  return monday.toISOString().split("T")[0]
}

/**
 * Calculates the label for a monthly group.
 * @param {string} dateStr - The target date string.
 * @returns {string} Formatted month label (e.g., "April 2026").
 */
function getMonthLabel(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/**
 * Calculates a unique, sortable key for a monthly group.
 * @param {string} dateStr - The target date string.
 * @returns {string} The YYYY-MM formatted string.
 */
function getMonthKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Formats a raw date string into a user-friendly display string.
 * @param {string} dateStr - The target date string.
 * @returns {string} Full human-readable date.
 */
function formatTargetDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

// --- Helpers ---

/**
 * Determines if a topic is in the future and allowed to be dragged/reordered.
 * @param {Topic} topic - The topic to evaluate.
 * @param {string} todayStr - Today's date as a string for comparison.
 * @returns {boolean} True if the topic is editable/draggable.
 */
function isFutureDraggable(topic, todayStr) {
  // Business logic: Only future, unarchived topics can be rescheduled via DnD.
  return topic.target_date >= todayStr && topic.status !== "archived"
}

// --- Main Page ---

/**
 * @component TopicManager
 * @description The main page component orchestrating the topic timeline, filters, and drag-and-drop context.
 * @returns {JSX.Element} The rendered Topic Manager interface.
 */
export default function TopicManager() {
  // Connect to the global mock database for centralized state management
  const { topics, setTopics, topicCycle, reorderTopicDates, setTopicInUse, versionTopic, generateTopics, rescheduleOverdueTopic, deleteTopic } = useMockDb()
  
  // Local UI state for modals and active filters
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [customDate, setCustomDate] = useState(undefined)

  // Local state for the dynamic generator
  const [topicCount, setTopicCount] = useState(1);

  // Pagination & Loading states
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Business Logic: Debounce search input to show skeleton loading state
  useEffect(() => {
    if (searchQuery.length > 0) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 500); // 500ms debounce simulation
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, dateFilter, customDate, topicCycle]);

  // Business Logic: Calculate maximum generation limits based on the user's automation cycle.
  // This prevents the system from over-generating and ensures roadmap stability.
  const maxLimit = useMemo(() => {
    switch (topicCycle) {
      case 'daily': return 30; // Limit to roughly 1 month
      case 'weekly': return 12; // Limit to roughly 3 months
      case 'biweekly': return 6; // Limit to roughly 3 months
      case 'monthly': return 6; // Limit to roughly 6 months
      default: return 10;
    }
  }, [topicCycle]);

  // Current date anchor used for dividing past/future UI
  const todayStr = new Date().toISOString().split("T")[0]

  // Configure DnD sensors. PointerSensor requires a 5px drag distance before activating to prevent accidental drags on clicks.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  /**
   * Handles the completion of a drag-and-drop reorder action.
   * @param {Object} event - The DnD kit event containing active and over node data.
   */
  const handleDragEnd = (event) => {
    const { active, over } = event
    // Only process if dropped on a valid, different target
    if (over && active.id !== over.id) {
      reorderTopicDates(active.id, over.id)
      toast.success("Topic dates swapped.")
    }
  }

  // Memoize the hero topic to prevent unnecessary recalculations on generic state changes
  // Business logic: There should only ever be one "in_use" topic acting as the current active campaign.
  const heroTopic = useMemo(() => topics.find(t => t.status === "in_use"), [topics])

  // Build the timeline list (everything except in_use), sorted by target_date ascending (recent first)
  const timelineTopics = useMemo(() => {
    let filtered = topics.filter(t => t.status !== "in_use")
    
    // Status filter: restrict list to a specific status if requested
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    // Search query filter: allows users to quickly find topics by keywords in title or brief
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.brief.toLowerCase().includes(query)
      )
    }

    // Date filter: restrict topics based on specific timeframes
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize today to midnight for accurate comparisons

    if (dateFilter !== "all") {
      filtered = filtered.filter(t => {
        const topicDate = new Date(t.target_date + "T00:00:00")
        
        // Execute the appropriate date comparison based on the selected filter
        switch (dateFilter) {
          case "today":
            return isSameDay(topicDate, today)
          case "this_week":
            return isWithinInterval(topicDate, {
              start: startOfWeek(today, { weekStartsOn: 1 }),
              end: endOfWeek(today, { weekStartsOn: 1 })
            })
          case "this_month":
            return isSameMonth(topicDate, today)
          case "specific_date":
            // Business Logic: Instead of an exact match, we display all topics from the picked date onwards.
            // This enables a "Milestone View" where users see the roadmap starting from a specific day.
            if (!customDate) return true;

            // Normalize the user-selected date to midnight to ensure accurate interval comparison.
            const selectedDate = new Date(customDate);
            selectedDate.setHours(0, 0, 0, 0);

            // Inclusive comparison: include topics on the same day or any day after.
            return topicDate.getTime() >= selectedDate.getTime();
          default:
            return true
        }
      })
    }

    // Always sort the final filtered list descending (newest at the top)
    return filtered.sort((a, b) => new Date(b.target_date).getTime() - new Date(a.target_date).getTime())
  }, [topics, statusFilter, searchQuery, dateFilter, customDate])

  // Group topics dynamically based on topicCycle (weekly or monthly chunks)
  const groupedTopics = useMemo(() => {
    const useMonthly = topicCycle === "monthly"
    const groups = []
    const groupMap = new Map()

    // Bin topics into their respective time groups
    for (const topic of timelineTopics) {
      const key = useMonthly ? getMonthKey(topic.target_date) : getWeekKey(topic.target_date)
      const label = useMonthly ? getMonthLabel(topic.target_date) : getWeekLabel(topic.target_date)

      if (!groupMap.has(key)) {
        groupMap.set(key, { label, topics: [] })
      }
      groupMap.get(key).topics.push(topic)
    }

    // Sort the group keys chronologically descending so future weeks appear at the top
    const sortedKeys = [...groupMap.keys()].sort().reverse()
    for (const key of sortedKeys) {
      groups.push({ key, ...groupMap.get(key) })
    }

    return groups
  }, [timelineTopics, topicCycle])

  // Business Logic: Limit the rendered groups based on infinite scroll pagination
  const displayedGroups = useMemo(() => {
    return groupedTopics.slice(0, page * 2); // Show 2 timeline groups per page
  }, [groupedTopics, page]);

  const hasMoreGroups = displayedGroups.length < groupedTopics.length;

  // Intersection Observer for grouped topic lazy loading
  const observer = useRef()
  const lastGroupElementRef = useCallback(node => {
    if (isLoadingMore || isSearching) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreGroups) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setPage(prevPage => prevPage + 1);
          setIsLoadingMore(false);
        }, 800); // Simulate network latency for lazy load
      }
    })
    
    if (node) observer.current.observe(node)
  }, [isLoadingMore, isSearching, hasMoreGroups])

  return (
    <div className="flex h-full flex-col">
      {/* Pinned Top Bar Controls */}
      <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Topic Manager</h1>
            <p className="text-sm text-gray-500">The AI Brain. Review and organize the content roadmap.</p>
          </div>
          <Button 
            onClick={() => setIsGenerateModalOpen(true)}
            className="gap-2 bg-blue-600 shadow-blue-200 hover:bg-blue-700 hover:shadow-md transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Generate New Topics
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search topics..." 
                className="pl-9 bg-gray-50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px] bg-gray-50">
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="specific_date">Specific Date</SelectItem>
                </SelectContent>
              </Select>

              {/* Conditionally render the DatePicker Popover only when the specific date filter is active */}
              {dateFilter === "specific_date" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal bg-gray-50",
                        !customDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? format(customDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={setCustomDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* "In Use" Hero Card: Highlighted separately from the timeline as the current primary focus */}
          {heroTopic && (
            <HeroCard
              topic={heroTopic}
              onUpdate={(updated) => setTopics(topics.map(t => t.id === updated.id ? updated : t))}
              onVersion={(oldTopic, newTopic, flagPosts) => {
                versionTopic(oldTopic.id, newTopic, flagPosts)
              }}
            />
          )}

          {/* Render State: Searching / Empty / List */}
          {isSearching ? (
             <div className="space-y-4">
                <TopicSkeletonRow />
                <TopicSkeletonRow />
                <TopicSkeletonRow />
             </div>
          ) : timelineTopics.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center py-24 px-4 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-md">
                  <Search className="h-10 w-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No topics found</h3>
                <p className="text-slate-500 max-w-md mx-auto text-base">
                  {searchQuery ? `We couldn't find any topics matching "${searchQuery}". Try adjusting your keywords or clearing your filters.` : "You don't have any topics in this timeframe. Generate some above!"}
                </p>
                {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    className="mt-8 border-slate-300 hover:bg-slate-100 px-6 h-10 shadow-sm"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
                      setDateFilter("all")
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
             </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {/* The SortableContext must contain the IDs of EVERY draggable topic in the timeline. */}
              <SortableContext items={timelineTopics.filter(t => isFutureDraggable(t, todayStr)).map(t => t.id)} strategy={verticalListSortingStrategy}>
                {displayedGroups.map((group, idx) => {
                  const isLast = idx === displayedGroups.length - 1;
                  // Split topics into draggable (future) and static (past) segments first
                const futureTopics = group.topics.filter(t => isFutureDraggable(t, todayStr))
                const pastTopics = group.topics.filter(t => !isFutureDraggable(t, todayStr))

                // Check if this group requires bulk actions (only check future topics)
                const hasPendingTopics = futureTopics.some(t => t.status === "scheduled")
                
                return (
                <div key={group.key} className="space-y-4" ref={isLast ? lastGroupElementRef : null}>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      🗓️ {group.label}
                    </h3>
                    {/* Bulk-approve removed: users can version or set in-use topics manually. */}
                  </div>
                  <div className="grid gap-3">
                    {/* Draggable future topics: We no longer wrap these in a local SortableContext here.
                        They now reference the top-level hoisted context above. */}
                    {futureTopics.map(topic => (
                      <SortableTopicCard
                        key={topic.id}
                        topic={topic}
                        onUpdate={(updated) => setTopics(topics.map(t => t.id === topic.id ? updated : t))}
                        onDelete={() => setTopics(topics.filter(t => t.id !== topic.id))}
                        onVersion={(oldTopic, newTopic, flagPosts) => {
                          versionTopic(oldTopic.id, newTopic, flagPosts)
                        }}
                        onUseNow={setTopicInUse}
                      />
                    ))}

                    {/* Divider between future and past (only visible if there's a crossover in this specific group) */}
                    {futureTopics.length > 0 && pastTopics.length > 0 && (
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Passed</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}

                    {/* Static past topics (Read-only view, immutable ordering) */}
                    {pastTopics.map(topic => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        onUpdate={(updated) => setTopics(topics.map(t => t.id === topic.id ? updated : t))}
                        onDelete={() => deleteTopic(topic.id)}
                        onReschedule={() => rescheduleOverdueTopic(topic.id)}
                        onVersion={(oldTopic, newTopic, flagPosts) => {
                          versionTopic(oldTopic.id, newTopic, flagPosts)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )})}
              
              {isLoadingMore && (
                <div className="space-y-4 mt-8">
                  <TopicSkeletonRow />
                  <TopicSkeletonRow />
                </div>
              )}
            </SortableContext>
          </DndContext>
          )}
        </div>
      </div>

      {/* Generate Topics Modal (Premium Light Mode Aesthetic) */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-slate-200 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] sm:rounded-2xl">
          {/* Decorative Glowing Orbs (Subtle for Light Mode) */}
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          {/* Header Section */}
          <div className="relative p-8 pb-6 border-b border-slate-100 z-10 bg-white/50 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium tracking-tight text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                Generate New Topics
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2 text-sm leading-relaxed">
                Let the AI map out your content timeline based on your automation settings.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Main Content Area */}
          <div className="p-8 bg-slate-50/50 relative z-10">
            {/* Card-like internal section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-slate-900 tracking-tight">Extend the Pipeline</h3>
                  <p className="text-sm text-slate-500 mt-1">Safely append new topics to the end of your current planned timeline.</p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <div className="space-y-2 relative">
                  <Label htmlFor="topic-count" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Number of topics to generate</Label>
                  <div className="relative mt-2">
                    <Input 
                      id="topic-count"
                      type="number" 
                      min={1} 
                      max={maxLimit} 
                      value={topicCount}
                      onChange={(e) => {
                        // Logic: Parse the input and enforce the min/max bounds established by the business logic.
                        const val = parseInt(e.target.value) || 1;
                        setTopicCount(Math.min(maxLimit, Math.max(1, val)));
                      }}
                      className="bg-white border-slate-300 text-slate-900 h-12 px-4 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                      Max {maxLimit}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
                    Limit: {maxLimit} topics per generation based on your {topicCycle} cycle.
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all border-0" 
                    onClick={() => {
                      // Business Logic: Trigger the generation mutation in the mock database context.
                      generateTopics(topicCount);
                      
                      // UI Feedback: Close the modal and notify the user of the successful append operation.
                      setIsGenerateModalOpen(false);
                      toast.success(`Successfully generated and appended ${topicCount} new topics.`);
                    }}
                  >
                    Generate & Append
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------

/**
 * @component HeroCard
 * @description Renders the visually distinct 'In Use' active topic at the top of the interface.
 * @param {Object} props - The component props.
 * @param {Topic} props.topic - The active topic data.
 * @param {(topic: Topic) => void} props.onUpdate - Callback to update the topic directly.
 * @param {(oldTopic: Topic, newTopic: Topic, flagPosts?: boolean) => void} props.onVersion - Callback to version the topic (archive old, create new).
 * @returns {JSX.Element} The HeroCard component.
 */
function HeroCard({ topic, onUpdate, onVersion }) {
  // Local state for modal visibility
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  return (
    <>
      <Card
        className="relative cursor-pointer border-2 border-blue-600 bg-blue-50/50 shadow-md transition-all hover:shadow-lg"
        onClick={() => setIsEditorOpen(true)}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌟</span>
                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Current Active Topic</span>
                <Badge variant="outline" className={`font-medium rounded-sm py-0 h-5 border ${statusConfig.in_use.className}`}>
                  {statusConfig.in_use.label}
                </Badge>
              </div>
              <h4 className="text-xl font-bold text-gray-900 leading-tight">{topic.title}</h4>
              <p className="text-sm text-gray-600">{topic.brief}</p>
              <p className="text-xs font-medium text-blue-600 mt-2">{formatTargetDate(topic.target_date)}</p>
            </div>
            <div className="flex items-center shrink-0">
              <Star className="h-6 w-6 text-blue-500 fill-blue-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      <TopicEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        topic={topic}
        onUpdate={onUpdate}
        onDelete={() => {}} // Deletion of in-use topics is generally restricted
        onVersion={onVersion}
      />
    </>
  )
}

/**
 * @component SortableTopicCard
 * @description A draggable topic card used in the timeline for future topics.
 * Includes @dnd-kit hooks and rendering for drag handles.
 * @param {Object} props - The component props.
 * @param {Topic} props.topic - The topic data to render.
 * @param {(topic: Topic) => void} props.onUpdate - Callback to update the topic.
 * @param {() => void} props.onDelete - Callback to delete the topic.
 * @param {(oldTopic: Topic, newTopic: Topic, flagPosts?: boolean) => void} props.onVersion - Callback to version the topic.
 * @param {(topicId: string, flagPosts?: boolean) => void} props.onUseNow - Callback to immediately activate this topic.
 * @returns {JSX.Element} The SortableTopicCard component.
 */
function SortableTopicCard({ topic, onUpdate, onDelete, onVersion, onUseNow }) {
  // Local state for modal visibility
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const config = statusConfig[topic.status]

  // Hook into dnd-kit context for this specific node
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id })

  // Apply CSS transforms dynamically during drag
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        // Visual feedback when actively dragging (ring and shadow increase)
        className={`group relative cursor-pointer border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${isDragging ? "ring-2 ring-blue-500 shadow-lg z-50 opacity-90" : ""}`}
        onClick={() => setIsEditorOpen(true)}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Drag handle: isolated listeners so dragging only occurs from the grip icon */}
            <div
              className="flex items-center pt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()} // Prevent opening the modal when clicking the handle
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`font-medium rounded-sm py-0 h-5 border ${config.className}`}>
                    {config.label}
                  </Badge>
                  <span className="text-xs font-medium text-gray-400 ml-1">{formatTargetDate(topic.target_date)}</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 leading-tight">{topic.title}</h4>
                <p className="text-sm text-gray-500 line-clamp-2 pr-12">{topic.brief}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Quick action to approve pending topics without opening modal */}
                {/* Approve shortcut removed; use Version or Use Now actions instead. */}
                {/* Use Now button with confirmation: promotes a future topic to active status immediately */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Rocket className="h-3 w-3" /> Use Now
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Activate this topic now?</AlertDialogTitle>
                      <AlertDialogDescription className="flex items-start gap-3 mt-4 text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          You are about to change the active topic. What would you like to do with the existing unpublished posts that were generated using the old topic?
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="sm:mt-0">Cancel</AlertDialogCancel>
                      <div className="flex flex-1 sm:justify-end gap-2">
                        {/* Bypass ripple effect: leaves existing posts untouched */}
                        <Button
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            onUseNow(topic.id, false)
                            toast.success("Topic activated. Existing posts kept intact.")
                          }}
                        >
                          Swap & Keep Posts
                        </Button>
                        {/* Trigger ripple effect: invalidates pending posts tied to the old topic */}
                        <AlertDialogAction
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                          onClick={() => {
                            onUseNow(topic.id, true)
                            toast.success("Topic activated. Existing posts flagged.")
                          }}
                        >
                          <Rocket className="h-4 w-4" /> Swap & Flag Posts
                        </AlertDialogAction>
                      </div>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TopicEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        topic={topic}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onVersion={onVersion}
      />
    </>
  )
}

/**
 * @component TopicCard
 * @description A static, non-draggable version of the topic card. Used for historical/past topics that should no longer be reordered.
 * @param {Object} props - The component props.
 * @param {Topic} props.topic - The topic data.
 * @param {(topic: Topic) => void} props.onUpdate - Callback to update the topic.
 * @param {() => void} props.onDelete - Callback to delete the topic.
 * @param {() => void} props.onReschedule - Callback to reschedule an overdue topic.
 * @param {(oldTopic: Topic, newTopic: Topic, flagPosts?: boolean) => void} props.onVersion - Callback to version the topic.
 * @returns {JSX.Element} The static TopicCard component.
 */
function TopicCard({ topic, onUpdate, onDelete, onReschedule, onVersion }) {
  // Local state for modal visibility
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  let config = statusConfig[topic.status]
  
  // Business Logic: Calculate if a topic is overdue
  // An overdue topic is one that has passed its target date but is still awaiting review or archived
  const today = new Date(new Date().setHours(0,0,0,0))
  const topicDate = new Date(new Date(topic.target_date).setHours(0,0,0,0))
  const isPast = topicDate < today
  const isOverdue = isPast && topic.status === 'scheduled'

  // Business Logic: Treat past topics as effectively archived visually so they don't look like active upcoming tasks.
  const isEffectivelyArchived = topic.status === "archived" || isPast

  return (
    <>
      <Card 
        className={`group relative cursor-pointer border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${isEffectivelyArchived ? "opacity-60" : ""} ${isOverdue ? "border-red-500" : ""}`}
        onClick={() => {
          // Disable opening the editor for overdue topics to enforce resolving them via actions
          if (!isOverdue) setIsEditorOpen(true)
        }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`font-medium rounded-sm py-0 h-5 border ${config.className}`}>
                  {config.label}
                </Badge>
                <span className="text-xs font-medium text-gray-400 ml-1">{formatTargetDate(topic.target_date)}</span>
                {isOverdue && (
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    Overdue
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-gray-900 leading-tight">{topic.title}</h4>
              <p className="text-sm text-gray-500 line-clamp-2 pr-12">{topic.brief}</p>
            </div>
            
            <div className="flex flex-col items-end gap-2 shrink-0">
              {isOverdue ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs border-gray-200 w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReschedule) onReschedule();
                      toast.success("Topic rescheduled to the end of the pipeline.");
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100 w-full justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      toast.success("Overdue topic removed.");
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <TopicEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        topic={topic}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onVersion={onVersion}
      />
    </>
  )
}

/**
 * @component TopicEditorModal
 * @description Centralized editor for modifying topic content, handling AI generation suggestions, and enforcing history retention rules (versioning vs overwriting).
 * @param {Object} props - The component props.
 * @param {boolean} props.isOpen - Controls dialog visibility.
 * @param {() => void} props.onClose - Callback to close dialog.
 * @param {Topic} props.topic - The current topic being edited.
 * @param {(topic: Topic) => void} props.onUpdate - Standard update callback (overwrites data).
 * @param {() => void} props.onDelete - Callback to delete the topic.
 * @param {(oldTopic: Topic, newTopic: Topic, flagPosts?: boolean) => void} props.onVersion - Version callback (preserves original as archived, creates new record).
 * @returns {JSX.Element} The TopicEditorModal component.
 */
function TopicEditorModal({ isOpen, onClose, topic, onUpdate, onDelete, onVersion }) {
  const { title, brief, target_date, status } = topic
  
  // Local state for tracking edits before committing them to context
  const [showMagic, setShowMagic] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [editedBrief, setEditedBrief] = useState(brief)
  const [showVersionDialog, setShowVersionDialog] = useState(false)

  // Reset local state cleanly whenever the underlying topic changes or modal reopens
  React.useEffect(() => {
    setEditedTitle(title)
    setEditedBrief(brief)
    setShowMagic(false)
    setShowVersionDialog(false)
  }, [title, brief])

  // Business logic: Evaluate if the topic belongs to the past
  const isPast = new Date(target_date + "T00:00:00").getTime() < new Date(new Date().toISOString().split("T")[0] + "T00:00:00").getTime()
  
  // Business logic: Lock historical or past records to prevent retrospective data altering.
  const isLocked = isPast || status === "archived"

  /**
   * Processes the save action, determining if a simple update or a complex versioning flow is required.
   */
  const handleSave = () => {
    // Guard clause: Prevent mutation on locked items
    if (isLocked) {
      onClose()
      return
    }
    
    // Business logic: If modifying an "In Use" topic, we must not overwrite it.
    // Instead, we trigger the versioning dialog to ask how to handle existing dependencies.
    if (status === "in_use" && (editedTitle !== title || editedBrief !== brief)) {
      setShowVersionDialog(true)
    } else {
      // Standard update for pending topics
      onUpdate({ ...topic, title: editedTitle, brief: editedBrief })
      onClose()
    }
  }

  /**
   * Finalizes the versioning process after the user selects how to handle dependent posts.
   * @param {boolean} flagPosts - If true, triggers the ripple effect flagging existing posts.
   */
  const confirmVersion = (flagPosts) => {
    // Passes the old state (to be archived) and the newly edited state (to become active)
    onVersion(
      { ...topic, status: "archived" },
      { ...topic, id: topic.id + "_v2", title: editedTitle, brief: editedBrief, status: "in_use" },
      flagPosts
    )
    toast.success(`Topic versioned. Existing posts ${flagPosts ? "flagged" : "kept intact"}.`)
    setShowVersionDialog(false)
    onClose()
  }

  const statusBadge = statusConfig[status]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">Edit Topic</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{formatTargetDate(target_date)}</DialogDescription>
          </div>
          {/* Communicate lock state visually to the user */}
          {isLocked
            ? <Badge variant="outline" className="bg-gray-100 text-gray-600 gap-1"><Lock className="h-3 w-3" /> {status === "archived" ? "Archived — read only." : "Past topics cannot be edited."}</Badge>
            : <Badge variant="outline" className={`border ${statusBadge.className}`}>{statusBadge.label}</Badge>
          }
        </div>
        
        {/* Input Fields */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-900 font-semibold">Topic Title</Label>
            <Input 
              value={editedTitle} 
              onChange={(e) => setEditedTitle(e.target.value)} 
              className="font-medium text-base h-11"
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-900 font-semibold">The Brief / Instructions</Label>
              {/* AI generator integration point */}
              {!isLocked && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  onClick={() => setShowMagic(true)}
                >
                  <Sparkles className="mr-1.5 h-3 w-3" /> Generate Alternatives
                </Button>
              )}
            </div>
            <Textarea 
              value={editedBrief}
              onChange={(e) => setEditedBrief(e.target.value)}
              className="min-h-[100px] resize-none text-gray-700"
              disabled={isLocked}
            />
            
            {/* AI Alternatives Panel (Mocked) */}
            {showMagic && (
              <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">AI Suggestions</p>
                
                <div 
                  className="p-3 text-sm text-indigo-800 bg-white border border-indigo-100 rounded-md cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                  onClick={() => { setEditedBrief("A comprehensive guide on managing first-week anxiety. Include 3 specific time-management techniques."); setShowMagic(false); }}
                >
                  "A comprehensive guide on managing first-week anxiety. Include 3 specific time-management techniques."
                </div>
                
                <div 
                  className="p-3 text-sm text-indigo-800 bg-white border border-indigo-100 rounded-md cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                  onClick={() => { setEditedBrief("Focus solely on building a social support network during orientation. Share a personal anecdote."); setShowMagic(false); }}
                >
                  "Focus solely on building a social support network during orientation. Share a personal anecdote."
                </div>
              </div>
            )}
          </div>

          {/* Configuration Settings */}
          <div className="space-y-2">
            <Label className="text-gray-900 font-semibold">Image Strategy Override</Label>
            <Select defaultValue="auto" disabled={isLocked}>
              <SelectTrigger>
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Use Global Settings (Auto)</SelectItem>
                <SelectItem value="ai">Force AI Generated Image</SelectItem>
                <SelectItem value="stock">Force Stock Photo</SelectItem>
                <SelectItem value="none">No Image (Text only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-2">
            {/* Destructive Action with Confirmation Dialog */}
            {(!isLocked && status !== "in_use") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="flex items-start gap-3 mt-4 text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        <strong>Warning:</strong> Deleting this leaves a blank day in your schedule and will cancel any associated posts. We recommend you <strong>CHANGE</strong> the topic instead to maintain your consistency.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { onDelete(); onClose(); }}>
                      Delete Topic
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="bg-white">Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLocked}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Versioning Confirmation Flow */}
      {/* Renders when an active topic is edited to handle the ripple effect */}
      <AlertDialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Version this active topic?</AlertDialogTitle>
            <AlertDialogDescription className="flex items-start gap-3 mt-4 text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                You are about to save changes to the active topic, which will create a new version. What would you like to do with the existing unpublished posts?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowVersionDialog(false)}>Cancel</AlertDialogCancel>
            <div className="flex flex-1 sm:justify-end gap-2">
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => confirmVersion(false)}
              >
                Version & Keep Posts
              </Button>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={() => confirmVersion(true)}
              >
                <Sparkles className="h-4 w-4" /> Version & Flag Posts
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
