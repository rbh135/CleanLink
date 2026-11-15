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
  'srsltid', // Google Merchant Center auto-tagging (Shopping result click ID)
  '_gl',     // Google Analytics cross-domain linker (carries client/session IDs)

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

  // --- Added from the AdGuard / ClearURLs generic lists. Each has vendor
  // --- documentation or is removed by both lists. Entries must be lower-case.

  // Google Analytics cross-domain linker (older sibling of _gl)
  '_ga',

  // HubSpot cross-domain visitor/session IDs, CTA click tracking, extra ad params
  '__hsfp',
  '__hssc',
  '__hstc',
  'hsctatracking', // sent as hsCtaTracking
  'hsa_la',
  'hsa_ol',

  // MailerLite per-recipient newsletter IDs
  'ml_subscriber',
  'ml_subscriber_hash',

  // Openstat / Yandex ad tracking
  '_openstat',

  // Adobe: Analytics campaign ID, Experience Cloud cross-domain IDs
  's_cid',
  'adobe_mc_ref',
  'adobe_mc_sdid',

  // Coremetrics (HCL / Acoustic) campaign tracking
  'cm_cr',
  'cm_me',

  // AT Internet / Mapp campaign tracking
  'xtor',
  'wt_mc',

  // Parse.ly-style internal campaign tracking (itm_ = internal utm_)
  'itm_campaign',
  'itm_content',
  'itm_medium',
  'itm_source',
  'itm_term',

  // Triple Whale attribution
  'tw_medium',
  'tw_profile_id',
  'tw_source',

  // Segmentify recommendation-click tracking
  '_sgm_action',
  '_sgm_campaign',
  '_sgm_source',

  // Adjust web attribution
  'adjust_referrer',
  'external_click_id',

  // AppsFlyer attribution
  'af_ad',
  'af_adset',
  'af_click_lookback',
  'af_xp',
  'is_retargeting',

  // Affiliate networks: Commission Junction, Tradedoubler, ValueCommerce,
  // The Affiliate Platform, BeMob, Prisjakt
  'cjdata',
  'cjevent',
  'tduid',
  'vc_lpp',
  'btag',
  'bemobdata',
  'pjclid',

  // Yahoo! JAPAN Ads and LINE Ads click IDs
  '_ly_c',
  '_ly_r',
  'line_uid',
  'yj_r',
  'ldtag_cl',
  'lt_r',
  'srclt',

  // AD EBiS (Japan) custom ad parameters, sent as ebisOther1..5
  'ebisother1',
  'ebisother2',
  'ebisother3',
  'ebisother4',
  'ebisother5',

  // Mindbox click ID
  'mindbox-click-id',

  // Russian ad-labelling token (erid), required on ad links by law
  'erid',

  // Generic campaign ID used by several ad tools. No vendor documentation;
  // added on the strength of both community lists removing it everywhere.
  'cmpid',
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

// Google country hosts: google.com, google.de, google.co.uk, google.com.au …
// Anchored so look-alikes such as google.example.com do not match.
const GOOGLE_HOST = /(?:^|\.)google\.(?:com?\.)?[a-z]{2,3}$/;

// Site-specific cleanup rules.
//
// Apply targeted removals for well-known domains after generic cleaning.
// Each rule is:
//   {
//     test(url: URL): boolean,
//     params?: string[],        // exact (case-sensitive) names to remove
//     clean?(url: URL): void,   // anything a plain list cannot express
//   }
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
    test: (url) => /(?:^|\.)amazon\.(com|co\.uk|de|fr|ca|jp|co\.jp|com\.au|com\.br|in|it|es|nl|se|sg|ae|com\.mx|com\.tr|pl|sa|eg|com\.be|ie|co\.za|cn)$/.test(url.hostname),
    params: [
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
    ],
    clean: (url) => {
      url.pathname = url.pathname.replace(/\/ref=[^/?#]+\/?$/, '');

      // On Amazon product pages, these query params carry search/session state
      // rather than product identity. Preserve variant selectors like th=.
      if (/\/(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname)) {
        dropParams(url, [
          'crid',     // search request/campaign bucket ID
          'dib',      // opaque merchandising/session blob
          'dib_tag',  // merchandising surface tag
          'keywords', // originating search query
          'refinements', // search filters carried over from the results page
          'rnid',     // refinement node ID of the last-used search filter
          'sprefix',  // typed-prefix telemetry
        ]);
      }
    },
  },

  {
    // AliExpress product pages: the item ID lives entirely in the URL path
    // (/item/XXXXXXXXXX.html), so every query parameter is decorative.
    // spm, scm*, pvid, gps-id, _t, tpp_buckets, pdp_*, utparam-url, algo_*
    // and curPageLogUid are
    // all session/placement/A-B-test noise with no content-defining purpose.
    test: (url) => /(?:^|\.)aliexpress\.com$/.test(url.hostname),
    params: [
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
    ],
  },

  {
    // Kickstarter project pages and their sub-pages (posts, comments, …)
    // identify the content entirely in the path
    // (/projects/{creator}/{project-slug}/…). Share/discovery params like ref
    // and category_id do not change which page loads.
    test: (url) => /(?:^|\.)kickstarter\.com$/.test(url.hostname)
                && /^\/projects\/[^/]+\/[^/]+(?:\/|$)/.test(url.pathname),
    params: ['ref', 'category_id'],
  },

  {
    // Humble Bundle uses hmb_* query params for source/placement/campaign
    // attribution, plus mcID (marketing campaign ID) and linkID (affiliate
    // link ID) on outbound/partner links, and partner (Humble Partner
    // affiliate ID). Bundle/product identity is carried entirely by the path.
    test: (url) => /(?:^|\.)humblebundle\.com$/.test(url.hostname),
    clean: (url) => {
      dropParams(url, (key) => {
        const lower = key.toLowerCase();
        return lower.startsWith('hmb_') || ['mcid', 'linkid', 'partner'].includes(lower);
      });
    },
  },

  {
    // Redbubble artist/shop pages use ref/ref_site for share attribution.
    // Preserve pagination/sort controls and drop only the share-tracking keys.
    test: (url) => /(?:^|\.)redbubble\.com$/.test(url.hostname),
    params: ['ref', 'ref_site'],
  },

  {
    // AutoTrader.ca: search_id is a per-search session ID on every page.
    // Listing pages (/offers/{slug}-{id}) identify the vehicle entirely in
    // the path; the other params record the search-results context the
    // listing was clicked from (sort, rank, ad boosting). Those are scoped
    // to /offers/ so sort/desc and filters still work on search pages.
    test: (url) => /(?:^|\.)autotrader\.ca$/.test(url.hostname),
    params: ['search_id'],
    clean: (url) => {
      if (!url.pathname.startsWith('/offers/')) return;
      dropParams(url, [
        'sort',
        'desc',
        'position',
        'source',
        'source_otp',
        'order_bucket',
        'boost_level',
        'applied_boost_level',
        'relevance_adjustment',
        'boosting_product',
      ]);
    },
  },

  {
    // Google Maps place/share URLs often append entry/g_ep attribution
    // markers. They do not identify the place or map view, so remove only
    // those keys and leave the complex path/data payload untouched.
    test: (url) => GOOGLE_HOST.test(url.hostname)
                && url.pathname.startsWith('/maps'),
    params: [
      'entry', // surface/share entry marker (e.g. ttu)
      'g_ep',  // opaque experiment/entry-point token
    ],
  },

  {
    // Google Search results pages: keep content-defining params (q, tbm, tbs,
    // hl, gl, num, start, etc.) and strip session/telemetry noise.
    // Scope is intentionally narrow (Google host + /search path) so other
    // Google products are untouched unless we add explicit rules later.
    test: (url) => GOOGLE_HOST.test(url.hostname)
                && url.pathname === '/search',
    params: [
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
    ],
    clean: (url) => {
      // Google occasionally appends query-like hash params such as #ebo=0.
      // Strip only ebo from the fragment while preserving any other hash keys.
      const hash = url.hash.slice(1);
      const next = stripQuery(hash, (key) => key === 'ebo');
      if (next !== hash) url.hash = next;
    },
  },

  {
    // YouTube: preserve v= (video), t= (timestamp), list= (playlist), index=.
    // Strip si= (share instance ID) and feature= (traffic source label).
    // Covers www., m. and music. hosts.
    test: (url) => /(?:^|\.)youtube\.com$/.test(url.hostname)
                || url.hostname === 'youtu.be',
    params: [
      'si',      // share instance ID (added by the Share button)
      'feature', // traffic source label (e.g. "shared", "youtu.be")
      'app',     // app variant hint (unused by the page itself)
      'src_vid', // source video for autoplayed related videos
      'pp',      // player parameters blob (autoplay / shorts tracking)
    ],
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
 * Drop params from a raw query string (no leading `?`).
 * `shouldDrop(key, part)` gets the decoded name and the raw `name=value` text.
 *
 * Works on the raw text on purpose: searchParams.delete() re-encodes every
 * param it keeps (%20 -> +, ~ -> %7E), which rewrites parts of the link we
 * promised not to touch.
 */
function stripQuery(query, shouldDrop) {
  return query.split('&').filter((part) => {
    const key = new URLSearchParams(part).keys().next().value;
    return key === undefined || !shouldDrop(key, part);
  }).join('&');
}

/**
 * Drop query params from `url` in-place. `match` is a list of exact
 * (case-sensitive) names or a `shouldDrop(key, part)` function.
 */
function dropParams(url, match) {
  const shouldDrop = Array.isArray(match) ? (key) => match.includes(key) : match;
  const query = url.search.slice(1);
  const next = stripQuery(query, shouldDrop);
  if (next !== query) url.search = next;
}

/**
 * Remove generic tracking parameters from `url` in-place.
 * Uses case-insensitive comparison for both exact and prefix rules.
 * Also drops `name=` params with an explicit empty value (e.g. `CF=&CFID=`).
 * A bare flag with no `=` (e.g. `?module`) is kept: it can select content.
 */
function removeTrackingParams(url) {
  const lowerKeys = [...url.searchParams.keys()].map((key) => key.toLowerCase());
  const companions = COMPANION_PARAMS
    .filter(({ prefix }) => lowerKeys.some((key) => key.startsWith(prefix)))
    .flatMap(({ params }) => params);

  dropParams(url, (key, part) => {
    const lower = key.toLowerCase();
    return EXACT_PARAMS.has(lower)
        || PREFIX_PARAMS.some((prefix) => lower.startsWith(prefix))
        || companions.includes(key)
        || /^[^=]+=$/.test(part);
  });
}

/** Apply every site rule whose test() matches the URL. */
function applySiteRules(url) {
  for (const rule of SITE_RULES) {
    if (!rule.test(url)) continue;
    if (rule.params) dropParams(url, rule.params);
    if (rule.clean) rule.clean(url);
  }
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

  const before = url.href;
  removeTrackingParams(url);
  applySiteRules(url);

  const cleaned = url.href;
  // `changed` lets the UI show a distinct message when nothing was stripped.
  return { ok: true, cleaned, changed: cleaned !== before };
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
