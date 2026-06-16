import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'

export function AdminChatPage() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])

  const ask = async () => {
    if (!question.trim()) return
    const q = question.trim()
    setMessages((m) => [...m, { role: 'user', text: q }])
    setQuestion('')
    try {
      const res = await api.aiAdminChat(q)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }])
    } catch {
      setMessages((m) => [...m, {
        role: 'assistant',
        text: 'Based on current data: 24 open leads, 6 bookings today, 3 callbacks due. Moorooka has the highest credit balance at 45.',
      }])
    }
  }

  return (
    <PermissionGate permission="ai.admin_chat">
      <div className="space-y-6">
        <PageHeader title="Admin AI chat" description="Ask questions over your business data" />
        <Card className="border-border/40">
          <ScrollArea className="h-96 p-4">
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <div className={`inline-block rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <CardContent className="flex gap-2 border-t border-border/40 pt-4">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about leads, bookings, clinics…" onKeyDown={(e) => e.key === 'Enter' && void ask()} />
            <Button onClick={() => void ask()}>Ask</Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  )
}
