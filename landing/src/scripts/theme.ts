export function initTheme(): void {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch {}
    });
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try { stored = localStorage.getItem('theme'); } catch {}
      if (stored === 'light' || stored === 'dark') return;
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else if (typeof (mq as any).addListener === 'function') {
      (mq as any).addListener(onChange);
    }
  }
}
