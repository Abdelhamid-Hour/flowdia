/**
 * @file manual-post-creator.jsx
 * @description Modal dialog for manually creating and scheduling social media posts.
 * Supports platform targeting, AI enhancement buttons, and daily limit enforcement.
 *
 * Migrated from: components/manual-post-creator.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive
 *   - Stripped TypeScript interface (ManualPostCreatorProps)
 *   - Removed generic type annotations from useState
 */

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Sparkles, Image as ImageIcon, Wand2, CalendarClock, Send, RefreshCw, Type, Scissors, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { callApi } from "@/lib/api"
import { format } from "date-fns"

export function ManualPostCreator({ open, onOpenChange, initialDate, fixedDate, onSuccess, editPost = null }) {
  const { session } = useAuth()

  const [isEnhancing, setIsEnhancing] = useState(false)
  
  // Local state for text input fields
  const [postContent, setPostContent] = useState("")
  const [mediaPrompt, setMediaPrompt] = useState("")
  const [scheduledDate, setScheduledDate] = useState(initialDate || new Date())
  const [scheduleTime, setScheduleTime] = useState("12:00")

  // Business Logic: Sync the default scheduledDate when opened from the calendar
  useEffect(() => {
    if (open && initialDate) {
      setScheduledDate(initialDate)
    }
  }, [open, initialDate])

  // Business Logic: If editPost is provided, populate the local state with existing post details
  useEffect(() => {
    if (open && editPost) {
      setPostContent(editPost.content || editPost.caption || "")
      setMediaPrompt(editPost.mediaPrompt || editPost.image_url || "")
    } else if (open && !editPost) {
      // Clear fields if we are creating a new post
      setPostContent("")
      setMediaPrompt("")
    }
  }, [open, editPost])

  const limits = {
    FB: { current: 0, max: 25 } // Dynamic limit handling can be added later
  }

  const handleEnhance = async (mode) => {
    if (!postContent.trim()) {
      toast.error("Please enter some content first.");
      return;
    }
    try {
      setIsEnhancing(true);
      toast.info("AI is working...");
      const data = await callApi('/ai/enhance', {
        method: 'POST',
        body: JSON.stringify({ text: postContent, mode })
      }, session);
      
      setPostContent(data.result);
      toast.success("Content enhanced.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateImagePrompt = async () => {
    // 1. If the user typed a specific prompt in the media box, generate an image from that directly.
    if (mediaPrompt.trim() && !mediaPrompt.startsWith('http')) {
       setIsEnhancing(true);
       toast.info("Generating AI Image...");
       // Simulate a tiny delay so the UI feels responsive
       setTimeout(() => {
         setMediaPrompt(`https://image.pollinations.ai/prompt/${encodeURIComponent(mediaPrompt.trim())}?width=1080&height=1080&nologo=true`);
         setIsEnhancing(false);
         toast.success("Image generated from your prompt.");
       }, 500);
       return;
    }

    // 2. Otherwise, require the main post content so the AI can figure out what to draw.
    if (!postContent.trim()) {
      toast.error("Please enter some post content, or describe the image you want in the media box first.");
      return;
    }
    
    try {
      setIsEnhancing(true);
      toast.info("Analyzing content to generate image...");
      const data = await callApi('/ai/enhance', {
        method: 'POST',
        body: JSON.stringify({ text: postContent, mode: 'image' })
      }, session);
      
      setMediaPrompt(data.result);
      toast.success("Image generated successfully.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Business Logic: Handles the final validation and submission of the manual post
  const handleAction = async (mode = 'schedule') => {
    // 1. Validation phase
    if (!postContent.trim()) {
      toast.error("Post content cannot be empty.")
      return
    }

    try {
      // Check if in Edit Mode
      if (editPost) {
        const payload = {
          caption: postContent,
          image_url: mediaPrompt
        }
        
        // CRITICAL FIX: If the user is fixing a "failed" post, we must reset its status 
        // to "scheduled" so the Publisher background worker knows to try sending it again.
        if (editPost.status === 'failed') {
          payload.status = 'scheduled'
        }

        const data = await callApi(`/posts/${editPost.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        }, session)

        if (onSuccess) onSuccess(data.post)
        toast.success("Changes saved successfully.")
        onOpenChange(false)
        return
      }

      // Standard Creation validation
      if (mode === 'schedule' && !fixedDate && !scheduledDate) {
        toast.error("Please select a date to schedule the post.")
        return
      }
      if (mode === 'schedule' && !scheduleTime) {
        toast.error("Please enter a valid time.")
        return
      }

      // Combine date and time
      const baseDate = fixedDate || scheduledDate || new Date()
      const combinedDate = new Date(baseDate)
      if (mode === 'schedule') {
        const [hours, minutes] = scheduleTime.split(':')
        combinedDate.setHours(parseInt(hours, 10))
        combinedDate.setMinutes(parseInt(minutes, 10))
        combinedDate.setSeconds(0)
      }

      const payload = {
        caption: postContent,
        image_url: mediaPrompt,
        scheduled_publish_time: combinedDate.toISOString(),
        mode: mode
      }

      // 2. Execution phase
      const data = await callApi('/posts', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, session)

      if (onSuccess) onSuccess(data.post)

      // 3. Cleanup and UI feedback
      if (mode === 'draft') toast.success("Saved as draft.");
      else if (mode === 'now') toast.success("Post published to Facebook!");
      else toast.success("Post successfully scheduled.");
      
      setPostContent("")
      setMediaPrompt("")
      setScheduledDate(null)
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Business Logic: Calculate boolean flags for whether Facebook has reached its limit
  const isFbMaxed = limits.FB.current >= limits.FB.max

  // Business Logic: Determine if the entire form should be locked.
  const isFormLocked = !editPost && isFbMaxed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{editPost ? "Edit Post" : "Create Manual Post"}</DialogTitle>
          <DialogDescription>
            {editPost ? "Modify and update your Facebook post details." : "Craft and schedule your next Facebook post."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {!editPost && isFbMaxed && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p><strong>Daily limit reached</strong> for Facebook. You cannot schedule more posts for today.</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <label className="text-sm font-medium text-gray-900">Post Content</label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isFormLocked || isEnhancing} onClick={() => handleEnhance('enhance')}><Sparkles className="h-3 w-3" /> Enhance</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isFormLocked || isEnhancing} onClick={() => handleEnhance('funnier')}><Wand2 className="h-3 w-3" /> Make Funnier</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isFormLocked || isEnhancing} onClick={() => handleEnhance('shorten')}><Scissors className="h-3 w-3" /> Shorten</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isFormLocked || isEnhancing} onClick={() => handleEnhance('rewrite')}><Type className="h-3 w-3" /> Rewrite</Button>
                </div>
              </div>
              <Textarea 
                placeholder="What's on your mind?" 
                className="min-h-[120px] resize-none" 
                disabled={isFormLocked || isEnhancing} 
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">Media</label>
              <div className="flex flex-col gap-3">
                {/* Standard Upload Actions */}
                <div className="flex flex-row gap-2">
                  <Button variant="outline" size="sm" className="gap-2" disabled={isFormLocked || isEnhancing}><ImageIcon className="h-4 w-4" /> Upload</Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isFormLocked || isEnhancing}><ImageIcon className="h-4 w-4" /> Unsplash</Button>
                </div>
                
                {/* AI Generation Card */}
                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {mediaPrompt && mediaPrompt.startsWith('http') ? (
                    <div className="relative w-full aspect-video rounded-md overflow-hidden border border-slate-200 bg-gray-100">
                      <img src={mediaPrompt} alt="Generated" className="w-full h-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-80 hover:opacity-100" onClick={() => setMediaPrompt("")}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Textarea 
                      placeholder="Describe image for AI or paste URL..." 
                      className="w-full resize-none border-slate-200 shadow-sm bg-white" 
                      rows={3}
                      disabled={isFormLocked || isEnhancing} 
                      value={mediaPrompt}
                      onChange={(e) => setMediaPrompt(e.target.value)}
                    />
                  )}
                  <div className="flex flex-row justify-end gap-2 mt-1">
                    {!mediaPrompt?.startsWith('http') && (
                      <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800" disabled={isFormLocked || isEnhancing} onClick={handleGenerateImagePrompt}>
                        <Sparkles className={`h-4 w-4 ${isEnhancing ? 'animate-spin' : ''}`} /> Generate AI Image
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Logic: Context-Aware Footer. Renders different actions depending on edit status or calendar days. */}
        {editPost ? (
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2 border-t border-gray-200 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => handleAction('schedule')}
            >
              Save Changes
            </Button>
          </DialogFooter>
        ) : fixedDate ? (
          <DialogFooter className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-4 -mx-6 -mb-6 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 shrink-0">Time</label>
              <Input 
                type="time" 
                className="w-[140px] text-center bg-white"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" 
              disabled={isFormLocked}
              onClick={() => handleAction('schedule')}
            >
              <CalendarClock className="h-4 w-4 mr-2" /> Schedule for {format(fixedDate, 'MMM d')}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" className="gap-2" onClick={() => handleAction('draft')} disabled={isFormLocked}>
              <Scissors className="h-4 w-4" /> Draft
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={isFormLocked}>
                  <CalendarClock className="h-4 w-4" /> Schedule
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar 
                  mode="single" 
                  selected={scheduledDate} 
                  onSelect={setScheduledDate} 
                />
                <div className="p-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <label className="text-sm font-medium text-gray-700 shrink-0">Time</label>
                    <Input 
                      type="time" 
                      className="w-[140px] text-center"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    size="sm" 
                    onClick={() => handleAction('schedule')}
                  >
                    Confirm Schedule
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleAction('now')} disabled={isFormLocked}>
              <Send className="h-4 w-4" /> Publish Now
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
