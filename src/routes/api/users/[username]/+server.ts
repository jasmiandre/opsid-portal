import type { RequestHandler } from "@sveltejs/kit"
import { json } from "@sveltejs/kit"

const FREEIPA_URL = "https://ipa.opsid.web.id/ipa"
const FREEIPA_ADMIN = "admin"
const FREEIPA_PASS  = "Sandiaman2026"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": FREEIPA_URL,
    },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  })
  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`)
  return res.headers.get("set-cookie") || ""
}

async function ipaCall(cookie: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const res = await fetch(`${FREEIPA_URL}/session/json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": FREEIPA_URL,
      "Cookie": cookie,
    },
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 })
  })
  return res.json()
}

// PATCH /api/users/[username] — update user di FreeIPA
export const PATCH: RequestHandler = async ({ params, request }) => {
  const username = params.username
  if (!username) return json({ success: false, error: "Username diperlukan" }, { status: 400 })

  const { name, email, dept, role } = await request.json()

  try {
    const cookie = await ipaLogin()

    const kwargs: any = {}
    if (name) {
      const names = name.trim().split(" ")
      kwargs.givenname = names[0]
      kwargs.sn = names.slice(1).join(" ") || names[0]
      kwargs.cn = name
    }
    if (email) kwargs.mail = email
    if (dept)  kwargs.departmentnumber = [dept]
    if (role)  kwargs.title = role

    const result = await ipaCall(cookie, "user_mod", [[username]], kwargs)

    if (result.error) {
      return json({ success: false, error: result.error.message }, { status: 400 })
    }

    return json({ success: true, message: `User @${username} berhasil diupdate di FreeIPA` })
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/users/[username] — hapus user dari FreeIPA
export const DELETE: RequestHandler = async ({ params }) => {
  const username = params.username
  if (!username) return json({ success: false, error: "Username diperlukan" }, { status: 400 })

  try {
    const cookie = await ipaLogin()
    const result = await ipaCall(cookie, "user_del", [[username]], {})

    if (result.error) {
      return json({ success: false, error: result.error.message }, { status: 400 })
    }

    return json({ success: true, message: `User @${username} berhasil dihapus dari FreeIPA` })
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 })
  }
}
