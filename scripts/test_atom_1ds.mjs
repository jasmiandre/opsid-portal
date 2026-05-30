// Test & fix Atom Pro (tenant 15) dan PT One Digital Solution (tenant 16)
process.env.DATABASE_URL = 'postgresql://svc_portal:Sandiaman2026@10.34.1.9:5432/opsid_db';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = '/opt/portal/.svelte-kit/output/server/chunks';
const m    = await import(BASE + '/tenantProvisioning.js');
const db   = await import(BASE + '/db.js');
const pool = db.t;

const reprovisionTenant = m.i;

// ── Verifikasi Odoo sebelum re-provision ──
async function checkOdooUser(tenantName, login, kcId) {
  const ODOO_URL = 'http://10.34.1.8:8069';
  const DB = 'odoo_db';

  // Login ke Odoo
  const sessReq = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { service: 'common', method: 'authenticate',
        args: [DB, 'admin', 'Sandiaman2026', {}] }
    })
  });
  const sessData = await sessReq.json();
  const adminUid = sessData.result;

  const readReq = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 2,
      params: { service: 'object', method: 'execute_kw',
        args: [DB, adminUid, 'Sandiaman2026', 'res.users', 'search_read',
          [[['login','=',login]]], {fields:['id','name','oauth_uid','oauth_provider_id'], limit:1}]
      }
    })
  });
  const data = await readReq.json();
  const users = data.result || [];
  if (users.length) {
    const u = users[0];
    const isFixed = u.oauth_uid === kcId;
    console.log(`  Odoo user: id=${u.id} login=${login}`);
    console.log(`  oauth_uid: ${u.oauth_uid || '(false/empty)'} ${isFixed ? '✅ MATCH KC' : '❌ MISMATCH (need fix)'}`);
    return isFixed;
  }
  console.log(`  Odoo user: NOT FOUND for login=${login}`);
  return false;
}

// ── Tenant data ──
const tenants = [
  {
    tenantId: 15, slug: 'pt-atom-pro', domain: 'atom.opsid.web.id',
    domain_type: 'subdomain', name: 'PT Atom Pro',
    adminUsername: 'anggita.atom', adminEmail: 'anggita@atom.opsid.web.id',
    kcId: 'fa611f9a-d708-4710-998d-afc1353c3b10',
    only: ['odoo_company', 'odoo_user'],  // hanya re-run Odoo steps
  },
  {
    tenantId: 16, slug: 'pt-one-digital-solution', domain: 'portal.1ds.biz.id',
    domain_type: 'custom_domain', name: 'PT One Digital Solution',
    adminUsername: 'dedi.1ds', adminEmail: 'dedi@1ds.biz.id',
    kcId: '9ef18577-90af-4dc7-b711-3d9a890ab43a',
    only: ['ssl_certbot', 'nginx_drive', 'nginx_erp', 'kc_redirect_uris', 'nc_trusted_domain', 'odoo_company', 'odoo_user'],
  },
];

for (const t of tenants) {
  console.log('\n' + '═'.repeat(56));
  console.log(`Tenant: ${t.name} (#${t.tenantId})`);
  console.log('═'.repeat(56));

  console.log('\n[BEFORE] Odoo status:');
  await checkOdooUser(t.name, t.adminEmail, t.kcId).catch(e => console.log('  Check error:', e.message));

  console.log(`\n[RE-PROVISION] steps: ${t.only.join(', ')}`);
  console.time('reprovision');

  const result = await reprovisionTenant({
    tenantId:   t.tenantId,
    slug:       t.slug,
    domain:     t.domain,
    domain_type: t.domain_type,
    name:       t.name,
    adminName:  t.name,  // akan dioverride dari tenant_users
    actor:      'opsid-admin',
    only:       t.only,
  });

  console.timeEnd('reprovision');
  console.log('');

  for (const s of (result.steps ?? [])) {
    const icon = s.ok ? '✓' : '✗';
    const err  = s.error ? '  → ' + String(s.error).slice(0, 80) : '';
    console.log(icon, s.step.padEnd(22), s.ok ? 'OK' : 'FAIL' + err);
  }

  console.log(`\n[AFTER] Odoo status:`);
  await checkOdooUser(t.name, t.adminEmail, t.kcId).catch(e => console.log('  Check error:', e.message));
}

await pool.end();
console.log('\n\nSelesai.');
