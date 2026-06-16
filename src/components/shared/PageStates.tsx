import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className,
      )}
    >
      <Inbox className="mb-4 size-10 text-muted-foreground" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try again',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center',
        className,
      )}
    >
      <AlertCircle className="mb-4 size-10 text-destructive" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatusDot({
  variant,
  className,
}: {
  variant: 'success' | 'warning' | 'error' | 'info'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block size-2 rounded-full',
        {
          success: 'bg-status-success',
          warning: 'bg-status-warning',
          error: 'bg-status-error',
          info: 'bg-status-info',
        }[variant],
        className,
      )}
    />
  )
}
