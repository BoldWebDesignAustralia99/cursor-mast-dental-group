import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { getCommandSearchItems } from '@/lib/navigation'
import { useMyPermissions } from '@/hooks/usePermissions'

interface CommandSearchProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandSearch({ open: controlledOpen, onOpenChange }: CommandSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const navigate = useNavigate()
  const { data: permissions } = useMyPermissions()
  const allowed = new Set(
    permissions?.filter((p) => p.allowed).map((p) => p.permission_key) ?? [],
  )
  const searchItems = getCommandSearchItems(allowed)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  const runCommand = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found. Try a different search term.</CommandEmpty>
        <CommandGroup heading="Pages">
          {searchItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.title} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(item.href)}
            >
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        {allowed.size > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              {allowed.has('settings.view') && (
                <CommandItem onSelect={() => runCommand('/settings')}>
                  Open settings
                </CommandItem>
              )}
              {allowed.has('permissions.manage') && (
                <CommandItem onSelect={() => runCommand('/permissions')}>
                  Manage permissions
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
