import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { CalendarDays, CalendarRange, Clock, Lock, AlertTriangle, Edit2, Trash2, RefreshCw, Eye, GripVertical, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { FaFacebook } from "react-icons/fa"
import { toast } from "sonner"
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ManualPostCreator } from "@/components/manual-post-creator"
import { useAuth } from "@/context/auth-context"
import { callApi } from "@/lib/api"

function timeToDecimal(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let [_, h, m, ampm] = match
  let hour = parseInt(h, 10)
  const min = parseInt(m, 10)
  if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12
  if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0
  return hour + min / 60
}

function decimalToTime(decimal) {
  let hour = Math.floor(decimal)
  let min = Math.round((decimal - hour) * 60)
  if (min === 60) { hour += 1; min = 0; }
  const ampm = hour >= 12 ? 'PM' : 'AM'
  let displayHour = hour > 12 ? hour - 12 : hour
  if (displayHour === 0) displayHour = 12
  return `${displayHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`
}

const getLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function EditorialCalendar() {
  const { session } = useAuth()
  const [view, setView] = useState("monthly")
  const [showRoadmap, setShowRoadmap] = useState(true)
  const [selectedDayContent, setSelectedDayContent] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [posts, setPosts] = useState([])
  const [activeDragId, setActiveDragId] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  const fetchPosts = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      // Fetch posts for the visible timeline
      const data = await callApi('/posts', {}, session);
      
      const mappedPosts = data.posts.map(post => {
        const d = new Date(post.scheduled_publish_time);
        
        return {
          id: post.id,
          cellId: `cell-${getLocalDateStr(d)}`, 
          time: decimalToTime(d.getHours() + d.getMinutes() / 60),
          platforms: ["FB"],
          caption: post.caption,
          status: post.status,
          isLocked: post.status === 'pushed',
          type: post.topic_id ? 'autonomous' : 'manual',
          count: 1,
          title: post.topics?.title || 'Manual Post',
          rawDate: post.scheduled_publish_time,
          image_url: post.image_url
        }
      });
      setPosts(mappedPosts);
    } catch (error) {
      toast.error(error.message);
    }
  }, [session]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleClearFlag = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'scheduled' } : p))
    setSelectedPost((prev) => prev?.id === postId ? { ...prev, status: 'scheduled' } : prev)
  }

  const handleDeletePost = async (id) => {
    try {
      await callApi(`/posts/${id}`, { method: 'DELETE' }, session)
      setPosts(prev => prev.filter(p => p.id !== id))
      setSelectedPost(null)
      if (selectedDayContent) {
         setSelectedDayContent(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== id) }))
      }
      toast.success("Post deleted.")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRegeneratePost = async (id) => {
    try {
      const data = await callApi(`/posts/${id}/regenerate`, { method: 'POST' }, session)
      
      const newRawDate = new Date(data.post.scheduled_publish_time);
      const updatedPostObj = {
        id: data.post.id,
        cellId: `cell-${getLocalDateStr(newRawDate)}`, 
        time: decimalToTime(newRawDate.getHours() + newRawDate.getMinutes() / 60),
        platforms: ["FB"],
        caption: data.post.caption,
        status: data.post.status,
        isLocked: data.post.status === 'pushed',
        type: data.post.topic_id ? 'autonomous' : 'manual',
        count: 1,
        title: data.post.topics?.title || 'Manual Post',
        rawDate: data.post.scheduled_publish_time
      };

      setPosts(prev => prev.map(p => p.id === id ? updatedPostObj : p));
      setSelectedPost(updatedPostObj);
      if (selectedDayContent) {
         setSelectedDayContent(prev => ({ 
           ...prev, 
           posts: prev.posts.map(p => p.id === id ? updatedPostObj : p) 
         }))
      }
      toast.success("Post successfully regenerated from topic brief.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  const navigateDate = (direction) => {
    if (direction === 0) {
      setCurrentDate(new Date())
      return
    }
    const newDate = new Date(currentDate)
    if (view === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (view === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (view === 'daily') {
      newDate.setDate(newDate.getDate() + direction)
    }
    setCurrentDate(newDate)
  }

  const currentDateLabel = useMemo(() => {
    if (view === 'monthly') {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)
    } else if (view === 'weekly') {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay() + 1)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const formatStr = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
      return `${formatStr(start)} - ${formatStr(end)}, ${end.getFullYear()}`
    } else {
      return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(currentDate)
    }
  }, [currentDate, view])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id)
  }

  const handleDragEnd = async (event) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const targetId = String(over.id)
    const draggedPost = posts.find(p => p.id === active.id)
    if (!draggedPost) return;

    let newCellId = draggedPost.cellId;
    let newTime = draggedPost.time;

    if (targetId.startsWith('cell-') && !targetId.includes('-hour-')) {
       newCellId = targetId; 
    } else if (targetId.includes('-hour-')) {
       const parts = targetId.split('-hour-');
       newCellId = parts[0];
       const hour = parseInt(parts[1], 10);
       newTime = decimalToTime(hour);
    }

    if (newCellId === draggedPost.cellId && newTime === draggedPost.time) return;

    try {
      const dateStr = newCellId.replace('cell-', '');
      const [hours, minutes] = newTime.split(':');
      const isPM = newTime.includes('PM');
      let h = parseInt(hours, 10);
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      
      const newDate = new Date(`${dateStr}T00:00:00`);
      newDate.setHours(h);
      newDate.setMinutes(parseInt(minutes, 10));

      const payload = {
         scheduled_publish_time: newDate.toISOString()
      };

      await callApi(`/posts/${draggedPost.id}`, {
         method: 'PATCH',
         body: JSON.stringify(payload)
      }, session);

      setPosts(prev => prev.map(p => {
         if (p.id === active.id) {
            return { ...p, cellId: newCellId, time: newTime, rawDate: newDate.toISOString() }
         }
         return p;
      }));

      toast.success("Post rescheduled successfully.")
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Editorial Calendar</h1>
            <p className="text-sm text-gray-500">Visual command center for your scheduled content.</p>
          </div>
          <div className="flex items-center gap-4 border border-gray-200 bg-white px-4 py-2 rounded-lg shadow-sm">
            <Label htmlFor="roadmap-toggle" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Show Future Topics
            </Label>
            <Switch id="roadmap-toggle" checked={showRoadmap} onCheckedChange={setShowRoadmap} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Tabs value={view} onValueChange={setView} className="w-[300px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="monthly" className="gap-2"><CalendarDays className="h-4 w-4" /> Monthly</TabsTrigger>
                <TabsTrigger value="weekly" className="gap-2"><CalendarRange className="h-4 w-4" /> Weekly</TabsTrigger>
                <TabsTrigger value="daily" className="gap-2"><Clock className="h-4 w-4" /> Daily</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white text-gray-700 shadow-sm border-gray-200" onClick={() => navigateDate(0)}>
                Today
              </Button>
              <div className="flex items-center border border-gray-200 bg-white rounded-lg shadow-sm">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-none border-r border-gray-200" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-none" onClick={() => navigateDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm font-bold text-gray-900 min-w-[140px]">{currentDateLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="mx-auto max-w-7xl bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            {view === "monthly" && (
              <MonthlyGrid 
                posts={posts}
                showRoadmap={showRoadmap} 
                onDayClick={(day) => setSelectedDayContent(day)} 
                currentDate={currentDate}
              />
            )}
            {view === "weekly" && <WeeklyGrid posts={posts} currentDate={currentDate} onPostClick={(post) => setSelectedPost(post)} />}
            {view === "daily" && <DailyGrid posts={posts} currentDate={currentDate} onPostClick={(post) => setSelectedPost(post)} />}
            
            <DragOverlay dropAnimation={null}>
              {activeDragId ? (
                <div className="px-3 py-2 rounded-md text-xs font-semibold border bg-white text-gray-900 shadow-2xl scale-105 opacity-90 cursor-grabbing border-blue-500 flex items-center justify-between min-w-[150px]">
                  <span className="flex-1 truncate">Dragging Post...</span>
                  <GripVertical className="h-4 w-4 text-blue-500 ml-2" />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <Sheet open={!!selectedDayContent} onOpenChange={(open) => !open && setSelectedDayContent(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6 flex flex-row items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{selectedDayContent?.date || "Selected Day"}</SheetTitle>
              <SheetDescription>Scheduled posts and planned topics.</SheetDescription>
            </div>
            {(() => {
              const today = new Date(new Date().setHours(0,0,0,0));
              const selectedDate = selectedDayContent?.date ? new Date(selectedDayContent.date) : new Date();
              const isPastDay = selectedDate < today;
              
              return !isPastDay && (
                <Button size="sm" className="mt-0" onClick={() => setIsManualModalOpen(true)}>Create Post</Button>
              )
            })()}
          </SheetHeader>
          <div className="space-y-4">
            {selectedDayContent?.posts?.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => { setSelectedDayContent(null); setTimeout(() => setSelectedPost(post), 300) }} />
            ))}
            {(!selectedDayContent?.posts || selectedDayContent.posts.length === 0) && (
              <div className="text-center p-8 text-gray-500 border border-dashed rounded-xl">No posts scheduled.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PostPreviewModal 
        post={selectedPost} 
        onClose={() => setSelectedPost(null)} 
        onClearFlag={handleClearFlag} 
        onEdit={(postToEdit) => {
          setSelectedPost(null)
          setTimeout(() => {
            setEditingPost(postToEdit)
          }, 200)
        }}
        onDelete={() => handleDeletePost(selectedPost?.id)}
        onRegenerate={handleRegeneratePost}
      />

      <ManualPostCreator
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        editPost={editingPost}
        onSuccess={() => {
           fetchPosts();
           setEditingPost(null);
           setSelectedDayContent(null);
        }}
      />

      <ManualPostCreator 
        open={isManualModalOpen} 
        onOpenChange={setIsManualModalOpen} 
        fixedDate={selectedDayContent?.cellId ? new Date(selectedDayContent.cellId.replace('cell-', '') + "T00:00:00") : undefined}
        onSuccess={() => {
           fetchPosts();
           setIsManualModalOpen(false);
           setSelectedDayContent(null);
        }}
      />
    </div>
  )
}

function DroppableCell({ id, className, children, onClick }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div 
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/50' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function DraggablePill({ post }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  if (isDragging) {
    return <div className="h-8 w-full rounded-lg bg-gray-100 border border-dashed border-gray-300 opacity-50"></div>
  }

  const statusStyles = post.status === 'failed'
    ? 'bg-red-50 text-red-700 border-red-200'
    : post.status === 'scheduled'
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-white text-gray-700 border-gray-200'

  const countBg = post.status === 'failed'
    ? 'bg-red-100 text-red-800'
    : post.status === 'scheduled'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-blue-100 text-blue-800'

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`rounded-lg text-xs font-semibold flex items-center border shadow-sm hover:shadow-md transition-shadow ${statusStyles}`}
    >
      <span className={`shrink-0 px-2 py-1.5 rounded-l-lg font-bold ${countBg}`}>
        {post.count || 1}
      </span>
      <span className="truncate flex-1 px-2 py-1.5">{post.title || post.caption}</span>
      <div
        className="shrink-0 px-1.5 py-1.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors rounded-r-lg hover:bg-gray-100"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function DraggablePostCard({ post, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id })
  const style = transform ? { transform: CSS.Translate.toString(transform), position: 'absolute', zIndex: 50, left: '8px', right: '8px', top: `${(timeToDecimal(post.time) / 24) * 100}%` } : { position: 'absolute', zIndex: 10, left: '8px', right: '8px', top: `${(timeToDecimal(post.time) / 24) * 100}%` }

  if (isDragging) {
    return <div style={{ position: 'absolute', top: `${(timeToDecimal(post.time) / 24) * 100}%`, left: '8px', right: '8px', height: '80px' }} className="rounded-xl bg-gray-100 border border-dashed border-gray-300 opacity-50"></div>
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <PostCard post={post} onClick={onClick} />
    </div>
  )
}

function MonthlyGrid({ posts, showRoadmap, onDayClick, currentDate }) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const cells = Array.from({ length: totalCells }).map((_, i) => {
    let dayNum
    let isCurrentMonthCell = false
    let isPast = false
    let isToday = false
    let cellDate;
    
    if (i < firstDay) {
      dayNum = daysInPrevMonth - firstDay + i + 1
      isPast = true
      cellDate = new Date(year, month - 1, dayNum)
    } else if (i >= firstDay && i < firstDay + daysInMonth) {
      dayNum = i - firstDay + 1
      isCurrentMonthCell = true
      cellDate = new Date(year, month, dayNum)
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      if (cellDate < todayDate) isPast = true
      if (cellDate.getTime() === todayDate.getTime()) isToday = true
    } else {
      dayNum = i - (firstDay + daysInMonth) + 1
      isPast = false
      cellDate = new Date(year, month + 1, dayNum)
    }

    const id = `cell-${getLocalDateStr(cellDate)}`
    const cellPosts = posts.filter(p => p.cellId === id)
    const hasGhost = false 
    const cellDateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(cellDate)

    return { 
      id, 
      dayNum, 
      date: cellDateStr, 
      isPast, 
      isToday, 
      isCurrentMonthCell,
      posts: cellPosts, 
      hasGhost 
    }
  })

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 shrink-0">
        {daysOfWeek.map(day => (
          <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider border-r last:border-r-0 border-gray-200">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 bg-gray-200 gap-px">
        {cells.map((cell) => (
          <DroppableCell 
            key={cell.id} 
            id={cell.id}
            className={`relative p-2 bg-white flex flex-col transition-colors ${cell.isPast ? 'bg-gray-50' : 'hover:bg-blue-50/30 cursor-pointer'} min-h-[120px]`}
            onClick={() => onDayClick({ date: cell.date, posts: cell.posts, cellId: cell.id })}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${cell.isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : !cell.isCurrentMonthCell ? 'text-gray-400 opacity-50' : cell.isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                {cell.dayNum}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 z-10 pointer-events-auto">
              {cell.posts.length > 0 && (() => {
                const postCount = cell.posts.length;
                const hasFailed = cell.posts.some(p => p.status === "failed");
                const hasScheduled = cell.posts.some(p => p.status === "scheduled");
                const status = hasFailed ? "failed" : hasScheduled ? "scheduled" : "scheduled";
                const title = postCount === 1
                  ? (cell.posts[0].title || cell.posts[0].caption || "Scheduled Post")
                  : "Posts Scheduled";

                return (
                  <DraggablePill 
                    post={{
                      id: `group-${cell.id}`,
                      title: title,
                      count: postCount,
                      status: status
                    }} 
                  />
                );
              })()}
            </div>
          </DroppableCell>
        ))}
      </div>
    </div>
  )
}

function WeeklyGrid({ posts, currentDate, onPostClick }) {
  const start = new Date(currentDate)
  start.setDate(currentDate.getDate() - currentDate.getDay() + 1)
  
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
    return { name: dayName, num: d.getDate(), id: `cell-${getLocalDateStr(d)}` }
  })
  
  const hours = Array.from({ length: 24 }).map((_, i) => i)

  return (
    <div className="flex h-[1440px] flex-1 overflow-y-auto">
      <div className="w-20 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0 sticky left-0 z-30 pt-14">
        {hours.map(hour => (
          <div key={hour} className="h-[60px] border-b border-gray-200 text-xs font-medium text-gray-500 p-2 text-right relative">
            <span className="absolute -top-2.5 right-2 bg-gray-50/50 px-1">{`${hour.toString().padStart(2, '0')}:00`}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-[800px]">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 sticky top-0 z-20 shrink-0 h-14">
          {days.map(day => (
            <div key={day.id} className="py-2 text-center border-r last:border-r-0 border-gray-200 bg-gray-50/95 backdrop-blur flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{day.name}</span>
              <span className="text-lg font-light text-gray-500 leading-none mt-0.5">{day.num}</span>
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 bg-gray-200 gap-px relative h-[1440px]">
          <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)', backgroundSize: '100% 60px' }}></div>
          
          {days.map(day => {
            const dayPosts = posts.filter(p => p.cellId === day.id)
            return (
              <div key={day.id} className="bg-white relative flex flex-col">
                {hours.map(hour => (
                  <DroppableCell key={hour} id={`${day.id}-hour-${hour}`} className="h-[60px] w-full z-0" />
                ))}
                
                {dayPosts.map(post => (
                  <DraggablePostCard key={post.id} post={post} onClick={() => onPostClick(post)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DailyGrid({ posts, currentDate, onPostClick }) {
  const hours = Array.from({ length: 24 }).map((_, i) => i)
  const dayId = `cell-${getLocalDateStr(currentDate)}`
  const dayPosts = posts.filter(p => p.cellId === dayId)

  return (
    <div className="flex h-[1440px] flex-1 overflow-y-auto">
      <div className="w-20 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0 sticky left-0 z-30 pt-4">
        {hours.map(hour => (
          <div key={hour} className="h-[60px] border-b border-gray-200 text-xs font-medium text-gray-500 p-2 text-right relative">
             <span className="absolute -top-2.5 right-2 bg-gray-50/50 px-1">{`${hour.toString().padStart(2, '0')}:00`}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 relative bg-white flex flex-col mt-4">
        <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)', backgroundSize: '100% 60px' }}></div>
        
        {hours.map(hour => (
          <DroppableCell key={hour} id={`${dayId}-hour-${hour}`} className="h-[60px] w-full z-0" />
        ))}

        {dayPosts.map(post => (
          <DraggablePostCard key={post.id} post={post} onClick={() => onPostClick(post)} />
        ))}
      </div>
    </div>
  )
}

function PostCard({ post, onClick }) {
  const statusColors = {
    "scheduled": "border-l-orange-500 bg-orange-50/30",
    "pushed": "border-l-emerald-500 bg-white",
    "failed": "border-l-red-500 bg-red-50/50"
  }
  
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`border border-gray-200 border-l-4 rounded-lg p-3 cursor-pointer transition-shadow hover:shadow-md h-full min-h-[70px] ${statusColors[post.status] || 'border-l-gray-300'}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-md bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center relative">
           <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
           {post.isLocked && (
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
               <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
             </div>
           )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-900">{post.time}</span>
            <div className="flex items-center gap-1.5">
              <FaFacebook className="h-3.5 w-3.5 text-[#1877F2]" />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 font-medium">{post.caption || post.title}</p>
        </div>
      </div>
    </div>
  )
}

function PostPreviewModal({ post, onClose, onClearFlag, onEdit, onDelete, onRegenerate }) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!post) return null

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(post.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white sm:rounded-xl">
        <DialogTitle className="sr-only">Post Preview</DialogTitle>
        <DialogDescription className="sr-only">Details and actions for the selected post.</DialogDescription>
        
        {post.status === "failed" && (
          <div className="bg-red-50 border-b border-red-200 p-4 pr-12 flex items-center justify-between w-full rounded-t-xl">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">⚠️ This post failed to publish.</p>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-sm shrink-0 ml-4" onClick={() => onEdit(post)}>Fix & Reschedule</Button>
          </div>
        )}

        <div className="grid md:grid-cols-2">
          <div className="bg-gray-100 border-r border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px] relative">
            <div className="w-full aspect-square bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-gray-400">
               <ImageIcon className="h-12 w-12 mb-2" />
               <p className="text-sm font-medium">High-Res Visual</p>
            </div>
            {post.isLocked && (
              <Badge className="absolute top-4 left-4 bg-gray-900 text-white gap-1.5 px-3">
                <Lock className="h-3 w-3" /> Pushed to Platform
              </Badge>
            )}
          </div>

          <div className="p-6 pr-12 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1.5 border border-gray-200 rounded-md bg-white shadow-sm">
                  <FaFacebook className="h-4 w-4 text-[#1877F2]" />
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900">{post.time}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 mb-6">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {post.caption || post.title}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              
              <Button 
                variant="outline" 
                className="border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                onClick={() => onEdit(post)}
                disabled={post.isLocked || isRegenerating}
              >
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </Button>
              
              <Button variant="outline" className="border-gray-200 bg-white hover:bg-gray-50 text-gray-700" disabled={!post.isLocked || isRegenerating}>
                <Eye className="mr-2 h-4 w-4" /> View Live
              </Button>

              {post.isLocked ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="col-span-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" disabled={isRegenerating}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} /> Regenerate Entire Post
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Already Scheduled on Platform</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600 mt-2">
                        This post is natively scheduled on the platform. If you regenerate it, you must select a new time. We will attempt to remove the old post from the platform queue.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleRegenerate}>
                        Proceed & Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button variant="outline" className="col-span-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700" disabled={isRegenerating} onClick={handleRegenerate}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} /> {isRegenerating ? 'Regenerating...' : 'Regenerate Entire Post'}
                </Button>
              )}
              
              <Button variant="ghost" className="col-span-2 text-red-600 hover:text-red-700 hover:bg-red-50 mt-2" onClick={onDelete} disabled={post.isLocked || isRegenerating}>
                <Trash2 className="mr-2 h-4 w-4" /> Cancel & Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
