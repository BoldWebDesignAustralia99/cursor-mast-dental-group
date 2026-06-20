import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { isDemoModeEnabled } from '@/lib/demo'
import { useLeaderboard } from '@/hooks/useTeam'

const db = supabase as any

const ENDPOINT_MAP: Record<string, string> = {
  twilio_au: '/functions/v1/twilio-voice-webhook',
  twilio_us: '/functions/v1/twilio-voice-webhook',
  stripe: '/functions/v1/webhook-stripe',
  gocardless: '/functions/v1/webhook-gocardless',
  deepgram: 'Live transcription service (TRANSCRIPTION_WS_URL)',
  elevenlabs: '/functions/v1/elevenlabs-practice-call',
  mapbox: '/functions/v1/mapbox-geocode',
  xero: '/functions/v1/xero-push-payroll',
  praktika: '/functions/v1/sync-pms',
  anthropic: 'Edge Function secret',
  openai: 'Edge Function secret',
  resend: 'Edge Function secret',
}

const OAUTH_INTEGRATIONS: Record<string, string> = {
  xero: '/functions/v1/xero-oauth',
}

const DEMO_INTEGRATIONS = [
  { integration_key: 'twilio_au', label: 'Twilio Australia', is_active: false },
  { integration_key: 'stripe', label: 'Stripe', is_active: false },
  { integration_key: 'deepgram', label: 'Deepgram', is_active: false },
  { integration_key: 'xero', label: 'Xero', is_active: false },
  { integration_key: 'praktika', label: 'Praktika PMS', is_active: false },
  { integration_key: 'elevenlabs', label: 'ElevenLabs', is_active: false },
]

export function IntegrationsPage() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      if (isDemoModeEnabled()) return DEMO_INTEGRATIONS
      const { data, error } = await db.from('integration_configs').select('integration_key, label, is_active')
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <PermissionGate permission="integrations.manage">
      <div className="space-y-6">
        <PageHeader title="Integrations" description="API credentials and webhook endpoints" />
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card className="border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Integration</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(integrations ?? []).map((i: { integration_key: string; label: string; is_active: boolean }) => (
                  <TableRow key={i.integration_key}>
                    <TableCell className="font-medium">{i.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {OAUTH_INTEGRATIONS[i.integration_key] ?? ENDPOINT_MAP[i.integration_key] ?? 'Configure in secrets'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.is_active ? 'success' : 'secondary'}>
                        {i.is_active ? 'Active' : 'Configure secrets'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Set credentials in Supabase Edge Function secrets. Live telephony requires Twilio + Deepgram keys.
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PerformanceDashboardPage() {
  const { data: reps, isLoading } = useLeaderboard()

  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-6">
        <PageHeader title="Performance" description="Bookings, shows, and rep grades" />
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Card className="border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Rep</TableHead>
                  <TableHead className="text-right tabular-nums">Bookings</TableHead>
                  <TableHead className="text-right tabular-nums">Shows</TableHead>
                  <TableHead className="text-right tabular-nums">Avg grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reps ?? []).map((r: { staff_id: string; full_name: string; bookings_month: number; shows_month: number; avg_grade: number | null }) => (
                  <TableRow key={r.staff_id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.bookings_month}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.shows_month}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avg_grade?.toFixed(0) ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </PermissionGate>
  )
}
