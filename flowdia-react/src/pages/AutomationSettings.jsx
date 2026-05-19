// Migrated from Next.js app/automation-settings/page.tsx to Vite SPA.

// React hooks for state and lifecycle.
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
// Icons used in section headers and helper messages.
import { Globe, Clock, MessageSquare, Image as ImageIcon, Info } from "lucide-react"
// Toasts for success/error feedback after API actions.
import { toast } from "sonner"
// Auth context gives us the active Supabase access token.
import { useAuth } from "@/context/auth-context"

// UI primitives reused across all settings blocks.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Backend API base URL (falls back to local backend when env var is absent).
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Default full settings object used by the page before API data arrives.
const defaultSettings = () => ({
  is_active: false,
  topic_cycle: "weekly",
  niche: "",
  target_audience: "",
  language: "English (US)",
  custom_instructions: "",
  image_source: "ai",
  image_instructions: "",
  frequency_per_day: 2,
  active_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  global_times: ["09:00", "15:00"],
})

// Ensures time slots array length always matches frequency selected by the user.
function adjustTimes(times, count) {
  const safeCount = Math.max(1, Math.min(25, Number(count) || 1))
  const base = Array.isArray(times) ? [...times] : []
  const fallbackSlots = ["09:00", "15:00", "18:00", "20:00"]
  while (base.length < safeCount) {
    base.push(fallbackSlots[(base.length - 1 + fallbackSlots.length) % fallbackSlots.length])
  }
  return base.slice(0, safeCount)
}

// Normalizes backend payload to ensure missing keys still produce stable UI state.
function normalizeSettings(raw) {
  const base = defaultSettings()
  const frequency = Math.max(1, Math.min(25, Number(raw?.frequency_per_day || base.frequency_per_day)))
  
  return {
    ...base,
    ...(raw || {}),
    frequency_per_day: frequency,
    global_times: adjustTimes(raw?.global_times || base.global_times, frequency),
    active_days: Array.isArray(raw?.active_days) ? raw.active_days : base.active_days
  }
}

export default function AutomationSettings() {
  // Main settings state loaded from backend and edited by user.
  const [settings, setSettings] = useState(defaultSettings())
  // Network-state flags for better UX and button locking.
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  // Read active session token for authenticated API requests.
  const { session } = useAuth()

  // Derived helper for inline warning when frequency exceeds Facebook daily cap.
  const isFbLimitExceeded = Number(settings.frequency_per_day || 0) > 25

  // Memoized auth headers so requests always carry the latest access token.
  const authHeaders = useMemo(() => {
    return session?.access_token
      ? {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" }
  }, [session?.access_token])

  // Shared API wrapper with consistent auth/error handling.
  const callApi = async (path, options = {}) => {
    if (!session?.access_token) throw new Error("You are not authenticated.")
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {}),
      },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || payload.error || "Request failed.")
    return payload
  }

  // Loads settings from backend on first authenticated render.
  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const data = await callApi("/automation/settings")
      setSettings(normalizeSettings(data.settings))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Persist current settings state to backend.
  const saveSettings = async () => {
    try {
      setIsSaving(true)
      const payload = {
        ...settings,
        frequency_per_day: Math.max(1, Math.min(25, Number(settings.frequency_per_day) || 1)),
        global_times: adjustTimes(settings.global_times, settings.frequency_per_day),
      }
      const data = await callApi("/automation/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setSettings(normalizeSettings(data.settings))
      toast.success(data.message || "Automation settings updated.")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset settings to backend defaults and refresh local state.
  const resetSettings = async () => {
    try {
      setIsResetting(true)
      const data = await callApi("/automation/settings/reset", { method: "POST" })
      setSettings(normalizeSettings(data.settings))
      toast.success(data.message || "Settings reset.")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsResetting(false)
    }
  }

  // Run initial load when session token becomes available.
  useEffect(() => {
    if (!session?.access_token) return
    loadSettings()
  }, [session?.access_token])

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 relative">
      {/* Top bar with master activation switch + save/reset actions. */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Automation Settings</h2>
          <p className="text-gray-500 mt-1">Configure Facebook page automation rules and AI behaviors.</p>
        </div>
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 shrink-0">
          <div className="flex items-center gap-4 bg-white border border-gray-200 px-6 py-4 rounded-xl shadow-sm">
            <div className="space-y-0.5 mr-4">
              <Label className="text-base font-bold text-gray-900">Master Switch</Label>
              <p className="text-xs text-gray-500">Toggle Facebook automation</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${settings.is_active ? "text-gray-500" : "text-gray-900"}`}>Paused</span>
              <Switch
                checked={settings.is_active}
                disabled={isLoading || isSaving}
                onCheckedChange={async (checked) => {
                  // Update local state immediately for snappy UI
                  setSettings((prev) => ({ ...prev, is_active: checked }));
                  
                  // Persist immediately to backend
                  try {
                    setIsSaving(true);
                    const data = await callApi("/automation/settings", {
                      method: "PATCH",
                      body: JSON.stringify({ is_active: checked }),
                    });
                    setSettings(normalizeSettings(data.settings));
                    toast.success(checked ? "Automation activated!" : "Automation paused.");
                  } catch (error) {
                    // Revert local state on failure
                    setSettings((prev) => ({ ...prev, is_active: !checked }));
                    toast.error("Failed to update status: " + error.message);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className={`text-sm font-semibold ${settings.is_active ? "text-emerald-600" : "text-gray-500"}`}>Active</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="whitespace-nowrap" variant="outline" disabled={isLoading || isResetting} onClick={resetSettings}>
              {isResetting ? "Resetting..." : "Reset Defaults"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap" disabled={isLoading || isSaving} onClick={saveSettings}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Global loading hint for first paint. */}
      {isLoading ? <div className="text-sm text-gray-500">Loading automation settings...</div> : null}

      <div className="grid gap-8 w-full">
        {/* Scheduling rules section. */}
        <Card>
          <CardHeader className="border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle>Scheduling Rules</CardTitle>
            </div>
            <CardDescription>Configure when and how often the AI publishes to your Facebook Page.</CardDescription>
          </CardHeader>
          <CardContent>
            <SchedulingForm settings={settings} setSettings={setSettings} isFbLimitExceeded={isFbLimitExceeded} />
          </CardContent>
        </Card>

        {/* Content strategy section. */}
        <Card>
          <CardHeader className="border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle>Content Strategy</CardTitle>
            </div>
            <CardDescription>Define what the AI talks about and who it talks to on Facebook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                placeholder="e.g., Small Business Owners, Tech Enthusiasts..."
                value={settings.target_audience}
                onChange={(e) => setSettings((prev) => ({ ...prev, target_audience: e.target.value }))}
              />
              <p className="text-xs text-gray-500">This audience profile defines the tone and style of generated posts.</p>
            </div>
            <TopicForm settings={settings} setSettings={setSettings} />
          </CardContent>
        </Card>

        {/* Brand + visual defaults section. */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <CardTitle>Brand Persona</CardTitle>
              </div>
              <CardDescription>Global voice and language rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primary Language</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings((prev) => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English (US)">English (US)</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Instructions (Prompt Rules)</Label>
                <Textarea
                  placeholder="e.g., Always use emojis. Never use the word 'cheap'."
                  className="min-h-[120px] resize-none"
                  value={settings.custom_instructions}
                  onChange={(e) => setSettings((prev) => ({ ...prev, custom_instructions: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <CardTitle>Visual Defaults</CardTitle>
              </div>
              <CardDescription>How the AI handles imagery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Image Source Strategy</Label>
                <Select value={settings.image_source} onValueChange={(value) => setSettings((prev) => ({ ...prev, image_source: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">Always Generate AI Image</SelectItem>
                    <SelectItem value="stock">Always Use Stock Photo</SelectItem>
                    <SelectItem value="auto">Auto-decide based on content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand Colors / Visual Vibe</Label>
                <Input
                  placeholder="e.g., Minimalist, blue and white colors..."
                  value={settings.image_instructions}
                  onChange={(e) => setSettings((prev) => ({ ...prev, image_instructions: e.target.value }))}
                />
                <p className="text-xs text-gray-500">Used as guidance when AI generates images.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Scheduling form extracted for readability.
function SchedulingForm({ settings, setSettings, isFbLimitExceeded }) {
  // Static weekday ordering used by active-day selector.
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  // Clamp frequency for UI stability.
  const frequency = Math.max(1, Math.min(25, Number(settings.frequency_per_day) || 1))
  // Active days chosen for automated publishing.
  const activeDays = Array.isArray(settings.active_days) ? settings.active_days : []

  // Time slots shown in inputs.
  const visibleTimes = adjustTimes(settings.global_times, frequency)

  return (
    <div className="space-y-6">
      {/* Frequency selector controls how many time slots should exist. */}
      <div className="space-y-2">
        <Label>Posting Frequency (per day)</Label>
        <Input
          type="number"
          value={frequency}
          min="1"
          onChange={(e) => {
            const nextFrequency = Math.max(1, Math.min(25, Number(e.target.value) || 1))
            setSettings((prev) => ({
              ...prev,
              frequency_per_day: nextFrequency,
              global_times: adjustTimes(prev.global_times, nextFrequency),
            }))
          }}
          className={isFbLimitExceeded ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        <div className="flex gap-1.5 items-start mt-1">
          <Info className={`h-4 w-4 shrink-0 mt-0.5 ${isFbLimitExceeded ? "text-red-500" : "text-gray-400"}`} />
          <p className={`text-xs ${isFbLimitExceeded ? "text-red-500 font-medium" : "text-gray-500"}`}>
            Facebook Daily Limit: Meta allows up to 25 posts/day. {isFbLimitExceeded ? "Limit exceeded." : ""}
          </p>
        </div>
      </div>

      {/* Day selector controls weekly distribution. */}
      <div className="space-y-3">
        <Label>Active Days</Label>
        <div className="flex flex-wrap gap-2">
          {allDays.map((day) => (
            <div key={day} className="flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
              <Checkbox
                id={`day-${day}`}
                checked={activeDays.includes(day)}
                onCheckedChange={(checked) => {
                  setSettings((prev) => ({
                    ...prev,
                    active_days: checked ? [...prev.active_days, day] : prev.active_days.filter((d) => d !== day),
                  }))
                }}
              />
              <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm font-medium">{day}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Time slots editor controls posting times for generated posts. */}
      <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <Label className="text-base font-semibold">Time Slots</Label>
        <div className="flex flex-wrap gap-4">
          {visibleTimes.map((slot, index) => (
            <div key={`global-${index}`} className="space-y-1.5">
              <Label className="text-xs text-gray-500">Post {index + 1}</Label>
              <Input
                type="time"
                value={slot}
                className="w-32 bg-white"
                onChange={(e) => {
                  const value = e.target.value
                  setSettings((prev) => {
                    const next = [...prev.global_times]
                    next[index] = value
                    return { ...prev, global_times: next }
                  })
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Topic strategy form.
function TopicForm({ settings, setSettings }) {
  // Value shown in cycle selector.
  const topicCycle = settings.topic_cycle
  // Value shown in niche field.
  const niche = settings.niche

  return (
    <div className="space-y-6 pt-2 border-t border-gray-100">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Topic Generation Cycle</Label>
          <Select
            value={topicCycle}
            onValueChange={(value) => {
              setSettings((prev) => ({ ...prev, topic_cycle: value }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Core Niche / Category</Label>
          <Input
            value={niche}
            onChange={(e) => {
              const value = e.target.value
              setSettings((prev) => ({ ...prev, niche: value }))
            }}
          />
        </div>
      </div>
    </div>
  )
}
