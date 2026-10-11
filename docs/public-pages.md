# Public page routes

The public routes are `/[locale]/streetfood-i-norrbotten`, `/[locale]/bestall-takeaway`, and `/[locale]/catering`.

`next.config.ts` permanently redirects the old `polish-food-boden`, `burgers-boden`, `delivery-boden`, `takeaway-boden`, and `catering-boden` URLs to these pages. Locales and query parameters are preserved. Only canonical routes belong in links and `app/sitemap.ts`.

Existing CMS page names and text keys are intentionally retained so saved edits and their whitespace survive the URL changes. The takeaway page reads the `delivery-boden` namespace. Catering combines the original `catering` page with unique descriptions and FAQ from `catering-boden` in `catering/details.tsx`. These database namespaces do not define public URLs.

Swedish navigation uses `/meny`, `/om-oss`, `/bokning`, `/foodtruck`, `/catering`, `/kontakt`, `/faq`, and `/vagn`. `i18n/paths.ts` is the shared URL map for links, metadata, sitemap, language switching, and `next-intl` middleware. Internal App Router directories and CMS keys remain stable. Routes outside this map (including admin, checkout, and order pages) pass through unchanged. Old navigation URLs permanently redirect in `middleware.ts` before internal rewrites, preserving query parameters. Keep the navigation redirects here so they use the same URL map as the rewrites.

The takeaway hero's lunch-box button leads to `/sv/bokning`, and its contact button leads to `/sv/kontakt`. Streetfood's food-truck buttons lead to `/sv/foodtruck`; menu buttons lead to `/sv/meny`. Other languages retain their existing URLs except `/mikes` becomes `/foodtruck` and `/support` becomes `/faq` in every language.

Public copy describes pickup. Historical order fulfillment types and administrative delivery settings retain their actual meanings. A missing checkout setting does not enable delivery. Current food-truck addresses still come from the saved shift location.

The takeaway hero includes `TakeawayPhotoSlider` with four supplied meal photos in
`public/images/takeaway`. WebP copies preserve the full frame and remove metadata.
The fixed portrait frame contains each image without cropping, including the
landscape photo. Navigation supports buttons, arrow keys and pointer swipes; it
does not advance while visitors read the page. Existing CMS copy remains intact.

The homepage shows `OrderEntryModal` only when the server reports an open shift.
The two cards stay side by side on mobile. They link to the localized menu and
group-order form. Dismissal is remembered for the current shift in sessionStorage
(keyed by `openedAt`); blocked storage never prevents ordering. Group times come
from the existing availability endpoint, and exhausted slots lead to the existing
waitlist. The regular hours and pickup wording are editable translated copy.
