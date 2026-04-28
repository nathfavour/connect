export function showUpgradeIsland(action: string) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('kylrix:island-notification', {
    detail: {
      type: 'pro',
      app: 'root',
      title: `Upgrade to Kylrix Pro to ${action}`,
      message: 'This feature is available on Kylrix Pro.',
      majestic: true,
      duration: 7500,
    },
  }));
}
