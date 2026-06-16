import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const INTEGRATIONS = [
  { key: 'twilio_au', label: 'Twilio Australia', status: 'Configure in env' },
  { key: 'twilio_us', label: 'Twilio USA', status: 'Configure in env' },
  { key: 'stripe', label: 'Stripe', status: 'Configure in env' },
  { key: 'gocardless', label: 'GoCardless', status: 'Configure in env' },
  { key: 'resend', label: 'Resend', status: 'Configure in env' },
  { key: 'anthropic', label: 'Anthropic', status: 'Configure in env' },
  { key: 'openai', label: 'OpenAI', status: 'Configure in env' },
  { key: 'deepgram', label: 'Deepgram', status: 'Configure in env' },
  { key: 'elevenlabs', label: 'ElevenLabs', status: 'Configure in env' },
  { key: 'mapbox', label: 'Mapbox', status: 'Configure in env' },
  { key: 'xero', label: 'Xero', status: 'Configure in env' },
  { key: 'praktika', label: 'Praktika PMS', status: 'Configure in env' },
]

export function IntegrationsPage() {
  return (
    <PermissionGate permission="integrations.manage">
      <div className="space-y-6">
        <PageHeader title="Integrations" description="API credentials and webhook endpoints" />
        <Card className="border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Integration</TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INTEGRATIONS.map((i) => (
                <TableRow key={i.key}>
                  <TableCell className="font-medium">{i.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    /functions/v1/webhook-{i.key.replace('_', '-')}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Set credentials in Supabase Edge Function secrets. Webhook URLs are documented in README.
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}

export function PerformanceDashboardPage() {
  const reps = [
    { name: 'Sarah Chen', bookings: 18, shows: 12, grade: 82 },
    { name: 'Mike Torres', bookings: 15, shows: 10, grade: 76 },
  ]
  return (
    <PermissionGate permission="dashboard.view">
      <div className="space-y-6">
        <PageHeader title="Performance" description="Bookings, shows, and rep grades" />
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
              {reps.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.bookings}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.shows}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.grade}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PermissionGate>
  )
}
