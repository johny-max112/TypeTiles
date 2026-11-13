# Public Wanderpets team profile

The approved public names and roles are shown at `/about/` (static `public/about/index.html`) and Settings ? About (from `src/data/developmentTeam.ts`). Keep these two representations in sync when profiles change. The public page intentionally works without JavaScript or authentication. Welcome and the initial home HTML link to it using full-page anchors.

The page includes AboutPage, Organization and five Person JSON-LD entries, matching visible profiles. No private contact details, invented social accounts or professional certifications are included. The home WebSite identifies Wanderpets as creator. The sitemap includes the public team page; protected app pages remain excluded.

After a reviewed frontend deployment, verify `/about/` directly and on refresh, check its source and mobile layout, and inspect `https://playtypetiles.com/about/` in Google Search Console. Request indexing once and let Google recrawl the sitemap. Structured data does not guarantee a search appearance, ranking or knowledge panel: https://developers.google.com/search/docs/appearance/structured-data/sd-policies

Rollback: revert this feature's home metadata/link, Welcome link, Settings profiles, public team page, shared team data and sitemap entry, then rebuild and redeploy the frontend. No backend or database changes are involved.
