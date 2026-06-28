# AdFrame — Hackathon One-Pager

> **Tagline:** Paste a premium product page, instantly generate an Apple-style infographic ad you can edit and export for IG Feed, Story, and Carousel.

## Problem
Premium products are hard to understand from a single image. Product pages contain too much text, too many specs, and scattered visuals. For high-ticket items, buyers need a fast visual summary that communicates value, craftsmanship, and differentiators in seconds.

## Solution
AdFrame turns a product URL or uploaded image set into a polished, Apple-inspired ad storyboard. For the hackathon demo, the core use case is **Samsung refrigerator → premium infographic ad**.

The system:
1. ingests a product page / PDP link,
2. extracts product name, hero images, key specs, and differentiators,
3. generates a clean multi-card layout with one message per card,
4. uses background removal + image generation to fill gaps,
5. lets the user drag, edit, reorder, and restyle cards,
6. exports a final asset sized for **IG Feed, Story, and Carousel**.

## Why this wins
- **High-ticket products justify visual explanation.**
- **Apple-style modular cards make dense information feel premium and scannable.**
- **Editable blocks beat one-shot generation.** Marketers need control.
- **One input → multiple outputs**: feed post, story frame, carousel sequence.

## Demo flow
1. Paste a Samsung refrigerator product URL.
2. Auto-detect key features like capacity, smart features, finish, and energy efficiency.
3. Generate a 1-page infographic with a central hero panel and surrounding feature cards.
4. Edit copy or swap images in a drag-and-drop canvas.
5. Export as:
   - 1080×1350 IG Feed
   - 1080×1920 Story
   - 3–5 slide Carousel

## Core product features
### 1) Product understanding layer
- URL ingestion
- image scrape / upload fallback
- text extraction from product page
- feature ranking and claim normalization

### 2) Creative generation layer
- Apple-style card templates
- headline generation per card
- image selection and background removal
- optional GPT image generation for missing hero/feature imagery

### 3) Editor layer
- drag-and-drop card layout
- inline text editing
- image replacement
- style presets by product category
- export to social sizes

## MVP scope for the hackathon
### In scope
- Single product page input
- One demo category: premium refrigerator
- 1 generated master layout
- IG Feed / Story / Carousel export
- Manual edit mode
- Background removal for product images

### Out of scope
- Full ecommerce integrations
- Multi-brand analytics
- Team collaboration
- Ad platform publishing
- Automated campaign optimization

## Technical approach
- **Frontend:** Next.js + canvas/editor UI
- **Layout engine:** template-driven card composer
- **Vision pipeline:** product image segmentation / background removal
- **LLM pipeline:** product feature extraction + marketing copy generation
- **Image generation:** GPT image model for missing visual elements
- **Export:** PNG/JPG/PDF sized variants for social formats

## Success criteria
- A user can paste a fridge URL and get a usable ad in under 2 minutes.
- The output feels premium, clean, and brand-safe.
- The user can edit the result without leaving the canvas.
- Exported assets are ready to post to Instagram immediately.

## Main risk
The biggest risk is hallucinating product claims. The system must separate:
- **verified page facts**
- **inferred marketing language**
- **generated decorative elements**

## Positioning
AdFrame is not a generic AI image generator. It is a **product-page-to-ad creative engine** for high-ticket ecommerce.

---

**Hackathon thesis:**
If a product is expensive, it deserves a visual explanation that feels premium, compact, and immediately shareable.
