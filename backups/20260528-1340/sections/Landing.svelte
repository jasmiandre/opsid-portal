<script lang="ts">
  import { auth } from '../auth.svelte';

  const paneApps = [
    { tile:'mail',   ic:'mail',   name:'SOGo Mail',    host:'mail.opsid.web.id' },
    { tile:'cloud',  ic:'cloud',  name:'Nextcloud',    host:'files.opsid.web.id' },
    { tile:'erp',    ic:'box',    name:'Odoo ERP',     host:'erp.opsid.web.id' },
    { tile:'key',    ic:'key',    name:'Keycloak SSO', host:'auth.opsid.web.id' },
    { tile:'shield', ic:'shield', name:'FreeIPA',      host:'ipa.opsid.web.id' },
  ];

  const features = [
    { n:'01', ic:'lock',     t:'True Single Sign-On', d:'Login sekali via Keycloak. Akses semua aplikasi tanpa password tambahan.', m:'KEYCLOAK · OIDC' },
    { n:'02', ic:'shield',   t:'Kedaulatan Data',     d:'Infrastruktur 100% on-premise. Data tidak pernah keluar dari server Anda.', m:'BARE-METAL · ID-DC' },
    { n:'03', ic:'building', t:'Multi-Tenant',        d:'Onboarding klien baru dalam hitungan menit. White-label per domain.', m:'NGINX · SSL · REALM' },
    { n:'04', ic:'chart',    t:'Monitoring Real-time',d:'Prometheus + Grafana memantau 11 VM. Alert otomatis jika ada anomali.', m:'PROM · ALERT · 1m' },
  ];

  // SVG icons inline
  const I = {
    lock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    arrowR:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
    arrowUR:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
    building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21V12h6v9"/><path d="M9 7h2M13 7h2M9 10h2M13 10h2"/></svg>`,
    chart:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 6-7"/></svg>`,
    mail:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cloud:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    box:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    key:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 8-8 3 3-3 3-2-2-2 2"/></svg>`,
    flagID:   `<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="8" fill="#E11D48"/><rect y="8" width="24" height="8" fill="#F4F4F5"/></svg>`,
  };

  function getIcon(name: string) {
    return (I as any)[name] ?? '';
  }
</script>

<div class="land">
  <!-- Nav -->
  <nav class="land-nav">
    <div class="brand">
      <div class="brand-mark"></div>
      <div>
        <div class="brand-name">OPSID</div>
        <div class="brand-sub">Open Platform Sovereign Indonesia</div>
      </div>
    </div>
    <div class="land-nav-links">
      <a href="#platform">Platform</a>
      <a href="#aplikasi">Aplikasi</a>
      <a href="#infra">Infrastruktur</a>
      <a href="#docs">Dokumentasi</a>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="tag" style="display:inline-flex;align-items:center;gap:6px">
        {@html I.flagID} Sovereign ID
      </span>
      <button class="btn btn-primary" onclick={() => auth.login()}>
        Masuk dengan SSO {@html I.arrowR}
      </button>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <div>
      <div class="hero-eyebrow">
        <span class="badge">v1.0</span>
        Hackathon IDCloudHost · OpenSuite · Project Sovereign
      </div>
      <h1>Satu portal untuk seluruh<br/>workspace digital Anda. <em>Dimiliki sepenuhnya, di tanah sendiri.</em></h1>
      <p class="hero-lead">
        OPSID menyatukan email, file, ERP dan identitas dalam satu sign-on
        yang berjalan di infrastruktur Anda — bukan di server luar.
      </p>
      <div class="hero-cta">
        <button class="btn btn-primary" onclick={() => auth.login()}>
          {@html I.lock} Masuk dengan SSO
        </button>
        <a class="btn btn-ghost" href="https://monitor.opsid.web.id" target="_blank" rel="noopener">
          Pantau Infrastruktur {@html I.arrowUR}
        </a>
      </div>
      <div class="hero-trust">
        <div><span class="num">11</span> VM dipantau real-time</div>
        <div><span class="num">100%</span> on-premise & sovereign</div>
        <div><span class="num">&lt;30s</span> onboard user baru</div>
      </div>
    </div>

    <!-- Pane kanan -->
    <div class="hero-pane" aria-hidden="true">
      <div class="pane-bar">
        <i></i><i></i><i></i>
        <span class="pane-url">opsid.web.id / dashboard</span>
      </div>
      {#each paneApps as a (a.name)}
        <div class="pane-app">
          <span class="tile tile-sm tile-{a.tile}">{@html getIcon(a.ic)}</span>
          <div>
            <div class="pa-name">{a.name}</div>
            <div class="pa-host">{a.host}</div>
          </div>
          <span class="pa-status">
            <span class="dot dot-pulse" style="color:var(--ok)"></span> Aktif
          </span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Trust row -->
  <section class="trust-row">
    <div class="trust-cell"><div class="l">Realm</div><div class="v mono">opsid-internal</div></div>
    <div class="trust-cell"><div class="l">Identity Provider</div><div class="v">FreeIPA + Keycloak</div></div>
    <div class="trust-cell"><div class="l">Stack</div><div class="v">SOGo · Nextcloud · Odoo</div></div>
    <div class="trust-cell"><div class="l">Monitoring</div><div class="v">Prometheus + Grafana</div></div>
  </section>

  <!-- Feature deck -->
  <section class="feat-deck">
    <div class="feat-deck-head">
      <h2>Bangun di atas standar terbuka, dijalankan di server Anda.</h2>
      <p>Empat pilar yang membedakan OPSID dari workspace publik. Setiap komponen bersifat open-source, dapat diaudit, dan tidak menitipkan data Anda ke pihak ketiga.</p>
    </div>
    <div class="feat-grid">
      {#each features as f (f.n)}
        <div class="feat-cell">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="ic">{@html getIcon(f.ic)}</span>
            <span class="num">{f.n}</span>
          </div>
          <h3>{f.t}</h3>
          <p>{f.d}</p>
          <span class="meta">{f.m}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="land-foot">
    <span>© 2026 OPSID — IDCloudHost OpenSuite Hackathon · Project Sovereign</span>
    <div style="display:flex;gap:20px">
      <a href="https://auth.opsid.web.id" target="_blank" rel="noopener">Keycloak</a>
      <a href="https://monitor.opsid.web.id" target="_blank" rel="noopener">Grafana</a>
      <a href="#">Status</a>
      <a href="#">Dokumentasi</a>
    </div>
  </footer>
</div>
