import type { Handle } from "@sveltejs/kit"

// Hook ini intercept semua request
// Ketika ada token di URL (callback dari Keycloak), simpan ke cookie
// Sehingga Nginx bisa baca cookie untuk validasi session di SOGo/Odoo

export const handle: Handle = async ({ event, resolve }) => {
  // Jika ada token di cookie, set di locals untuk dipakai
  const token = event.cookies.get("opsid_token")
  if (token) {
    event.locals.token = token
  }

  const response = await resolve(event)
  return response
}
