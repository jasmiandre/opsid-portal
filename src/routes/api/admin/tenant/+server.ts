import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import db from '$lib/db';

const execAsync = promisify(exec);
const EDGE     = 'root@10.34.1.1';
const CONF_DIR = '/opt/nginxui/data/sites-available';
const ENAB_DIR = '/opt/nginxui/data/sites-enabled';

async function ssh(cmd: string) {
  return execAsync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${EDGE} ${JSON.stringify(cmd)}`);
}

async function getKcToken(): Promise<string> {
  const res = await fetch('https://auth.opsid.web.id/realms/master/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026'
  });
  const d = await res.json();
  return d.access_token;
}

async function createKeycloakOrg(slug: string, name: string, domain: string) {
  const token = await getKcToken();
  const res = await fetch('https://auth.opsid.web.id/admin/realms/opsid-internal/organizations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, alias: slug, domains: [{ name: domain, verified: false }] })
  });
  return res.status === 201;
}

async function createFreeIPAGroup(slug: string) {
  // Buat group di FreeIPA via JSON-RPC
  const res = await fetch('https://ipa.opsid.web.id/ipa/session/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': 'https://ipa.opsid.web.id/ipa' },
    body: JSON.stringify({
      method: 'group_add',
      params: [[`${slug}-users`], { description: `Users for tenant ${slug}`, nonposix: true }]
    })
  });
  return res.ok;
}

export const GET: RequestHandler = async () => {
  try {
    const result = await db.query(`
      SELECT t.*, 
        COUNT(tu.id) as user_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return json({ ok: true, tenants: result.rows });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const { name, slug, primaryColor, logoUrl, useCustomDomain, domain,
          planNextcloudGb, planEmailGb, planOdooGb } = await request.json();

  if (!name || !slug) return json({ error: 'name dan slug wajib' }, { status: 400 });

  const tenantDomain = useCustomDomain && domain ? domain : `${slug}.opsid.web.id`;
  const confFile     = `${tenantDomain}.conf`;
  const tmpFile      = `/tmp/${confFile}`;

  const nginxConfig = `server {
    listen 443 ssl;
    server_name ${tenantDomain};
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    location / {
        proxy_pass http://10.34.1.2:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Tenant-Slug ${slug};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
server {
    listen 80;
    server_name ${tenantDomain};
    return 301 https://\$host\$request_uri;
}`;

  try {
    // 1. Simpan ke PostgreSQL
    const result = await db.query(`
      INSERT INTO tenants (name, slug, domain, primary_color, logo_url, plan_nextcloud_gb, plan_email_gb, plan_odoo_gb)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, slug, tenantDomain, primaryColor || '#5B86FF', logoUrl || '', 
        planNextcloudGb || 50, planEmailGb || 50, planOdooGb || 50]);

    const tenant = result.rows[0];

    // 2. Buat group di FreeIPA
    await createFreeIPAGroup(slug).catch(() => null);

    // 3. Buat Organization di Keycloak
    await createKeycloakOrg(slug, name, tenantDomain).catch(() => null);

    // 4. Buat Nginx config
    writeFileSync(tmpFile, nginxConfig);
    await execAsync(`scp -o StrictHostKeyChecking=no ${tmpFile} ${EDGE}:${CONF_DIR}/${confFile}`);
    unlinkSync(tmpFile);
    await ssh(`ln -sf /etc/nginx/sites-available/${confFile} ${ENAB_DIR}/${confFile}`);
    await ssh(`docker exec nginx-ui nginx -s reload`);

    // 5. Audit log
    await db.query(`
      INSERT INTO audit_logs (actor, action, target, metadata)
      VALUES ($1, $2, $3, $4)
    `, ['system', 'CREATE_TENANT', tenantDomain, JSON.stringify({ name, slug })]);

    return json({ ok: true, tenant });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
