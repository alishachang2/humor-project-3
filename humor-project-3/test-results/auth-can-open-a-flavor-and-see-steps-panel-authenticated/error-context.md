# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.test.ts >> can open a flavor and see steps panel
- Location: __tests__/e2e/auth.test.ts:42:5

# Error details

```
Error: locator.click: Error: strict mode violation: getByText('Flavors') resolved to 2 elements:
    1) <span>Flavors</span> aka getByText('Flavors', { exact: true })
    2) <div>…</div> aka getByText('Test FlavorSelect Test Image')

Call log:
  - waiting for getByText('Flavors')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - paragraph [ref=e7]: Admin
        - heading "Flavors / playwright-steps-1776711202748" [level=1] [ref=e8]:
          - text: Flavors /
          - emphasis [ref=e9]: playwright-steps-1776711202748
      - generic [ref=e10]:
        - button "☾ Dark" [ref=e11] [cursor=pointer]
        - button "+ Add Step" [ref=e12] [cursor=pointer]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - paragraph [ref=e16]: Steps · 0
        - paragraph [ref=e17]: Loading…
      - generic [ref=e18]:
        - paragraph [ref=e19]: Test Flavor
        - generic [ref=e20]:
          - paragraph [ref=e21]: Select Test Image
          - combobox [ref=e22]:
            - option "— pick an image —" [selected]
        - button "Generate Captions" [ref=e23] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('authenticated user can access /flavors', async ({ page }) => {
  4  |   await page.goto('/flavors')
  5  |   await expect(page).toHaveURL(/\/flavors/)
  6  |   await expect(page.getByText('Flavors.')).toBeVisible()
  7  | })
  8  | 
  9  | test('flavors page shows Admin label', async ({ page }) => {
  10 |   await page.goto('/flavors')
  11 |   await expect(page.getByText('Admin')).toBeVisible()
  12 | })
  13 | 
  14 | test('flavors page has New Flavor button', async ({ page }) => {
  15 |   await page.goto('/flavors')
  16 |   await expect(page.getByText('+ New Flavor')).toBeVisible()
  17 | })
  18 | 
  19 | test('can create and delete a flavor', async ({ page }) => {
  20 |   await page.goto('/flavors')
  21 | 
  22 |   const slug = `playwright-test-${Date.now()}`
  23 | 
  24 |   // Open new flavor modal
  25 |   await page.click('text=+ New Flavor')
  26 |   await expect(page.getByText('New Humor Flavor')).toBeVisible()
  27 | 
  28 |   // Fill in slug
  29 |   await page.getByPlaceholder('e.g. stan-twitter').fill(slug)
  30 |   await page.click('text=Create Flavor')
  31 | 
  32 |   // Flavor should appear in list
  33 |   await expect(page.getByText(slug)).toBeVisible()
  34 | 
  35 |   // Delete it
  36 |   const card = page.locator('.flavor-card', { hasText: slug })
  37 |   await card.getByText('Delete').click()
  38 |   page.on('dialog', d => d.accept())
  39 |   await expect(page.getByText(slug)).not.toBeVisible()
  40 | })
  41 | 
  42 | test('can open a flavor and see steps panel', async ({ page }) => {
  43 |   await page.goto('/flavors')
  44 | 
  45 |   const slug = `playwright-steps-${Date.now()}`
  46 | 
  47 |   // Create a flavor to open
  48 |   await page.click('text=+ New Flavor')
  49 |   await page.getByPlaceholder('e.g. stan-twitter').fill(slug)
  50 |   await page.click('text=Create Flavor')
  51 |   await expect(page.getByText(slug)).toBeVisible()
  52 | 
  53 |   // Open it
  54 |   await page.locator('.flavor-card', { hasText: slug }).click()
  55 |   await expect(page.getByText('Steps · 0')).toBeVisible()
  56 |   await expect(page.getByText('+ Add Step')).toBeVisible()
  57 | 
  58 |   // Go back and delete
> 59 |   await page.getByText('Flavors').click()
     |                                   ^ Error: locator.click: Error: strict mode violation: getByText('Flavors') resolved to 2 elements:
  60 |   const card = page.locator('.flavor-card', { hasText: slug })
  61 |   await card.getByText('Delete').click()
  62 |   page.on('dialog', d => d.accept())
  63 | })
  64 | 
  65 | test('theme toggle cycles through modes', async ({ page }) => {
  66 |   await page.goto('/flavors')
  67 |   const toggle = page.locator('button', { hasText: /Light|Dark|System/ })
  68 |   await expect(toggle).toBeVisible()
  69 |   await toggle.click()
  70 |   await expect(toggle).toBeVisible()
  71 | })
  72 | 
```