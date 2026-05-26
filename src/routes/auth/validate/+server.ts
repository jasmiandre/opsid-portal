import type { RequestHandler } from "@sveltejs/kit"
import { json } from "@sveltejs/kit"

const KEYCLOAK_USERINFO = "https://auth.opsid.web.id/realms/opsid-internal/protocol/openid-connect/userinfo"

// Endpoint ini dipanggil oleh Nginx auth_request
// untuk validasi session Keycloak user
// Return 200 + X-Auth-Username header jika valid
// Return 401 jika tidak valid

export const GET: RequestHandler = async ({ request, cookies }) => {
  try {
    // Ambil token dari cookie atau Authorization header
    const authHeader = request.headers.get("authorization")
    const cookieHeader = request.headers.get("cookie") || ""

    // Coba ambil access token dari cookie portal
    // Portal menyimpan token di cookie saat login
    let accessToken = ""

    // Cari token di cookie
    const tokenCookie = cookieHeader
      .split(";")
      .find(c => c.trim().startsWith("opsid_token="))
    
    if (tokenCookie) {
      accessToken = tokenCookie.split("=")[1]?.trim() || ""
    }

    // Atau dari Authorization header
    if (!accessToken && authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7)
    }

    if (!accessToken) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" }
      })
    }

    // Validasi token ke Keycloak userinfo endpoint
    const userInfoRes = await fetch(KEYCLOAK_USERINFO, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })

    if (!userInfoRes.ok) {
      return new Response("Unauthorized", { status: 401 })
    }

    const userInfo = await userInfoRes.json()
    const username = userInfo.preferred_username || ""
    const email    = userInfo.email || ""
    const name     = userInfo.name || username

    if (!username) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Return 200 dengan username di header
    // Nginx akan inject header ini ke SOGo/Odoo
    return new Response("OK", {
      status: 200,
      headers: {
        "X-Auth-Username": username,
        "X-Auth-Email":    email,
        "X-Auth-Name":     name,
        "Content-Type":    "text/plain"
      }
    })

  } catch (error) {
    console.error("Auth validate error:", error)
    return new Response("Unauthorized", { status: 401 })
  }
}
