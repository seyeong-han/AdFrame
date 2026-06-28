# AdFrame

AdFrame turns a product detail page into an editable, Apple-style infographic ad studio.

The current demo extracts verified product facts, source images, section visuals, videos, and design tokens from the Samsung S90F OLED TV page, then composes them into a tldraw-based canvas for social export.

## App

```bash
cd app-web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Key Capabilities

- Product page extraction with Playwright and cached fixture fallback
- Source design-token extraction to `generated/design.md`
- remove.bg-backed product cutouts with local caching
- Section visual crop extraction for feature cards
- Samsung PDP video extraction and local MP4 caching
- tldraw editor with custom liquid-glass shapes
- PNG, JPG, PDF, and carousel ZIP export

## Validation

```bash
cd app-web
npm run test:template-composition
npm run test:section-crops
npm run test:video-extraction
npm run lint
npm run build
```
