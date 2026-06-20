import { test, expect } from '@playwright/test'

test.describe('Demo mode smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in|login|mast dental/i })).toBeVisible({ timeout: 10_000 })
  })

  test('public booking page renders', async ({ page }) => {
    await page.goto('/book/moorooka-implants')
    await expect(page.getByText(/implant consult|book/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
