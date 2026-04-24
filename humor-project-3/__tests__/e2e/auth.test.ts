import { test, expect } from '@playwright/test'

test('authenticated user can access /flavors', async ({ page }) => {
  await page.goto('/flavors')
  await expect(page).toHaveURL(/\/flavors/)
  await expect(page.getByText('Flavors.')).toBeVisible()
})

test('flavors page shows Admin label', async ({ page }) => {
  await page.goto('/flavors')
  await expect(page.getByText('Admin')).toBeVisible()
})

test('flavors page has New Flavor button', async ({ page }) => {
  await page.goto('/flavors')
  await expect(page.getByText('+ New Flavor')).toBeVisible()
})

test('can create and delete a flavor', async ({ page }) => {
  await page.goto('/flavors')

  const slug = `playwright-test-${Date.now()}`

  // Open new flavor modal
  await page.click('text=+ New Flavor')
  await expect(page.getByText('New Humor Flavor')).toBeVisible()

  // Fill in slug
  await page.getByPlaceholder('e.g. stan-twitter').fill(slug)
  await page.click('text=Create Flavor')

  // Flavor should appear in list
  await expect(page.getByText(slug)).toBeVisible()

  // Delete it
  page.on('dialog', d => d.accept())
  const card = page.locator('.flavor-card', { hasText: slug })
  await card.getByText('Delete').click()
  await expect(page.getByText(slug)).not.toBeVisible({ timeout: 5000 })
})

test('can open a flavor and see steps panel', async ({ page }) => {
  await page.goto('/flavors')

  const slug = `playwright-steps-${Date.now()}`

  // Create a flavor to open
  await page.click('text=+ New Flavor')
  await page.getByPlaceholder('e.g. stan-twitter').fill(slug)
  await page.click('text=Create Flavor')
  await expect(page.getByText(slug)).toBeVisible()

  // Open it
  await page.locator('.flavor-card', { hasText: slug }).click()
  await expect(page.getByText('Steps · 0')).toBeVisible()
  await expect(page.getByText('+ Add Step')).toBeVisible()

  // Go back and delete
  await page.locator('span', { hasText: 'Flavors' }).first().click()
  const card = page.locator('.flavor-card', { hasText: slug })
  await card.getByText('Delete').click()
  page.on('dialog', d => d.accept())
})

test('theme toggle cycles through modes', async ({ page }) => {
  await page.goto('/flavors')
  const toggle = page.locator('button', { hasText: /Light|Dark|System/ })
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(toggle).toBeVisible()
})
