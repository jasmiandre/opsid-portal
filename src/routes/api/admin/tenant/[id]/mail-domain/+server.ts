import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { requireTenantAccess } from '$lib/server/authHelpers';

const MAIL_API = 'http://10.34.1.6:8082';
const MX_HOST  = 'mail.opsid.web.id';

// ── Static record templates ───────────────────────────────────────────────

function buildRecords(mail_domain: string, selector: string, dkim_public_key: string | null) {
  return {
    mx: {
      type: 'MX',
      name: mail_domain,
      value: `10 ${MX_HOST}`,
      hint: `Prioritas 10, arahkan ke ${MX_HOST}`,
    },
    spf: {
      type: 'TXT',
      name: mail_domain,
      value: `v=spf1 a:${MX_HOST} ~all`,
      hint: 'Tambahkan sebagai TXT record di root domain',
    },
    dkim: {
      type: 'TXT',
      name: `${selector}._domainkey.${mail_domain}`,
      value: dkim_public_key
        ? `v=DKIM1; h=sha256; k=rsa; p=${_extractP(dkim_public_key)}`
        : '(generate DKIM dulu)',
      hint: 'Salin seluruh nilai p= dari tombol Salin di bawah',
      full_value: dkim_public_key ?? null,
    },
    dmarc: {
      type: 'TXT',
      name: `_dmarc.${mail_domain}`,
      value: `v=DMARC1; p=none; rua=mailto:jasmiandre@gmail.com; adkim=r; aspf=r`,
      hint: 'Ganti rua dengan email kamu untuk menerima laporan',
    },
  };
}

function _extractP(full_txt: string): string {
  // full_txt may be the full "v=DKIM1; h=sha256; k=rsa; p=..." string
  const m = full_txt.match(/p=([A-Za-z0-9+/=]+)/);
  return m ? m[1] : full_txt;
}

// ── GET — read mail domain config from DB ─────────────────────────────────

export const GET: RequestHandler = async ({ params, cookies }) => {
  const auth = await requireTenantAccess(cookies, params.id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, { status: auth.status });

  const { rows } = await db.query(
    `SELECT id, name, domain, mail_domain, dkim_selector, dkim_public_key,
            dkim_generated_at, dns_checked_at,
            dns_mx_ok, dns_spf_ok, dns_dkim_ok, dns_dmarc_ok
     FROM tenants WHERE id = $1`,
    [params.id]
  );
  if (!rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });

  const t = rows[0];

  // When mail_domain is not set, derive a suggestion from the org-admin's email
  let suggested_domain: string | null = null;
  if (!t.mail_domain) {
    const adminRow = await db.query(
      `SELECT email FROM tenant_users
       WHERE  tenant_id = $1 AND role = 'org-admin' AND status = 'active'
       ORDER  BY id ASC LIMIT 1`,
      [params.id]
    ).then(r => r.rows[0]).catch(() => null);

    if (adminRow?.email) {
      const parts = String(adminRow.email).split('@');
      if (parts.length === 2 && parts[1].includes('.')) {
        suggested_domain = parts[1].toLowerCase();
      }
    }

    // Fallback: strip first subdomain label from tenant domain (workspace.1go.biz.id → 1go.biz.id)
    if (!suggested_domain && t.domain) {
      const labels = String(t.domain).split('.');
      if (labels.length >= 3) {
        suggested_domain = labels.slice(1).join('.');
      }
    }
  }

  const records = t.mail_domain
    ? buildRecords(t.mail_domain, t.dkim_selector ?? 'mail', t.dkim_public_key)
    : null;

  return json({
    ok:                true,
    mail_domain:       t.mail_domain       || null,
    suggested_domain:  suggested_domain,
    dkim_selector:     t.dkim_selector     ?? 'mail',
    dkim_public_key:   t.dkim_public_key   || null,
    dkim_generated_at: t.dkim_generated_at || null,
    dns_checked_at:    t.dns_checked_at    || null,
    dns_mx_ok:         t.dns_mx_ok,
    dns_spf_ok:        t.dns_spf_ok,
    dns_dkim_ok:       t.dns_dkim_ok,
    dns_dmarc_ok:      t.dns_dmarc_ok,
    records,
  });
};

// ── POST — set mail domain + generate DKIM ────────────────────────────────

export const POST: RequestHandler = async ({ params, cookies, request }) => {
  const auth = await requireTenantAccess(cookies, params.id);
  if (!auth.ok) return json({ ok: false, error: auth.error }, { status: auth.status });

  const body        = await request.json();
  const mail_domain = (body.mail_domain ?? '').trim().toLowerCase();
  const selector    = 'mail';

  if (!mail_domain) return json({ ok: false, error: 'mail_domain wajib' }, { status: 400 });
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(mail_domain))
    return json({ ok: false, error: 'Format domain tidak valid' }, { status: 400 });

  // Save mail_domain first
  await db.query(
    `UPDATE tenants SET mail_domain = $1, dkim_selector = $2 WHERE id = $3`,
    [mail_domain, selector, params.id]
  );

  // Call mail-api to generate DKIM key
  let dkim_public_key: string | null = null;
  try {
    const resp = await fetch(`${MAIL_API}/dkim/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ domain: mail_domain, selector }),
    });
    const data = await resp.json();
    if (data.ok && data.public_key_txt) {
      dkim_public_key = data.public_key_txt;
      await db.query(
        `UPDATE tenants SET dkim_public_key = $1, dkim_generated_at = NOW() WHERE id = $2`,
        [dkim_public_key, params.id]
      );
    } else {
      // mail-api down or key already exists — try to get from status endpoint
      const st = await fetch(`${MAIL_API}/dkim/status?domain=${mail_domain}&selector=${selector}`);
      const sd = await st.json();
      if (sd.public_key_txt) {
        dkim_public_key = sd.public_key_txt;
        await db.query(
          `UPDATE tenants SET dkim_public_key = $1, dkim_generated_at = NOW() WHERE id = $2`,
          [dkim_public_key, params.id]
        );
      }
    }
  } catch (e) {
    // mail-api unreachable — store domain but no key yet
    console.error('mail-api error:', e);
  }

  const records = buildRecords(mail_domain, selector, dkim_public_key);

  return json({
    ok:              true,
    mail_domain,
    dkim_selector:   selector,
    dkim_public_key,
    records,
    dkim_ready:      !!dkim_public_key,
  });
};
