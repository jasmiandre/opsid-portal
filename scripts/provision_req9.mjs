// Provision onboarding request #9 — PT Satu Go Digital (custom domain)
// Run: node scripts/provision_req9.mjs

process.env.DATABASE_URL = 'postgresql://svc_portal:Sandiaman2026@10.34.1.9:5432/opsid_db';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = '/opt/portal/.svelte-kit/output/server/chunks';
const m    = await import(BASE + '/tenantProvisioning.js');
const db   = await import(BASE + '/db.js');

const provisionTenant  = m.r;
const generatePassword = m.t;
const generateSlug     = m.n;
const sendWelcomeEmail = m.a;
const pool             = db.t;

const row = {
  id:                 9,
  company_name:       'PT Satu Go Digital',
  pic_name:           'Jasmi Andre',
  pic_email:          'jasmiandre.assistant@gmail.com',
  primary_user_name:  'Andrean Rangga',
  primary_user_email: 'andrean@1go.biz.id',
  domain_type:        'custom_domain',
  domain_value:       'workspace.1go.biz.id',
  user_count:         10,
  plan_tier:          'basic',
};

const slug     = generateSlug(row.company_name);
const domain   = row.domain_value;           // custom domain: tidak perlu .opsid.web.id
const password = generatePassword();

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   OPSID — Provisioning Tenant (LIVE)            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  Perusahaan  : PT Satu Go Digital               ║');
console.log('║  Domain type : custom_domain                    ║');
console.log('║  Domain      : workspace.1go.biz.id             ║');
console.log('║  Admin user  : Andrean Rangga                   ║');
console.log('║  Admin email : andrean@1go.biz.id               ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('Slug    :', slug);
console.log('Password:', password);
console.log('');

// Mark as processing
await pool.query(
  `UPDATE onboarding_requests SET status='processing', reviewed_at=NOW(), reviewed_by='opsid-admin' WHERE id=$1`,
  [row.id]
);
console.log('[DB] status → processing');
console.log('[>>] Menjalankan provisionTenant...\n');
console.time('total');

const result = await provisionTenant({
  name:          row.company_name,
  slug,
  domain,
  domain_type:   'custom_domain',
  planTier:      row.plan_tier,
  maxUsers:      row.user_count,
  adminName:     row.primary_user_name,
  adminEmail:    row.primary_user_email,
  adminUsername: row.primary_user_email.split('@')[0],
  adminPassword: password,
  createdBy:     'opsid-admin',
});

console.timeEnd('total');
console.log('');
console.log('═══════════════ STEP-BY-STEP ═══════════════════');

let okCount = 0, failCount = 0;
for (const s of (result.steps ?? [])) {
  const icon = s.ok ? '✓' : '✗';
  const err  = s.error ? '  → ' + String(s.error).slice(0, 90) : '';
  console.log(icon, s.step.padEnd(22), s.ok ? 'OK' : 'FAIL' + err);
  s.ok ? okCount++ : failCount++;
}

console.log('');
console.log(`RESULT: ok=${okCount}  fail=${failCount}  overall=${result.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
if (result.error) console.log('ERROR:', result.error);
console.log('');

if (result.ok) {
  await pool.query(
    `UPDATE onboarding_requests
     SET status='approved', tenant_id=$1, provisioning_log=$2
     WHERE id=$3`,
    [result.tenant?.id, JSON.stringify(result.steps), row.id]
  );
  console.log('[DB] status → approved  |  tenant_id =', result.tenant?.id);

  // Welcome email ke primary user (Andrean Rangga)
  console.log('[EMAIL] Kirim ke', row.primary_user_email, '...');
  await sendWelcomeEmail({
    toEmail:  row.primary_user_email,
    toName:   row.primary_user_name,
    company:  row.company_name,
    domain,
    username: result.adminUsername ?? row.primary_user_email.split('@')[0],
    password,
  }).then(() => console.log('[EMAIL] ✓ Terkirim ke Andrean Rangga'))
    .catch(e  => console.log('[EMAIL] ✗ Gagal:', e.message));

  // Welcome email ke PIC (Jasmi Andre) jika beda email
  if (row.pic_email !== row.primary_user_email) {
    await sendWelcomeEmail({
      toEmail:  row.pic_email,
      toName:   row.pic_name,
      company:  row.company_name,
      domain,
      username: result.adminUsername ?? row.primary_user_email.split('@')[0],
      password,
    }).then(() => console.log('[EMAIL] ✓ CC ke PIC:', row.pic_email))
      .catch(e  => console.log('[EMAIL] ✗ CC gagal:', e.message));
  }

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  KREDENSIAL LOGIN — PT Satu Go Digital  ║');
  console.log('╠══════════════════════════════════════════╣');
  const u = (result.adminUsername ?? row.primary_user_email.split('@')[0]).padEnd(26);
  const p = password.padEnd(26);
  const d = ('https://' + domain).padEnd(26);
  console.log('║  URL      : https://' + domain.padEnd(24) + '║');
  console.log('║  Username : ' + u + '║');
  console.log('║  Password : ' + p + '║');
  console.log('║  Tenant ID: ' + String(result.tenant?.id ?? '?').padEnd(26) + '║');
  console.log('╚══════════════════════════════════════════╝');

} else {
  await pool.query(
    `UPDATE onboarding_requests
     SET status='pending', reviewed_at=NULL, reviewed_by=NULL,
         notes=$1, provisioning_log=$2
     WHERE id=$3`,
    ['Gagal: ' + result.error, JSON.stringify(result.steps), row.id]
  );
  console.log('[DB] Rollback → pending (bisa di-retry dari Admin Console)');
}

await pool.end();
