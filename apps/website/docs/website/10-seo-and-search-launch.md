# SEO and search launch

## Scope

Improve the existing homepage and public company pages without adding feature pages or changing the visual direction. Homepage explanations and native HTML FAQs cover Indian builders/contractors, mobile and web, labour attendance, wages, already-paid Kharchi advances, expenses, materials, progress and sales. Important answers are in server-rendered HTML rather than only in animations or screenshots.

Public pages have distinct titles/descriptions, canonical URLs and Open Graph/Twitter previews. The homepage includes Organization, WebSite and SoftwareApplication JSON-LD matching the visible product information. No prices, reviews, testimonials, unsupported platforms or FAQ rich-result promises are invented. A deterministic 1200 × 630 sharing image uses the existing brand logo (`node scripts/generate-social-image.cjs` regenerates it).

## Staging and live configuration

Metadata and structured data identify the permanent domain `https://nirmansite.com`. Staging does not need a Google account and must not be submitted for indexing.

Indexing is **off by default**. All routes receive `X-Robots-Tag: noindex, follow` while it is off, and inherited HTML metadata also specifies noindex. Crawling public HTML remains allowed so search crawlers can actually read noindex. Do not combine staging noindex with a blanket robots disallow that prevents crawlers reading it. Access protection is still appropriate for confidential previews.

Enable indexing only at live launch with all of:

- `SITE_INDEXING_ENABLED=true`
- `NEXT_PUBLIC_SITE_URL=https://nirmansite.com`
- A production build (`NODE_ENV=production`). On Vercel, `VERCEL_ENV=production` is also required. Preview/development builds remain excluded even if the other values are copied.

Redeploy after changing these values: metadata routes and Next.js headers are built/cached. Keep `SITE_INDEXING_ENABLED=false` on the current staging deployment, including staging that Vercel labels "production". Setting it true with the old Vercel SITE_URL still leaves indexing disabled.

When disabled, the sitemap is empty and robots.txt does not advertise it. When enabled, it lists only `/`, `/about`, and `/contact`, with live-domain URLs. `/activate` and `/hero-preview` retain their own noindex metadata; privacy/terms remain noindex review drafts. No invented last-modified dates are published.

At live launch, robots rules permit public marketing content crawling by Googlebot, Bingbot and OAI-SearchBot, while `/api/` is excluded. OAI-SearchBot also excludes activation, preview and draft legal pages at live launch and is fully blocked on staging; Google/Bing can read the HTML noindex controls. Hosting/CDN protections must also permit legitimate search crawlers on the live site. Allowing a crawler establishes eligibility, not indexing, ranking or AI-citation guarantees. There is no special AI schema or required llms.txt file for Google AI search.

## Live launch checklist (later)

1. Connect the domain and verify HTTPS, then enable the live configuration and redeploy.
2. Check the live homepage, about and contact metadata: correct canonicals, no staging noindex header, and accessible sharing image. Check activation/preview/legal pages remain noindex.
3. Redirect alternative public domains and www consistently to the chosen domain. Preserve invitation paths/query parameters when configuring redirects. Do not change domain routing as part of this staging PR.
4. Create/verify the Search Console Domain property through DNS; submit `https://nirmansite.com/sitemap.xml` and inspect representative URLs.
5. Verify Bing Webmaster Tools and submit the sitemap there too. Use its available AI Performance reports to monitor citation visibility separately from website clicks.
6. Configure GA4 consent/privacy settings and confirmed enquiry measurement. The initial SEO change installed no analytics tags; the later Google tag integration is described below.
7. Review relevant non-branded queries and qualified enquiries; add deeper pages only when customer questions or search demand justify them.

## Verification

Local implementation verification completed:

- Type checking and production builds passed.
- Rendered HTTP checks passed in staging and simulated live configurations: canonical/social metadata, server-rendered feature text and FAQs, parsed JSON-LD, page exclusions, response headers, robots and sitemap.
- Indexing guard checks cover missing/disabled flags, development/preview environments, a staging URL, a lookalike domain, an invalid URL and a non-root path.
- Headless Chrome checks at 1440px and 390px passed: no horizontal overflow, one homepage h1, all 10 FAQ items, native accordion interaction and no page runtime errors. Screenshots of revised materials/progress and FAQ sections were visually reviewed.
- Existing activation contract checks passed. No contact emails, real activation submissions, analytics events or production domain changes were made during verification.

These are local checks; deployed staging is verified separately after the PR merge. Search indexing, rankings and AI citations require the subsequent live launch and external crawler processing.

Run `npm run typecheck`, `npm run build`, and `node scripts/verify-seo.cjs` against the running build. The verification script checks rendered HTML, valid JSON-LD, unique page metadata, social image dimensions, staging/live sitemap behavior and excluded pages without sending enquiries or activation requests.

For a local live-mode check, set the three production variables above for the build and server, then run `SEO_EXPECT_INDEXING=true node scripts/verify-seo.cjs`. Use a different local port if needed via `SEO_BASE_URL`. Restore staging configuration and rebuild before publishing the staging artifact. No live domain changes or Search Console/GA4 setup are included in this PR.

## Google tag follow-up

The supplied GA4 tag (`G-W2LK4EB9N1`) is loaded once with Next.js `Script` using `afterInteractive` in the marketing layout. It uses the existing live-launch gate, so preview/development builds remain untracked. Direct `/activate` visits are outside this layout and do not load the tag. No custom enquiry/key-event tracking or consent banner is introduced by this script addition. The privacy draft now discloses Google Analytics usage. Google account reporting and key-event configuration remain separate from installing the tag.

## Official references

- [Google AI features and websites](https://developers.google.com/search/docs/appearance/ai-features): normal search eligibility, textual content, internal links and matching structured data remain the foundation.
- [Google indexing controls](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share): robots.txt does not replace noindex or access protection.
- [Google FAQ rich-result limits](https://developers.google.com/search/blog/2023/08/howto-faq-changes): FAQ rich results are restricted to authoritative government/health websites.
- [OpenAI search crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot controls search access separately from GPTBot training access.
- [Bing webmaster guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a): discoverability, clear content and genuine external references support search and grounding eligibility.
