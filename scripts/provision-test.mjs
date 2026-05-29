/**
 * Direct provisioning test script — bypasses HTTP/auth layer.
 * Usage: node scripts/provision-test.mjs
 *
 * Reads onboarding request #4 from DB and runs provisionTenant() directly.
 */

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';

// Use built output so $lib aliases are already resolved
const BUILT_DIR = '/opt/portal/.svelte-kit/output/server/chunks';

// ── 1. Import DB pool ─────────────────────────────────────────────
const { t: pool } = await import(path.join(BUILT_DIR, 'db.js'));

// ── 2. Import provisioning functions ─────────────────────────────
// Named exports use single-char aliases in the built output:
// a=sendWelcomeEmail, i=reprovisionTenant, n=generateSlug, r=provisionTenant, t=generatePassword
const provMod = await import(path.join(BUILT_DIR, 'tenantProvisioning.js'));
const provisionTenant   = provMod.r;
const generateSlug      = provMod.n;
const generatePassword  = provMod.t;
const sendWelcomeEmail  = provMod.a;

// ── 3. Load onboarding request ────────────────────────────────────
const { rows } = await pool.query(
  `SELECT * FROM onboarding_requests WHERE id = $1`,
  [4]
);

if (!rows.length) {
  console.error('Request #4 not found');
  process.exit(1);
}

const row = rows[0];
console.log('Request:', row.company_name, '|', row.status);

if (row.status !== 'pending') {
  console.error(`Request is not pending (status: ${row.status})`);
  process.exit(1);
}

// ── 4. Derive slug + domain ───────────────────────────────────────
const slug   = generateSlug(row.company_name);
const domain = row.domain_type === 'custom_domain' && row.domain_value
  ? row.domain_value
  : `${row.domain_value || slug}.opsid.web.id`;

console.log('slug:', slug, '| domain:', domain);

// ── 5. Mark as processing ─────────────────────────────────────────
await pool.query(
  `UPDATE onboarding_requests SET status='processing', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2`,
  ['e2e-test', 4]
);

// ── 6. Generate temp password ──────────────────────────────────────
const adminPassword = generatePassword();
console.log('Generated admin password:', adminPassword);

// ── 7. Run provisioning ───────────────────────────────────────────
console.log('\n=== Starting provisionTenant() ===\n');

const result = await provisionTenant({
  name:        row.company_name,
  slug,
  domain,
  domain_type: (row.domain_type === 'custom_domain' ? 'custom_domain' : 'subdomain'),
  planTier:    row.plan_tier,
  maxUsers:    row.user_count,
  adminName:   row.pic_name,
  adminPassword,
  createdBy:   'e2e-test',
});

// ── 8. Print steps ─────────────────────────────────────────────────
console.log('\n=== Provisioning Steps ===');
for (const s of result.steps ?? []) {
  const icon = s.ok ? '✅' : '❌';
  console.log(`${icon} ${s.step}${s.error ? ': ' + s.error : ''}`);
}

// ── 9. Handle result ──────────────────────────────────────────────
if (!result.ok) {
  console.error('\n❌ Provisioning FAILED:', result.error);
  // Reset to pending
  await pool.query(
    `UPDATE onboarding_requests SET status='pending', notes=$1, reviewed_at=NULL, reviewed_by=NULL WHERE id=4`,
    [`Provisioning gagal: ${result.error}`]
  );
  process.exit(1);
}

// Update to approved
await pool.query(
  `UPDATE onboarding_requests
   SET status='approved', tenant_id=$1, notes=$2, provisioning_log=$3
   WHERE id=4`,
  [result.tenant?.id, 'E2E test approved', JSON.stringify(result.steps)]
);

console.log('\n✅ Provisioning SUCCESS');
console.log('Tenant ID:', result.tenant?.id);
console.log('Admin username:', result.adminUsername);
console.log('Admin password:', adminPassword);
console.log('Domain:', domain);

// ── 10. Send welcome email ────────────────────────────────────────
console.log('\n=== Sending welcome email to', row.pic_email, '===');
try {
  await sendWelcomeEmail({
    toEmail:  row.pic_email,
    toName:   row.pic_name,
    company:  row.company_name,
    domain,
    username: result.adminUsername ?? `admin.${slug}`,
    password: adminPassword,
  });
  console.log('✅ Welcome email sent');
} catch (e) {
  console.error('❌ Welcome email failed:', e.message);
}

await pool.end();
