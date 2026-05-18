// Migrated from Next.js app/profile/page.tsx to Vite SPA

import * as React from "react"
import { useState } from "react"
import { Shield, Key, Globe, CheckCircle2, MoreVertical, LogOut, RefreshCw } from "lucide-react"
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState("personal")

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings & Profile</h1>
            <p className="text-sm text-gray-500">Manage your identity and external connections.</p>
          </div>
        </div>
      </div>

      {/* Main Workspace Area (Vertical Tabs) */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row gap-8">
          
          {/* Vertical Tabs Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
              <TabsList className="flex flex-col h-auto bg-transparent items-stretch space-y-1 p-0">
                <TabsTrigger 
                  value="personal" 
                  className="justify-start px-4 py-2.5 h-auto text-left font-medium data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200 transition-all rounded-md"
                >
                  <Shield className="mr-3 h-4 w-4" /> Personal Profile
                </TabsTrigger>
                <TabsTrigger 
                  value="integrations" 
                  className="justify-start px-4 py-2.5 h-auto text-left font-medium data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200 transition-all rounded-md"
                >
                  <Globe className="mr-3 h-4 w-4" /> Social Integrations
                </TabsTrigger>

              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 min-w-0">
            {/* Personal Profile */}
            {activeTab === "personal" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                    <p className="text-sm text-gray-500">Update your basic profile details.</p>
                  </div>
                  
                  <div className="grid gap-6 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue="Alex Rivera" className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue="alex@flowdia.app" className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Timezone</Label>
                      <Select defaultValue="est">
                        <SelectTrigger className="bg-gray-50">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pst">Pacific Time (US & Canada)</SelectItem>
                          <SelectItem value="est">Eastern Time (US & Canada)</SelectItem>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="gmt">GMT (London)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Crucial for accurate scheduling of Cron jobs and posts.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Security</h4>
                      <p className="text-sm text-gray-500">Manage your password.</p>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Key className="h-4 w-4" /> Reset Password
                    </Button>
                  </div>

                  <div className="pt-6">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Social Integrations */}
            {activeTab === "integrations" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Social Integrations</h3>
                    <p className="text-sm text-gray-500">Manage your connected social media accounts.</p>
                  </div>

                  {/* Meta Card */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-md flex items-center justify-center">
                          <FaFacebook className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">Meta / Facebook</h4>
                          <p className="text-xs text-gray-500">Publish to Facebook and Instagram.</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-2 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                      </Badge>
                    </div>

                    <div className="bg-gray-50 rounded-md p-4 flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>FL</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Flowdia Official</p>
                          <p className="text-xs text-gray-500">Business Page</p>
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 bg-white border-gray-200 text-gray-700">
                            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Switch Page
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Which Page do you want to connect?</DialogTitle>
                            <DialogDescription>
                              Select a Facebook Business Page associated with your account.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-2 py-4">
                            <div className="flex items-center justify-between p-3 border-2 border-blue-600 bg-blue-50 rounded-lg cursor-pointer">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>FL</AvatarFallback></Avatar>
                                <span className="font-semibold text-gray-900 text-sm">Flowdia Official</span>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>TS</AvatarFallback></Avatar>
                                <span className="font-medium text-gray-900 text-sm">Tech Startups Weekly</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline">Cancel</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Confirm Selection</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" /> Disconnect Integration
                      </Button>
                    </div>
                  </div>

                  {/* Google Card */}
                  <div className="border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-red-50 rounded-md flex items-center justify-center">
                          <FaYoutube className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">Google / YouTube</h4>
                          <p className="text-xs text-gray-500">Publish video content and shorts.</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-2 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                      </Badge>
                    </div>

                    <div className="bg-gray-50 rounded-md p-4 flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>YT</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Flowdia App</p>
                          <p className="text-xs text-gray-500">YouTube Channel</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" /> Disconnect Integration
                      </Button>
                    </div>
                  </div>
                  
                </div>
              </div>
            )}


            
          </div>
        </div>
      </div>
    </div>
  )
}
