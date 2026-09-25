# Clean Link

A minimal Chrome extension that removes tracking parameters from the current tab's URL and copies the clean link to your clipboard.

Click the toolbar icon → clean URL is on your clipboard and a brief toast confirms it. No popup opens.

---

## What it does

When you click the toolbar icon, Clean Link:

1. Reads the URL of the current active tab.
2. Strips known tracking and analytics query parameters.
3. Applies a small set of site-specific rules (Amazon, AliExpress, YouTube, Google Search).
4. Copies the result to your clipboard.
5. Shows a brief toast in the corner of the page: green if tracking was removed or the link was already clean, red on error. The toast dismisses itself after 2.5 seconds.

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

**Google Search URL with session/telemetry noise:**

- Before: `https://www.google.com/search?q=wayback+short+movie&client=ms-android-samsung-ss&sxsrf=...&ei=...&oq=wayback+short+movie&sclient=mobile-gws-wiz-serp#ebo=0`
- After: `https://www.google.com/search?q=wayback+short+movie`

**AliExpress product URL with placement/session params:**

- Before: `https://fr.aliexpress.com/item/1005009851200333.html?spm=...&pvid=...&_t=...`
- After: `https://fr.aliexpress.com/item/1005009851200333.html`

**Redbubble artist page with share attribution:**

- Before: `https://www.redbubble.com/people/Assassimation/explore?page=1&sortOrder=recent&ref=artist_profile_share&ref_site=share`
- After: `https://www.redbubble.com/people/Assassimation/explore?page=1&sortOrder=recent`

**Already clean URL:** copied as-is, and the toast says so.

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
| `ck_subscriber_id`                  | Kit (ConvertKit)           | exact      |
| `igshid`                            | Instagram                  | exact      |
| `twclid`                            | Twitter / X                | exact      |
| `yclid`                             | Yandex                     | exact      |
| `bl3nlclid`                         | Dutch affiliate click ID   | exact      |
| `etrias_*` (+ `p` alongside it)     | Etrias                     | prefix     |
| `vero_id`                           | Vero                       | exact      |
| `oly_anon_id`, `oly_enc_id`         | Omnisend                   | exact      |

The `utm_` prefix rule catches any current or future `utm_*` variant without requiring an explicit entry per parameter.

### Site-specific rules

| Site    | Params removed                                                         | Params kept                    |
| ------- | ---------------------------------------------------------------------- | ------------------------------ |
| YouTube | `si`, `feature`, `app`, `src_vid`, `pp`                                | `v`, `t`, `list`, `index`, ... |
| Amazon  | path `/ref=...`, `ats`, `_encoding`, `content-id`, `ie`, `tag`, `linkCode`, `linkId`, `ref`, `pd_rd_*`, `pf_rd_*`, `sr`, `qid`  | `th`, `k`, `i`, ...            |
| AliExpress | `spm`, `gps-id`, `scm*`, `pvid`, `_t`, `tpp_buckets`, `pdp_*`, `utparam-url` | path item ID, content params |
| Redbubble | `ref`, `ref_site`                                                    | `page`, `sortOrder`, ...       |
| Google Search (`/search`) | `client`, `sxsrf`, `ei`, `gs_lp`, `sca_esv`, `oq`, `sclient`, `sourceid`, `ved`, `uact`, `iflsig`, hash `ebo` | `q`, `tbm`, `tbs`, `hl`, `gl`, `num`, `start`, ... |

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

You can audit every line: a handful of small files, no build step, no minification, no network access.

---

## Permissions

**`activeTab`** – allows the extension to inject scripts into the tab you are currently viewing, but only when you explicitly click the icon. There is no persistent access to your tabs or browsing history.

**`scripting`** – required to call `chrome.scripting.executeScript`, which injects `clean-url.js` and `content.js` into the active tab. Without this, the extension cannot interact with the page at all.

**`clipboardWrite`** – grants `navigator.clipboard.writeText()` access to the injected content script. Used as the primary clipboard path; `document.execCommand('copy')` serves as a fallback if the modern API is unavailable.

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
├── background.js        # Service worker – handles icon click, injects scripts
├── clean-url.js         # Pure URL-cleaning logic (no browser APIs)
├── content.js           # Injected into page – cleans URL, writes clipboard, shows toast
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

- **`chrome://`, `about:`, and other restricted pages are silently skipped.** Chrome does not allow script injection into these pages, so the extension does nothing when clicked on them.
- **`file://` pages are not cleaned.** By default, script injection is blocked. If a user manually enables "Allow access to file URLs", the cleaner still rejects `file://` as an unsupported scheme.
- **Fragment-only tracking** is mostly not removed. `#ebo=0` is stripped on Google Search, but other hash trackers (e.g. `#xtor=RSS-...`) are currently preserved.
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
