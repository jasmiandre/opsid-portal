import db from '$lib/db';

/** One-time table creation guard */
let ensured = false;

async function ensureTable(): Promise<void> {
  if (ensured) return;
  ensured = true;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id          SERIAL PRIMARY KEY,
        actor       VARCHAR(255) NOT NULL,
        action      VARCHAR(255) NOT NULL,
        target      VARCHAR(500) DEFAULT '',
        metadata    JSONB        DEFAULT '{}',
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_act_actor      ON activity_logs(actor)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_act_created_at ON activity_logs(created_at DESC)`);
  } catch {
    ensured = false; // retry next time if migration fails
  }
}

/**
 * Record a user-visible activity event.
 * Non-fatal: failures are swallowed to avoid breaking the calling request.
 */
export async function logActivity(
  actor: string,
  action: string,
  target: string = '',
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await ensureTable();
    await db.query(
      `INSERT INTO activity_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [actor, action, target, JSON.stringify(metadata ?? {})]
    );
  } catch { /* intentionally swallowed */ }
}
