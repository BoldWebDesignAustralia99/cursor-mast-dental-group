import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { signInWithMagicLink } from '@/hooks/useAuth'
import { enableDemoMode } from '@/lib/demo'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    try {
      await signInWithMagicLink(email.trim())
      setSent(true)
      toast.success('Check your email for a sign-in link')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not send sign-in link. Try again or contact support.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mast Dental Group</CardTitle>
          <CardDescription>
            Sign in with your work email to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>. Open it on
                this device to continue.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending link…' : 'Send sign-in link'}
              </Button>
            </form>
          )}
          {!import.meta.env.VITE_SUPABASE_URL && (
            <Alert className="mt-4 border-amber-500/30 bg-amber-500/10">
              <AlertTitle>Demo mode</AlertTitle>
              <AlertDescription>
                Supabase is not configured. You can explore the UI shell without signing in.
              </AlertDescription>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => enableDemoMode()}
              >
                Continue to demo
              </Button>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
