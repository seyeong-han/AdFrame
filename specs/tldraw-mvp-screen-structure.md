# AdFrame Tldraw MVP Screen Structure

## Product goal
Build a Figma-like, highly editable ad canvas where a premium product page can become an Apple-style infographic in minutes.

## Primary demo flow
1. Paste a Samsung refrigerator product URL.
2. Wait for the page to be parsed and the product assets to load.
3. Review the generated infographic canvas.
4. Drag, edit, replace, and restyle cards.
5. Export as IG Feed, Story, or Carousel.

---

## Screen 1: Landing / Import
### Purpose
Start from a single product URL or a manual upload.

### Layout
- Centered hero area
- URL input box
- Upload fallback button
- Example product buttons
- Small trust note: "Supports premium ecommerce product pages"

### Core controls
- `Paste URL`
- `Upload images`
- `Try Samsung refrigerator demo`
- `Generate infographic`

### States
- Empty
- Loading metadata
- Error / unsupported page

---

## Screen 2: Analysis / Parse Preview
### Purpose
Show that the system understood the product before entering the editor.

### Layout
- Left: extracted product facts
- Right: source images preview
- Bottom: confidence / claim review

### Content blocks
- Product name
- Price
- Key features
- Verified claims
- Suggested headline angle
- Available images

### Core controls
- `Approve facts`
- `Regenerate summary`
- `Continue to canvas`

### Why this matters
This screen prevents hallucination and makes the product feel trustworthy.

---

## Screen 3: Main Editor Canvas
### Purpose
The core Figma-like editing experience.

### Overall layout
```
┌──────────────────────────────────────────────────────────────┐
│ Top bar                                                      │
├──────────────┬──────────────────────────────┬─────────────────┤
│ Left panel   │       Tldraw canvas          │ Right inspector │
│ assets/data  │   cards, images, text        │ properties      │
│              │                              │                 │
├──────────────┴──────────────────────────────┴─────────────────┤
│ Bottom bar: export, size presets, zoom, undo/redo             │
└──────────────────────────────────────────────────────────────┘
```

### A. Top bar
#### Purpose
Global actions and document context.

#### Controls
- Logo / project name
- Product title
- Undo / redo
- Duplicate layout
- Regenerate selected card
- Save status
- Export button

#### Optional
- Template selector
- Style preset selector
- Device preview toggle

---

### B. Left panel — Sources / Assets
#### Purpose
Give the user everything they need to build the ad without leaving the editor.

#### Tabs
1. **Assets**
   - product hero images
   - extracted image crops
   - generated visuals
   - icons / badges

2. **Copy**
   - headline candidates
   - feature bullets
   - CTA variants
   - claim-safe versions

3. **Layout**
   - Apple-clean template
   - Premium bold template
   - Carousel variant
   - Story variant

#### Key interactions
- Drag assets directly onto canvas
- Click copy to insert
- Drag layout preset to replace current arrangement

---

### C. Center canvas — Tldraw workspace
#### Purpose
Freeform, high-control layout editing.

#### Editable objects
- hero product image
- feature cards
- text blocks
- badges/icons
- background shapes
- callout lines

#### Required interactions
- drag
- resize
- rotate
- multi-select
- align / distribute
- snap to grid or smart guides
- lock layer
- duplicate layer

#### Canvas rules
- Default artboard size should match the selected export preset
- Each card should remain a separate object
- Elements should be JSON-addressable for export and regeneration

---

### D. Right inspector — Properties panel
#### Purpose
Make selected objects easy to edit like Figma.

#### When a card is selected
- Title text
- Subtitle text
- Body copy
- Background color
- Border radius
- Shadow
- Padding
- Image fit mode
- Icon color
- Badge style

#### When an image is selected
- Crop
- Fit / fill / contain
- Background removal toggle
- Replace image
- AI regenerate

#### When text is selected
- Font family
- Font weight
- Size
- Line height
- Tracking
- Alignment
- Color

---

## Screen 4: Export Modal
### Purpose
Turn the design into social-ready deliverables.

### Export targets
- IG Feed: 1080 × 1350
- Story: 1080 × 1920
- Carousel: 3–5 slide pack

### Export options
- PNG
- JPG
- ZIP bundle for carousel
- Optional PDF proof

### UX
- Preview each size before download
- Let user choose whether to keep safe margins or fill bleed
- Show a final checklist before export

---

## Screen 5: Carousel Split View
### Purpose
Convert the master layout into a slide sequence.

### Layout
- Left: master canvas
- Right: slide thumbnails
- Bottom: slide order controls

### Behavior
- Auto-split the infographic into 3–5 story-like cards
- Each slide should preserve one message
- User can reorder or merge slides

---

## Screen 6: Style Preset Drawer
### Purpose
Make the same product feel different for different audiences.

### Presets
- Apple-clean
- Luxury premium
- Pastel editorial
- Bold social ad
- Trust/clinical

### Controls
- Color palette
- Typography pair
- Shadow depth
- Card spacing
- Accent color

---

## Recommended Tldraw component model
Each node should be a structured object.

```ts
{
  id: string
  type: 'card' | 'text' | 'image' | 'badge' | 'icon'
  x: number
  y: number
  w: number
  h: number
  zIndex: number
  locked?: boolean
  style: {
    radius: number
    fill: string
    stroke?: string
    shadow?: string
  }
  content?: {
    title?: string
    body?: string
    imageUrl?: string
    alt?: string
  }
}
```

---

## MVP screen priorities
### P0
- URL import
- analysis preview
- main editor canvas
- export modal

### P1
- carousel split view
- style preset drawer
- background removal controls

### P2
- collaboration
- comments
- version history
- campaign performance analytics

---

## What makes this feel like Figma
- freeform canvas, not form fields
- object-level editing
- inspector panel
- keyboard shortcuts
- drag-and-drop asset placement
- live export preview

## What keeps it hackathon-feasible
- one main canvas
- one product category
- one master template system
- one export pipeline
- no collaboration layer

---

## Short implementation thesis
Use Tldraw to get the motion, selection, and freeform manipulation feeling of Figma, then layer your own product-specific panels and export logic around it.
