<script lang="ts">
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  const I = {
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    file:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    arrowUR:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    home:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    back:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>`,
  };

  interface FileItem {
    name: string;
    href: string;
    type: string;
    size: number;
    modified: string;
    isDir: boolean;
  }

  let items   = $state<FileItem[]>([]);
  let path    = $state('/');
  let loading = $state(true);
  let error   = $state('');
  let pathStack = $state<string[]>([]);

  async function loadFiles(p = '/') {
    loading = true; error = '';
    try {
      const res = await fetch(`/api/nextcloud/files?path=${encodeURIComponent(p)}`);
      const d = await res.json();
      if (d.ok) {
        items = d.items;
        path = p;
      } else {
        error = d.error ?? 'Gagal memuat file';
        items = [];
      }
    } catch { error = 'Koneksi gagal'; items = []; }
    loading = false;
  }

  function openFolder(item: FileItem) {
    pathStack = [...pathStack, path];
    const newPath = path === '/' ? '/' + item.name : path + '/' + item.name;
    loadFiles(newPath);
  }

  function goBack() {
    const prev = pathStack.pop();
    pathStack = [...pathStack];
    if (prev !== undefined) loadFiles(prev);
  }

  function goHome() { pathStack = []; loadFiles('/'); }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + ' MB';
    return (bytes/1024/1024/1024).toFixed(2) + ' GB';
  }

  function fileIcon(item: FileItem) {
    if (item.isDir) return I.folder;
    const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
    return I.file;
  }

  function fileColor(item: FileItem) {
    if (item.isDir) return 'var(--warn)';
    const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'var(--danger)';
    if (['docx','doc'].includes(ext)) return 'var(--pri)';
    if (['xlsx','xls','csv'].includes(ext)) return 'var(--ok)';
    return 'var(--fg-3)';
  }

  onMount(() => loadFiles('/'));
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Drive</strong></div>
    <div class="topbar-right">
      <a class="btn btn-secondary btn-sm" href={APP_URLS.cloud} target="_blank" rel="noopener">
        Buka Nextcloud {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Drive — Nextcloud</h1>
        <p class="page-sub">File dan folder tersimpan di Nextcloud</p>
      </div>
    </div>

    <!-- Breadcrumb / nav -->
    <div class="path-bar">
      <button class="path-btn" onclick={goHome}>{@html I.home} Home</button>
      {#if pathStack.length > 0}
        <span class="path-sep">/</span>
        <button class="path-btn" onclick={goBack}>{@html I.back} Kembali</button>
      {/if}
      <span class="path-current mono">{path}</span>
    </div>

    <div class="panel">
      {#if loading}
        <div class="empty-state">Memuat file dari Nextcloud…</div>
      {:else if error}
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Tidak dapat memuat file</div>
          <div class="error-sub">{error}</div>
          <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
            <button class="btn btn-secondary btn-sm" onclick={() => loadFiles(path)}>Coba lagi</button>
            <a class="btn btn-primary btn-sm" href={APP_URLS.cloud} target="_blank" rel="noopener">
              Buka Nextcloud {@html I.arrowUR}
            </a>
          </div>
        </div>
      {:else if items.length === 0}
        <div class="empty-state">Folder kosong</div>
      {:else}
        <table class="file-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Ukuran</th>
              <th>Terakhir Diubah</th>
              <th style="text-align:right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item (item.name)}
              <tr class="file-row" class:is-dir={item.isDir}>
                <td>
                  <div class="file-cell">
                    <span style="color:{fileColor(item)}">{@html fileIcon(item)}</span>
                    {#if item.isDir}
                      <button class="file-name-btn" onclick={() => openFolder(item)}>{item.name}</button>
                    {:else}
                      <span class="file-name">{item.name}</span>
                    {/if}
                  </div>
                </td>
                <td class="mono file-size">{item.isDir ? '—' : fmtSize(item.size)}</td>
                <td class="file-date">{item.modified ? new Date(item.modified).toLocaleDateString('id-ID') : '—'}</td>
                <td style="text-align:right">
                  <a class="btn btn-ghost btn-xs" href={item.href} target="_blank" rel="noopener" title="Buka">
                    {@html I.arrowUR}
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>

<style>
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); }
  .main-pad { padding:28px; display:flex; flex-direction:column; gap:18px; max-width:1200px; width:100%; }
  .page-head { display:flex; justify-content:space-between; align-items:flex-start; }
  .page-h1 { font-size:24px; font-weight:700; color:var(--fg-1); margin:0; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  .path-bar { display:flex; align-items:center; gap:6px; padding:8px 12px; background:var(--bg-2); border-radius:var(--r-md); border:1px solid var(--bd-1); flex-wrap:wrap; }
  .path-btn { display:flex; align-items:center; gap:4px; background:none; border:none; color:var(--pri); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; padding:2px 4px; border-radius:4px; transition:.12s; }
  .path-btn:hover { background:var(--bg-3); }
  .path-sep { color:var(--fg-4); font-size:12px; }
  .path-current { font-size:12px; color:var(--fg-3); }

  .file-table { width:100%; border-collapse:collapse; }
  .file-table th { padding:10px 20px; text-align:left; font-size:10px; font-weight:700; color:var(--fg-4); letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid var(--bd-1); background:var(--bg-2); }
  .file-table td { padding:12px 20px; font-size:13px; color:var(--fg-2); border-bottom:1px solid color-mix(in srgb, var(--bd-1) 60%, transparent); vertical-align:middle; }
  .file-table tr:last-child td { border-bottom:none; }
  .file-row:hover td { background:var(--bg-2); }
  .file-cell { display:flex; align-items:center; gap:10px; }
  .file-name-btn { background:none; border:none; cursor:pointer; font-size:13px; font-weight:500; color:var(--pri); font-family:inherit; padding:0; }
  .file-name-btn:hover { text-decoration:underline; }
  .file-name { font-size:13px; color:var(--fg-1); }
  .file-size { font-size:12px; color:var(--fg-4); }
  .file-date { font-size:12px; color:var(--fg-4); }
  .btn-xs { padding:3px 7px !important; font-size:11px !important; }

  .empty-state { padding:48px; text-align:center; color:var(--fg-3); font-size:13px; }
  .error-state { padding:48px; text-align:center; }
  .error-icon { font-size:36px; margin-bottom:12px; }
  .error-title { font-size:16px; font-weight:600; color:var(--fg-1); }
  .error-sub { font-size:13px; color:var(--fg-3); margin-top:6px; }
</style>
