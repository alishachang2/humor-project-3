import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = `playwright-test-${Date.now()}@test.com`
const TEST_PASSWORD = `PlaywrightTest${Date.now()}!`

setup('create test user and save session', async ({ page }) => {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user }, error } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error || !user) throw new Error(`Failed to create test user: ${error?.message}`)

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: user.id,
    email: TEST_EMAIL,
    is_superadmin: true,
    is_matrix_admin: true,
  }, { onConflict: 'id' })
  if (profileError) throw new Error(`Profile upsert failed: ${profileError.message}`)

  fs.mkdirSync('.playwright', { recursive: true })
  fs.writeFileSync('.playwright/test-user.json', JSON.stringify({ id: user.id, email: TEST_EMAIL }))

  const authUrl = `http://localhost:3000/api/test-auth?email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`
  await page.goto(authUrl)
  await page.waitForURL('**/flavors', { timeout: 10000 })

  await page.context().storageState({ path: '.playwright/auth.json' })
})
