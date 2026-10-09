// Portal renders its badge inside a same-origin iframe, beyond theme CSS.
export function hidePortalBadge(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc?.head || doc.getElementById('tb-portal-branding')) return;
    const style = doc.createElement('style');
    style.id = 'tb-portal-branding';
    style.textContent = '.gh-portal-powered { display: none !important; }';
    doc.head.appendChild(style);
  } catch {
    // Leave Portal functional if a future version uses a cross-origin frame.
  }
}

export function watchPortalBranding() {
  const seen = new WeakSet();
  const scan = () => {
    document.querySelectorAll('#ghost-portal-root iframe').forEach((frame) => {
      if (seen.has(frame)) return;
      seen.add(frame);
      frame.addEventListener('load', () => hidePortalBadge(frame));
      hidePortalBadge(frame);
    });
  };
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
