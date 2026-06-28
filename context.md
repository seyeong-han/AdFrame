# AdFrame context

## Current app

- Production web app scaffold lives at `app-web/` (Next.js 16 App Router, TypeScript, Tailwind v4).
- Main routes:
  - `app/page.tsx` — landing/import screen with Samsung S90F URL prefilled.
  - `app/analysis/page.tsx` — verified/inferred fact review before canvas generation.
  - `app/editor/page.tsx` — tldraw editor shell with assets/copy panels, inspector, export modal, carousel split view, and style preset drawer.
- API routes:
  - `app/api/extract/route.ts` — Playwright scrape first, cached fixture fallback, optional OpenAI copy normalization if `OPENAI_API_KEY` exists.
  - `app/api/generate-image/route.ts` — `gpt-image-1` when `OPENAI_API_KEY` exists, local SVG placeholder fallback otherwise.
  - `app/api/remove-background/route.ts` — server-only remove.bg integration. Reads API key from `REMOVE_BG_API_KEY`, `REMOVEBG_API_KEY`, `REMOVEBG_KEY`, or `REMOVE_BG_KEY`; also checks parent `../.env` because the user keeps `REMOVEBG_KEY` at `startup/fridgeframe/.env`.
  - `app/api/extract/route.ts` also extracts product-page design signals (computed fonts, colors, radii, CTA styles) and writes `app-web/generated/design.md` plus `app-web/generated/tokens.source.json`.
  - `app/api/extract/route.ts` filters Samsung PDP images to S90F product/gallery URLs and caches remove.bg outputs under `app-web/public/generated/removebg/samsung-s90f/`.
- `app/api/extract/route.ts` now also extracts Samsung feature section components before trying background removal: DOM image URLs for Processor/Upscaling/HDR/Motion are cached under `app-web/public/generated/sections/samsung-s90f/`, and `section-components.json` records the DOM/OCR-style label inference plus editable recreation metadata.

## Data and assets

- Cached Samsung demo fixture: `app-web/fixtures/samsung-s90f.json`.
- Cached Samsung fixture assets now point to real remove.bg outputs (`/generated/removebg/samsung-s90f/asset-1.png` through `asset-4.png`) rather than the earlier SVG mockups.
- Section component assets are included in Source Images as `kind: "section"` visual-only crops: `/generated/sections/samsung-s90f/01-section-processor-visual.jpg` through `04-section-motion-visual.jpg`. Full source cards are preserved as `*-full.jpg`, while `section-components.json` records `captionRemoved: true`, `sourceFullCardSrc`, and editable text recreation metadata.
- Samsung PDP video extraction scrolls the page to trigger lazy-loaded `<video>/<source>` nodes, scans DOM attributes and HTML for MP4 URLs, caches the first six MP4s under `app-web/public/generated/videos/samsung-s90f/`, and adds them to Source Assets as `kind: "video"` / `mediaType: "video"`. Analysis/Editor preview them with `<video>`; canvas placement remains image-only for now.
- Stable local demo cutouts: `app-web/public/fixtures/samsung-s90f/*.svg`.
- Shared product/export types: `app-web/lib/types.ts`.
- Client state handoff between import, analysis, and editor uses `localStorage` via `app-web/lib/client-store.ts`. SSR/client hydration must use `useExtractionSnapshot()` rather than calling `readExtraction()` in a `useState` initializer; otherwise server fixture HTML can mismatch client live extraction HTML.
- Product extraction can include `designSystem` metadata (`ProductDesignSystem` in `app-web/lib/types.ts`), based on Open Design's portable `design.md` pattern.

## Editor architecture

- Real tldraw is used with custom shape utils in `app-web/lib/tldraw/shapes/fridgeframe-shapes.tsx`.
- Template shapes are parented to the social frame in `app-web/lib/tldraw/templates.ts`; keep this invariant or frame export can omit canvas contents.
- Custom shape types:
  - `ff-glass-card`
  - `ff-glass-text`
  - `ff-cutout-image`
  - `ff-badge`
  - `ff-icon`
- Template composer: `app-web/lib/tldraw/templates.ts`.
- Default editor composition now uses the reusable Apple-style rules in root `style.md`: light canvas, dark readable type, rounded gray/accent tiles, no blank cards, and a role-based "hero + feature mosaic" layout. Hero/gallery assets are used for the central product cutout, `kind: "section"` visual crops are matched to feature cards and placed as cover-fit visual strips, an ambient section panel fills the upper right, and video assets are intentionally excluded from static canvas placement.
- `ff-cutout-image` supports both `contain` and `cover`; cover mode clips with rounded corners so section crops behave like PDP feature tiles rather than transparent cutouts.
- `ff-glass-card` now has light-readable `tile` and `accent` tones; default template feature cards should use those tones on white export frames. `ff-glass-text` renders dark bold display text, and implementation-only `cutout` badges are not shown in export artwork.
- Editor asset behavior: source image assets can be dragged from the left panel onto the tldraw stage and are placed at the drop point via `editor.screenToPage`; clicking an asset remains an explicit copy-to-canvas action. Drag payloads are cleared to AdFrame's custom MIME type, thumbnail `<img>` nodes are `draggable={false}`, and stage drop handlers run in capture phase with `stopPropagation()` so tldraw/browser default URL drops do not create caption/link cards. Existing canvas image shapes also set their internal `<img>` to `draggable={false}` and prevent native `dragstart`, so dragging a placed asset moves the tldraw shape instead of copying/dropping its image URL. Newly created asset/feature shapes are immediately selected so the inspector reflects them.
- Editor canvas sizing: the glass `.editor-stage` is shaped to the active export aspect ratio via `--stage-ratio` (inline from `preset.ratio`, e.g. `4 / 5`) with `aspect-ratio` + fixed height + `width: auto` + centered, so the frame fills the stage (no empty black box) and the stage stays compact. The middle editor `<section>` is centered with `maxWidth: 560` and the title uses `text-2xl`, so the "Glass canvas" header panel shrinks together with the canvas. The old `COMPACT_CANVAS_ZOOM` camera hack was removed in favor of this; `zoomToFit()` now fills the aspect-shaped stage directly.
- Manual feature placement uses the same `tile`/`accent` tones as the default style. Inspector tone options include `tile` and `accent`, and selected layers can be duplicated, brought to front, or sent to back.
- In-browser local background removal helper: `app-web/lib/segmentation.ts` using `@imgly/background-removal`.
- Editor background removal now calls server `/api/remove-background` first (remove.bg), then falls back to local `@imgly/background-removal` if remove.bg is unavailable or the source is unsupported.
- Source Images in Analysis/Editor are populated with real background-removed Samsung TV assets after extraction; repeated extraction reuses cached files instead of spending remove.bg credits again.
- Export helper: `app-web/lib/export.ts` using `editor.toImage`, `jspdf`, and `jszip`.
- Carousel ZIP export renders one PNG per feature slide via an offscreen canvas (`downloadCarouselSlidesZip`) rather than re-exporting the master frame.
- `/editor` requires the analysis approval flag in `localStorage`; direct editor navigation redirects to `/analysis`.

## Design notes

- `DESIGN.md` liquid-glass tokens and `.liquid-glass` / `.liquid-glass-strong` recipes are ported into `app-web/app/globals.css`.
- Source PDP design tokens are injected into the editor as `--brand-*` CSS variables, so generated cards preserve the scraped page's font stack, accent color, and radius language while keeping AdFrame liquid-glass editability.
- Next config pins `turbopack.root` to `app-web/` because the Obsidian vault root also has a lockfile.

## Verification

- As of 2026-06-28, `npm run lint` and `npm run build` pass in `app-web/`.
- `npm run build` may show a Turbopack NFT trace warning because `lib/server-env.ts` intentionally checks parent `../.env`; build still succeeds.
- Browser smoke tested local flow: landing → extract → analysis → approve → editor, plus export modal, carousel split view, and style preset drawer.
- Design extraction smoke tested via `/api/extract`: response includes `designSystem`, and `generated/design.md` / `generated/tokens.source.json` are written.
- Hydration regression loop: seed `adframe:last-extraction` in localStorage, open `/analysis`, and assert no console/page error matching `Hydration failed`; as of 2026-06-28 this passes and the first mode chip becomes `live` after hydration.
- Section crop regression: `npm run test:section-crops` calls `/api/extract` and verifies section asset bottom strips are no longer bright caption bands.
- Video extraction regression: `npm run test:video-extraction` calls `/api/extract` and verifies the Samsung hidden-details MP4 is cached at `/generated/videos/samsung-s90f/04-us-feature-catch-hidden-details-in-dark-scenes-545617641.mp4`.
- Template composition regression: `npm run test:template-composition` asserts the canvas template includes at least three section visual image shapes, has no empty feature cards, uses light-readable tile/accent tones, keeps video assets out of static image shapes, and parents every export shape to the frame.
- Editor interaction regression: `npm run test:editor-interactions` statically asserts drag-to-place hooks, `screenToPage` placement, immediate selection, extended tone options, and basic layer controls.
