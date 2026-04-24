import { test as teardown } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

teardown('delete test user', async () => {
  const filePath = '.playwright/test-user.json'
  if (!fs.existsSync(filePath)) return

  const { id } = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  await adminClient.from('profiles').delete().eq('id', id)
  await adminClient.auth.admin.deleteUser(id)
  fs.unlinkSync(filePath)
})
