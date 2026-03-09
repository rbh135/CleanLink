# Clean Link

A minimal Chrome extension that removes tracking parameters from the current tab's URL and copies the clean link to your clipboard.

Click the toolbar icon → clean URL is on your clipboard. That's it.

---

## What it does

When you click the toolbar icon, Clean Link:

1. Reads the URL of the current active tab.
2. Strips known tracking and analytics query parameters.
3. Applies a small set of site-specific rules (Amazon, YouTube).
4. Copies the result to your clipboard.
5. Shows whether tracking was removed, or the URL was already clean.

---

## Examples

**Article with UTM campaign params:**

- Before: `https://example.com/article?id=42&utm_source=twitter&utm_medium=social`
- After: `https://example.com/article?id=42`

**YouTube share link with tracking ID:**

- Before: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=shared`
- After: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

**Amazon product with affiliate tag and session noise:**

- Before: `https://www.amazon.com/dp/B08XYZ?tag=mysite-20&ref=sr_1_1&pd_rd_r=xyz`
- After: `https://www.amazon.com/dp/B08XYZ`

**Facebook share link:**

- Before: `https://example.com/page?fbclid=IwAR2_abc123&color=red`
- After: `https://example.com/page?color=red`

**Search URL with UTM appended by the site:**

- Before: `https://www.google.com/search?q=privacy+tools&utm_source=homepage`
- After: `https://www.google.com/search?q=privacy+tools`

**Already clean URL:** copied as-is, and the popup says so.

---

## Tracking parameters removed

### Generic rules (applied to all URLs)

| Parameter(s)                        | Source                     | Match type |
| ----------------------------------- | -------------------------- | ---------- |
| `utm_*` (any variant)               | Google Analytics / generic | prefix     |
| `gclid`, `dclid`, `gbraid`, `wbraid`| Google Ads click IDs       | exact      |
| `fbclid`                            | Meta / Facebook            | exact      |
| `mc_cid`, `mc_eid`                  | Mailchimp                  | exact      |
| `_hsenc`, `_hsmi`                   | HubSpot                    | exact      |
| `mkt_tok`                           | Marketo                    | exact      |
| `igshid`                            | Instagram                  | exact      |
| `twclid`                            | Twitter / X                | exact      |
| `yclid`                             | Yandex                     | exact      |
| `vero_id`                           | Vero                       | exact      |
| `oly_anon_id`, `oly_enc_id`         | Omnisend                   | exact      |

The `utm_` prefix rule catches any current or future `utm_*` variant without requiring an explicit entry per parameter.

### Site-specific rules

| Site    | Params removed                                                         | Params kept                    |
| ------- | ---------------------------------------------------------------------- | ------------------------------ |
| YouTube | `si`, `feature`, `app`, `src_vid`, `pp`                                | `v`, `t`, `list`, `index`, ... |
| Amazon  | `tag`, `linkCode`, `linkId`, `ref`, `pd_rd_*`, `pf_rd_*`, `sr`, `qid`  | `th`, `k`, `i`, ...            |

---

## Why some parameters are preserved

Many query parameters serve dual purposes or have ambiguous names. Clean Link only removes parameters with a documented, unambiguous tracking purpose that carries no content identity.

**Parameters we deliberately do not remove globally:**

- `ref` – used by GitHub for branch names, by many sites for pagination refs. Only removed on Amazon where its tracking purpose on product pages is well-documented.
- `source` – often describes internal navigation (e.g. search → article).
- `id`, `pid`, `cid`, `sid` – almost always content or session identifiers.
- `page`, `sort`, `filter`, `variant`, `color`, `size` – UI state, not tracking.
- Any parameter we cannot confirm is tracking-only.

If a parameter's purpose is ambiguous — even slightly — it is preserved.

---

## Conservative vs aggressive cleaning

Some tools take an **aggressive** approach: remove everything except an explicit allowlist of "safe" parameters. This is thorough but has real costs:

- Removing the wrong parameter can silently break the page (session tokens, pagination, authenticated content).
- An allowlist approach is hard to audit: what's in the list? Why is each entry there?
- A broken shared link is harder to debug than a link with a leftover tracking param.

Clean Link takes the **conservative** approach: start from zero removals and only add parameters we are confident are tracking-only. This means:

- A small number of obscure trackers may survive. That is acceptable.
- Legitimate content parameters will not be removed. That is required.
- The rule lists in `clean-url.js` are short enough to read in two minutes.

If you want more aggressive cleaning for a specific site, add a targeted rule to `SITE_RULES` rather than widening the generic lists.

---

## Privacy guarantees

- **No network requests** – the extension never contacts any server, ever.
- **No telemetry** – nothing is tracked, logged, or reported anywhere.
- **No remote configuration** – all logic lives in the installed files.
- **No data storage** – nothing is written to `chrome.storage` or `localStorage`.
- **No third-party scripts** – zero external dependencies.
- **No `eval` or dynamic code** – the CSP is declared explicitly in `manifest.json`.

You can audit every line: five small files, no build step, no minification, no network access.

---

## Permissions

**`activeTab`** – reads the URL of the tab you are currently viewing. Access is granted only while the popup is open; there is no persistent background access to your tabs or browsing history.

**`clipboardWrite`** – writes the cleaned URL to your clipboard.

No host permissions (`<all_urls>` or `*://*/*`) are requested.

The `content_security_policy` field in `manifest.json` is declared explicitly for auditors:

```text
script-src 'self'; object-src 'none';
```

This is MV3's default, written out so you don't have to look it up.

---

## File structure

```text
CleanLink/
├── manifest.json        # MV3 manifest – permissions and CSP
├── popup.html           # Popup UI and styles
├── popup.js             # Tab query, clipboard write, UI state
├── clean-url.js         # Pure URL-cleaning logic (no browser APIs)
├── clean-url.test.js    # Test suite – run with node clean-url.test.js
└── README.md
```

The URL-cleaning logic in `clean-url.js` is a pure function with no side-effects. It can be tested in Node without a browser, and can be read without understanding how Chrome extensions work.

---

## How to load in Chrome (unpacked)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle, top-right corner).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.

Pin the extension from the puzzle-piece menu for one-click access.

---

## Running the tests

No framework required. The test file uses only Node's built-in `assert` module:

```bash
node clean-url.test.js
```

Exit code is `0` on full pass, `1` on any failure.

---

## Current limitations

- **`chrome://`, `file://`, `about:`, `data:` pages are not cleaned.** These schemes don't carry meaningful tracking parameters. The extension shows a readable error instead of silently doing nothing.
- **Fragment-only tracking** (e.g. `#xtor=RSS-...`) is not removed. Hash fragments are not sent to servers, so this is low priority, but it is a known gap.
- **URL shorteners** (bit.ly, t.co, etc.) are not expanded. Following a redirect requires a network request, which violates the no-network-requests guarantee.
- **Redirect wrappers** (e.g. `https://l.facebook.com/l.php?u=...`) are not unwrapped for the same reason.

---

## Adding domain-specific rules

The `SITE_RULES` array in `clean-url.js` is the right place for targeted additions. Each rule is a plain object with two functions:

```js
{
  // Return true if this rule applies to the URL.
  test: (url) => url.hostname === 'open.spotify.com',

  // Remove tracking params; return the modified URL object.
  clean: (url) => {
    url.searchParams.delete('si'); // Spotify share instance ID
    return url;
  },
}
```

Rules here only apply to URLs that match `test()`, so they carry no risk of breaking unrelated sites. Add a test case to `clean-url.test.js` for every rule you add.

Examples worth adding:

| Site           | Params to remove               | Params to keep  |
| -------------- | ------------------------------ | --------------- |
| Spotify        | `si`                           | everything else |
| Twitter / X    | `s` (share source)             | everything else |
| Reddit         | `utm_*` (added by share button)| everything else |
| Apple Podcasts | `itsct`, `itscg`               | everything else |
| TikTok         | `_r`, `is_from_webapp`         | everything else |
| Substack       | `utm_*` (added on share)       | everything else |
