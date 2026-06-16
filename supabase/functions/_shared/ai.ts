// Shared AI module — Anthropic primary, OpenAI fallback (§1.5)

export interface AIRequest {
  useCase: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  content: string
  provider: 'anthropic' | 'openai'
  model: string
}

export async function callAI(req: AIRequest): Promise<AIResponse> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: Deno.env.get('AI_MODEL_ANTHROPIC') ?? 'claude-sonnet-4-20250514',
          max_tokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.3,
          system: req.systemPrompt,
          messages: [{ role: 'user', content: req.userPrompt }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text ?? ''
        return { content: text, provider: 'anthropic', model: data.model ?? 'claude' }
      }
    } catch { /* fall through */ }
  }

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL_OPENAI') ?? 'gpt-4o-mini',
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.3,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    })
    const data = await res.json()
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      provider: 'openai',
      model: data.model ?? 'gpt-4o-mini',
    }
  }

  throw new Error('No AI provider configured')
}

export function stripStaffNames(text: string): string {
  return text.replace(/\b(representative|agent|rep)\s+[A-Z][a-z]+/gi, '[staff]')
}
