import type { RequestHandler } from "@sveltejs/kit"
import { json } from "@sveltejs/kit"

const FREEIPA_URL = "https://ipa.opsid.web.id/ipa"
const FREEIPA_ADMIN = "admin"
const FREEIPA_PASS  = "Sandiaman2026"

// Skip SSL verification untuk FreeIPA self-signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": FREEIPA_URL,
      "Accept": "text/plain",
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
    body: JSON.stringify({
      method,
      params: [args, kwargs],
      id: 0,
    })
  })
  return res.json()
}

// GET /api/users — list semua user dari FreeIPA
export const GET: RequestHandler = async () => {
  try {
    const cookie = await ipaLogin()
    const result = await ipaCall(cookie, "user_find", [[]], {
      sizelimit: 200,
      all: true,
    })

    if (result.error) {
      return json({ success: false, error: result.error.message }, { status: 400 })
    }

    // Filter out service accounts (svc-*)
    const users = (result.result?.result || [])
      .filter((u: any) => !u.uid?.[0]?.startsWith("svc-") && u.uid?.[0] !== "admin")
      .map((u: any) => ({
        username:  u.uid?.[0] || "",
        name:      u.cn?.[0] || u.displayname?.[0] || "",
        email:     u.mail?.[0] || "",
        dept:      u.departmentnumber?.[0] || u.ou?.[0] || "-",
        role:      u.title?.[0] || "Staff",
        status:    u.nsaccountlock ? "inactive" : "active",
      }))

    return json({ success: true, users })
  } catch (err) {
    console.error("FreeIPA GET users error:", err)
    return json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/users — create user baru di FreeIPA
export const POST: RequestHandler = async ({ request }) => {
  const { username, name, fullname, email, password, dept, role } = await request.json()

  if (!username || !(fullname || name) || !email || !password) {
    return json({ success: false, error: "Username, nama, email, dan password wajib diisi" }, { status: 400 })
  }

  try {
    const cookie = await ipaLogin()

    const names = (fullname || name).trim().split(" ")
    const givenname = names[0]
    const sn       = names.slice(1).join(" ") || names[0]

    const result = await ipaCall(cookie, "user_add", [username], {
      givenname,
      sn,
      cn: fullname || name,
      mail:          email,
      userpassword:  password,
      departmentnumber: dept ? [dept] : undefined,
      title:         role || "Staff",
    })

    if (result.error) {
      return json({ success: false, error: result.error.message }, { status: 400 })
    }

    return json({
      success: true,
      message: `User ${fullname || name} berhasil dibuat di FreeIPA & Keycloak. Dapat langsung login ke semua aplikasi.`
    })
  } catch (err) {
    console.error("FreeIPA POST user error:", err)
    return json({ success: false, error: String(err) }, { status: 500 })
  }
}
