/**
 * popup.js
 *
 * Popup lifecycle:
 *   1. Query the active tab URL (requires activeTab permission).
 *   2. Pass it through cleanUrl() from clean-url.js.
 *   3. Copy the result to the clipboard (requires clipboardWrite permission).
 *   4. Show feedback: whether tracking was removed, or the URL was already clean,
 *      or an explanatory error if cleaning/copying was not possible.
 *
 * No network requests. No storage. No telemetry.
 */

const statusEl = document.getElementById('status');
const urlBox   = document.getElementById('url-box');

// ---------------------------------------------------------------------------
// UI state helpers
// ---------------------------------------------------------------------------

/** Tracking params were found and removed; cleaned URL is now on the clipboard. */
function showCleaned(cleanedUrl) {
  statusEl.textContent = 'Tracking params removed \u2013 copied \u2713';
  statusEl.className   = 'success';
  showUrlBox(cleanedUrl);
}

/** URL had no tracking params; copied as-is so the user still gets the URL. */
function showAlreadyClean(url) {
  statusEl.textContent = 'Already clean \u2013 copied \u2713';
  statusEl.className   = 'clean';
  showUrlBox(url);
}

/** Something went wrong; explain why without jargon. */
function showError(message) {
  statusEl.textContent = message;
  statusEl.className   = 'error';
}

function showUrlBox(url) {
  urlBox.textContent   = url;
  urlBox.style.display = 'block';
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function run() {
  // activeTab grants access to the current tab URL only while the popup is
  // open – no persistent background access to browsing history.
  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showError('Could not access the current tab.');
    return;
  }

  const tab = tabs?.[0];
  if (!tab?.url) {
    showError('No URL available for this tab.');
    return;
  }

  const result = cleanUrl(tab.url);
  if (!result.ok) {
    // Covers unsupported schemes (chrome://, about:, file://, etc.) and
    // malformed URLs. The error string is intentionally user-readable.
    showError(result.error);
    return;
  }

  // clipboardWrite permission makes this work even when the popup is
  // not the focused element. No fallback to execCommand – that API is
  // deprecated and can silently fail.
  try {
    await navigator.clipboard.writeText(result.cleaned);
  } catch {
    showError('Could not copy to clipboard. Try clicking the icon again while the popup is focused.');
    return;
  }

  if (result.changed) {
    showCleaned(result.cleaned);
  } else {
    showAlreadyClean(result.cleaned);
  }
}

run();
