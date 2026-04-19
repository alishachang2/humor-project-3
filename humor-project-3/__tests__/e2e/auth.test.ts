import { test, expect } from '@playwright/test'

test('login page shows branding and login button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('The Humor Project')).toBeVisible()
  await expect(page.getByText('Prompt Chain Tool')).toBeVisible()
  await expect(page.getByText('Login with Google')).toBeVisible()
})

test('clicking login redirects to Google OAuth', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Login with Google')
  await expect(page).toHaveURL(/accounts\.google\.com|google\.com/)
})

test('visiting /flavors unauthenticated redirects to /', async ({ page }) => {
  await page.goto('/flavors')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('visiting /flavors shows tool when authenticated as superadmin', async ({ page }) => {
  test.skip(true, 'Requires a real Supabase test user — set up via Supabase admin API in CI')
  await page.goto('/flavors')
  await expect(page.getByText('Flavors.')).toBeVisible()
})
