# AdFrame context

## Current app

- Production web app scaffold lives at `app-web/` (Next.js 16 App Router, TypeScript, Tailwind v4).
- Main routes:
  - `app/page.tsx` — landing/import screen with Samsung S90F URL prefilled.
  - `app/analysis/page.tsx` — verified/inferred fact review before canvas generation.
  - `app/editor/page.tsx` — tldraw editor shell with assets/copy panels, inspector, export modal, carousel split view, and style preset drawer.
- Top navigation (`app-web/components/AppChrome.tsx`) is now step-focused for hackathon: only `Import`, `Analysis`, and `Editor`; the previous `Open studio` CTA/tab is removed. `AppNav` uses `usePathname()` and `aria-current=\"page\"`; the active step gets the white pill background via `.nav-pill .active`.
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
  - `ff-canvas-bg` (full-frame dark canvas background; black + one accent radial glow)
  - `ff-glass-card`
  - `ff-glass-text`
  - `ff-cutout-image`
  - `ff-badge`
  - `ff-icon`
- Template composer: `app-web/lib/tldraw/templates.ts`.
- Canonical design system is root `DESIGN.md` — **Apple-Inspired Tile-Based Infographic System (DARK)**. This replaced the earlier light direction. `style.md` is now an implementation-mapping companion to `DESIGN.md` (tone→tldraw table, layout/type/asset rules); when they disagree, `DESIGN.md` wins. The old root `DESIGN.md` (vendored "liquid-glass-agency" open-design skill) was overwritten with the new spec.
- Design posture (DESIGN.md): pure-black export canvas, dark glass tiles (`#111` + subtle white gradient), high-contrast **white** type, product-first hero cutout with one accent glow, accent used ≤2–3× per canvas, 12-col grid (72px margin), tile radius 40px. Tokens live in `app-web/app/globals.css` as `--ig-*` vars.
- Position presets now exist in `app-web/lib/presets.ts`: `cinema-mosaic` preserves the current dark AdFrame story layout, while `apple-infographic` creates a light Apple Watch-reference-style rounded tile board with sparse orange accent, short feature/spec labels, and a true centered hero image. The editor has a `Position preset` selector in `app-web/app/editor/page.tsx`; changing it recomposes the main canvas through `composeMainCanvasTemplate(product, exportPreset, positionPreset)`.
- Apple infographic preset implementation lives in `app-web/lib/tldraw/templates.ts` as `composeAppleInfographicTemplate()`. It uses a light `ff-canvas-bg` variant, `paper`/`orange` card tones, center-positioned hero (`heroX = (frameWidth - heroW) / 2`), and surrounding image/text/spec tiles. Asset organization uses metadata scoring helpers (`describeAsset`, `scoreAssetForSlot`, `pickHeroAsset`, `pickAssetForSlot`) over current `asset.name`/`asset.alt`/`kind`, structured so generated captions/tags can be added later without rewriting placement.
- Main canvas polish: the old `Verified PDP facts` badge was removed from generated canvases. `composeMainCanvasTemplate()` accepts `{ showPrice }`, and the editor exposes a `Show price` checkbox that recomposes the current position preset with price/model tiles included or omitted. Assets/Copy side-panel titles now show live counts (`Assets (n)`, `Copy (n)`).
- Default editor composition: `composeAppleCleanTemplate` inserts `ff-canvas-bg` as the **first child** of the export frame, then a hero cutout + ambient section panel + headline/subtitle + optional price/model badge + a 3-tile feature mosaic (section visual crop above each editable dark-glass feature card). Hero/gallery → product cutout (`contain`), `kind: "section"` crops → feature image tiles (`cover`), video assets excluded from static placement.
- `ff-cutout-image` supports both `contain` and `cover`; cover mode clips with rounded corners so section crops behave like PDP feature tiles rather than transparent cutouts.
- `ff-glass-card` tones: dark tones `tile`, `ink`, `frost`, `clear`, `accent`; Apple infographic light tones `paper` and `orange`. Titles use `currentColor` so light tiles can render dark text while dark tiles render white text. Body copy uses a muted mix of current color. `ff-glass-text` renders white display text; implementation-only `cutout` badges are not shown in export artwork.
- Editor asset behavior: source image assets can be dragged from the left panel onto the tldraw stage and are placed at the drop point via `editor.screenToPage`; clicking an asset remains an explicit copy-to-canvas action. Drag payloads are cleared to AdFrame's custom MIME type, thumbnail `<img>` nodes are `draggable={false}`, and stage drop handlers run in capture phase with `stopPropagation()` so tldraw/browser default URL drops do not create caption/link cards. Existing canvas image shapes also set their internal `<img>` to `draggable={false}` and prevent native `dragstart`, so dragging a placed asset moves the tldraw shape instead of copying/dropping its image URL. Newly created asset/feature shapes are immediately selected so the inspector reflects them.
- Editor toolbar now exposes explicit icon buttons for `Undo` (`editor.undo()`) and `Redo` (`editor.redo()`), both with `aria-label`s; the interaction regression test asserts both hooks.
- Carousel Split was reimplemented from a preview modal into an editable multi-frame flow, but is hidden for hackathon focus behind `ENABLE_CAROUSEL_FEATURES = false` in `app-web/app/editor/page.tsx`. Keep the code so it can be revived later by flipping that flag. Hidden implementation: `composeCarouselSplitTemplate()` in `app-web/lib/tldraw/templates.ts` generates 3–5 real tldraw carousel frames (`carousel-slide-frame-*`, 1080x1350 feed format) placed beside the master frame; each slide has `ff-canvas-bg`, slide badge, editable headline text, editable image, editable copy card, and footer badge. When enabled, ZIP export prefers existing editable carousel frames via `downloadCarouselFramesZip()`; the old product-derived canvas renderer remains a fallback when no carousel frames exist. Current hackathon UI shows only main-canvas controls/exports (PNG/JPG/PDF), no Carousel Split button or Carousel ZIP button.
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
