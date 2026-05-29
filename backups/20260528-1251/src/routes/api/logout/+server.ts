import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username } = await request.json()
    if (username) {
      await execAsync(`ssh root@10.34.1.7 "docker exec -u www-data nextcloud php occ user:delete-auth-tokens ${username}"`)
        .catch(() => {})
    }
  } catch {}
  return json({ ok: true })
}
