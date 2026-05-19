/**
 * @file Topic Manager Page
 * @description The core interface for managing the AI-generated content roadmap. 
 * Architecturally, this acts as the "Brain" of Flowdia, where users review and sequence topics.
 * It connects to the backend API for state persistence and utilizes @dnd-kit for drag-and-drop timeline management.
 * The page unifies future planning (drag-and-drop) with historical versioning (archived topics).
 */

import * as React from "react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Search, Sparkles, CheckCircle2, Calendar as CalendarIcon, Trash2, AlertTriangle, Lock, Star, GripVertical, Rocket, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format, startOfWeek, endOfWeek, isWithinInterval, isSameDay, isSameMonth } from "date-fns"

import { useAuth } from "@/context/auth-context"
import { callApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
const statusConfig = {
  scheduled: { label: "Scheduled", className: "bg-amber-100 text-amber-800 border-amber-200" },
  in_use: { label: "In Use", className: "bg-blue-100 text-blue-800 border-blue-200" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-200" },
}

// --- Grouping helpers ---
function getWeekLabel(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  return `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
}

function getWeekKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  return monday.toISOString().split("T")[0]
}

function getMonthLabel(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function getMonthKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatTargetDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

export default function TopicManager() {
  const { session } = useAuth()
  
  const [topicCycle, setTopicCycle] = useState("weekly")
  const [topics, setTopics] = useState([])
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [generateCount, setGenerateCount] = useState(5)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [customDate, setCustomDate] = useState(undefined)
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchTopics = useCallback(async (isInitial = false) => {
    try {
      if (!session?.access_token) return
      if (isInitial) setIsLoading(true)
      
      const queryParams = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
        page: isInitial ? 1 : page,
        limit: 20
      })

      const [topicsData, settingsData] = await Promise.all([
        callApi(`/topics?${queryParams.toString()}`, {}, session),
        isInitial ? callApi('/automation/settings', {}, session).catch(() => null) : Promise.resolve(null)
      ])
      
      setTopics(prev => isInitial ? topicsData.topics : [...prev, ...topicsData.topics])
      setHasMore(topicsData.pagination.hasMore)
      if (isInitial) {
        setPage(1)
        if (settingsData && settingsData.settings) {
          setTopicCycle(settingsData.settings.topic_cycle)
        }
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [session, statusFilter, searchQuery, page])

  useEffect(() => {
    fetchTopics(true)
  }, [session, statusFilter, searchQuery])

  useEffect(() => {
    if (page > 1) fetchTopics(false)
  }, [page])

  const handleCreate = async (topicData) => {
    try {
      const data = await callApi(`/topics`, {
        method: 'POST',
        body: JSON.stringify(topicData)
      }, session)
      setTopics(prev => [data.topic, ...prev])
      setIsCreateModalOpen(false)
      toast.success("Topic created successfully.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleUpdate = async (topic) => {
    try {
      const data = await callApi(`/topics/${topic.id}`, {
        method: 'PATCH',
        body: JSON.stringify(topic)
      }, session)
      setTopics(prev => prev.map(t => t.id === topic.id ? data.topic : t))
      toast.success("Topic updated.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await callApi(`/topics/${id}`, { method: 'DELETE' }, session)
      setTopics(prev => prev.filter(t => t.id !== id))
      toast.success("Topic deleted.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handlePromote = async (id) => {
    try {
      await callApi(`/topics/${id}/promote`, { method: 'POST' }, session)
      fetchTopics(true)
      toast.success("Topic promoted to active.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleGenerate = async () => {
    try {
      setIsGenerateModalOpen(false)
      toast.info(`Generating ${generateCount} new topics...`)
      await callApi('/automation/run', { 
        method: 'POST',
        body: JSON.stringify({ count: generateCount })
      }, session)
      await fetchTopics(true) 
      toast.success("Topic generation completed.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const t1 = topics.find(t => t.id === active.id)
      const t2 = topics.find(t => t.id === over.id)
      
      try {
        await callApi('/topics/swap-dates', {
          method: 'POST',
          body: JSON.stringify({
            id1: t1.id,
            date1: t1.target_date,
            id2: t2.id,
            date2: t2.target_date
          })
        }, session)
        
        setTopics(prev => prev.map(t => {
          if (t.id === t1.id) return { ...t, target_date: t2.target_date }
          if (t.id === t2.id) return { ...t, target_date: t1.target_date }
          return t
        }))
        toast.success("Timeline reordered.")
      } catch (error) {
        toast.error(error.message)
      }
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const heroTopic = useMemo(() => topics.find(t => t.status === "in_use"), [topics])
  
  const timelineTopics = useMemo(() => {
    return topics.filter(t => t.status !== "in_use")
      .sort((a, b) => new Date(b.target_date).getTime() - new Date(a.target_date).getTime())
  }, [topics])

  const groupedTopics = useMemo(() => {
    const useMonthly = topicCycle === "monthly"
    const groupMap = new Map()

    for (const topic of timelineTopics) {
      const key = useMonthly ? getMonthKey(topic.target_date) : getWeekKey(topic.target_date)
      const label = useMonthly ? getMonthLabel(topic.target_date) : getWeekLabel(topic.target_date)

      if (!groupMap.has(key)) groupMap.set(key, { label, topics: [] })
      groupMap.get(key).topics.push(topic)
    }

    return [...groupMap.keys()].sort().reverse().map(key => ({ key, ...groupMap.get(key) }))
  }, [timelineTopics, topicCycle])

  const observer = useRef()
  const lastGroupElementRef = useCallback(node => {
    if (isLoadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1)
        setIsLoadingMore(true)
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoadingMore, hasMore])

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Topic Manager</h1>
            <p className="text-sm text-gray-500">The AI Brain. Review and organize the content roadmap.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-white hover:bg-gray-50 text-gray-700">
              <Plus className="h-4 w-4" /> Add Topic
            </Button>
            <Button onClick={() => setIsGenerateModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Sparkles className="h-4 w-4" /> Generate New Topics
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Search topics..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

      <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Active Campaign Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Star className="h-5 w-5 text-blue-600 fill-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Current Active Campaign</h2>
            </div>
            {heroTopic ? (
              <Card className="border-blue-200 bg-blue-50/30 shadow-md ring-1 ring-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active Topic</Badge>
                        <span className="text-sm font-medium text-blue-600/70">{formatTargetDate(heroTopic.target_date)}</span>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900">{heroTopic.title}</h3>
                      <p className="text-gray-700 leading-relaxed max-w-3xl line-clamp-2">{heroTopic.brief}</p>
                    </div>
                    <Button variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleUpdate(heroTopic)}>
                       Edit Active
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-gray-300 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Rocket className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900">No active campaign</h3>
                  <p className="text-sm text-gray-500 max-w-xs mt-1">Promote a scheduled topic to start generating daily content.</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Timeline Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  <h2 className="text-xl font-bold text-gray-900">Topic Roadmap</h2>
               </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={timelineTopics.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-10">
                  {isLoading && <><TopicSkeletonRow /><TopicSkeletonRow /></>}
                  {groupedTopics.map((group, index) => (
                    <div key={group.key} className="space-y-4" ref={index === groupedTopics.length - 1 ? lastGroupElementRef : null}>
                      <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">🗓️ {group.label}</h3>
                      <div className="grid gap-3">
                        {group.topics.map(topic => (
                          <SortableTopicCard key={topic.id} topic={topic} onUpdate={handleUpdate} onDelete={() => handleDelete(topic.id)} onUseNow={() => handlePromote(topic.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        </div>
      </div>

      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Topics</DialogTitle>
            <DialogDescription>Let the AI generate fresh content ideas for your roadmap.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
             <div className="flex flex-col items-center gap-4">
                <Sparkles className="h-12 w-12 text-blue-500" />
                <p className="text-center text-sm text-gray-600">This will use your niche and audience settings to generate new topics.</p>
             </div>
             
             <div className="space-y-3 px-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="count-slider" className="text-sm font-medium">How many topics?</Label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{generateCount}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => setGenerateCount(prev => Math.max(1, prev - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1" 
                    value={generateCount} 
                    onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                    className="flex-1 accent-blue-600"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => setGenerateCount(prev => Math.min(10, prev + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-gray-400 text-center">We recommend generating 3-5 at a time for best quality.</p>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">Start Generation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TopicEditorModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        topic={{ title: "", brief: "", target_date: new Date().toISOString().split("T")[0], status: "scheduled" }} 
        onUpdate={handleCreate} 
        isCreating={true}
      />
    </div>
  )
}

function SortableTopicCard({ topic, onUpdate, onDelete, onUseNow }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const config = statusConfig[topic.status]
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  
  const isOverdue = useMemo(() => {
    if (topic.status !== 'scheduled') return false;
    const target = new Date(topic.target_date + "T00:00:00");
    const today = new Date();
    today.setHours(0,0,0,0);
    return target < today;
  }, [topic.target_date, topic.status]);

  return (
    <>
      <Card ref={setNodeRef} style={style} className={cn("group relative cursor-pointer hover:border-blue-300", isDragging && "z-50 opacity-90 ring-2 ring-blue-500 shadow-lg", isOverdue && "border-amber-300 bg-amber-50/30")} onClick={() => setIsEditorOpen(true)}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex items-center pt-1 cursor-grab text-gray-400" {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("h-5", config.className)}>{config.label}</Badge>
              {isOverdue && <Badge variant="outline" className="h-5 bg-amber-100 text-amber-800 border-amber-200 gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>}
              <span className={cn("text-xs text-gray-400", isOverdue && "text-amber-600 font-medium")}>{formatTargetDate(topic.target_date)}</span>
            </div>
            <h4 className="font-bold text-gray-900">{topic.title}</h4>
            <p className="text-sm text-gray-500 line-clamp-2">{topic.brief}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {topic.status === 'scheduled' && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700" onClick={e => { e.stopPropagation(); onUseNow(); }}>
                Use Now
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-100" onClick={e => { e.stopPropagation(); onDelete(); }}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <TopicEditorModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} topic={topic} onUpdate={onUpdate} />
    </>
  )
}

function TopicEditorModal({ isOpen, onClose, topic, onUpdate, isCreating = false }) {
  const [title, setTitle] = useState(topic.title)
  const [brief, setBrief] = useState(topic.brief)
  const [targetDate, setTargetDate] = useState(topic.target_date)

  useEffect(() => {
    setTitle(topic.title)
    setBrief(topic.brief)
    setTargetDate(topic.target_date)
  }, [topic.id, topic.title, topic.brief, topic.target_date])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isCreating ? "Create New Topic" : "Edit Topic"}</DialogTitle>
          <DialogDescription>{isCreating ? "Manually add a topic to your roadmap." : "Modify topic details and schedule."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brief / Instructions</Label>
            <Textarea value={brief} onChange={e => setBrief(e.target.value)} className="min-h-[150px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onUpdate({ ...topic, title, brief, target_date: targetDate }); onClose(); }} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
