/**
 * clean-url.test.js
 *
 * Minimal self-contained test suite for cleanUrl().
 * No test framework required – run with:  node clean-url.test.js
 */

'use strict';

const assert = require('assert');
const { cleanUrl, EXACT_PARAMS, PREFIX_PARAMS } = require('./clean-url');

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  \u2713  ${description}`);
    passed++;
  } catch (err) {
    console.error(`  \u2717  ${description}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

/** Assert strict equality with a readable default message. */
function eq(actual, expected) {
  assert.strictEqual(actual, expected, `Expected:\n  "${expected}"\nGot:\n  "${actual}"`);
}

/**
 * Run cleanUrl and assert it succeeded, returning the cleaned string.
 * Throws if cleanUrl returned ok=false so the test fails with the error reason.
 */
function clean(url) {
  const result = cleanUrl(url);
  if (!result.ok) throw new Error(`cleanUrl failed: ${result.error}`);
  return result.cleaned;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('\nclean-url.js tests\n');

// -- Rule coverage sanity check ----------------------------------------------
// Verify the data structures have the expected types so a typo in the
// lists fails loudly rather than silently not matching anything.

test('EXACT_PARAMS is a non-empty Set', () => {
  assert.ok(EXACT_PARAMS instanceof Set);
  assert.ok(EXACT_PARAMS.size > 0);
});

test('PREFIX_PARAMS is a non-empty Array of strings', () => {
  assert.ok(Array.isArray(PREFIX_PARAMS));
  assert.ok(PREFIX_PARAMS.length > 0);
  assert.ok(PREFIX_PARAMS.every((p) => typeof p === 'string'));
});

test('EXACT_PARAMS entries are lower-cased (required for matching)', () => {
  for (const key of EXACT_PARAMS) {
    assert.strictEqual(key, key.toLowerCase(), `"${key}" is not lower-cased`);
  }
});

test('utm_ is in PREFIX_PARAMS, not in EXACT_PARAMS (no duplication)', () => {
  assert.ok(PREFIX_PARAMS.includes('utm_'), 'utm_ should be a prefix rule');
  // No utm_* entry should litter the exact set
  for (const key of EXACT_PARAMS) {
    assert.ok(!key.startsWith('utm_'), `"${key}" belongs in PREFIX_PARAMS, not EXACT_PARAMS`);
  }
});

// -- Standard UTM params (prefix rule) ---------------------------------------

test('removes utm_source', () => {
  eq(clean('https://example.com/page?utm_source=google'), 'https://example.com/page');
});

test('removes multiple utm_* params', () => {
  eq(
    clean('https://example.com/?utm_source=nl&utm_medium=email&utm_campaign=spring'),
    'https://example.com/',
  );
});

test('removes utm_id and utm_creative_format', () => {
  eq(clean('https://example.com/?p=1&utm_id=42&utm_creative_format=video'), 'https://example.com/?p=1');
});

// -- Exact-match tracking params ---------------------------------------------

test('removes fbclid', () => {
  eq(clean('https://example.com/?fbclid=abc123'), 'https://example.com/');
});

test('removes gclid', () => {
  eq(clean('https://example.com/?gclid=CjwKCA'), 'https://example.com/');
});

test('removes dclid', () => {
  eq(clean('https://example.com/?dclid=xyz'), 'https://example.com/');
});

test('removes gbraid and wbraid', () => {
  eq(clean('https://example.com/?gbraid=a&wbraid=b'), 'https://example.com/');
});

test('removes mc_cid and mc_eid', () => {
  eq(clean('https://example.com/?mc_cid=abc&mc_eid=def&id=1'), 'https://example.com/?id=1');
});

test('removes _hsenc and _hsmi', () => {
  eq(clean('https://example.com/?_hsenc=p&_hsmi=q'), 'https://example.com/');
});

test('removes mkt_tok', () => {
  eq(clean('https://example.com/?mkt_tok=abc'), 'https://example.com/');
});

test('removes igshid', () => {
  eq(clean('https://www.instagram.com/p/abc/?igshid=xyz'), 'https://www.instagram.com/p/abc/');
});

test('removes twclid', () => {
  eq(clean('https://example.com/?twclid=abc'), 'https://example.com/');
});

test('removes yclid', () => {
  eq(clean('https://example.com/?yclid=123'), 'https://example.com/');
});

test('removes vero_id, oly_anon_id, oly_enc_id', () => {
  eq(
    clean('https://example.com/?x=1&vero_id=a&oly_anon_id=b&oly_enc_id=c'),
    'https://example.com/?x=1',
  );
});

// -- All params together -----------------------------------------------------

test('removes all known tracking params in one URL', () => {
  const url =
    'https://example.com/article?id=42' +
    '&utm_source=tw&utm_medium=social' +
    '&fbclid=x&gclid=y&mc_cid=z' +
    '&_hsenc=p&mkt_tok=m&igshid=i' +
    '&twclid=t&yclid=y2&oly_anon_id=o' +
    '&gbraid=g&wbraid=w';
  eq(clean(url), 'https://example.com/article?id=42');
});

// -- Mixed-case param names (case-insensitive matching) ----------------------

test('removes UTM_SOURCE (uppercase)', () => {
  eq(clean('https://example.com/?UTM_SOURCE=google'), 'https://example.com/');
});

test('removes Utm_Campaign (mixed case)', () => {
  eq(clean('https://example.com/?Utm_Campaign=foo'), 'https://example.com/');
});

test('removes FBCLID (uppercase)', () => {
  eq(clean('https://example.com/?FBCLID=abc'), 'https://example.com/');
});

test('removes _HSENC (uppercase)', () => {
  eq(clean('https://example.com/?_HSENC=p&q=1'), 'https://example.com/?q=1');
});

// -- Duplicate tracking params -----------------------------------------------

test('removes duplicate tracking params (all copies)', () => {
  eq(
    clean('https://example.com/?utm_source=a&utm_source=b&q=cats'),
    'https://example.com/?q=cats',
  );
});

// -- Already-clean URLs – changed flag ---------------------------------------

test('returns changed=false for a URL with no tracking params', () => {
  const result = cleanUrl('https://example.com/article?id=42');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.changed, false);
});

test('returns changed=false for a URL with no query string', () => {
  const result = cleanUrl('https://example.com/about');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.changed, false);
});

test('returns changed=true when tracking params were removed', () => {
  const result = cleanUrl('https://example.com/?utm_source=x&id=1');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.changed, true);
});

test('cleaned string matches original when nothing changed', () => {
  const input = 'https://example.com/article?id=42';
  const result = cleanUrl(input);
  assert.strictEqual(result.cleaned, input);
});

// -- Useful params preserved -------------------------------------------------

test('preserves video ID (v=) on YouTube', () => {
  eq(
    clean('https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
});

test('preserves playlist (list=) and timestamp (t=) on YouTube', () => {
  eq(
    clean('https://www.youtube.com/watch?v=abc&list=PLabc&t=42&si=xyz'),
    'https://www.youtube.com/watch?v=abc&list=PLabc&t=42',
  );
});

test('preserves search query (q=)', () => {
  eq(
    clean('https://www.google.com/search?q=clean+url&utm_source=homepage'),
    'https://www.google.com/search?q=clean+url',
  );
});

test('preserves product variant and article ID alongside tracking', () => {
  eq(
    clean('https://shop.example.com/product?sku=XYZ-42&color=red&fbclid=abc'),
    'https://shop.example.com/product?sku=XYZ-42&color=red',
  );
});

// -- URL fragments (hashes) --------------------------------------------------

test('preserves hash in a clean URL', () => {
  eq(clean('https://example.com/docs#section-3'), 'https://example.com/docs#section-3');
});

test('preserves hash while removing tracking params', () => {
  eq(
    clean('https://example.com/docs?utm_source=email#section-3'),
    'https://example.com/docs#section-3',
  );
});

// -- No trailing ? after cleaning -------------------------------------------

test('produces no trailing ? when all params are removed', () => {
  const cleaned = clean('https://example.com/page?utm_source=x');
  assert.ok(!cleaned.includes('?'), `Should not contain "?" but got: ${cleaned}`);
});

// -- Unsupported URL schemes -------------------------------------------------

test('rejects chrome:// with ok=false and a user-readable error', () => {
  const result = cleanUrl('chrome://extensions/');
  assert.strictEqual(result.ok, false);
  assert.ok(typeof result.error === 'string' && result.error.length > 0);
});

test('rejects about:blank with ok=false', () => {
  assert.strictEqual(cleanUrl('about:blank').ok, false);
});

test('rejects data: URIs with ok=false', () => {
  assert.strictEqual(cleanUrl('data:text/html,<h1>Hi</h1>').ok, false);
});

test('rejects file:// with ok=false', () => {
  assert.strictEqual(cleanUrl('file:///home/user/page.html').ok, false);
});

// -- Invalid input -----------------------------------------------------------

test('rejects a non-URL string with ok=false', () => {
  const result = cleanUrl('not a url at all');
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.length > 0);
});

test('rejects an empty string with ok=false', () => {
  assert.strictEqual(cleanUrl('').ok, false);
});

// -- Novel / unknown utm_* variants (prefix catch-all) -----------------------

test('removes an unknown utm_* variant (prefix match)', () => {
  eq(clean('https://example.com/?p=1&utm_brand_initiative=xyz'), 'https://example.com/?p=1');
});

// -- Site rule: YouTube ------------------------------------------------------

test('YouTube: removes si= (share instance ID)', () => {
  eq(
    clean('https://www.youtube.com/watch?v=abc&si=trackingtoken'),
    'https://www.youtube.com/watch?v=abc',
  );
});

test('YouTube: removes feature= (traffic source label)', () => {
  eq(
    clean('https://www.youtube.com/watch?v=abc&feature=shared'),
    'https://www.youtube.com/watch?v=abc',
  );
});

test('YouTube: removes pp= (player parameters blob)', () => {
  eq(
    clean('https://www.youtube.com/watch?v=abc&pp=some_blob'),
    'https://www.youtube.com/watch?v=abc',
  );
});

test('youtu.be short links: removes si= while preserving the path (video ID)', () => {
  eq(
    clean('https://youtu.be/dQw4w9WgXcQ?si=abc123'),
    'https://youtu.be/dQw4w9WgXcQ',
  );
});

// -- Site rule: Google Search ------------------------------------------------

test('Google Search: strips known tracking/session params but preserves q=', () => {
  eq(
    clean('https://www.google.com/search?q=wayback+short+movie&client=ms-android-samsung-ss&sca_esv=23fc8e95f4db8408&sxsrf=AHTn8zqfvuvcvp5NBgSPe3fOnXv-CJ3Ddg%3A1743796736779&ei=ADrwZ9-XL8CokdUPpuPjiAI&oq=wayback+short+movie&gs_lp=EhNtb2JpbGUtZ3dzLXdpei1zZXJwIhN3YXliYWNrIHNob3J0IG1vdmllMgQQIxgn&sclient=mobile-gws-wiz-serp#ebo=0'),
    'https://www.google.com/search?q=wayback+short+movie',
  );
});

test('Google Search: preserves content-defining search controls', () => {
  eq(
    clean('https://www.google.com/search?q=clean+link&tbm=vid&tbs=qdr:w&start=20&hl=en&gl=us&num=20&sourceid=chrome'),
    'https://www.google.com/search?q=clean+link&tbm=vid&tbs=qdr%3Aw&start=20&hl=en&gl=us&num=20',
  );
});

test('Google non-search pages are not affected by Google Search rule', () => {
  eq(
    clean('https://www.google.com/maps?client=foo&q=coffee'),
    'https://www.google.com/maps?client=foo&q=coffee',
  );
});

// -- Site rule: Amazon -------------------------------------------------------

test('Amazon: removes affiliate tag= and ref= but preserves ASIN in path', () => {
  eq(
    clean('https://www.amazon.com/dp/B08XYZ?tag=mysite-20&ref=sr_1_1'),
    'https://www.amazon.com/dp/B08XYZ',
  );
});

test('Amazon: removes session noise (pd_rd_*, pf_rd_*) but preserves content params', () => {
  eq(
    clean('https://www.amazon.com/dp/B08XYZ?pd_rd_r=abc&pd_rd_w=def&th=1'),
    'https://www.amazon.com/dp/B08XYZ?th=1',
  );
});

test('Amazon: removes qid (query session ID) and sr (rank position)', () => {
  eq(
    clean('https://www.amazon.com/s?k=laptop&qid=123456&sr=8-1'),
    'https://www.amazon.com/s?k=laptop',
  );
});

test('Amazon: removes _encoding and content-id merchandising noise', () => {
  eq(
    clean('https://www.amazon.ca/Giantex-Thickened-Tabletop-Cross-Shaped-Capacity/dp/B0GGHYFVVJ/?_encoding=UTF8&content-id=amzn1.sym.b72a7db1-2e40-43b1-9a87-c772f9c9cf18%3Aamzn1.symc.5a16118f-86f0-44cd-8e3e-6c5f82df43d0'),
    'https://www.amazon.ca/Giantex-Thickened-Tabletop-Cross-Shaped-Capacity/dp/B0GGHYFVVJ/',
  );
});

test('Amazon: removes path ref segment plus ie and ats personalization params', () => {
  eq(
    clean('https://www.amazon.ca/gp/buyagain/ref=pd_hp_d_atf_rp_1?ie=UTF8&ats=eyJleHBsaWNpdENhbmRpZGF0ZXMiOiJCMDlCWFNRUDZXIiwiY3VzdG9tZXJJZCI6IkFFN0ZaUDZJNFFMS1UifQ%3D%3D&pd_rd_w=XTg0o&content-id=amzn1.sym.ace16cc7-9ebe-41a0-b471-1454746eb0b6&pf_rd_p=ace16cc7-9ebe-41a0-b471-1454746eb0b6&pf_rd_r=BJZ5D08KXGHPYESX9AJ9&pd_rd_wg=uJGDb&pd_rd_r=178ac574-8459-4009-9fd3-795f7d3eb033'),
    'https://www.amazon.ca/gp/buyagain',
  );
});

// -- Site rule: AliExpress ---------------------------------------------------

test('AliExpress: strips all tracking params, preserving item ID in path', () => {
  eq(
    clean('https://fr.aliexpress.com/item/1005009851200333.html?spm=a2g0o.detail.0.0&pvid=129e8773-dbbb&_t=gps-id:pcDetail,scm-url:1007.40050'),
    'https://fr.aliexpress.com/item/1005009851200333.html',
  );
});

test('AliExpress: removes all known tracking params including utparam-url', () => {
  eq(
    clean('https://www.aliexpress.com/item/123.html?spm=x&gps-id=y&scm=z&scm_id=z&scm-url=z&pvid=a&_t=b&tpp_buckets=c&pdp_ext_f=d&pdp_npi=e&utparam-url=f'),
    'https://www.aliexpress.com/item/123.html',
  );
});

test('AliExpress: rule applies to all regional subdomains', () => {
  eq(
    clean('https://de.aliexpress.com/item/999.html?spm=tracking&pvid=session'),
    'https://de.aliexpress.com/item/999.html',
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
