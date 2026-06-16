import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

const DEMO_CUES = [
  { title: 'Superannuation objection', content: 'Many patients use super for implants — I can explain the process.' },
  { title: 'Pain concern', content: 'Sedation options available — most patients report minimal discomfort.' },
]

const DEMO_TRANSCRIPT = [
  'Rep: So tell me about your current situation with your teeth.',
  'Patient: I have upper and lower missing molars, wearing a partial plate.',
  'Patient: My husband David wants to look at superannuation funding.',
]

interface LiveCopilotPanelProps {
  open: boolean
  onClose: () => void
}

export function LiveCopilotPanel({ open, onClose }: LiveCopilotPanelProps) {
  const [lines] = useState(DEMO_TRANSCRIPT)

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border/40 bg-background shadow-xl">
      <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Live copilot</span>
          <Badge variant="info">Live</Badge>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="space-y-4 p-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lines.map((line, i) => (
                <p key={i} className="text-muted-foreground">{line}</p>
              ))}
            </CardContent>
          </Card>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cue cards</p>
            {DEMO_CUES.map((cue) => (
              <Card key={cue.title} className="mb-2 border-border/40">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{cue.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{cue.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
