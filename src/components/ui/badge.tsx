import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          default: 'border-transparent bg-primary text-primary-foreground',
          secondary: 'border-transparent bg-secondary text-secondary-foreground',
          outline: 'text-foreground',
          success: 'border-transparent bg-status-success/15 text-status-success',
          warning: 'border-transparent bg-status-warning/15 text-status-warning',
          error: 'border-transparent bg-status-error/15 text-status-error',
          info: 'border-transparent bg-status-info/15 text-status-info',
        }[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
