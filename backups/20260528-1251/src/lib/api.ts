import { auth } from './auth.svelte';

/** Tipis: bungkus fetch dengan Authorization header otomatis. */
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`);
  if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
