# DESIGN.md — Apple-Inspired Tile-Based Infographic System

## 1. Design Intent

Create a premium, Apple-inspired tile-based infographic system for generating vertical product infographics, especially for Instagram Story, feed, and post formats.

The system should feel close to Apple’s product infographic language:

- Deep black or near-black presentation canvas
- Large rounded tiles arranged in a precise modular grid
- High-contrast white typography
- Product imagery treated as the visual hero
- Minimal copy, strong hierarchy, and generous breathing room
- Soft gradients, glassy highlights, and dimensional product cutouts
- Editorial polish without decorative clutter

This design system must be original and must not reproduce Apple trademarks, logos, proprietary layouts, or exact marketing copy. It should capture the visual qualities of Apple-style product storytelling while remaining brand-neutral and adaptable.

---

## 2. Primary Use Case

The product is an infographic generator.

Primary flow:

1. User enters a product URL.
2. The system extracts product information:
   - Product name
   - Main image
   - Feature list
   - Pricing or key specs, when available
   - Supporting imagery
3. The generator creates an Apple-style vertical infographic.
4. Every tile remains editable:
   - Text can be rewritten
   - Images can be replaced or cropped
   - Tiles can be reordered
   - Feature blocks can be added, removed, or resized
5. User exports the result for social formats.

Primary output format:

- Instagram Story / vertical infographic

Secondary formats may include:

- Instagram feed square
- Instagram portrait post
- Web preview
- Downloadable image/PDF export

---

## 3. Visual Principles

### 3.1 Premium Minimalism

The design should look expensive because it is restrained.

Use:

- Few colors
- Large type
- Large images
- Simple geometry
- Precise spacing
- Strong contrast

Avoid:

- Busy backgrounds
- Excessive icons
- Generic colorful gradients
- Emoji decorations
- Dense dashboard-style UI
- Random card colors
- Filler statistics

---

### 3.2 Tiles as the Core Language

The infographic is built from modular tiles.

Tiles should feel like a premium product layout system, not generic cards.

Each tile should have:

- A clear purpose
- A strong content hierarchy
- Generous internal padding
- Rounded corners
- High contrast
- Optional product image or gradient treatment
- Editable text and media regions

The tile grid should create a sense of rhythm: large hero tiles, supporting feature tiles, compact spec tiles, and image-led accent tiles.

---

### 3.3 Product First

Product imagery should carry the design.

The system should prioritize:

- Product cutouts
- Large hero renders
- Cropped product close-ups
- Floating image compositions
- Subtle shadows and glows
- Background gradients that support the product image

Do not over-design around weak content. If no image is available, use a labeled image placeholder rather than inventing fake visuals.

---

### 3.4 One Strong Story Per Infographic

Each infographic should communicate one clear product story.

Examples:

- “Why this product is different”
- “The 5 features that matter”
- “A launch announcement”
- “A visual spec sheet”
- “A before/after product comparison”
- “A premium product overview”

Avoid combining too many story types in one canvas.

---

## 4. Color System

### 4.1 Base Tokens

Use a dark, high-contrast Apple-inspired visual system.

```css
:root {
  --color-bg: #000000;
  --color-surface: #0a0a0a;
  --color-surface-elevated: #111111;
  --color-surface-soft: #171717;

  --color-fg: #ffffff;
  --color-muted: #a3a3a3;
  --color-subtle: #737373;
  --color-border: #242424;

  --color-accent-blue: #1677ff;
  --color-accent-cyan: #5ac8fa;
  --color-accent-green: #30d158;
  --color-accent-orange: #ff9f0a;
  --color-accent-red: #ff453a;

  --color-glass-highlight: rgba(255, 255, 255, 0.18);
  --color-glass-border: rgba(255, 255, 255, 0.12);
  --color-shadow-deep: rgba(0, 0, 0, 0.55);
}
```

---

### 4.2 Color Usage Rules

#### Background

Default background should be pure black or near-black.

Use:

- `#000000` for main export canvas
- `#0a0a0a` for large dark tiles
- `#111111` for elevated tile surfaces

Avoid:

- Beige, peach, cream, or warm AI-style canvas colors
- Full-page rainbow gradients
- Light app-style backgrounds for the final infographic output

---

#### Accent Color

Accent color must be used sparingly.

Use accent color for:

- One primary callout
- One key metric
- A small badge
- A product glow
- A subtle gradient stop

Do not use accent color on every tile.

Recommended default accent:

```css
--accent-primary: #1677ff;
```

Accent should appear no more than 2–3 times per infographic.

---

#### Gradients

Gradients should be subtle, premium, and product-supporting.

Allowed examples:

```css
--gradient-blue-glow:
  radial-gradient(circle at 50% 20%, rgba(22, 119, 255, 0.42), transparent 42%);

--gradient-cyan-glow:
  radial-gradient(circle at 70% 20%, rgba(90, 200, 250, 0.35), transparent 45%);

--gradient-dark-glass:
  linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
```

Do not apply gradients to every tile. Use one major glow moment per canvas.

---

## 5. Typography

### 5.1 Font Stack

Use Apple-adjacent system typography.

```css
:root {
  --font-display:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "Helvetica Neue",
    Arial,
    sans-serif;

  --font-body:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    "Helvetica Neue",
    Arial,
    sans-serif;

  --font-mono:
    "SF Mono",
    ui-monospace,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}
```

If custom web fonts are unavailable, system fonts are preferred.

---

### 5.2 Type Scale

For a vertical Instagram Story canvas, use the following scale.

```css
:root {
  --text-hero: clamp(56px, 8vw, 96px);
  --text-title: clamp(36px, 5.4vw, 64px);
  --text-section: clamp(28px, 4vw, 44px);
  --text-body: clamp(18px, 2.6vw, 28px);
  --text-caption: clamp(13px, 1.8vw, 18px);
  --text-micro: clamp(10px, 1.4vw, 13px);
}
```

---

### 5.3 Typography Rules

Hero headline:

- Large
- Short
- Confident
- Maximum 6–9 words
- Prefer 1–3 lines

Feature title:

- Direct and benefit-led
- Maximum 5 words when possible

Body text:

- Minimal
- No paragraphs longer than 2 lines
- Avoid generic filler

Captions:

- Use for specs, labels, source notes, or tile metadata

Numbers:

- Use tabular numerics

```css
.number,
.metric,
.spec-value {
  font-variant-numeric: tabular-nums;
}
```

---

### 5.4 Copy Tone

Use concise product marketing language.

Good:

- “Built for all-day editing”
- “4K capture, stabilized”
- “Designed for creators”
- “More detail in less light”
- “Fast setup. Clean export.”

Avoid:

- “Revolutionize your workflow”
- “Unlock productivity”
- “Next-gen solution”
- “10× faster” unless sourced
- “Feature One / Feature Two”

When data is missing, use honest placeholders:

- `—`
- `Add product feature`
- `Replace image`
- `Product detail unavailable`

---

## 6. Canvas Rules

### 6.1 Primary Canvas

Instagram Story vertical:

```css
:root {
  --canvas-width: 1080px;
  --canvas-height: 1920px;
  --canvas-ratio: 9 / 16;
}
```

The full export should be designed as a fixed vertical composition.

---

### 6.2 Safe Area

Use generous safe areas.

```css
:root {
  --safe-top: 96px;
  --safe-right: 72px;
  --safe-bottom: 96px;
  --safe-left: 72px;
}
```

Do not place critical text too close to the edges.

---

### 6.3 Responsive Preview

The editor should scale the canvas visually while preserving the 1080×1920 design coordinate system.

Preview behavior:

- Canvas keeps 9:16 ratio
- Tiles preserve relative spacing
- Editor chrome does not appear in exported image
- Export should always render from the canonical canvas size

---

## 7. Grid System

### 7.1 Base Grid

Use a 12-column vertical poster grid.

```css
:root {
  --grid-columns: 12;
  --grid-gap: 20px;
  --grid-margin: 72px;
  --grid-row: 20px;
}
```

Recommended canvas content width:

```css
content width = 1080px - 72px - 72px = 936px
```

---

### 7.2 Tile Grid

Tiles should snap to the grid.

Common tile widths:

- 12 columns: full-width hero or section tile
- 8 columns: dominant feature tile
- 6 columns: half-width tile
- 4 columns: compact stat or image tile
- 3 columns: small badge/spec tile

Common tile heights:

- 160px compact label tile
- 240px small feature tile
- 360px metric/spec tile
- 520px image-led tile
- 680px hero product tile
- 860px large immersive hero tile

---

### 7.3 Spacing Tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

Default tile gap:

```css
--tile-gap: 20px;
```

Default tile padding:

```css
--tile-padding-sm: 24px;
--tile-padding-md: 32px;
--tile-padding-lg: 44px;
```

---

## 8. Radius, Border, Shadow, and Depth

### 8.1 Radius

Apple-style tiles should be highly rounded but not cartoonish.

```css
:root {
  --radius-sm: 16px;
  --radius-md: 28px;
  --radius-lg: 40px;
  --radius-xl: 56px;
  --radius-pill: 999px;
}
```

Default tile radius:

```css
--tile-radius: 40px;
```

Large hero tiles may use:

```css
--tile-radius-hero: 56px;
```

---

### 8.2 Borders

Borders should be subtle.

```css
.tile {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

Use borders to define glass surfaces, not to decorate every edge heavily.

---

### 8.3 Shadows

Use deep, soft shadows for product cutouts and elevated tiles.

```css
--shadow-tile:
  0 24px 80px rgba(0, 0, 0, 0.45);

--shadow-product:
  0 40px 120px rgba(0, 0, 0, 0.65);

--shadow-glow-blue:
  0 0 80px rgba(22, 119, 255, 0.36);
```

Avoid harsh drop shadows.

---

## 9. Tile Anatomy

Every tile should use this mental model:

```txt
Tile
├── Background layer
│   ├── solid surface / gradient / image
├── Content layer
│   ├── eyebrow or label
│   ├── headline / metric / image
│   ├── supporting copy
│   └── optional badge or control
└── Media layer
    ├── product cutout
    ├── detail image
    └── soft glow or shadow
```

---

## 10. Core Tile Components

### 10.1 Hero Product Tile

Purpose:

- Introduce the product
- Create the strongest visual moment
- Anchor the infographic

Content:

- Product name
- Short headline
- Product cutout or render
- Optional one-line descriptor

Layout:

- Full width
- Tall
- Product image can break the internal grid visually
- Text should remain aligned and readable

Rules:

- Product image may overlap tile boundaries only if export cropping is controlled.
- Hero image should not cover important text.
- Use one glow behind the product, not multiple competing glows.

---

### 10.2 Feature Tile

Purpose:

- Explain one product feature clearly.

Content:

- Feature label
- Feature headline
- 1 short supporting sentence
- Optional image crop or icon-like detail

Rules:

- One feature per tile.
- Avoid cramming multiple benefits into one tile.
- If the tile has an image, reduce the text.

---

### 10.3 Metric Tile

Purpose:

- Highlight a specific measurable value.

Content:

- Large number
- Unit
- Label
- Short context

Rules:

- Do not invent metrics.
- Use `—` if the extracted product page does not provide a value.
- Use tabular numerics.
- Metric tile should feel calm, not like a SaaS dashboard card.

---

### 10.4 Image Detail Tile

Purpose:

- Show a cropped product detail.

Rules:

- Images should be cropped intentionally.
- Avoid generic stock imagery.
- Use product detail images when available.

---

### 10.5 Comparison Tile

Purpose:

- Compare two product states, variants, or before/after outcomes.

Rules:

- Keep comparison balanced.
- Do not use more than two comparison points in one tile.

---

### 10.6 Spec Tile

Purpose:

- Present compact technical specs.

Rules:

- Use real extracted values.
- Keep each spec visually distinct.
- Group specs only when they remain readable.

---

### 10.7 Badge Tile

Purpose:

- Add a small editorial callout.

Rules:

- Use sparingly.
- Badge tiles are accents, not the main content.

---

### 10.8 CTA / Footer Tile

Purpose:

- End the infographic with a source, URL, or call to action.

Rules:

- Do not include editor UI in export.
- Keep CTA subtle and premium.

---

## 11. Tile Layout Patterns

### Pattern A — Product Launch Poster

```txt
[ Hero product tile       12 cols / 720h ]
[ Feature tile 6 cols ][ Metric tile 6 cols ]
[ Image tile   4 cols ][ Spec tile 4 cols ][ Badge tile 4 cols ]
[ Footer tile            12 cols / 180h ]
```

### Pattern B — Feature Breakdown

```txt
[ Header tile             12 cols / 360h ]
[ Feature tile 6 cols ][ Feature tile 6 cols ]
[ Feature tile 6 cols ][ Image tile   6 cols ]
[ Metric tile 4 cols ][ Metric tile 4 cols ][ Spec tile 4 cols ]
[ Footer tile             12 cols / 180h ]
```

### Pattern C — Visual Spec Sheet

```txt
[ Hero image tile         12 cols / 680h ]
[ Metric tile 4 cols ][ Metric tile 4 cols ][ Metric tile 4 cols ]
[ Spec tile   6 cols ][ Spec tile   6 cols ]
[ Detail image tile       12 cols / 420h ]
[ Footer tile             12 cols / 160h ]
```

### Pattern D — Editorial Story

```txt
[ Title tile              12 cols / 480h ]
[ Product image tile       8 cols / 620h ][ Quote tile 4 cols / 620h ]
[ Feature tile 6 cols ][ Feature tile 6 cols ]
[ Closing / CTA tile       12 cols / 220h ]
```

---

## 12. Editable Tile Requirements

Every tile must be editable in the generator.

### 12.1 Editable Fields

```json
{
  "id": "tile_hero_01",
  "type": "hero-product",
  "fields": {
    "eyebrow": "Product Overview",
    "headline": "Studio-grade power in your pocket.",
    "body": "A compact creator device built for capture, edit, and share.",
    "image": "/images/product.png",
    "accent": "blue",
    "layout": "image-right"
  }
}
```

### 12.2 Tile Editing States

Each tile should support: default, hover/focus, selected, empty, error, drag/reorder. Editor-only states must not appear in exported artwork.

### 12.3 Selection State

```css
.tile[data-selected="true"] {
  outline: 2px solid #1677ff;
  outline-offset: 4px;
}
```

Export rule: remove editor outlines before export.

### 12.4 Empty State

Empty states should be honest and minimal (`Add product image`, `Add feature headline`, `Metric unavailable`). Do not fill missing values with fake marketing claims.

---

## 13. Image and Product Cutout Rules

### 13.1 Product Image Treatment

Use transparent PNG cutouts, clean screenshots, high-res images, controlled cropping, soft shadow + subtle glow. Avoid low-res thumbnails, busy web screenshots, random stock, uncropped white-bg ecommerce images, compression artifacts.

### 13.2 Cutout Composition

```css
.product-stage {
  position: relative;
  display: grid;
  place-items: center;
  isolation: isolate;
}

.product-stage::before {
  content: "";
  position: absolute;
  width: 72%;
  aspect-ratio: 1;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(22, 119, 255, 0.36), transparent 65%);
  filter: blur(18px);
  z-index: -1;
}

.product-stage img {
  max-width: 92%;
  max-height: 92%;
  object-fit: contain;
  filter: drop-shadow(0 42px 80px rgba(0, 0, 0, 0.65));
}
```

### 13.3 Image Cropping

Image tiles use `object-fit: cover`; product images use `object-fit: contain`. Never distort product images.

### 13.4 Image Background Removal

When source images contain white backgrounds, attempt to remove the background, convert to cutout, place on a dark tile, and apply shadow/glow. If removal fails, show a clean image tile rather than a fake cutout.

---

## 14. Interaction and Editor Rules

The editor UI must be separate from the exported infographic.

### 14.1 Generator Screen Requirements

URL input, extract button, loading state, image preview, feature list, editable tile canvas, tile inspector, export controls. The flow starts from a product URL, not CSV upload.

### 14.2 Required Interactions

URL validation, generate, regenerate layout, edit text, replace image, crop/reposition, reorder tiles, add/remove tile, select + edit properties, export image.

### 14.3 Editor vs Export

Editor-only elements (selection outlines, handles, inspector, zoom controls, export buttons, loading messages) must not appear in exported output.

---

## 15. Responsive Web Requirements

### 15.1 Desktop Editor

```txt
┌──────────────────────────────────────────────┐
│ Top bar: URL input / Generate / Export       │
├───────────────┬────────────────┬─────────────┤
│ Sources       │ Canvas Preview  │ Inspector   │
│ Images/Text   │ 9:16 Infograph  │ Tile edits  │
└───────────────┴────────────────┴─────────────┘
```

### 15.2 Responsive Web

For smaller screens: canvas stays central, inspector becomes a drawer, sources collapse into tabs, export remains reachable, tile editing stays usable. Do not simply shrink the desktop editor into a phone viewport.

```css
@media (max-width: 430px) {}
@media (min-width: 768px) and (max-width: 1180px) {}
@media (min-width: 1280px) {}
```

---

## 16. Motion Rules

```css
:root {
  --ease-premium: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 140ms;
  --duration-med: 260ms;
  --duration-slow: 520ms;
}
```

Use motion for tile reveal, selection, image replacement, export completion, drawer open/close. Avoid bouncy easing and constant animation. Respect `prefers-reduced-motion`.

---

## 17. Accessibility

Text contrast should pass WCAG AA where possible; visible focus states; labeled inputs; clear button names; keyboard alternatives for drag/reorder; alt text for images. Tile text must remain readable on dark backgrounds.

---

## 18. Export Rules

### 18.1 Export Sizes

```txt
Instagram Story:        1080 × 1920   (primary)
Instagram Feed Square:  1080 × 1080
Instagram Portrait:     1080 × 1350
Web Preview:            responsive
```

### 18.2 Export Quality

Remove editor UI; render at exact target dimensions; preserve font rendering, shadows/glows, rounded tile clipping; use high-res sources; avoid blurry scaled screenshots.

### 18.3 Export Padding

Do not place important text within `72px` from left/right or `96px` from top/bottom.

---

## 19. Component CSS Starter

```css
.infograph-canvas {
  width: 1080px;
  height: 1920px;
  background: #000000;
  color: #ffffff;
  font-family: var(--font-body);
  position: relative;
  overflow: hidden;
  padding: 96px 72px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}

.tile {
  position: relative;
  overflow: hidden;
  border-radius: 40px;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 32px;
  min-height: 160px;
  color: #ffffff;
}

.tile-glass {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.035)),
    #111111;
  border-color: rgba(255, 255, 255, 0.14);
}

.tile-hero { grid-column: span 12; min-height: 680px; padding: 44px; }
.tile-feature { grid-column: span 6; min-height: 360px; }
.tile-metric { grid-column: span 4; min-height: 280px; }
.tile-image { grid-column: span 6; min-height: 420px; padding: 0; }

.eyebrow {
  color: #a3a3a3;
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.tile h1, .tile h2, .tile h3 {
  font-family: var(--font-display);
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.tile h1 { font-size: 76px; line-height: 0.92; }
.tile h2 { font-size: 44px; line-height: 1; }
.tile p { color: #a3a3a3; font-size: 24px; line-height: 1.25; text-wrap: pretty; }

.metric {
  color: #ffffff;
  font-size: 84px;
  line-height: 0.9;
  letter-spacing: -0.06em;
  font-variant-numeric: tabular-nums;
}

.metric span { font-size: 32px; color: #a3a3a3; letter-spacing: -0.03em; }
```

---

## 20. Data Model

```json
{
  "canvas": { "format": "instagram-story", "width": 1080, "height": 1920, "background": "#000000" },
  "source": { "type": "product-url", "url": "", "extractedAt": "" },
  "product": { "name": "", "description": "", "images": [], "features": [], "specs": [], "price": null },
  "tiles": [
    {
      "id": "hero_01",
      "type": "hero-product",
      "grid": { "column": 1, "span": 12, "height": 680 },
      "content": { "eyebrow": "Product Overview", "headline": "", "body": "", "image": "" },
      "style": { "variant": "dark-glass", "accent": "blue", "radius": "hero" }
    }
  ]
}
```

---

## 21. Quality Checklist

### Visual
- [ ] Canvas uses a dark premium background.
- [ ] Tiles align to the grid.
- [ ] Rounded corners are consistent.
- [ ] There is one clear hero moment.
- [ ] Product imagery is the visual focus.
- [ ] Accent color is used sparingly.
- [ ] No generic emoji or filler icons are used.
- [ ] No beige/peach AI-style background is used.

### Typography
- [ ] Hero headline is short and readable.
- [ ] Body copy is minimal.
- [ ] Metrics use real values or honest placeholders.
- [ ] No invented claims are present.
- [ ] Text contrast is strong.

### Tile System
- [ ] Every tile has a clear purpose.
- [ ] Tile sizes create visual rhythm.
- [ ] No tile is overloaded with content.
- [ ] Empty states are honest.
- [ ] All tile content remains editable.

### Product Imagery
- [ ] Product image is high resolution.
- [ ] Cutout does not look jagged.
- [ ] Shadow/glow supports the image.
- [ ] Cropping is intentional.
- [ ] Product is not distorted.

### Export
- [ ] Export is exactly 1080×1920 for Story.
- [ ] Editor UI is not visible in export.
- [ ] Safe margins are respected.
- [ ] Rounded clipping renders correctly.
- [ ] Final image is sharp.

---

## 22. Anti-Slop Rules

Never include: generic emoji feature icons, lorem ipsum, fake performance metrics, random gradients on every tile, generic SaaS dashboard cards, rounded cards with arbitrary colored left borders, hand-drawn illustration people, decorative icons beside every heading, editor controls inside exported infographic, Apple logos/trademarks/copied copy.

When uncertain, make the layout quieter.

---

## 23. Implementation Notes

Separate three layers: (1) Editor UI, (2) Infographic canvas (pure visual output, fixed export dimensions, editable tile regions), (3) Data model. The exported canvas should never include editor-specific UI.

### AdFrame mapping (how this repo implements the system)

- **Canvas background** → `ff-canvas-bg` tldraw shape (full-frame `.infograph-canvas-bg`: black + one accent radial glow), inserted as the first child of the export frame.
- **Tiles** → `ff-glass-card` rendering `.glass-card-shape` dark-glass surfaces; tones map to `tile` (dark glass), `ink` (solid near-black), `frost`/`clear` (lighter glass), `accent` (one accent-glow tile, used ≤2–3×).
- **Hero / image tiles** → `ff-cutout-image` (`fit: contain` for product cutouts with drop-shadow, `fit: cover` for cropped section visuals).
- **Headline / body text** → `ff-glass-text` (`.adframe-display-text`, white).
- **Badges** → `ff-badge` pills; **icon/spec glyphs** → `ff-icon`.
- Brand tokens scraped into `design.md` are applied as `--brand-*` CSS variables; accent falls back to `#1677ff`.

---

## 24. Default Template Recommendation

```txt
Canvas: 1080 × 1920

Top:
[ Hero Product Tile — 12 columns — 720px ]

Middle:
[ Feature Tile — 6 columns — 360px ]
[ Metric Tile  — 6 columns — 360px ]

Lower:
[ Image Detail Tile — 4 columns — 360px ]
[ Spec Tile         — 4 columns — 360px ]
[ Badge Tile        — 4 columns — 360px ]

Bottom:
[ Footer / CTA Tile — 12 columns — 180px ]
```

This creates a strong Apple-style rhythm: one immersive product moment, two clear supporting tiles, three compact detail tiles, one quiet footer.

---

## 25. Definition of Done

- A user can paste a product URL.
- The system extracts product content.
- The system generates a premium Apple-inspired vertical infographic.
- The infographic is built from editable tiles.
- Product images are treated as cutouts or intentional image crops.
- The result exports cleanly at Instagram Story size.
- The design feels premium, restrained, and product-led.
- No Apple-specific trademarked assets or copied marketing materials are used.
