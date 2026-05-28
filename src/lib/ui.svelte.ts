// Shared reactive UI state — importable anywhere in the app.
// Svelte 5 $state works in *.svelte.ts files.

class UIState {
  currentApp = $state<{ key: string; url: string; label: string } | null>(null);
  showProfileModal = $state(false);
  profileTab = $state<'profil' | 'keamanan' | 'organisasi'>('profil');

  openApp(key: string, url: string, label: string) {
    this.currentApp = { key, url, label };
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
}

export const ui = new UIState();
