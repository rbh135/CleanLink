(async function () {

  // Guard against rapid double-clicks: skip if already running.
  // Auto-clears after 1s so a subsequent click always works.
  if (globalThis._cleanLinkActive) return;
  globalThis._cleanLinkActive = true;
  setTimeout(() => { delete globalThis._cleanLinkActive; }, 1000);

  // 1. Clean the URL

  const result = globalThis._cleanLink.cleanUrl(location.href);

  if (!result.ok) {
    showToast(result.error, true);
    return;
  }
  
  // 2. Write to clipboard

  try {
    await copyText(result.cleaned);
  } catch {
    showToast('Could not copy to clipboard.', true);
    return;
  }

  // 3. Show feedback

  showToast(
    result.changed
      ? 'Copied \u2013 tracking removed \u2713'
      : 'Copied \u2013 link already clean \u2713',
    false,
  );

  // Helpers

  /**
   * Write `text` to the clipboard.
   * Tries navigator.clipboard first (clean, async); falls back to the
   * textarea + execCommand approach which is reliable in content-script
   * contexts regardless of user-activation timing.
   */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* fall through */ }

    // Legacy fallback – still works in all current Chrome versions.
    const previousFocus = document.activeElement;
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    previousFocus?.focus?.(); // give focus back to where the user was
    if (!ok) throw new Error('execCommand returned false');
  }

  /**
   * Inject a small, self-removing toast into the page.
   * Uses the maximum z-index so it appears above page content.
   * Styled inline to avoid any dependency on the page's CSS.
   */
  function showToast(message, isError) {
    const ID = '__clean-link-toast';
    const existing = document.getElementById(ID);
    if (existing) {
      clearTimeout(existing._fadeTimer);
      clearTimeout(existing._removeTimer);
      existing.remove();
    }

    const el = document.createElement('div');
    el.id = ID;
    el.setAttribute('role', isError ? 'alert' : 'status'); // announced by screen readers
    el.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:2147483647',
      'padding:10px 18px',
      'border-radius:6px',
      'background:' + (isError ? '#7f1d1d' : '#14532d'),
      'color:#fff',
      'font:500 13px/1.5 system-ui,-apple-system,sans-serif',
      'box-shadow:0 2px 12px rgba(0,0,0,.35)',
      'pointer-events:none',
      'opacity:1',
      'transition:opacity .25s ease',
    ].join(';');

    document.body.appendChild(el);
    // Set the text after insertion: live regions announce changes, not initial content.
    el.textContent = message;

    // Fade out after 2.5 s, then remove from DOM.
    // Store timer IDs on the element so a re-triggered toast can cancel them.
    el._fadeTimer = setTimeout(() => {
      el.style.opacity = '0';
      el._removeTimer = setTimeout(() => el.remove(), 300);
    }, 2500);
  }

}());
