/**
 * background.js – MV3 service worker
 *
 * Handles the extension icon click. Injects clean-url.js and content.js into
 * the active tab in a single call so they share the same isolated-world
 * globalThis. All URL cleaning, clipboard writing, and toast display happen
 * inside those injected scripts; nothing sensitive passes through this worker.
 * 
 */

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // Injected in order, sharing one isolated-world execution context:
      //   clean-url.js  →  sets globalThis._cleanLink = { cleanUrl }
      //   content.js    →  reads that, cleans, writes clipboard, shows toast
      files: ['clean-url.js', 'content.js'],
    });
  } catch {
    // executeScript is blocked on chrome://, file://, about:, and other
    // restricted pages. There is no page surface to display feedback on,
    // so we silently do nothing rather than show a confusing browser alert.
  }
});
