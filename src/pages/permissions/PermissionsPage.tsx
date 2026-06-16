import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, ErrorState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import {
  usePermissionKeys,
  useRolePermissions,
  useUpdateRolePermission,
} from '@/hooks/usePermissions'
import { USER_ROLES, ROLE_LABELS, type UserRole } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales_rep')
  const [search, setSearch] = useState('')
  const { data: keys, isLoading: keysLoading, isError: keysError, refetch } =
    usePermissionKeys()
  const { data: rolePerms, isLoading: permsLoading } =
    useRolePermissions(selectedRole)
  const updateRolePermission = useUpdateRolePermission()

  const permMap = useMemo(
    () => new Map(rolePerms?.map((p) => [p.permission_key, p.allowed]) ?? []),
    [rolePerms],
  )

  const modules = useMemo(() => {
    const grouped = new Map<string, typeof keys>()
    keys?.forEach((key) => {
      const list = grouped.get(key.module) ?? []
      list.push(key)
      grouped.set(key.module, list)
    })
    return grouped
  }, [keys])

  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules
    const q = search.toLowerCase()
    const result = new Map<string, NonNullable<typeof keys>>()
    modules.forEach((moduleKeys, module) => {
      const filtered = (moduleKeys ?? []).filter(
        (k) =>
          k.key.toLowerCase().includes(q) ||
          k.label.toLowerCase().includes(q) ||
          module.toLowerCase().includes(q),
      )
      if (filtered.length > 0) result.set(module, filtered)
    })
    return result
  }, [modules, search])

  const handleToggle = async (permissionKey: string, allowed: boolean) => {
    try {
      await updateRolePermission.mutateAsync({
        role: selectedRole,
        permissionKey,
        allowed,
      })
      toast.success('Permission updated')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update permission',
      )
    }
  }

  return (
    <PermissionGate permission="permissions.manage">
      <div className="space-y-6">
        <PageHeader
          title="Permissions"
          description="Control what each role can access. Changes apply immediately and are enforced in the database."
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search permissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs
          value={selectedRole}
          onValueChange={(v) => setSelectedRole(v as UserRole)}
        >
          <TabsList className="flex h-auto flex-wrap">
            {USER_ROLES.map((role) => (
              <TabsTrigger key={role} value={role}>
                {ROLE_LABELS[role]}
              </TabsTrigger>
            ))}
          </TabsList>

          {USER_ROLES.map((role) => (
            <TabsContent key={role} value={role} className="space-y-4">
              {(keysLoading || permsLoading) && (
                <Skeleton className="h-64 w-full" />
              )}

              {keysError && (
                <ErrorState
                  message="Could not load permission registry."
                  onRetry={() => void refetch()}
                />
              )}

              {Array.from(filteredModules.entries()).map(([module, moduleKeys]) => (
                <Card key={module}>
                  <CardHeader>
                    <CardTitle className="capitalize text-base">
                      {module.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead className="hidden md:table-cell">Key</TableHead>
                          <TableHead className="w-24 text-right">Allowed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(moduleKeys ?? []).map((key) => (
                          <TableRow key={key.key}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{key.label}</p>
                                {key.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {key.description}
                                  </p>
                                )}
                                {key.is_sensitive && (
                                  <Badge variant="warning" className="mt-1">
                                    Sensitive
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden font-mono text-xs md:table-cell">
                              {key.key}
                            </TableCell>
                            <TableCell className="text-right">
                              <Switch
                                checked={permMap.get(key.key) ?? false}
                                onCheckedChange={(checked) =>
                                  void handleToggle(key.key, checked)
                                }
                                disabled={role === 'super_admin'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PermissionGate>
  )
}
