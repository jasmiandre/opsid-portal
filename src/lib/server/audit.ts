// Shared audit logging helper — import from any server-side endpoint.
import db from '$lib/db';

export async function logAudit(
  actor: string,
  action: string,
  target: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [actor, action, target, JSON.stringify(metadata ?? {})]
    );
  } catch {
    // Non-fatal — never break the main operation
  }
}

/** Decode JWT to get username — no signature verify (already done by Keycloak) */
export function usernameFromCookie(token: string | undefined): string {
  if (!token) return 'anonymous';
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return payload.preferred_username ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}
