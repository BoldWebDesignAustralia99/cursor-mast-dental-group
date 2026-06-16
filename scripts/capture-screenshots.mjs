import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import path from 'path'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const OUT = process.env.SCREENSHOT_DIR ?? '/opt/cursor/artifacts/screenshots'

const PAGES = [
  { name: '01-login', path: '/login', demo: false },
  { name: '02-dashboard', path: '/dashboard' },
  { name: '03-call-queue', path: '/calls/queue' },
  { name: '04-leads-list', path: '/leads' },
  { name: '05-lead-record', path: '/leads/c0000001-0000-4000-8000-000000000001' },
  { name: '06-bookings', path: '/bookings' },
  { name: '07-booking-detail', path: '/bookings/demo' },
  { name: '08-clinics-list', path: '/clinics' },
  { name: '09-clinic-pipeline', path: '/clinics/pipeline' },
  { name: '10-clinic-inbox', path: '/clinics/inbox' },
  { name: '11-clinic-routing', path: '/clinics/routing' },
  { name: '12-clinic-detail', path: '/clinics/1' },
  { name: '13-training', path: '/training' },
  { name: '14-training-builder', path: '/training/builder' },
  { name: '15-training-grading', path: '/training/grading' },
  { name: '16-team', path: '/team' },
  { name: '17-team-messages', path: '/team/messages' },
  { name: '18-team-community', path: '/team/community' },
  { name: '19-team-timesheets', path: '/team/timesheets' },
  { name: '20-team-leave', path: '/team/leave' },
  { name: '21-team-payroll', path: '/team/payroll' },
  { name: '22-settings', path: '/settings' },
  { name: '23-permissions', path: '/permissions' },
  { name: '24-notifications', path: '/notifications' },
  { name: '25-profile', path: '/profile' },
  { name: '26-admin-chat', path: '/admin/chat' },
  { name: '27-admin-integrations', path: '/admin/integrations' },
  { name: '28-admin-performance', path: '/admin/performance' },
  { name: '29-portal-bookings', path: '/portal/bookings' },
  { name: '30-portal-calendar', path: '/portal/calendar' },
  { name: '31-portal-credits', path: '/portal/credits' },
  { name: '32-portal-messages', path: '/portal/messages' },
]

async function enableDemo(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('demo_mode', 'true')
  })
}

async function capture(page, name, viewport) {
  const dir = path.join(OUT, viewport)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log('saved', file)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  for (const viewport of ['desktop', 'mobile']) {
    const context = await browser.newContext({
      viewport: viewport === 'desktop'
        ? { width: 1440, height: 900 }
        : { width: 390, height: 844 },
      deviceScaleFactor: viewport === 'desktop' ? 1 : 2,
    })

    for (const p of PAGES) {
      const page = await context.newPage()
      if (p.demo !== false) await enableDemo(page)
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#root', { state: 'attached', timeout: 15000 })
      await page.waitForTimeout(1200)
      await capture(page, p.name, viewport)
      await page.close()
    }

    await context.close()
  }

  await browser.close()
  console.log('Done. Screenshots in', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
