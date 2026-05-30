import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function isAdmin(token: string): boolean {
  const p = decodeToken(token);
  return (p?.realm_access?.roles ?? []).includes('opsid-admin');
}

// Public — no auth required
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'Invalid JSON' }, { status: 400 });

  const { company_name, pic_name, pic_email, pic_whatsapp, domain_type, domain_value, user_count, plan_tier } = body;

  if (!company_name?.trim()) return json({ ok: false, error: 'Nama perusahaan wajib diisi' }, { status: 400 });
  if (!pic_name?.trim())     return json({ ok: false, error: 'Nama PIC wajib diisi' }, { status: 400 });
  if (!pic_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pic_email))
    return json({ ok: false, error: 'Email tidak valid' }, { status: 400 });

  const safeDomainType  = ['subdomain', 'custom_domain'].includes(domain_type) ? domain_type : 'subdomain';
  const safeDomainValue = safeDomainType === 'subdomain'
    ? (domain_value ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100)
    : (domain_value ?? '').trim().toLowerCase().slice(0, 255);

  try {
    const result = await db.query(
      `INSERT INTO onboarding_requests
         (company_name, pic_name, pic_email, pic_whatsapp, domain_type, domain_value, user_count, plan_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        company_name.trim().slice(0, 255),
        pic_name.trim().slice(0, 255),
        pic_email.trim().toLowerCase().slice(0, 255),
        (pic_whatsapp ?? '').trim().slice(0, 50) || null,
        safeDomainType,
        safeDomainValue || null,
        Math.min(Math.max(parseInt(user_count) || 10, 1), 10000),
        ['basic', 'pro', 'enterprise'].includes(plan_tier) ? plan_tier : 'basic',
      ]
    );
    return json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    console.error('[Onboarding] DB error:', String(e).slice(0, 200));
    return json({ ok: false, error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 });
  }
};

// Admin only — list all requests
export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get('opsid_token');
  if (!token || !isAdmin(token)) return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const status = url.searchParams.get('status') ?? 'all';
  // When filtering for 'pending', also include 'processing' (transient state during provisioning).
  // This ensures admins can see and reset stuck-processing rows.
  let where: string;
  let params: string[];
  if (status === 'all') {
    where = ''; params = [];
  } else if (status === 'pending') {
    where = `WHERE status IN ('pending', 'processing')`; params = [];
  } else {
    where = `WHERE status = $1`; params = [status];
  }

  try {
    const result = await db.query(
      `SELECT * FROM onboarding_requests ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    return json({ ok: true, requests: result.rows });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
