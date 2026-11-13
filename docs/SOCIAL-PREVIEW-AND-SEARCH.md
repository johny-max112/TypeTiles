# Type Tiles: Messenger preview and Google discovery

Prepared 13 November 2026. Production domain used in this setup: `https://playtypetiles.com/`.

## Implemented locally

- `index.html` has a descriptive title, search description, canonical home URL, Open Graph metadata, image dimensions/alt text, Twitter large-image metadata and WebSite structured data.
- The share artwork is `public/social/type-tiles-preview.png` (1200 × 630). It uses the existing Type Tiles logo, brand colours, falling-word artwork and the public domain. It is a code-rendered image, without an image generation API.
- `scripts/generate-social-preview.mjs` regenerates the artwork with an already installed Chrome/Edge. It writes the editable HTML design under `output/social-preview/`. Set `SOCIAL_PREVIEW_BROWSER` to an existing browser executable if the default Windows locations are unavailable. No new npm dependency is needed.
- Static descriptive content is present inside the initial HTML app element, so clients that do not execute JavaScript can understand the game. React replaces this fallback when it starts; it is not a second game engine or a way to bypass login.
- `src/pages/Welcome.tsx` contains a semantic brand heading and visible descriptions of the typing game and supported activities. Onboarding navigation remains the same.
- `public/robots.txt` allows public crawling and discourages crawling application/development/Admin paths. Robots instructions do not provide authorization or guarantee that a URL is excluded from search; existing backend access controls remain responsible for private records.
- `public/sitemap.xml` lists the public home URL only. Authenticated classroom/results routes are not sitemap entries.

All social metadata is in the initial HTML head. This matters because a social crawler may not execute the React application. The favicon is independent of the large share image.

## 1. Publish the frontend changes

Use the project's normal reviewed release process. Nothing was committed, pushed or deployed by this implementation task.

Build from the project root:

```sh
npm run build
```

If using the existing Cloudflare Git-connected build, publish the reviewed changes and confirm its new build/deployment succeeds. If using the established local Wrangler release workflow, deploy the new `dist` through that workflow after review. An old uploaded `dist` will still contain old tags.

Check these public URLs after the deployment completes:

- Home: `https://playtypetiles.com/`
- Share image: `https://playtypetiles.com/social/type-tiles-preview.png`
- Sitemap: `https://playtypetiles.com/sitemap.xml`
- Robots file: `https://playtypetiles.com/robots.txt`

The image must load publicly without logging in, return PNG data rather than the SPA fallback HTML, and be reachable by crawlers. View Page Source on the deployed home page and confirm the `og:` tags are present before JavaScript runs. If hosting access controls or bot challenges block the page/image, review those settings separately; do not assume a successful local build establishes public crawler access.

## 2. Refresh the Facebook/Messenger preview

1. Open [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) and sign in if requested.
2. Enter `https://playtypetiles.com/`.
3. Select **Debug**, then **Scrape Again** if the previous result is cached.
4. Confirm the detected image URL, title and description match the new metadata.
5. Share the home URL in a new Messenger message. Existing messages may keep their previously generated preview.

Meta controls the final card layout, cropping and whether a particular message displays a preview. These tags and artwork supply the card content; they cannot force Messenger's UI to show an identical design in every context. If it is missing, check public page/image access and the debugger's crawler errors before changing the image.

If replacing the artwork in a later release, consider a new filename such as `type-tiles-preview-v2.png` and update all image references together to avoid stale image caching. Do not apply unrelated URL parameters to the canonical home URL merely to alter search identity.

The official debugger/documentation returned a rate-limit response to the automated research browser during this task. No live Meta scraping or Messenger preview was verified by this implementation. Use your browser and the deployed URL for that final check.

## 3. Register the domain in Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console/welcome).
2. Add a **Domain** property for `playtypetiles.com`.
3. Copy the DNS TXT verification record Google gives you. It is an ownership-verification record, not a Resend API key or database credential.
4. In Cloudflare, open **playtypetiles.com → DNS → Records → Add record**.
5. Choose **TXT**, use the root domain (`@`) for the record name, and paste the exact Google-provided TXT content. Keep the existing website and Resend DNS records.
6. Save the DNS record, return to Search Console and select **Verify**. DNS propagation can delay verification.

Do not add a fake verification token to the frontend. Domain verification uses the actual value issued for your Google account. No Search Console property or DNS records were created during this task.

## 4. Submit the sitemap and home page

1. In the verified Search Console property, open **Sitemaps**.
2. Submit `https://playtypetiles.com/sitemap.xml` (or `sitemap.xml` if the form already supplies the site prefix).
3. Use **URL Inspection** for `https://playtypetiles.com/`.
4. Run the live URL check and review any crawling/indexing errors.
5. If the page is eligible and the option is available, select **Request indexing**.
6. Monitor the Page Indexing and Performance reports over time.

Google decides crawling, indexing, canonical selection, snippets and rankings. Search Console submission and metadata do not guarantee indexing, immediate results, or a first-page position for a broad query such as “typing game.” Start by monitoring brand searches such as “Type Tiles” and “playtypetiles,” then actual search impressions for relevant queries. Repeated indexing requests do not make crawling faster.

The home route currently keeps the application's loading-to-Welcome navigation. Google may render that JavaScript transition and select `/welcome` as its preferred URL. Review the selected canonical in Search Console after deployment; a future single public landing route or prerendering can make that flow simpler if indexing reports show a problem. This change does not introduce full server-side rendering or searchable private game records.

## 5. Improve search value beyond metadata

Keep the public page descriptions accurate and useful. Future public pages can explain how the game works, WPM/accuracy rules, teacher-hosted classrooms and verified Gregg content. Add real instructional content only when it exists, link to it from public navigation and include its canonical URL in the sitemap. Keep the mobile experience, loading performance and public links healthy. Do not add fake reviews, invented ratings, invisible keyword lists or unsupported promises of learning improvement.

The existing build has a large JavaScript chunk and large avatar assets; this task does not redesign bundling or compress unrelated artwork. Those are separate performance improvements if search/device measurements identify them as bottlenecks.

## Relevant official references

- [Open Graph protocol](https://ogp.me/): metadata properties and image dimensions/alt text.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/): inspect and refresh public share metadata.
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): meaningful public content, titles and search expectations.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical public URLs and sitemap submission.
- [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl): URL Inspection, delays and indexing limits.

## Scope

No backend APIs, database records, authentication rules, scoring, classroom capacity, Gregg mappings or manuscript content were changed. Public onboarding copy and HTML metadata were updated; the artwork uses existing branding. Public production delivery, actual Messenger rendering and Google indexing require verification after the frontend is deployed.
