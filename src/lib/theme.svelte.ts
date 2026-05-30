/**
 * Reactive theme store — 'dark' | 'light'.
 * Persists to localStorage and syncs to <html data-theme="...">.
 */

type Theme = 'dark' | 'light';

class ThemeState {
  current: Theme = $state('dark');

  init() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('opsid-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        this.current = saved;
      }
      // app.html already set the attribute; sync our state to match it
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
      if (attr === 'light' || attr === 'dark') this.current = attr;
    } catch { /* private browsing may block localStorage */ }
  }

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }

  set(t: Theme) {
    this.current = t;
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('opsid-theme', t); } catch { /* ignore */ }
  }

  get isDark()  { return this.current === 'dark'; }
  get isLight() { return this.current === 'light'; }
}

export const theme = new ThemeState();
