import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TranscriptLine } from '@/hooks/useLiveTranscript'
import type { CopilotCue } from '@/hooks/useCopilot'

function speakerLabel(speaker: string) {
  if (speaker === 'rep' || speaker === 'agent') return 'You'
  if (speaker === 'patient') return 'Patient'
  return speaker
}

interface LiveCopilotPanelProps {
  open: boolean
  onClose: () => void
  lines: TranscriptLine[]
  cues: CopilotCue[]
  cuesLoading?: boolean
  connected?: boolean
  isLive?: boolean
}

export function LiveCopilotPanel({ open, onClose, lines, cues, cuesLoading, connected, isLive }: LiveCopilotPanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border/40 bg-background shadow-xl">
      <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Live copilot</span>
          <Badge variant={connected || isLive ? 'info' : 'secondary'}>
            {isLive ? 'Live call' : connected ? 'Connected' : 'Demo'}
          </Badge>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="space-y-4 p-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lines.length === 0 ? (
                <p className="text-muted-foreground">Waiting for speech…</p>
              ) : (
                lines.map((line) => (
                  <p key={line.id} className={line.isFinal ? 'text-foreground' : 'text-muted-foreground italic'}>
                    <span className="font-medium">{speakerLabel(line.speaker)}:</span> {line.text}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cue cards</p>
            {cuesLoading ? (
              <p className="text-sm text-muted-foreground">Matching cues…</p>
            ) : cues.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cue cards appear as keywords are detected in the conversation.</p>
            ) : (
              cues.map((cue) => (
                <Card key={cue.id} className="mb-2 border-border/40">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{cue.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{cue.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
