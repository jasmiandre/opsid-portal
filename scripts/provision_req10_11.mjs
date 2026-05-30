// Provision request #10 (PT Atom Pro) dan #11 (PT One Digital Solution)
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

async function run(req) {
  const slug     = generateSlug(req.company_name);
  const domain   = req.domain_type === 'subdomain'
    ? req.domain_value + '.opsid.web.id'
    : req.domain_value;
  const password = generatePassword();

  console.log('\n' + '═'.repeat(54));
  console.log('REQUEST #' + req.id + ' — ' + req.company_name);
  console.log('═'.repeat(54));
  console.log('Domain      :', domain);
  console.log('Domain type :', req.domain_type);
  console.log('PIC email   :', req.pic_email);
  console.log('Primary user:', req.primary_user_email);
  console.log('');

  await pool.query(
    `UPDATE onboarding_requests SET status='processing', reviewed_at=NOW(), reviewed_by='opsid-admin' WHERE id=$1`,
    [req.id]
  );

  console.time('provision');
  const result = await provisionTenant({
    name:          req.company_name,
    slug,
    domain,
    domain_type:   req.domain_type,
    planTier:      req.plan_tier,
    maxUsers:      req.user_count,
    adminName:     req.primary_user_name,
    adminEmail:    req.primary_user_email,
    adminUsername: req.primary_user_email.split('@')[0],
    adminPassword: password,
    createdBy:     'opsid-admin',
  });
  console.timeEnd('provision');

  console.log('');
  for (const s of (result.steps ?? [])) {
    const icon = s.ok ? '✓' : '✗';
    const err  = s.error ? '  → ' + String(s.error).slice(0, 80) : '';
    console.log(icon, s.step.padEnd(22), s.ok ? 'OK' : 'FAIL' + err);
  }

  const ok = result.steps?.filter(s => s.ok).length ?? 0;
  const fail = result.steps?.filter(s => !s.ok).length ?? 0;
  console.log(`\nok=${ok} fail=${fail} overall=${result.ok ? '✅ SUCCESS' : '❌ FAILED'}`);

  if (result.ok) {
    await pool.query(
      `UPDATE onboarding_requests SET status='approved', tenant_id=$1, provisioning_log=$2 WHERE id=$3`,
      [result.tenant?.id, JSON.stringify(result.steps), req.id]
    );

    const adminUser = result.adminUsername ?? req.primary_user_email.split('@')[0];
    const picEmail  = req.pic_email.trim().toLowerCase();
    const priEmail  = req.primary_user_email.trim().toLowerCase();
    const onNewDomain = priEmail.endsWith('@' + domain);

    // Kirim ke PIC (selalu)
    await sendWelcomeEmail({
      toEmail: picEmail, toName: req.pic_name,
      company: req.company_name, domain,
      username: adminUser, password,
    }).then(() => console.log('\n[EMAIL] ✓ PIC:', picEmail))
      .catch(e => console.log('\n[EMAIL] ✗ PIC:', e.message));

    // Kirim ke primary user jika berbeda dari PIC dan bukan domain baru
    if (priEmail !== picEmail && !onNewDomain) {
      await sendWelcomeEmail({
        toEmail: priEmail, toName: req.primary_user_name,
        company: req.company_name, domain,
        username: adminUser, password,
      }).then(() => console.log('[EMAIL] ✓ User:', priEmail))
        .catch(() => {});
    } else {
      console.log('[EMAIL] Skip user email:', priEmail,
        onNewDomain ? '(domain baru, belum ada mailbox)' : '(sama dengan PIC)');
    }

    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│ KREDENSIAL LOGIN                            │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ URL      : https://' + domain.padEnd(24) + '│');
    console.log('│ Username : ' + adminUser.padEnd(33) + '│');
    console.log('│ Password : ' + password.padEnd(33) + '│');
    console.log('│ Tenant # : ' + String(result.tenant?.id).padEnd(33) + '│');
    console.log('└─────────────────────────────────────────────┘');
  } else {
    await pool.query(
      `UPDATE onboarding_requests SET status='pending', reviewed_at=NULL, reviewed_by=NULL,
       notes=$1, provisioning_log=$2 WHERE id=$3`,
      ['Gagal: ' + result.error, JSON.stringify(result.steps), req.id]
    );
    console.log('→ Rollback ke pending');
  }
}

// Data dari DB
const rows = await pool.query(
  `SELECT * FROM onboarding_requests WHERE id IN (10,11) ORDER BY id`
).then(r => r.rows);

for (const row of rows) {
  await run(row);
}

await pool.end();
console.log('\n\nSelesai.');
