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
import { useMockDb } from "@/context/mock-db-context"
import { format } from "date-fns"

/**
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility.
 * @param {(open: boolean) => void} props.onOpenChange - Callback to toggle dialog.
 * @param {Date} [props.initialDate] - Optional date to prepopulate the calendar.
 * @param {Date} [props.fixedDate] - Optional fixed date enforcing contextual scheduling mode.
 * @param {(data: Object) => void} [props.onSuccess] - Optional callback fired when scheduling is complete.
 * @param {Object} [props.editPost] - Optional post object to switch standard creator into edit mode.
 */
export function ManualPostCreator({ open, onOpenChange, initialDate, fixedDate, onSuccess, editPost = null }) {
  const { scheduleManualPost, updatePost } = useMockDb()
  const [syncAll, setSyncAll] = useState(true)
  const [selectedPlatforms, setSelectedPlatforms] = useState(["FB", "IG", "YT"])

  // Local state for text input fields
  const [targetAudience, setTargetAudience] = useState("")
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
      setMediaPrompt(editPost.mediaPrompt || editPost.media || "")
      setTargetAudience(editPost.audience || "")
    } else if (open && !editPost) {
      // Clear fields if we are creating a new post
      setPostContent("")
      setMediaPrompt("")
      setTargetAudience("")
    }
  }, [open, editPost])

  const limits = {
    FB: { current: 25, max: 25 },
    IG: { current: 3, max: 25 },
    YT: { current: 1, max: 10 }
  }

  const handlePlatformToggle = (platform, checked) => {
    if (checked) {
      setSelectedPlatforms(prev => [...prev, platform])
    } else {
      setSelectedPlatforms(prev => prev.filter(p => p !== platform))
      setSyncAll(false)
    }
  }

  const handleSyncAllToggle = (checked) => {
    setSyncAll(checked)
    if (checked) setSelectedPlatforms(["FB", "IG", "YT"])
  }

  // Business Logic: Handles the final validation and submission of the manual post
  const handleScheduleSubmit = () => {
    // 1. Validation phase
    if (!postContent.trim()) {
      toast.error("Post content cannot be empty.")
      return
    }

    // Check if in Edit Mode
    if (editPost) {
      updatePost(editPost.id, {
        content: postContent,
        caption: postContent,
        media: mediaPrompt,
        mediaPrompt: mediaPrompt,
        audience: targetAudience
      })

      if (onSuccess) {
        onSuccess({
          isEdit: true,
          id: editPost.id,
          content: postContent,
          mediaPrompt: mediaPrompt,
          audience: targetAudience
        })
      }

      toast.success("Changes saved successfully.")
      onOpenChange(false)
      return
    }

    // Standard Creation validation
    if (!fixedDate && !scheduledDate) {
      toast.error("Please select a date to schedule the post.")
      return
    }
    if (!scheduleTime) {
      toast.error("Please enter a valid time.")
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform.")
      return
    }

    // Combine date and time
    // Business Logic: If fixedDate is provided, use it as the definitive scheduling date.
    const baseDate = fixedDate || scheduledDate
    const combinedDate = new Date(baseDate)
    const [hours, minutes] = scheduleTime.split(':')
    combinedDate.setHours(parseInt(hours, 10))
    combinedDate.setMinutes(parseInt(minutes, 10))

    // 2. Execution phase
    scheduleManualPost({
      platforms: selectedPlatforms,
      audience: targetAudience,
      content: postContent,
      mediaPrompt: mediaPrompt,
      scheduledDate: combinedDate
    })

    if (onSuccess) {
      onSuccess({
        platforms: selectedPlatforms,
        content: postContent,
        scheduledDate: combinedDate,
        time: scheduleTime
      })
    }

    // 3. Cleanup and UI feedback
    toast.success("Posts successfully scheduled.")
    setTargetAudience("")
    setPostContent("")
    setMediaPrompt("")
    setScheduledDate(null)
    onOpenChange(false)
  }

  // Business Logic: Calculate boolean flags for whether each platform has reached its limit
  const isFbMaxed = limits.FB.current >= limits.FB.max
  const isIgMaxed = limits.IG.current >= limits.IG.max
  const isYtMaxed = limits.YT.current >= limits.YT.max

  // Business Logic: Global flag indicating if any platform is blocked from scheduling
  const isAnyPlatformMaxed = isFbMaxed || isIgMaxed || isYtMaxed

  // Business Logic: Automatically disable "Sync All" and force uncheck any maxed platforms
  // This ensures the user cannot bypass the limits via initial state or global toggles.
  useEffect(() => {
    if (isAnyPlatformMaxed) {
      setSyncAll(false)
      setSelectedPlatforms(prev => prev.filter(p => {
        if (p === 'FB' && isFbMaxed) return false
        if (p === 'IG' && isIgMaxed) return false
        if (p === 'YT' && isYtMaxed) return false
        return true
      }))
    }
  }, [isAnyPlatformMaxed, isFbMaxed, isIgMaxed, isYtMaxed])

  // Business Logic: Determine if the entire form should be locked.
  // The form is only locked if every single platform has reached its limit.
  const areAllPlatformsMaxed = !editPost && isFbMaxed && isIgMaxed && isYtMaxed

  const maxedOutPlatforms = ['FB', 'IG', 'YT'].filter(p => limits[p].current >= limits[p].max)
  const hasLimitHit = maxedOutPlatforms.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{editPost ? "Edit Post" : "Create Manual Post"}</DialogTitle>
          <DialogDescription>
            {editPost ? "Modify and update your post details." : "Craft and schedule your next post across platforms."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Platform Targeting - Hidden in Edit Mode */}
          {!editPost && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Platform Targeting</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Sync All</span>
                  <Switch checked={syncAll} onCheckedChange={handleSyncAllToggle} disabled={isAnyPlatformMaxed} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {['FB', 'IG', 'YT'].map(p => {
                  const isMaxed = p === 'FB' ? isFbMaxed : p === 'IG' ? isIgMaxed : isYtMaxed;
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <Switch 
                        checked={selectedPlatforms.includes(p)} 
                        onCheckedChange={(checked) => handlePlatformToggle(p, checked)} 
                        disabled={isMaxed}
                      />
                      <span className={`text-sm font-medium ${isMaxed ? 'text-gray-400' : 'text-gray-700'}`}>
                        {p} <span className={`text-xs ${isMaxed ? 'text-red-500 font-bold' : 'text-gray-500'}`}>({limits[p].current}/{limits[p].max})</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!editPost && hasLimitHit && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p><strong>Daily limit reached</strong> for {maxedOutPlatforms.join(', ')}. That platform has been disabled for this post.</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">Target Audience</label>
              <Input 
                placeholder="e.g. Tech founders, local business owners..." 
                disabled={areAllPlatformsMaxed} 
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <label className="text-sm font-medium text-gray-900">Post Content</label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={areAllPlatformsMaxed}><Sparkles className="h-3 w-3" /> Enhance</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={areAllPlatformsMaxed}><Wand2 className="h-3 w-3" /> Make Funnier</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={areAllPlatformsMaxed}><Scissors className="h-3 w-3" /> Shorten</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={areAllPlatformsMaxed}><Type className="h-3 w-3" /> Rewrite</Button>
                </div>
              </div>
              <Textarea 
                placeholder="What's on your mind?" 
                className="min-h-[120px] resize-none" 
                disabled={areAllPlatformsMaxed} 
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">Media</label>
              <div className="flex flex-col gap-3">
                {/* Standard Upload Actions */}
                <div className="flex flex-row gap-2">
                  <Button variant="outline" size="sm" className="gap-2" disabled={areAllPlatformsMaxed}><ImageIcon className="h-4 w-4" /> Upload</Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={areAllPlatformsMaxed}><ImageIcon className="h-4 w-4" /> Unsplash</Button>
                </div>
                
                {/* AI Generation Card */}
                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <Textarea 
                    placeholder="Describe image for AI..." 
                    className="w-full resize-none border-slate-200 shadow-sm bg-white" 
                    rows={3}
                    disabled={areAllPlatformsMaxed} 
                    value={mediaPrompt}
                    onChange={(e) => setMediaPrompt(e.target.value)}
                  />
                  <div className="flex flex-row justify-end gap-2 mt-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" disabled={areAllPlatformsMaxed}><RefreshCw className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800" disabled={areAllPlatformsMaxed}><Sparkles className="h-4 w-4" /> Generate</Button>
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
              onClick={handleScheduleSubmit}
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
              disabled={areAllPlatformsMaxed || selectedPlatforms.length === 0}
              onClick={handleScheduleSubmit}
            >
              <CalendarClock className="h-4 w-4 mr-2" /> Schedule for {format(fixedDate, 'MMM d')}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" className="gap-2" onClick={() => onOpenChange(false)} disabled={areAllPlatformsMaxed || selectedPlatforms.length === 0}>
              <Scissors className="h-4 w-4" /> Draft
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={areAllPlatformsMaxed || selectedPlatforms.length === 0}>
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
                    onClick={handleScheduleSubmit}
                  >
                    Confirm Schedule
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => onOpenChange(false)} disabled={areAllPlatformsMaxed || selectedPlatforms.length === 0}>
              <Send className="h-4 w-4" /> Publish Now
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
