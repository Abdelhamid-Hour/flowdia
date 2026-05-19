// Migrated from Next.js app/profile/page.tsx to Vite SPA

// React state drives tabs, form values, and async request states.
import * as React from "react"
import { useEffect, useMemo, useState } from "react"
// Icons for profile/security/integration actions.
import { Shield, Key, Globe, CheckCircle2, LogOut, RefreshCw } from "lucide-react"
import { FaFacebook } from "react-icons/fa"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"

// Shared UI primitives for forms, tabs, badges, and dialogs.
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const TIMEZONE_OPTIONS = [
  { value: "pst", label: "Pacific Time (US & Canada)" },
  { value: "est", label: "Eastern Time (US & Canada)" },
  { value: "utc", label: "UTC" },
  { value: "gmt", label: "GMT (London)" },
]

function platformIcon(platform) {
  return <FaFacebook className="h-5 w-5 text-blue-600" />
}

function platformLabel(platform) {
  return "Meta / Facebook"
}

export default function ProfileSettings() {
  // Controls which vertical section is visible on the right panel.
  const [activeTab, setActiveTab] = useState("personal")
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false)
  const [isSelectingIntegration, setIsSelectingIntegration] = useState(false)
  const [isDisconnectingIntegration, setIsDisconnectingIntegration] = useState(false)

  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    timezone: "utc",
    avatar_url: null,
    mfa_enabled: false,
    is_mfa_active: false,
  })
  const [integrations, setIntegrations] = useState([])
  const [switchDialogPlatform, setSwitchDialogPlatform] = useState(null)

  const selectedPlatformAccounts = useMemo(() => {
    if (!switchDialogPlatform) return []
    return integrations.filter((item) => item.platform === switchDialogPlatform)
  }, [integrations, switchDialogPlatform])

  const authHeaders = useMemo(() => {
    return session?.access_token
      ? {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" }
  }, [session?.access_token])

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
    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Request failed.")
    }
    return payload
  }

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const me = await callApi("/profile/me")
      setProfile({
        id: me.id || "",
        full_name: me.full_name || "",
        email: me.email || "",
        timezone: me.timezone || "utc",
        avatar_url: me.avatar_url || null,
        mfa_enabled: Boolean(me.mfa_enabled),
        is_mfa_active: Boolean(me.is_mfa_active),
      })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadIntegrations = async () => {
    try {
      setIsLoadingIntegrations(true)
      const data = await callApi("/profile/integrations")
      setIntegrations(Array.isArray(data.integrations) ? data.integrations : [])
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoadingIntegrations(false)
    }
  }

  useEffect(() => {
    if (!session?.access_token) return
    loadProfile()
    loadIntegrations()
  }, [session?.access_token])

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      const payload = {
        full_name: profile.full_name,
        email: profile.email,
        timezone: profile.timezone,
      }
      const data = await callApi("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      setProfile((prev) => ({
        ...prev,
        ...(data.profile || {}),
      }))
      toast.success(data.message || "Profile updated.")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      setIsResettingPassword(true)
      const data = await callApi("/profile/reset-password", { method: "POST" })
      toast.success(data.message || "Password reset email sent.")
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleSelectIntegration = async (integrationId) => {
    try {
      setIsSelectingIntegration(true)
      const data = await callApi(`/profile/integrations/${integrationId}/select-account`, {
        method: "PATCH",
      })
      setSwitchDialogPlatform(null)
      toast.success(data.message || "Integration selected.")
      await loadIntegrations()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSelectingIntegration(false)
    }
  }

  const handleDisconnectIntegration = async (id) => {
    try {
      setIsDisconnectingIntegration(true)
      const data = await callApi(`/profile/integrations/${id}`, { method: "DELETE" })
      toast.success(data.message || "Integration disconnected.")
      loadIntegrations()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsDisconnectingIntegration(false)
    }
  }

  const handleConnectFacebook = async () => {
    try {
      const data = await callApi('/auth/facebook/url')
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error("Failed to start Facebook connection: " + error.message)
    }
  }

  return (
    // Settings workspace with sticky header and two-column content area.
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
                      <Input
                        id="name"
                        value={profile.full_name}
                        className="bg-gray-50"
                        disabled={isLoading}
                        onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        className="bg-gray-50"
                        disabled={isLoading}
                        onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Timezone</Label>
                      <Select
                        value={profile.timezone}
                        onValueChange={(value) => setProfile((prev) => ({ ...prev, timezone: value }))}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="bg-gray-50">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
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
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={isResettingPassword || isLoading}
                      onClick={handleResetPassword}
                    >
                      <Key className="h-4 w-4" /> Reset Password
                    </Button>
                  </div>

                  <div className="pt-6">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSaving || isLoading}
                      onClick={handleSaveChanges}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
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
                  {isLoadingIntegrations ? (
                    <div className="text-sm text-gray-500">Loading integrations...</div>
                  ) : integrations.length === 0 ? (
                    <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <FaFacebook className="h-6 w-6 text-[#1877F2]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">No Integrations Connected</h4>
                        <p className="max-w-xs mx-auto">Connect your Facebook page to enable autonomous posting and scheduling.</p>
                      </div>
                      <Button className="bg-[#1877F2] hover:bg-[#0c5bca] text-white" onClick={handleConnectFacebook}>
                        Connect Facebook Page
                      </Button>
                    </div>
                  ) : (
                    integrations.map((integration) => (
                      <div key={integration.id} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md flex items-center justify-center bg-gray-50">
                              {platformIcon(integration.platform)}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{platformLabel(integration.platform)}</h4>
                              <p className="text-xs text-gray-500">{integration.platform}</p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              integration.status === "connected"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-2 py-1"
                                : "bg-gray-50 text-gray-600 border-gray-200 gap-1.5 px-2 py-1"
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {integration.status}
                          </Badge>
                        </div>

                        <div className="bg-gray-50 rounded-md p-4 flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {integration.avatar_url ? <AvatarImage src={integration.avatar_url} /> : null}
                              <AvatarFallback>
                                {(integration.account_name || integration.platform || "NA").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{integration.account_name || "Unnamed account"}</p>
                              <p className="text-xs text-gray-500">{integration.account_id}</p>
                            </div>
                          </div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 bg-white border-gray-200 text-gray-700"
                                onClick={() => setSwitchDialogPlatform(integration.platform)}
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Switch Account
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Select account</DialogTitle>
                                <DialogDescription>
                                  Choose which {integration.platform} account should stay connected.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-2 py-4">
                                {selectedPlatformAccounts.map((candidate) => (
                                  <button
                                    key={candidate.id}
                                    type="button"
                                    disabled={isSelectingIntegration}
                                    onClick={() => handleSelectIntegration(candidate.id)}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                      candidate.status === "connected"
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        {candidate.avatar_url ? <AvatarImage src={candidate.avatar_url} /> : null}
                                        <AvatarFallback>
                                          {(candidate.account_name || candidate.platform || "NA").slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-gray-900 text-sm">{candidate.account_name || candidate.account_id}</span>
                                    </div>
                                    {candidate.status === "connected" ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : null}
                                  </button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isDisconnectingIntegration}
                            onClick={() => handleDisconnectIntegration(integration.id)}
                          >
                            <LogOut className="mr-2 h-4 w-4" /> Disconnect Integration
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
