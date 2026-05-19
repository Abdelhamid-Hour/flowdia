// React state drives the controlled auth form fields and loading state.
import React, { useState } from 'react'
// Auth context exposes sign in/up methods backed by Supabase.
import { useAuth } from '@/context/auth-context'
// Reusable UI primitives for consistent styling.
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
// Toast notifications provide immediate success/error feedback.
import { toast } from 'sonner'
// Decorative and provider icons used in the login card.
import { Bot, Sparkles } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'

export default function Login() {
  // Local controlled form values and submission lock.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()

  // Handles email/password login flow.
  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn({ email, password })
    if (error) toast.error(error.message)
    setLoading(false)
  }

  // Handles registration flow from the same screen.
  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUp({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  // Handles OAuth login via Google provider.
  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200 text-white">
            <Bot className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Flowdia</CardTitle>
          <CardDescription>
            The ultimate AI-powered social automation engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-11 border-slate-200 flex items-center justify-center gap-3 font-medium hover:bg-slate-50 transition-colors"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle className="h-5 w-5" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">Or email login</span>
            </div>
          </div>

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base font-medium" 
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Sign In'}
            </Button>
          </form>
          <Button 
            variant="ghost" 
            className="w-full h-11 text-slate-600" 
            onClick={handleSignUp}
            disabled={loading}
          >
            Create an Account
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-slate-500">
            By clicking continue, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
      
      {/* Decorative background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  )
}
