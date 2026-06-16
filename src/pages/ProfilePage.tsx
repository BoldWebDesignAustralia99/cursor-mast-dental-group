import { useAuth } from '@/providers/AuthProvider'
import { useThemePreference } from '@/providers/ThemeProvider'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ROLE_LABELS } from '@/lib/constants'

export function ProfilePage() {
  const { profile } = useAuth()
  const { isDark, setDarkMode } = useThemePreference()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details and display preferences"
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{profile?.full_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">
              {profile ? ROLE_LABELS[profile.role] : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-md items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="profile-dark-mode">Dark mode</Label>
              <p className="text-sm text-muted-foreground">
                Dark is the default. Turn off for light mode.
              </p>
            </div>
            <Switch
              id="profile-dark-mode"
              checked={isDark}
              onCheckedChange={setDarkMode}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
