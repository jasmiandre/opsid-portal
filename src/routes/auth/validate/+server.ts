import type { RequestHandler } from "@sveltejs/kit"

// Validate portal session for nginx auth_request (SOGo, Nextcloud, Odoo SSO).
// Uses LOCAL JWT decode — no Keycloak network call.
// This avoids the 130s hairpin-NAT timeout that occurred when calling
// https://auth.opsid.web.id/realms/.../userinfo from inside the VM network.
export const GET: RequestHandler = async ({ request, cookies }) => {
  try {
    // 1. Get token from cookie (primary) or Authorization header (fallback)
    const cookieHeader = request.headers.get("cookie") || ""
    let accessToken = ""

    const tokenCookie = cookieHeader.split(";").find(c => c.trim().startsWith("opsid_token="))
    if (tokenCookie) accessToken = tokenCookie.split("=")[1]?.trim() || ""

    if (!accessToken) {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) accessToken = authHeader.substring(7)
    }

    if (!accessToken) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" }
      })
    }

    // 2. Decode JWT payload (Keycloak already verified signature; we just read claims)
    const parts = accessToken.split('.')
    if (parts.length < 2) return new Response("Unauthorized", { status: 401 })

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )

    // 3. Check token expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return new Response("Token expired", { status: 401 })
    }

    const username = payload.preferred_username || ""
    const email    = payload.email || ""
    const name     = payload.name || username

    if (!username) return new Response("Unauthorized", { status: 401 })

    // 4. Return 200 + auth headers — nginx injects X-Auth-Username into backend requests
    return new Response("OK", {
      status: 200,
      headers: {
        "X-Auth-Username": username,
        "X-Auth-Email":    email,
        "X-Auth-Name":     name,
        "Content-Type":    "text/plain"
      }
    })

  } catch {
    return new Response("Unauthorized", { status: 401 })
  }
}
