# House walkthrough (Phase 1)

React + Three.js rebuild of the single-page "G+2 House Plan and Walkthrough" drawing set
(`reference/original-g2-house.html`), with real furniture models, PBR materials, soft shadows,
ambient occlusion and a cinematic guided tour, presented as a premium single-page site.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (deploy anywhere: Vercel, Netlify, S3)
```

Append `?q=fast` to force the low-end preset, `?debug` to expose renderer stats on `window.__stats`.

## What is on the page

A single scrolling page (`src/App.tsx`, styles in `src/index.css`):

| Section | Source |
| --- | --- |
| Hero | static render of the main hall (`public/hero-hall.webp`, captured from the 3D viewer) |
| 3D walkthrough | `src/viewer/*`: Dollhouse, Walk inside, Whole house (reset view), Play guided tour. Quality is chosen automatically. |
| Floor plans | `src/plan2d/planSvg.ts` draws all three floors as SVG from the plan data |

The viewer still supports per-floor cutaways, evening lighting and video recording in code
(`Scene` settings, `TourPlayer`); they are just not exposed in the UI.

## Architecture: one plan schema drives everything

```
HousePlan (src/plan/types.ts)            ← Phase 1: written by hand (src/plan/houses/g2House.ts)
   │                                       ← Phase 2: produced from an uploaded 2D drawing
   ├─ compilePlan()  src/plan/compile.ts  → wall/door/window/stair boxes, colliders, walkable surfaces
   ├─ planSVG()      src/plan2d           → 2D floor plans
   └─ <Scene>        src/viewer           → 3D model, furniture, lighting, walkthrough
```

Nothing in `src/viewer` or `src/plan2d` knows about this particular house. A plan is ~22 KB of JSON:
levels, slabs, walls (axis-aligned rectangles), openings (door/window/slider placed in a wall cell),
railings, stair flights and landings, floor finishes, rooms, furniture items, viewpoints and a tour path.

### Furniture

`src/viewer/Furniture.tsx` maps each `ItemType` to a renderer. Item positions are footprints in feet
(`x, y, w, d, rot`); the renderer fits content into that footprint.

* **Real models** (Poly Haven, CC0): sofas, armchairs, dining and bar chairs, chandeliers, pendant lamps,
  console, crockery cabinet, coffee/side/round tables, plants, vases, diya lanterns, pillows, clock,
  desk lamp, microwave, bistro set, basket. Fitted with `<Model fit="stretch|contain|height|native">`.
* **Procedural with PBR materials**: beds, wardrobes, kitchen counters and cabinets, TV wall units, temple,
  WC, basins, showers, fridge, washing machine, water tank, pergola, swing, rugs (generated pattern),
  art. Free libraries have no usable models for these Indian-home items.

After a floor's models load, `mergeStatic()` bakes that floor's furniture into one mesh per material
(~2,800 → ~600 draw calls including the shadow pass).

### Assets

`public/assets` is committed so the site works offline and deploys as static files. To re-download
(or after adding a model id to `scripts/fetch-assets.mjs`):

```bash
npm run assets          # skips files that exist; --force to redo
```

The script downloads 1k glTF, converts to GLB with WebP textures (`@gltf-transform/cli`) and decimates
dense models. Textures were then recompressed to JPEG q82 with ImageMagick. All assets are CC0
(https://polyhaven.com/license); no attribution is required.

### Performance budget

Scene: ~670k triangles, ~600 draw calls with shadows, 19 MB of assets (models 15 MB).
`High` = 4k soft sun shadows + N8AO + bloom + SMAA. `Fast` = no shadows or AO, DPR ≤ 1.25
(default on screens ≤ 700px wide).

## Phase 2: upload a 2D plan

The renderer is ready for it; the open problem is turning a drawing into a `HousePlan`. In order of
reliability:

1. **DXF/DWG from the architect**: walls, doors and windows are vectors and usually on named layers.
   Parse, snap to a grid, emit `walls` and `openings`. Most reliable; do this first.
2. **Raster image or PDF of a drawn plan**: wall segmentation (a floor-plan model such as a U-Net trained
   on CubiCasa5k), then rectangle fitting, then door/window symbol detection. Expect 70–90% correct output
   on clean CAD exports and much worse on hand sketches or photos. **A correction editor is required**:
   the user fixes walls and openings on a 2D canvas before generating 3D.
3. **Rooms and furniture**: room type from the label text (OCR) or the user's choice; furniture is then
   auto-placed per room type using rule-based layouts (bed against the longest solid wall, etc.) and
   written into `items`. An LLM can propose layouts as JSON, but validate every item against collisions
   and door swings.

Also needed: a scale step (user marks one known dimension), multi-floor alignment (stair position), and
server-side storage of plans per client.
