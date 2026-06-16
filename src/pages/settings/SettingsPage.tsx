import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, ErrorState } from '@/components/shared/PageStates'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useSettings, useUpdateSetting } from '@/hooks/useSettings'
import { useAuth } from '@/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AppSetting } from '@/types/database'

function SettingField({
  setting,
  onSave,
  disabled,
}: {
  setting: AppSetting
  onSave: (value: unknown) => void
  disabled: boolean
}) {
  const [localValue, setLocalValue] = useState(setting.value)

  const renderInput = () => {
    switch (setting.value_type) {
      case 'boolean':
        return (
          <Switch
            checked={Boolean(localValue)}
            onCheckedChange={(checked) => {
              setLocalValue(checked)
              onSave(checked)
            }}
            disabled={disabled}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={String(localValue ?? '')}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            disabled={disabled}
            className="max-w-xs tabular-nums"
          />
        )
      case 'string_array':
        return (
          <Input
            value={Array.isArray(localValue) ? localValue.join(', ') : ''}
            onChange={(e) =>
              setLocalValue(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            disabled={disabled}
            placeholder="Comma-separated values"
          />
        )
      default:
        return (
          <Input
            value={String(localValue ?? '')}
            onChange={(e) => setLocalValue(e.target.value)}
            disabled={disabled}
          />
        )
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <Label>{setting.label}</Label>
        {setting.description && (
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        )}
        <p className="text-xs text-muted-foreground font-mono">{setting.key}</p>
      </div>
      <div className="flex items-center gap-2">
        {renderInput()}
        {setting.value_type !== 'boolean' && (
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => onSave(localValue)}
          >
            Save change
          </Button>
        )}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useSettings()
  const updateSetting = useUpdateSetting()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'super_admin' || profile?.role === 'admin'

  const categories = useMemo(() => {
    const cats = new Set(settings?.map((s) => s.category) ?? [])
    return Array.from(cats).sort()
  }, [settings])

  const handleSave = async (key: string, value: unknown) => {
    if (!profile || !canEdit) return
    try {
      await updateSetting.mutateAsync({
        key,
        value,
        updatedBy: profile.id,
      })
      toast.success('Setting saved')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save setting',
      )
    }
  }

  return (
    <PermissionGate permission="settings.view">
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Business rules and configuration. Changes apply immediately without a deploy."
        />

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {isError && (
          <ErrorState
            message="Could not load settings. Check your connection and try again."
            onRetry={() => void refetch()}
          />
        )}

        {settings && categories.length > 0 && (
          <Tabs defaultValue={categories[0]}>
            <TabsList className="flex h-auto flex-wrap">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat.replace(/_/g, ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((cat) => (
              <TabsContent key={cat} value={cat}>
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {cat.replace(/_/g, ' ')} settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {settings
                      .filter((s) => s.category === cat)
                      .map((setting) => (
                        <SettingField
                          key={setting.key}
                          setting={setting}
                          disabled={!canEdit}
                          onSave={(value) => void handleSave(setting.key, value)}
                        />
                      ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {settings && settings.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No settings configured yet. Run database migrations to seed defaults.
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGate>
  )
}
