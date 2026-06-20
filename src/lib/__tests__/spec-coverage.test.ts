import { describe, it, expect } from 'vitest'
import { SPEC_ITEMS, SPEC_COMPLETION_TARGETS, specCounts } from '@/lib/spec-registry'

describe('spec inventory', () => {
  it('tracks platform specifications', () => {
    const counts = specCounts()
    expect(counts.total).toBeGreaterThanOrEqual(49)
    expect(counts.done + counts.partial + counts.missing).toBe(counts.total)
  })

  it('completion targets are registered specs', () => {
    for (const id of SPEC_COMPLETION_TARGETS) {
      expect(SPEC_ITEMS.some((s) => s.id === id)).toBe(true)
    }
  })

  it('completion targets are marked done', () => {
    const targets = SPEC_ITEMS.filter((s) => (SPEC_COMPLETION_TARGETS as readonly string[]).includes(s.id))
    expect(targets.every((s) => s.status === 'done')).toBe(true)
  })
})

describe('spec implementation — modules exist', () => {
  it('exports spec feature hooks', async () => {
    const hooks = await import('@/hooks/useSpecFeatures')
    expect(typeof hooks.useResolveClassificationReview).toBe('function')
    expect(typeof hooks.useCreateWorkflow).toBe('function')
    expect(typeof hooks.useTimesheetClock).toBe('function')
    expect(typeof hooks.useClinicAvailableSlots).toBe('function')
  })

  it('key pages are importable', async () => {
    const { WorkflowBuilderPage } = await import('@/pages/admin/WorkflowBuilderPage')
    const { ClassificationReviewsPage } = await import('@/pages/admin/ClassificationReviewsPage')
    const { TasksPage } = await import('@/pages/team/TasksPage')
    expect(WorkflowBuilderPage.name).toBeTruthy()
    expect(ClassificationReviewsPage.name).toBeTruthy()
    expect(TasksPage.name).toBeTruthy()
  })

  it('navigation includes spec completion routes', async () => {
    const { commandSearchItems } = await import('@/lib/navigation')
    const hrefs = commandSearchItems.map((i) => i.href)
    expect(hrefs).toContain('/clinics/pipeline')
    expect(hrefs).toContain('/training/builder')
    expect(hrefs).toContain('/team/timesheets')
    expect(hrefs).toContain('/admin/classification')
  })
})
