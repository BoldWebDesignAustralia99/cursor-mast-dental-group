import { useAuth } from '@/providers/AuthProvider'
import { useThemePreference } from '@/providers/ThemeProvider'
import { PageHeader } from '@/components/shared/PageStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE_LABELS, THEME_PREFERENCES } from '@/lib/constants'

export function ProfilePage() {
  const { profile } = useAuth()
  const { preference, setPreference } = useThemePreference()

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
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={preference}
              onValueChange={(v) =>
                setPreference(v as (typeof THEME_PREFERENCES)[number])
              }
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System default</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
