# Inline site copy editing

## Architecture

Public pages reuse `EditableText`. `EditableMessage` connects visible translated
copy to the existing `site_content` table (`copy.<dictionary.path>`, page
`translations`). Plain translation calls remain strings for attributes, form
values and server requests. Existing CMS keys remain compatible.

`EditableCopy` covers static page copy and existing category keys. Menu products,
modifier choices, customer data, totals and payment state retain their own data
models and admin editors; this editor never changes these values.

The locale layout shares content and owner/admin access within a request. Saved
translations are validated against the original dictionary before rendering.
Missing/unavailable overrides fall back to checked-in copy. Footer content is
now loaded for the selected locale instead of mixing all languages.

## Critical fixes and security

The pencil is a real button rendered through a portal outside surrounding links,
labels and buttons. The editor is a separate native modal dialog. Click, pointer
and keyboard events are isolated because React portal events still bubble along
the component tree. Textarea interaction and Save/Cancel cannot navigate, toggle
an ingredient, add an item or submit checkout. Focus returns to the pencil.

Writes still require owner/admin on the server. The route additionally validates
same-origin JSON, input types, supported locale, key paths, size, existing
translation leaves and ICU parameters. Errors do not reveal database details.
The existing ICU parser is explicitly declared as a direct dependency.

## Reliability and maintainability

Saves have a timeout, show a localized error while keeping the draft, and always
leave the saving state on failure. Escape cancels without saving. Existing keys
and translated messages use one editor; changes synchronize between repeated
labels. Header/footer share the request-scoped content and authorization reads.
No database migration or production content rewrite is needed.

Visible copy preserves manually entered line breaks, blank lines and spaces.
The saved string remains unchanged, and the public text uses `white-space:
pre-wrap`; checkout option copy is not truncated to one or two lines.

## Customer homepage changes

The hero has one larger order button. The secondary cart link is removed from
that section. Category cards show only image and name; the repeated
"Utforska menyn" caption is removed in every locale. Poster images use contain
sizing in a portrait frame at desktop and mobile breakpoints, so source photos
remain complete. Images retain their intrinsic proportions; the corner radius
applies to the image itself, including photos that do not fill the frame.

## Verification

- PASS: baseline 48 tests, typecheck, lint and isolated production build.
- PASS: `npm test` — 53 tests, including copy input validation, immutable merging,
  safe key handling, preservation of whitespace and ICU variables/types/nesting.
- PASS: `npm run typecheck`, `npm run typecheck:swish`.
- PASS: `npm run lint` — 0 errors, 3 pre-existing warnings.
- PASS: Prettier check of the shared editor, content modules, endpoint and tests.
- PASS: isolated `npm run build` (initial disk-space failure resolved by deleting
  only agent-owned temporary build caches).
- PASS: isolated HTTP tests for guest/cook denial, origin, payload limits, locale,
  invalid keys, ICU validation, persistence, language isolation and old CMS keys.
- PASS: browser editing on a product button, checkout submit button, checkbox
  label and navigation link; click/type/save/cancel do not invoke parent actions.
  Reload retained saved copy; cart/selection stayed intact; nested buttons = 0.
- PASS: UI rejected deletion of dynamic template parameters and retained draft.
- PASS: multiline copy saved and survived a browser reload with indentation and
  blank lines intact; computed public style is `white-space: pre-wrap`.
- PASS: 390px homepage breakpoint, no horizontal overflow, mobile pencil works;
  hero has exactly one order link and `object-fit: contain`.

## Remaining debt and risks

The three lint warnings predate this change. Locale copy is edited independently;
there is no automatic translation or text revision history. Simultaneous writes
to one key use the existing last-write-wins contract. Actual payment and email
provider transactions are not exercised by these checks. Production business
settings and group Swish availability are not changed by this release.
