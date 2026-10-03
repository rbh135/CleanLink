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
 *
 * Wrapped in an IIFE so that injecting this file more than once into the same
 * page (e.g. on rapid double-click) never causes a "const already declared" error.
 */

(function () {

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
  'gad_source', // Google Ads source marker
  'gad_campaignid', // Google Ads campaign identifier

  // Meta / Facebook
  'fbclid',  // Facebook Click ID

  // Mailchimp campaign tracking
  'mc_cid',  // Mailchimp campaign ID
  'mc_eid',  // Mailchimp email ID (recipient)
  'wickedid', // newsletter/email attribution token

  // HubSpot email tracking
  '_hsenc',  // HubSpot encoded email address
  '_hsmi',   // HubSpot email message ID
  'hsa_acc', // HubSpot account ID
  'hsa_cam', // HubSpot campaign ID
  'hsa_grp', // HubSpot ad group ID
  'hsa_ad',  // HubSpot ad ID
  'hsa_src', // HubSpot traffic source
  'hsa_tgt', // HubSpot targeting descriptor
  'hsa_kw',  // HubSpot keyword
  'hsa_mt',  // HubSpot match type
  'hsa_net', // HubSpot ad network
  'hsa_ver', // HubSpot tracking schema version
  'dm_cam',  // ad campaign identifier
  'dm_grp',  // ad group identifier
  'dm_ad',   // ad creative identifier
  'dm_kw',   // paid keyword
  'dm_net',  // ad network/source

  // Marketo email tracking
  'mkt_tok', // Marketo tracking token

  // Kit (formerly ConvertKit) newsletter tracking
  'ck_subscriber_id', // per-recipient subscriber ID appended to newsletter links

  // Instagram share tracking
  'igshid',  // Instagram Share ID
  'igsh',    // Instagram share token variant

  // Twitter / X click tracking
  'twclid',  // Twitter Click ID

  // Yandex click tracking
  'yclid',   // Yandex Click ID

  // Microsoft Ads click tracking
  'msclkid',

  // TikTok Ads click tracking
  'ttclid',

  // Reddit Ads click tracking
  'rb_clickid',

  // Meta share attribution
  'mibextid',

  // Pinterest/Ezoic-style click tracking
  'epik',

  // Vero campaign tracking
  'vero_id',
  'vero_conv',

  // Omnisend subscriber tracking
  'oly_anon_id',
  'oly_enc_id',

  // Blue3 / bol.com-style affiliate click ID (seen on Dutch webshops)
  'bl3nlclid',
]);

// Prefix-match rules (case-insensitive).
//
// Any parameter whose name starts with one of these prefixes is removed.
// The utm_ namespace is universally reserved for campaign measurement
// (Google Analytics / GA4 / generic). No legitimate page-identity parameter
// uses this prefix, so it is safe to remove the entire namespace.
// ---------------------------------------------------------------------------
const PREFIX_PARAMS = [
  'utm_',
  'etrias_', // Etrias (Dutch price-comparison/affiliate feed) source & campaign
];

// Params that are too generic to strip on their own, but are tracking when
// they appear alongside a given tracking prefix.
//   Etrias appends a bare `p` (feed/partner ID) next to etrias_*; elsewhere
//   `p` is often pagination or a content ID, so only drop it in that context.
const COMPANION_PARAMS = [
  { prefix: 'etrias_', params: ['p'] },
];

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
      url.pathname = url.pathname.replace(/\/ref=[^/?#]+$/, '');

      const amazonSessionParams = [
        'ats', // opaque personalization blob; can include customer/account hints
        '_encoding', // legacy page encoding marker, not content-defining
        'content-id', // merchandising/placement token from recommendation slots
        'ie', // legacy input-encoding marker
        'tag',       // affiliate / associate tag
        'linkCode',  // affiliate link code
        'linkId',    // affiliate link ID
        'ref',       // referral source (sr_1_1 = search result rank, etc.)
        'ref_',      // share-link variant of ref (cm_sw_r_cp_ud_ct_… tokens)
        'psc',       // share-link session marker; not present on normal navigation
        'pd_rd_r',   // personalisation session token
        'pd_rd_w',   // personalisation session token
        'pd_rd_wg',  // personalisation session token
        'pf_rd_p',   // page feature token
        'pf_rd_r',   // page feature token
        'sr',        // search result rank position (tracking)
        'qid',       // query session ID (changes per search, not content)
        'ufe',       // app deep-link/experiment attribution token (app_do:...)
        'xpid',      // experiment/placement session ID
      ];
      for (const key of amazonSessionParams) {
        url.searchParams.delete(key);
      }

      // On Amazon product pages, these query params carry search/session state
      // rather than product identity. Preserve variant selectors like th=.
      if (/\/(?:[^/]+\/)?dp\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)) {
        const amazonProductTrackingParams = [
          'crid',     // search request/campaign bucket ID
          'dib',      // opaque merchandising/session blob
          'dib_tag',  // merchandising surface tag
          'keywords', // originating search query
          'refinements', // search filters carried over from the results page
          'rnid',     // refinement node ID of the last-used search filter
          'sprefix',  // typed-prefix telemetry
        ];
        for (const key of amazonProductTrackingParams) {
          url.searchParams.delete(key);
        }
      }
      return url;
    },
  },

  {
    // AliExpress product pages: the item ID lives entirely in the URL path
    // (/item/XXXXXXXXXX.html), so every query parameter is decorative.
    // spm, scm*, pvid, gps-id, _t, tpp_buckets, pdp_*, utparam-url, algo_*
    // and curPageLogUid are
    // all session/placement/A-B-test noise with no content-defining purpose.
    test: (url) => /(?:^|\.)aliexpress\.com$/.test(url.hostname),
    clean: (url) => {
      const aliexpressTrackingParams = [
        'spm',          // session/placement tracking path
        'gps-id',       // placement ID
        'scm',          // scene tracking token
        'scm_id',       // scene ID
        'scm-url',      // scene URL token
        'pvid',         // page view ID
        '_t',           // tracking blob
        'tpp_buckets',  // A/B test bucket IDs
        'pdp_ext_f',    // page-detail extra fields (fromPage, sceneId, …)
        'pdp_npi',      // pricing display data redundant with page content
        'utparam-url',  // URL-level tracking (distinct from utm_ prefix)
        'algo_pvid',    // recommendation-algorithm page view ID
        'algo_exp_id',  // recommendation-algorithm experiment ID
        'curPageLogUid', // logging ID of the page the link was clicked from
      ];
      for (const key of aliexpressTrackingParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },

  {
    // Kickstarter project pages identify the content entirely in the path
    // (/projects/{creator}/{project-slug}). Share/discovery params like ref
    // and category_id do not change which project page loads.
    test: (url) => /(?:^|\.)kickstarter\.com$/.test(url.hostname)
                && /^\/projects\/[^/]+\/[^/]+\/?$/.test(url.pathname),
    clean: (url) => {
      const kickstarterTrackingParams = [
        'ref',
        'category_id',
      ];
      for (const key of kickstarterTrackingParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },

  {
    // Humble Bundle uses hmb_* query params for source/placement/campaign
    // attribution, plus mcID (marketing campaign ID) and linkID (affiliate
    // link ID) on outbound/partner links. Bundle/product identity is carried
    // entirely by the path.
    test: (url) => /(?:^|\.)humblebundle\.com$/.test(url.hostname),
    clean: (url) => {
      const humbleTrackingParams = ['mcid', 'linkid'];
      for (const key of [...url.searchParams.keys()]) {
        const lower = key.toLowerCase();
        if (lower.startsWith('hmb_') || humbleTrackingParams.includes(lower)) {
          url.searchParams.delete(key);
        }
      }
      return url;
    },
  },

  {
    // Redbubble artist/shop pages use ref/ref_site for share attribution.
    // Preserve pagination/sort controls and drop only the share-tracking keys.
    test: (url) => /(?:^|\.)redbubble\.com$/.test(url.hostname),
    clean: (url) => {
      const redbubbleTrackingParams = [
        'ref',
        'ref_site',
      ];
      for (const key of redbubbleTrackingParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },

  {
    // Google Maps place/share URLs often append entry/g_ep attribution
    // markers. They do not identify the place or map view, so remove only
    // those keys and leave the complex path/data payload untouched.
    test: (url) => /(?:^|\.)google\.[a-z.]+$/.test(url.hostname)
                && url.pathname.startsWith('/maps'),
    clean: (url) => {
      const googleMapsTrackingParams = [
        'entry', // surface/share entry marker (e.g. ttu)
        'g_ep',  // opaque experiment/entry-point token
      ];
      for (const key of googleMapsTrackingParams) {
        url.searchParams.delete(key);
      }
      return url;
    },
  },

  {
    // Google Search results pages: keep content-defining params (q, tbm, tbs,
    // hl, gl, num, start, etc.) and strip session/telemetry noise.
    // Scope is intentionally narrow (Google host + /search path) so other
    // Google products are untouched unless we add explicit rules later.
    test: (url) => /(?:^|\.)google\.[a-z.]+$/.test(url.hostname)
                && url.pathname === '/search',
    clean: (url) => {
      const googleSearchTrackingParams = [
        'client',   // requesting client/app fingerprint
        'sxsrf',    // session/XSRF token
        'ei',       // request/session event identifier
        'gs_lp',    // query refinement/session blob
        'sca_esv',  // experiment/session variant token
        'oq',       // original query (typing/correction telemetry)
        'sclient',  // search client surface identifier
        'sourceid', // traffic source marker (e.g. "chrome")
        'ved',      // click/context telemetry token
        'uact',     // user action type
        'iflsig',   // integrity/session signature
      ];
      for (const key of googleSearchTrackingParams) {
        url.searchParams.delete(key);
      }

      // Google occasionally appends query-like hash params such as #ebo=0.
      // Strip only ebo from the fragment while preserving any other hash keys.
      if (url.hash.startsWith('#') && url.hash.length > 1) {
        const hashParams = new URLSearchParams(url.hash.slice(1));
        if (hashParams.has('ebo')) {
          hashParams.delete('ebo');
          const nextHash = hashParams.toString();
          url.hash = nextHash ? `#${nextHash}` : '';
        }
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
    if (EXACT_PARAMS.has(lower) || PREFIX_PARAMS.some((prefix) => lower.startsWith(prefix))) {
      keysToDelete.push(key);
    }
  }

  for (const { prefix, params } of COMPANION_PARAMS) {
    if (keysToDelete.some((key) => key.toLowerCase().startsWith(prefix))) {
      keysToDelete.push(...params);
    }
  }

  // Delete in a second pass to avoid mutating the iterator mid-loop.
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }

  return url;
}

/** Remove parameters whose value is an empty string (e.g. `CF=`, `CFID=`). */
function removeEmptyParams(url) {
  const keysToDelete = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (value === '') keysToDelete.push(key);
  }
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }
  return url;
}

/** Apply every site rule whose test() matches the URL. */
function applySiteRules(url) {
  for (const rule of SITE_RULES) {
    if (rule.test(url)) {
      url = rule.clean(url);
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
  url = removeEmptyParams(url);
  url = applySiteRules(url);

  const cleaned = url.toString();
  // `changed` lets the UI show a distinct message when nothing was stripped.
  return { ok: true, cleaned, changed: cleaned !== rawUrl };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined') {
  // CommonJS – used by clean-url.test.js running in Node.
  module.exports = { cleanUrl, EXACT_PARAMS, PREFIX_PARAMS };
} else {
  // Browser content-script context: expose cleanUrl for content.js, which is
  // injected in the same executeScript call and therefore shares globalThis.
  // The underscore prefix signals this is extension-internal, not page API.
  globalThis._cleanLink = { cleanUrl };
}

}()); // end IIFE
