import { test, expect } from '@playwright/test'

test('login page shows branding and login button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('The Humor Project')).toBeVisible()
  await expect(page.getByText('Prompt Chain Tool')).toBeVisible()
  await expect(page.getByText('Login with Google')).toBeVisible()
})

test('login page shows Humor Flavors heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Flavors.')).toBeVisible()
})

test('visiting /flavors unauthenticated redirects to /', async ({ page }) => {
  await page.goto('/flavors')
  await expect(page).toHaveURL('http://localhost:3000/')
})

test('clicking login redirects to Google OAuth', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Login with Google')
  await expect(page).toHaveURL(/accounts\.google\.com|google\.com/)
})
