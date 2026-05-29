<script lang="ts">
  // DNS Setup Wizard — shown to both tenant admins and superadmins.
  // Props:
  //   tenantId   — required
  //   tenantName — for display
  //   onClose    — optional callback when used inside a modal

  interface Props {
    tenantId:   number;
    tenantName: string;
    onClose?:   () => void;
  }
  let { tenantId, tenantName, onClose }: Props = $props();

  // ── Icons ────────────────────────────────────────────────────────
  const I = {
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>`,
    x:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    copy:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    globe:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    warn:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  // ── Types ────────────────────────────────────────────────────────
  interface DnsRecord { type: string; name: string; value: string; hint: string; full_value?: string | null; }
  interface CheckItem { ok: boolean; value: string | null; detail: string; }
  interface CheckResult {
    all_ok: boolean; checked_at: string;
    checks: { mx: CheckItem; spf: CheckItem; dkim: CheckItem; dmarc: CheckItem };
  }
  interface Config {
    mail_domain: string | null;
    dkim_selector: string;
    dkim_public_key: string | null;
    dkim_generated_at: string | null;
    dns_checked_at: string | null;
    dns_mx_ok: boolean | null;
    dns_spf_ok: boolean | null;
    dns_dkim_ok: boolean | null;
    dns_dmarc_ok: boolean | null;
    records: { mx: DnsRecord; spf: DnsRecord; dkim: DnsRecord; dmarc: DnsRecord } | null;
  }

  // ── State ────────────────────────────────────────────────────────
  let config      = $state<Config | null>(null);
  let loadErr     = $state('');
  let domainInput = $state('');
  let setting     = $state(false);
  let setErr      = $state('');
  let checking    = $state(false);
  let checkResult = $state<CheckResult | null>(null);
  let copied      = $state<Record<string, boolean>>({});

  // ── Init ─────────────────────────────────────────────────────────
  $effect(() => { loadConfig(); });

  async function loadConfig() {
    loadErr = '';
    try {
      const res  = await fetch(`/api/admin/tenant/${tenantId}/mail-domain`);
      const data = await res.json();
      if (data.ok) {
        config      = data;
        domainInput = data.mail_domain ?? '';
      } else {
        loadErr = data.error ?? 'Gagal memuat konfigurasi';
      }
    } catch {
      loadErr = 'Koneksi gagal';
    }
  }

  // ── Setup (set domain + generate DKIM) ───────────────────────────
  async function setup() {
    if (!domainInput.trim()) { setErr = 'Masukkan mail domain'; return; }
    setting = true; setErr = '';
    try {
      const res  = await fetch(`/api/admin/tenant/${tenantId}/mail-domain`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mail_domain: domainInput.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadConfig();
      } else {
        setErr = data.error ?? 'Gagal menyimpan';
      }
    } catch {
      setErr = 'Koneksi gagal';
    }
    setting = false;
  }

  // ── Live DNS check ────────────────────────────────────────────────
  async function checkDns() {
    checking = true; checkResult = null;
    try {
      const res  = await fetch(`/api/admin/tenant/${tenantId}/mail-domain/check`);
      const data = await res.json();
      if (data.ok || data.checks) {
        checkResult = data;
        // Refresh cached status from DB
        await loadConfig();
      }
    } catch {
      checkResult = null;
    }
    checking = false;
  }

  // ── Copy to clipboard ─────────────────────────────────────────────
  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    copied[key] = true;
    setTimeout(() => { copied[key] = false; }, 2000);
  }

  // ── Derived ──────────────────────────────────────────────────────
  function statusIcon(ok: boolean | null) {
    if (ok === null || ok === undefined) return '—';
    return ok ? '✅' : '❌';
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  const allGreen = $derived(
    config?.dns_mx_ok && config?.dns_spf_ok && config?.dns_dkim_ok && config?.dns_dmarc_ok
  );
</script>

<div class="wizard">
  <!-- Header -->
  <div class="wizard-head">
    <div style="display:flex;align-items:center;gap:8px">
      {@html I.globe}
      <span class="wizard-title">DNS & Email Setup</span>
      {#if tenantName}<span class="wizard-sub">— {tenantName}</span>{/if}
    </div>
    {#if onClose}
      <button class="btn-icon" onclick={onClose}>{@html I.x}</button>
    {/if}
  </div>

  {#if loadErr}
    <div class="err-banner">{loadErr}</div>
  {:else if !config}
    <div class="loading-row"><div class="spinner-sm"></div> Memuat…</div>
  {:else}

  <!-- ── Step 1: domain input ──────────────────────────────────── -->
  <div class="section">
    <label class="section-label" for="wiz-domain">Mail Domain</label>
    <div class="domain-row">
      <input id="wiz-domain"
        class="domain-input"
        placeholder="contoh: 1go.biz.id"
        bind:value={domainInput}
        onkeydown={(e) => { if (e.key === 'Enter') setup(); }}
      />
      <button class="btn btn-primary btn-sm" onclick={setup} disabled={setting}>
        {setting ? 'Menyimpan…' : config.mail_domain ? 'Ubah' : 'Setup DKIM'}
      </button>
    </div>
    {#if setErr}<p class="field-err">{setErr}</p>{/if}
    <p class="field-hint">Domain email user kamu — berbeda dari portal domain.</p>
  </div>

  {#if config.mail_domain && config.records}
    <!-- ── Step 2: records to copy ───────────────────────────── -->
    <div class="section">
      <div class="section-label">Records yang harus ditambahkan ke DNS</div>
      <table class="rec-table">
        <thead>
          <tr>
            <th>Tipe</th>
            <th>Name</th>
            <th>Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each [
            { key: 'mx',    rec: config.records.mx    },
            { key: 'spf',   rec: config.records.spf   },
            { key: 'dkim',  rec: config.records.dkim  },
            { key: 'dmarc', rec: config.records.dmarc },
          ] as { key, rec }}
            {@const dbOk = key === 'mx' ? config.dns_mx_ok
                          : key === 'spf' ? config.dns_spf_ok
                          : key === 'dkim' ? config.dns_dkim_ok
                          : config.dns_dmarc_ok}
            {@const chkItem = checkResult?.checks?.[key as keyof typeof checkResult.checks]}
            <tr class:rec-ok={dbOk} class:rec-fail={dbOk === false}>
              <td><span class="type-badge">{rec.type}{key === 'mx' ? '/MX' : ''}</span></td>
              <td>
                <code class="rec-name">{rec.name}</code>
                <button class="copy-btn" onclick={() => copy('n_'+key, rec.name)} title="Salin name">
                  {#if copied['n_'+key]}✓{:else}{@html I.copy}{/if}
                </button>
              </td>
              <td>
                <div class="rec-val-wrap">
                  <code class="rec-val">
                    {key === 'dkim' && rec.full_value
                      ? rec.full_value.slice(0, 60) + '…'
                      : rec.value.slice(0, 55) + (rec.value.length > 55 ? '…' : '')}
                  </code>
                  {#if chkItem}
                    <span class="check-detail {chkItem.ok ? 'cd-ok' : 'cd-fail'}">
                      {chkItem.detail}
                    </span>
                  {/if}
                </div>
              </td>
              <td>
                <div class="rec-actions">
                  <span class="status-icon">
                    {#if dbOk === null || dbOk === undefined}—
                    {:else if dbOk}✅
                    {:else}❌
                    {/if}
                  </span>
                  <button
                    class="btn btn-secondary btn-xs"
                    onclick={() => copy(key, key === 'dkim' && rec.full_value ? rec.full_value : rec.value)}
                    title="Salin value"
                  >
                    {copied[key] ? '✓ Disalin' : 'Salin'}
                  </button>
                </div>
              </td>
            </tr>
            {#if key === 'dkim' && rec.full_value}
              <tr class="dkim-full-row">
                <td colspan="4">
                  <div class="dkim-box">
                    <code class="dkim-full">{rec.full_value}</code>
                    <button class="btn btn-ghost btn-xs" onclick={() => copy('dkim_full', rec.full_value!)}>
                      {@html I.copy} {copied['dkim_full'] ? 'Disalin!' : 'Salin Semua'}
                    </button>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>

      {#if !config.dkim_public_key}
        <div class="warn-box">
          {@html I.warn}
          <span>DKIM belum di-generate. Klik "Setup DKIM" di atas untuk membuat key otomatis.</span>
        </div>
      {/if}
    </div>

    <!-- ── Step 3: live check ─────────────────────────────────── -->
    <div class="section">
      <div class="check-bar">
        <button class="btn btn-primary btn-sm" onclick={checkDns} disabled={checking}>
          {@html I.refresh}
          {checking ? 'Mengecek DNS…' : 'Cek DNS Sekarang'}
        </button>
        {#if config.dns_checked_at}
          <span class="last-checked">Terakhir dicek: {formatDate(config.dns_checked_at)}</span>
        {/if}
      </div>

      {#if checking}
        <div class="loading-row"><div class="spinner-sm"></div> Menghubungi DNS server…</div>
      {:else if checkResult}
        <div class="check-grid">
          {#each [
            { key: 'mx',    label: 'MX',    item: checkResult.checks.mx    },
            { key: 'spf',   label: 'SPF',   item: checkResult.checks.spf   },
            { key: 'dkim',  label: 'DKIM',  item: checkResult.checks.dkim  },
            { key: 'dmarc', label: 'DMARC', item: checkResult.checks.dmarc },
          ] as { key, label, item }}
            <div class="check-row" class:cr-ok={item.ok} class:cr-fail={!item.ok}>
              <span class="cr-icon">{item.ok ? '✅' : '❌'}</span>
              <span class="cr-label">{label}</span>
              <span class="cr-detail">{item.detail}</span>
            </div>
          {/each}
        </div>

        {#if checkResult.all_ok}
          <div class="success-box">
            ✅ Semua record DNS sudah benar! Email domain <strong>{config.mail_domain}</strong> siap digunakan.
          </div>
        {:else}
          <div class="info-box">
            DNS bisa memakan waktu 5–60 menit untuk propagasi setelah ditambahkan. Klik "Cek DNS Sekarang" untuk refresh.
          </div>
        {/if}
      {:else if config.dns_checked_at}
        <!-- Cached status from DB -->
        <div class="check-grid">
          {#each [
            { label: 'MX',    ok: config.dns_mx_ok    },
            { label: 'SPF',   ok: config.dns_spf_ok   },
            { label: 'DKIM',  ok: config.dns_dkim_ok  },
            { label: 'DMARC', ok: config.dns_dmarc_ok },
          ] as { label, ok }}
            <div class="check-row" class:cr-ok={ok} class:cr-fail={ok === false}>
              <span class="cr-icon">{statusIcon(ok)}</span>
              <span class="cr-label">{label}</span>
              <span class="cr-detail">{ok ? 'OK' : 'Belum terdeteksi'}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {/if}
</div>

<style>
  .wizard { display:flex; flex-direction:column; gap:0; }

  .wizard-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid var(--bd-1); }
  .wizard-title { font-size:14px; font-weight:600; color:var(--fg-1); }
  .wizard-sub { font-size:12px; color:var(--fg-4); font-weight:400; }

  .section { padding:18px 20px; border-bottom:1px solid var(--bd-1); }
  .section:last-child { border-bottom:none; }
  .section-label { font-size:11px; font-weight:600; color:var(--fg-3); text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; display:block; }

  .domain-row { display:flex; gap:8px; align-items:center; }
  .domain-input { flex:1; height:36px; padding:0 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-sm); color:var(--fg-1); font-size:13px; }
  .domain-input:focus { outline:none; border-color:var(--pri); }
  .field-err { font-size:12px; color:var(--danger); margin-top:6px; }
  .field-hint { font-size:11px; color:var(--fg-4); margin-top:6px; }

  .rec-table { width:100%; border-collapse:collapse; font-size:12px; }
  .rec-table th { text-align:left; font-size:10px; font-weight:600; color:var(--fg-4); text-transform:uppercase; letter-spacing:.05em; padding:0 8px 8px; border-bottom:1px solid var(--bd-1); }
  .rec-table td { padding:10px 8px; border-bottom:1px solid var(--bd-1); vertical-align:top; }
  .rec-table tr:last-child td { border-bottom:none; }
  .rec-table tr.rec-ok td { background:rgba(52,211,153,.04); }
  .rec-table tr.rec-fail td { background:rgba(248,113,113,.04); }

  .type-badge { font-size:10px; font-weight:600; color:var(--pri); background:rgba(91,134,255,.1); border:1px solid rgba(91,134,255,.2); padding:2px 6px; border-radius:4px; white-space:nowrap; }
  .rec-name { font-size:11px; color:var(--fg-2); font-family:monospace; word-break:break-all; }
  .rec-val { font-size:11px; color:var(--fg-3); font-family:monospace; word-break:break-all; }
  .rec-val-wrap { display:flex; flex-direction:column; gap:3px; }
  .copy-btn { background:none; border:none; cursor:pointer; color:var(--fg-4); padding:0 4px; vertical-align:middle; opacity:.6; }
  .copy-btn:hover { opacity:1; color:var(--pri); }

  .rec-actions { display:flex; align-items:center; gap:6px; white-space:nowrap; }
  .status-icon { font-size:14px; }

  .check-detail { font-size:10px; padding:2px 0; }
  .cd-ok   { color:var(--ok);     }
  .cd-fail { color:var(--danger); }

  .dkim-full-row td { padding:0 8px 12px; background:var(--bg-2); }
  .dkim-box { display:flex; align-items:flex-start; gap:8px; padding:10px; background:var(--bg-3); border:1px solid var(--bd-1); border-radius:var(--r-sm); }
  .dkim-full { font-size:10px; font-family:monospace; color:var(--fg-3); word-break:break-all; flex:1; line-height:1.5; }

  .warn-box { display:flex; align-items:center; gap:8px; margin-top:12px; padding:10px 14px; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.25); border-radius:var(--r-sm); font-size:12px; color:var(--warn); }
  .info-box { margin-top:12px; padding:10px 14px; background:rgba(91,134,255,.06); border:1px solid rgba(91,134,255,.2); border-radius:var(--r-sm); font-size:12px; color:var(--fg-3); }
  .success-box { margin-top:12px; padding:10px 14px; background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.25); border-radius:var(--r-sm); font-size:12px; color:var(--ok); }

  .check-bar { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
  .last-checked { font-size:11px; color:var(--fg-4); }

  .check-grid { display:flex; flex-direction:column; gap:6px; }
  .check-row { display:grid; grid-template-columns:22px 60px 1fr; align-items:center; gap:8px; padding:8px 12px; border-radius:var(--r-sm); background:var(--bg-2); font-size:12px; }
  .check-row.cr-ok   { background:rgba(52,211,153,.06);  border:1px solid rgba(52,211,153,.15); }
  .check-row.cr-fail { background:rgba(248,113,113,.06); border:1px solid rgba(248,113,113,.15); }
  .cr-icon  { font-size:14px; }
  .cr-label { font-weight:600; color:var(--fg-2); }
  .cr-detail { color:var(--fg-3); }

  .loading-row { display:flex; align-items:center; gap:10px; padding:20px; font-size:13px; color:var(--fg-3); }
  .spinner-sm { width:16px; height:16px; border:2px solid var(--bd-2); border-top-color:var(--pri); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .err-banner { padding:14px 20px; background:rgba(248,113,113,.08); border-bottom:1px solid rgba(248,113,113,.2); font-size:12px; color:var(--danger); }

  /* Inherit button styles from global */
  .btn-xs { font-size:11px !important; padding:3px 8px !important; height:24px !important; }
</style>
