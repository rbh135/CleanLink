<p align="center">
  <img src="icons/CleanLink_logo_128.png" width="96" height="96" alt="Clean Link logo">
</p>

<h1 align="center">Clean Link</h1>

<p align="center">
  A Chrome extension that copies the current page's link without the trackers.<br>
  One click. No popup, no settings, no network requests.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/clean-link/ajaeglecjpobpjcpbfbbifalilkdckne"><strong>Add to Chrome</strong></a>
</p>

## What it does

Click the toolbar icon. Clean Link removes the tracking parameters from the current tab's URL, copies the clean link to your clipboard, and confirms with a small toast in the corner of the page.

```diff
- https://tardiglitch.com/?utm_source=instagram&utm_medium=social&fbclid=IwAR2abc123
+ https://tardiglitch.com/

- https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=shared
+ https://www.youtube.com/watch?v=dQw4w9WgXcQ

- https://www.redbubble.com/people/Assassimation/explore?page=1&sortOrder=recent&ref=artist_profile_share&ref_site=share
+ https://www.redbubble.com/people/Assassimation/explore?page=1&sortOrder=recent

- https://www.amazon.com/dp/B08XYZ1234/ref=sr_1_1?tag=mysite-20&pd_rd_r=xyz&th=1
+ https://www.amazon.com/dp/B08XYZ1234?th=1

- https://www.google.com/search?q=privacy+tools&client=firefox-b-d&sxsrf=abc&ei=xyz
+ https://www.google.com/search?q=privacy+tools
```

If the link is already clean, it is copied as it is and the toast says so.

## Install

**[Get Clean Link from the Chrome Web Store](https://chromewebstore.google.com/detail/clean-link/ajaeglecjpobpjcpbfbbifalilkdckne)**, then pin it from the puzzle-piece menu so it is one click away.

To run it from source instead:

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder that contains `manifest.json`.

## Privacy

Clean Link runs entirely on your computer.

- It makes no network requests and has no telemetry.
- It stores nothing: no `chrome.storage`, no `localStorage`.
- It loads no remote configuration and no third-party code.
- It has no build step and no minified files. What you read in this repository is exactly what runs.

It asks for three permissions and no access to your browsing history:

| Permission       | Why it is needed                                                   |
| ---------------- | ------------------------------------------------------------------ |
| `activeTab`      | Read the URL of the tab you are on, only when you click the icon.  |
| `scripting`      | Run the cleaner in that tab and show the toast.                    |
| `clipboardWrite` | Put the clean link on your clipboard.                              |

## What gets removed

Clean Link is deliberately conservative. A parameter is removed only when its sole job is tracking. Anything that might select content (`id`, `page`, `sort`, `variant`, and the like) is kept, and so is anything ambiguous. A leftover tracker is a small annoyance; a broken link is a failure.

Parameters that are kept are left exactly as the site wrote them.

<details>
<summary><strong>On every site</strong></summary>

<br>

Names are matched case-insensitively.

- **Campaign tags:** every `utm_*` parameter
- **Google Ads and Shopping:** `gclid`, `dclid`, `gbraid`, `wbraid`, `gad_source`, `gad_campaignid`, `srsltid`
- **Google Analytics:** `_gl`, `_ga`
- **Meta:** `fbclid`, `mibextid`
- **Instagram:** `igshid`, `igsh`
- **Microsoft Ads:** `msclkid`
- **TikTok Ads:** `ttclid`
- **Twitter / X:** `twclid`
- **Reddit Ads:** `rb_clickid`
- **Pinterest:** `epik`
- **Yandex:** `yclid`
- **Mailchimp:** `mc_cid`, `mc_eid`
- **HubSpot:** `_hsenc`, `_hsmi`, `__hsfp`, `__hssc`, `__hstc`, `hsCtaTracking`, and the `hsa_*` ad parameters (`hsa_acc`, `hsa_cam`, `hsa_grp`, `hsa_ad`, `hsa_src`, `hsa_tgt`, `hsa_kw`, `hsa_mt`, `hsa_net`, `hsa_ver`, `hsa_la`, `hsa_ol`)
- **MailerLite:** `ml_subscriber`, `ml_subscriber_hash`
- **Adobe:** `s_cid`, `adobe_mc_ref`, `adobe_mc_sdid`
- **Coremetrics:** `cm_cr`, `cm_me`
- **AT Internet / Mapp:** `xtor`, `wt_mc`
- **Internal campaign tags:** `itm_campaign`, `itm_content`, `itm_medium`, `itm_source`, `itm_term`
- **Triple Whale:** `tw_medium`, `tw_profile_id`, `tw_source`
- **Segmentify:** `_sgm_action`, `_sgm_campaign`, `_sgm_source`
- **Adjust:** `adjust_referrer`, `external_click_id`
- **AppsFlyer:** `af_ad`, `af_adset`, `af_click_lookback`, `af_xp`, `is_retargeting`
- **Affiliate networks:** `cjdata`, `cjevent` (Commission Junction), `tduid` (Tradedoubler), `vc_lpp` (ValueCommerce), `btag`, `bemobdata`, `pjclid` (Prisjakt)
- **Yahoo! JAPAN and LINE Ads:** `_ly_c`, `_ly_r`, `line_uid`, `yj_r`, `ldtag_cl`, `lt_r`, `srclt`
- **AD EBiS:** `ebisOther1` to `ebisOther5`
- **Mindbox:** `mindbox-click-id`
- **Openstat:** `_openstat`
- **Russian ad-labelling token:** `erid`
- **Generic campaign ID:** `cmpid`
- **Marketo:** `mkt_tok`
- **Kit (ConvertKit):** `ck_subscriber_id`
- **Vero:** `vero_id`, `vero_conv`
- **Omnisend:** `oly_anon_id`, `oly_enc_id`
- **Other ad and newsletter attribution:** `dm_cam`, `dm_grp`, `dm_ad`, `dm_kw`, `dm_net`, `wickedid`, `bl3nlclid`
- **Etrias:** every `etrias_*` parameter, plus `p` when it appears next to one
- **Empty values:** any `name=` with nothing after the `=`. A bare flag such as `?module` is kept.

</details>

<details>
<summary><strong>On specific sites</strong></summary>

<br>

- **YouTube** (including `m.`, `music.` and `youtu.be`): `si`, `feature`, `app`, `src_vid`, `pp`. The video, timestamp and playlist are kept.
- **Amazon:** the `/ref=…` path segment, `tag`, `linkCode`, `linkId`, `ref`, `ref_`, `psc`, `pd_rd_*`, `pf_rd_*`, `sr`, `qid`, `ie`, `_encoding`, `content-id`, `ats`, `ufe`, `xpid`. On product pages also `crid`, `dib`, `dib_tag`, `keywords`, `refinements`, `rnid`, `sprefix`. Variant selectors such as `th` are kept.
- **Google Search:** `client`, `sxsrf`, `ei`, `gs_lp`, `sca_esv`, `oq`, `sclient`, `sourceid`, `ved`, `uact`, `iflsig`, and `ebo` in the hash. The query and its filters are kept.
- **Google Maps:** `entry`, `g_ep`
- **AliExpress:** `spm`, `gps-id`, `scm`, `scm_id`, `scm-url`, `pvid`, `_t`, `tpp_buckets`, `pdp_ext_f`, `pdp_npi`, `utparam-url`, `algo_pvid`, `algo_exp_id`, `curPageLogUid`
- **Kickstarter** (project pages): `ref`, `category_id`
- **Humble Bundle:** every `hmb_*` parameter, `mcID`, `linkID`, `partner`
- **Redbubble:** `ref`, `ref_site`
- **AutoTrader.ca:** `search_id`. On listing pages also `sort`, `desc`, `position`, `source`, `source_otp`, `order_bucket`, `boost_level`, `applied_boost_level`, `relevance_adjustment`, `boosting_product`.

</details>

The rules live in [`clean-url.js`](clean-url.js), which is the source of truth.

## Limitations

- **Browser pages.** Chrome does not let extensions run on `chrome://` pages, the Web Store, or similar. Nothing is copied there, and the icon shows a `✗` badge for two seconds.
- **Local files.** `file://` pages are not cleaned.
- **Short links and redirect wrappers.** Links such as `bit.ly/…` or `l.facebook.com/l.php?u=…` are copied as they are. Resolving them would need a network request, which Clean Link never makes.
- **Trackers in the hash.** Tracking that sits after the `#` is mostly left alone. The one exception is `#ebo` on Google Search.

## Report a problem

Found a tracker that survives, or a cleaned link that opens the wrong page? [Open an issue](https://github.com/rbh135/CleanLink/issues/new/choose) with the original URL and what was copied.

Issues are public, so replace anything personal in the URL (session tokens, account IDs) with `XXXX` first. Keep the parameter names: they are what matter.

## Contributing

Most fixes are a single line in [`clean-url.js`](clean-url.js), a pure function with no browser APIs.

A parameter that is tracking on every site goes in `EXACT_PARAMS`. One that is only safe to remove on a particular site gets a rule in `SITE_RULES`:

```js
{
  // Which URLs the rule applies to.
  test: (url) => url.hostname === 'open.spotify.com',

  // Exact, case-sensitive parameter names to remove.
  params: ['si'],
}
```

For anything a list cannot express, such as cleaning the path, add an optional `clean(url)` function that edits the URL in place. Inside it, use `dropParams(url, [...])` rather than `url.searchParams.delete()`, which re-encodes every parameter it keeps.

Add a test for every rule, then run the suite. It needs only Node, with no dependencies:

```bash
node clean-url.test.js
```

## License

[MIT](LICENSE)
