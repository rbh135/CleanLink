/**
 * clean-url.js
 *
 * Pure URL-cleaning logic. No DOM, no browser APIs, no side-effects.
 * Safe to run in Node.js for testing.
 *
 * Design principles:
 *   - Conservative by default: only remove parameters with unambiguous tracking purpose.
 *   - When uncertain whether a parameter is tracking or content-defining, preserve it.
 *   - Exact-match rules and prefix-match rules are kept separate for clarity.
 *   - Site-specific rules live in SITE_RULES, not in the generic lists.
 */

// ---------------------------------------------------------------------------
// Exact-match tracking parameters (compared case-insensitively).
//
// A parameter belongs here only if:
//   (a) it has a single, documented, unambiguous tracking purpose, AND
//   (b) it is never used to identify page content.
//
// When in doubt, leave it out. Prefer site-specific rules for ambiguous cases.
// ---------------------------------------------------------------------------
const EXACT_PARAMS = new Set([
  // Google Ads click IDs
  'gclid',   // Google Click ID (search/display ads)
  'dclid',   // Display Click ID (Display Network)
  'gbraid',  // iOS app conversion (SKAdNetwork)
  'wbraid',  // iOS web-to-app conversion

  // Meta / Facebook
  'fbclid',  // Facebook Click ID

  // Mailchimp campaign tracking
  'mc_cid',  // Mailchimp campaign ID
  'mc_eid',  // Mailchimp email ID (recipient)

  // HubSpot email tracking
  '_hsenc',  // HubSpot encoded email address
  '_hsmi',   // HubSpot email message ID

  // Marketo email tracking
  'mkt_tok', // Marketo tracking token

  // Instagram share tracking
  'igshid',  // Instagram Share ID

  // Twitter / X click tracking
  'twclid',  // Twitter Click ID

  // Yandex click tracking
  'yclid',   // Yandex Click ID

  // Vero campaign tracking
  'vero_id',

  // Omnisend subscriber tracking
  'oly_anon_id',
  'oly_enc_id',
]);

// ---------------------------------------------------------------------------
// Prefix-match rules (case-insensitive).
//
// Any parameter whose name starts with one of these prefixes is removed.
// The utm_ namespace is universally reserved for campaign measurement
// (Google Analytics / GA4 / generic). No legitimate page-identity parameter
// uses this prefix, so it is safe to remove the entire namespace.
// ---------------------------------------------------------------------------
const PREFIX_PARAMS = [
  'utm_',
];

// ---------------------------------------------------------------------------
// Site-specific cleanup rules.
//
// Apply targeted removals for well-known domains after generic cleaning.
// Each rule is: { test(url: URL): boolean, clean(url: URL): URL }
//
// Rules here should be conservative: only remove params that are
// unambiguously decorative/tracking on that specific domain.
// Do not add rules for params that could be content-defining elsewhere.
// ---------------------------------------------------------------------------
const SITE_RULES = [
  {
    // Amazon product and search pages append affiliate tags and session noise
    // that are not part of the product identity. The ASIN in the URL path is
    // the content identifier; none of the params below affect which page loads.
    test: (url) => /\bamazon\.(com|co\.uk|de|fr|ca|jp|com\.au|com\.br|in|it|es|nl|se|sg|ae|com\.mx)$/.test(url.hostname),
    clean: (url) => {
      const amazonSessionParams = [
        'tag',       // affiliate / associate tag
        'linkCode',  // affiliate link code
        'linkId',    // affiliate link ID
        'ref',       // referral source (sr_1_1 = search result rank, etc.)
        'pd_rd_r',   // personalisation session token
        'pd_rd_w',   // personalisation session token
        'pd_rd_wg',  // personalisation session token
        'pf_rd_p',   // page feature token
        'pf_rd_r',   // page feature token
        'sr',        // search result rank position (tracking)
        'qid',       // query session ID (changes per search, not content)
      ];
      for (const key of amazonSessionParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },

  {
    // YouTube: preserve v= (video), t= (timestamp), list= (playlist), index=.
    // Strip si= (share instance ID) and feature= (traffic source label).
    test: (url) => url.hostname === 'www.youtube.com'
                || url.hostname === 'youtube.com'
                || url.hostname === 'youtu.be',
    clean: (url) => {
      const youtubeTrackingParams = [
        'si',      // share instance ID (added by the Share button)
        'feature', // traffic source label (e.g. "shared", "youtu.be")
        'app',     // app variant hint (unused by the page itself)
        'src_vid', // source video for autoplayed related videos
        'pp',      // player parameters blob (autoplay / shorts tracking)
      ];
      for (const key of youtubeTrackingParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for URL schemes this cleaner can meaningfully process.
 * Internal browser pages (chrome://, about:, file://, data:, etc.) are
 * excluded: they don't carry tracking params and we shouldn't touch them.
 */
function isSupportedScheme(url) {
  return url.protocol === 'https:' || url.protocol === 'http:';
}

/**
 * Remove all tracking parameters from `url` in-place.
 * Uses case-insensitive comparison for both exact and prefix rules.
 */
function removeTrackingParams(url) {
  const keysToDelete = [];

  for (const key of url.searchParams.keys()) {
    const lower = key.toLowerCase();
    const isExact  = EXACT_PARAMS.has(lower);
    const isPrefix = PREFIX_PARAMS.some((p) => lower.startsWith(p));
    if (isExact || isPrefix) {
      keysToDelete.push(key);
    }
  }

  // Delete in a second pass to avoid mutating the iterator mid-loop.
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }

  return url;
}

/** Apply every site rule whose test() matches the URL. */
function applySiteRules(url) {
  for (const rule of SITE_RULES) {
    if (rule.test(url)) {
      url = rule.clean(url) ?? url;
    }
  }
  return url;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Clean a URL string by removing known tracking parameters.
 *
 * @param {string} rawUrl
 * @returns {
 *   | { ok: true;  cleaned: string; changed: boolean }
 *   | { ok: false; error: string }
 * }
 *
 * `changed` is true when at least one parameter was removed, so callers can
 * distinguish "already clean, copied as-is" from "trackers stripped, copied".
 */
function cleanUrl(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Not a valid URL.' };
  }

  if (!isSupportedScheme(url)) {
    // Give a human-readable message rather than exposing the raw protocol token.
    return {
      ok: false,
      error: `This page type (${url.protocol.replace(':', '')}) cannot be cleaned.`,
    };
  }

  url = removeTrackingParams(url);
  url = applySiteRules(url);

  const cleaned = url.toString();
  // `changed` lets the UI show a distinct message when nothing was stripped.
  return { ok: true, cleaned, changed: cleaned !== rawUrl };
}

// Allow importing in Node without breaking the browser global.
if (typeof module !== 'undefined') {
  module.exports = { cleanUrl, EXACT_PARAMS, PREFIX_PARAMS };
}
