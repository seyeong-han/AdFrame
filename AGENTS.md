## Learned User Preferences

- User wants AdFrame implementation tasks executed directly when a plan is already approved; do not re-create existing todos or edit the plan file.
- User expects quick diagnosis and direct remediation for local app breakages such as server-down `Failed to fetch` errors and React console errors.

## Learned Workspace Facts

- AdFrame's active app is `app-web/`, a Next.js 16 App Router app with routes for landing import, analysis approval, and a tldraw editor.
- AdFrame extraction uses Playwright with cached Samsung S90F fixture fallback, writes `generated/design.md` and `generated/tokens.source.json`, and passes `ProductDesignSystem` tokens into Analysis and Editor.
- Source PDP design tokens are injected into the editor as `--brand-*` CSS variables so AdFrame preserves extracted font, palette, radius, and CTA style while keeping liquid-glass editability.
- Server-only remove.bg support lives at `app/api/remove-background/route.ts`; it recognizes `REMOVE_BG_API_KEY`, `REMOVEBG_API_KEY`, `REMOVEBG_KEY`, and `REMOVE_BG_KEY`, including the parent project `.env`.
- `/api/extract` filters Samsung S90F product/gallery images, caches remove.bg outputs under `app-web/public/generated/removebg/samsung-s90f/`, and updates Source Images to use those cached PNGs.
- remove.bg is suitable for hero/gallery foreground cutouts, but section composite images need DOM extraction, screenshot crop detection, OCR, and editable recreation rather than background removal.
- `npm run lint` and `npm run build` are the current validation commands for `app-web/`; build may warn because `lib/server-env.ts` intentionally reads the parent `.env`.
