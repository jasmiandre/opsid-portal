// Shared reactive UI state — importable anywhere in the app.
// Svelte 5 $state works in *.svelte.ts files.

const APP_ACTION_MAP: Record<string, string> = {
  mail:  'OPEN_MAIL',
  cloud: 'OPEN_DRIVE',
  erp:   'OPEN_ODOO',
  auth:  'OPEN_KEYCLOAK',
  drive: 'OPEN_DRIVE',
};

async function recordActivity(action: string, target: string) {
  try {
    await fetch('/api/activity/log', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, target }),
    });
  } catch { /* non-fatal */ }
}

class UIState {
  currentApp        = $state<{ key: string; url: string; label: string } | null>(null);
  showProfileModal  = $state(false);
  profileTab        = $state<'profil' | 'keamanan' | 'organisasi'>('profil');

  // Notification badge — refreshed by Dashboard / Sidebar
  notifCount        = $state(0);
  notifList         = $state<Array<{ id: string; type: string; message: string; time: string }>>([]);

  openApp(key: string, url: string, label: string) {
    this.currentApp = { key, url, label };
    const action = APP_ACTION_MAP[key] ?? 'OPEN_APP';
    recordActivity(action, label);
  }

  closeApp() {
    this.currentApp = null;
  }

  openProfile(tab: 'profil' | 'keamanan' | 'organisasi' = 'profil') {
    this.showProfileModal = true;
    this.profileTab = tab;
  }

  closeProfile() {
    this.showProfileModal = false;
  }

  async refreshNotifications() {
    try {
      const res  = await fetch('/api/notifications');
      const data = await res.json();
      this.notifCount = data.unread ?? 0;
      this.notifList  = data.notifications ?? [];
    } catch { /* ignore */ }
  }
}

export const ui = new UIState();
