// Migrated from Next.js app/automation-settings/page.tsx to Vite SPA

import * as React from "react"
import { useState } from "react"
import { Power, Globe, Clock, MessageSquare, Image as ImageIcon, Bot, AlertTriangle, CheckCircle, Info } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function AutomationSettings() {
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [masterSwitch, setMasterSwitch] = useState(false)
  
  // Sync Toggles
  const [syncScheduling, setSyncScheduling] = useState(true)
  const [syncTopics, setSyncTopics] = useState(true)

  // Scheduling State
  const [frequency, setFrequency] = useState("2")
  const isMetaLimitExceeded = parseInt(frequency) > 25

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 relative">
      
      {/* Onboarding Modal */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md text-center p-8">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">Welcome to the Engine Room</DialogTitle>
            <DialogDescription className="text-base text-gray-500 mb-6">
              This is where you define the "Rules of the Game". Configure your posting frequency, AI behavior, and approval workflows.
            </DialogDescription>
          </DialogHeader>
          <Button 
            size="lg" 
            className="w-full animate-pulse shadow-blue-200 shadow-lg"
            onClick={() => setShowOnboarding(false)}
          >
            Configure Automation
          </Button>
        </DialogContent>
      </Dialog>

      {/* Page Header & Master Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Automation Settings</h2>
          <p className="text-gray-500 mt-1">Configure global rules and AI behaviors for your social channels.</p>
        </div>
        <div className="flex items-center gap-4 bg-white border border-gray-200 px-6 py-4 rounded-xl shadow-sm">
          <div className="space-y-0.5 mr-4">
            <Label className="text-base font-bold text-gray-900">Master Switch</Label>
            <p className="text-xs text-gray-500">Toggle all AI automation</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${masterSwitch ? 'text-gray-500' : 'text-gray-900'}`}>Paused</span>
            <Switch 
              checked={masterSwitch} 
              onCheckedChange={setMasterSwitch}
              className="data-[state=checked]:bg-emerald-500"
            />
            <span className={`text-sm font-semibold ${masterSwitch ? 'text-emerald-600' : 'text-gray-500'}`}>Active</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 w-full">
        
        {/* Section 1: Scheduling Rules */}
        <Card>
          <CardHeader className="border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <CardTitle>Scheduling Rules</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sync-scheduling" className="text-sm font-medium text-gray-700">Sync Platforms</Label>
                <Switch id="sync-scheduling" checked={syncScheduling} onCheckedChange={setSyncScheduling} />
              </div>
            </div>
            <CardDescription>Configure when and how often the AI generates and publishes content.</CardDescription>
          </CardHeader>
          <CardContent>
            {syncScheduling ? (
              <SchedulingForm frequency={frequency} setFrequency={setFrequency} isMetaLimitExceeded={isMetaLimitExceeded} />
            ) : (
              <Tabs defaultValue="facebook" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="facebook">Facebook</TabsTrigger>
                  <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  <TabsTrigger value="youtube">YouTube</TabsTrigger>
                </TabsList>
                <TabsContent value="facebook"><SchedulingForm frequency={frequency} setFrequency={setFrequency} isMetaLimitExceeded={isMetaLimitExceeded} platform="Facebook" /></TabsContent>
                <TabsContent value="instagram"><SchedulingForm frequency={frequency} setFrequency={setFrequency} isMetaLimitExceeded={isMetaLimitExceeded} platform="Instagram" /></TabsContent>
                <TabsContent value="youtube"><SchedulingForm frequency={frequency} setFrequency={setFrequency} isMetaLimitExceeded={isMetaLimitExceeded} platform="YouTube" /></TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Content Strategy */}
        <Card>
          <CardHeader className="border-b border-gray-100 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <CardTitle>Content Strategy</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sync-topics" className="text-sm font-medium text-gray-700">Sync Topics</Label>
                <Switch id="sync-topics" checked={syncTopics} onCheckedChange={setSyncTopics} />
              </div>
            </div>
            <CardDescription>Define what the AI talks about and who it talks to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Target Audience is always global */}
            <div className="space-y-2">
              <Label>Global Target Audience</Label>
              <Input placeholder="e.g., Small Business Owners, Tech Enthusiasts..." defaultValue="Tech Founders & Developers" />
              <p className="text-xs text-gray-500">This audience profile applies to all platforms.</p>
            </div>

            {syncTopics ? (
              <TopicForm />
            ) : (
              <Tabs defaultValue="facebook" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="facebook">Facebook</TabsTrigger>
                  <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  <TabsTrigger value="youtube">YouTube</TabsTrigger>
                </TabsList>
                <TabsContent value="facebook"><TopicForm platform="Facebook" /></TabsContent>
                <TabsContent value="instagram"><TopicForm platform="Instagram" /></TabsContent>
                <TabsContent value="youtube"><TopicForm platform="YouTube" /></TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Section 3: Brand Persona */}
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
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Instructions (Prompt Rules)</Label>
                <Textarea 
                  placeholder="e.g., Always use emojis. Never use the word 'cheap'." 
                  className="min-h-[120px] resize-none"
                  defaultValue="Maintain a professional yet enthusiastic tone. Use 1-2 emojis per post."
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Visual & Asset Defaults */}
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
                <Select defaultValue="ai">
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
                <Input placeholder="e.g., Minimalist, blue and white colors..." defaultValue="Modern, clean, predominantly blue branding" />
                <p className="text-xs text-gray-500">Used as guidance when AI generates images.</p>
              </div>
            </CardContent>
          </Card>
        </div>



      </div>
    </div>
  )
}

// Sub-components for modularity

function SchedulingForm({ frequency, setFrequency, isMetaLimitExceeded, platform }) {
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  
  const [activeDays, setActiveDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
  const [syncTimes, setSyncTimes] = useState(true)
  
  const freqCount = parseInt(frequency) > 0 ? parseInt(frequency) : 1
  const freqArray = Array.from({ length: Math.min(freqCount, 25) })

  const handleDayToggle = (day, checked) => {
    if (checked) {
      setActiveDays(prev => [...prev, day])
    } else {
      setActiveDays(prev => prev.filter(d => d !== day))
    }
  }

  const sortedActiveDays = allDays.filter(day => activeDays.includes(day))

  return (
    <div className="space-y-6">
      {platform && <div className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">{platform} Specific Settings</div>}
      
      <div className="space-y-2">
        <Label>Posting Frequency (per day)</Label>
        <Input 
          type="number" 
          value={frequency} 
          onChange={(e) => setFrequency(e.target.value)}
          className={isMetaLimitExceeded ? "border-red-500 focus-visible:ring-red-500" : ""}
          min="1"
        />
        <div className="flex gap-1.5 items-start mt-1">
          <Info className={`h-4 w-4 shrink-0 mt-0.5 ${isMetaLimitExceeded ? 'text-red-500' : 'text-gray-400'}`} />
          <p className={`text-xs ${isMetaLimitExceeded ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            Platform Daily Limit: Meta allows up to 25 posts/day. {isMetaLimitExceeded && "Limit exceeded."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Active Days</Label>
        <div className="flex flex-wrap gap-2">
          {allDays.map(day => (
            <div key={day} className="flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
              <Checkbox 
                id={`day-${day}-${platform || 'unified'}`} 
                checked={activeDays.includes(day)}
                onCheckedChange={(checked) => handleDayToggle(day, checked)}
              />
              <Label htmlFor={`day-${day}-${platform || 'unified'}`} className="cursor-pointer text-sm font-medium">{day}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">Time Slots</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor={`sync-time-${platform || 'unified'}`} className="text-xs text-gray-500">Sync Times (Apply to all)</Label>
            <Switch 
              id={`sync-time-${platform || 'unified'}`} 
              checked={syncTimes}
              onCheckedChange={setSyncTimes}
            />
          </div>
        </div>
        <div className="space-y-4">
          {syncTimes ? (
            <div className="flex flex-wrap gap-4">
              {freqArray.map((_, i) => (
                <div key={`master-${i}`} className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Post {i + 1}</Label>
                  <Input type="time" defaultValue={i === 0 ? "09:00" : i === 1 ? "15:00" : "18:00"} className="w-32 bg-white" />
                </div>
              ))}
            </div>
          ) : (
            sortedActiveDays.map(day => (
              <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <Label className="w-16 font-semibold text-gray-700">{day}</Label>
                <div className="flex flex-wrap gap-3">
                  {freqArray.map((_, i) => (
                    <div key={`${day}-${i}`} className="space-y-1">
                      <Label className="text-[10px] text-gray-400 uppercase tracking-wider">Post {i + 1}</Label>
                      <Input type="time" defaultValue={i === 0 ? "09:00" : i === 1 ? "15:00" : "18:00"} className="w-28 h-8 text-sm bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {(!syncTimes && sortedActiveDays.length === 0) && (
            <p className="text-sm text-gray-500 italic">No active days selected.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicForm({ platform }) {
  return (
    <div className="space-y-6 pt-2 border-t border-gray-100">
      {platform && <div className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">{platform} Specific Strategy</div>}
      
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Topic Generation Cycle</Label>
          <Select defaultValue="weekly">
            <SelectTrigger>
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Core Niche / Category</Label>
          <Input defaultValue="Education & SaaS Productivity" />
        </div>
      </div>
    </div>
  )
}
