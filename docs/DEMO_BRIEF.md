# Demo brief: Modern Luxe walkthrough (handoff for the next session)

## Product the client (an interior designer) wants
1. Homeowner uploads a 2D floor plan (with sofa, kitchen etc. marked) and picks a style: modern / heritage / royal / simple.
2. We turn it into a designed 3D interior: wall finishes, false ceilings, furniture, decor props per style.
3. We generate a walkthrough of that design.
4. Lighting and exposure are set to suit the design.
5. A real city photo/skyline is visible behind windows and from open terraces.

Reference look: `Apartment Interior Design 3D Walkthrough | Living, Bedroom & Kitchen | 4K` (Yantram Studio, YouTube
puhXfWCpFeM). About 20 slow eye-level dolly shots of ~5 s; bright high-key exposure; false ceilings with warm LED coves
and profile lights; fluted / panelled feature walls; arched niches; modular joinery with metal trims; heavy styling
(pampas, books, sculpture, throws, cushions, plants); city view behind every window.

## Decisions (agreed)
- Demo style: **Modern Luxe** only. Royal/other styles: later.
- Assets: **free models only** (Poly Haven CC0 + procedural). No paid models.
- City view: **generic skyline** (Ahmedabad was requested; no free Ahmedabad 360° image exists, so a generic CC0 city HDRI is used).
- Demo house: the existing G+2 plan (`src/plan/houses/g2House.ts`), redesigned. Note: it is only 12′ wide, rooms are small.

## Architecture already in place
- `src/plan/types.ts`: plan schema (walls, openings, stairs, rooms, items in feet). Everything renders from it.
- `src/plan/compile.ts`: plan to boxes/colliders/walk surfaces. `src/viewer/Furniture.tsx`: item catalogue (models + procedural).
- `src/viewer/Scene.tsx`: lights, post-processing, camera rig. `src/viewer/walk.ts`: walk + spline guided tour.
- Offline light bake: `scripts/bake/bake.py` (Blender 5.3 `bpy` + `pyoidn`), see README "Photoreal lighting". Baked output in
  `public/baked/g2-house/`, loaded by `src/viewer/Baked.tsx` (`BAKE_EXPOSURE`). Meshes named `arch|L<n>|*` get baked;
  `furn|*` are furniture; anything else is excluded.
- Site: single page (hero, 3D walkthrough, floor plans), premium dark/gold design, deployed by Vercel on push to
  `claude/cool-turing-6emu68` -> https://house-walkthrough-topaz.vercel.app

## Done in the session that wrote this brief
- City skyline environment behind windows/terrace (CC0 HDRI).
- City skyline: `homecoming_center_rooftop` (2K HDRI, `CITY_HDRI` in `src/viewer/Scene.tsx`). Its towers are taller than Ahmedabad's.
- Rule-based false ceilings (`src/style/falseCeiling.ts`, rendered by `src/viewer/FalseCeilings.tsx`): perimeter band,
  cove shelf with LED strip, profile-light line; skipped over stairwells and in wet/outdoor/small rooms. Bands and strips
  are named `arch|L<n>|ceilingBand` / `coveGlow` so the next bake includes them (strips emit light in Cycles; `Baked.tsx`
  keeps `glow` self-lit). The cove light washes are real-time fakes (`fx|…`), not baked.
- The current bake in `public/baked/` predates the false ceilings: re-export and re-bake next session.

## Next steps (in order)
1. ~~**Style kit structure**~~ DONE: `src/style/kit.ts` (StyleKit, `roomType()` classifier), `src/style/modernLuxe.ts`
   (materials incl. white marble with grout AO map, ceiling rule by room type, lighting colours/intensities),
   `src/style/index.ts` (`applyStyle`, `activeStyle`), selected in `src/viewer/Viewer.tsx`. Kit lighting colours feed
   `lightAnchors`, so the next `?export` + bake picks up the neutral lamps. Original text: `src/style/modernLuxe.ts`: materials (white large-format marble floor, greige textured walls),
   ceiling rules, feature-wall rules, furniture/decor choices. Apply by rules from room type, not hand placement.
2. ~~**Feature walls**~~ DONE: rule in `src/style/featureWalls.ts` (finds the wall behind beds/temples from the item's
   back edge + room outline), rendered by `src/viewer/FeatureWalls.tsx` in a local wall frame: bouclé panel grid + oak
   fluting + champagne trim/LED behind beds; stone arch with LED around the temple niche. TV wall = `tvBack` (marble) +
   `tvFlute` (oak) slots in the tvUnit renderer. Joinery restyled via kit overrides (white/grey oak veneer, champagne metal,
   painted frames); fabrics use colour + texture normal map only (Poly Haven fabric colours unsuitable).
   Export now tags meshes by their nearest `arch|`/`furn|` ancestor. `?view=<n>` deep-links walk mode to viewpoint n.
   Original text: fluted panel TV wall (hall, master), upholstered/panel bed wall, arched temple niche, wardrobe trims.
3. ~~**Decor props**~~ DONE: per-style item renderers `src/viewer/styles/modernLuxeItems.tsx` (looked up in
   `Furniture.tsx` via `STYLE_ITEMS`): bouclé sofa + cushions + throw, halo LED chandelier, modern rug, stone drum coffee
   table, marble dining table, fluted oak sideboard with glass/LED shelves, slim console + round mirror, bed with neutral
   cushions/throw, modern armchair, `dining_chair_02` model; decor props (pampas, sculpture, book stacks, bowls) live on
   those pieces. `src/style/decor.ts` adds corner plants by rule (clear of furniture, doors, stairs).
   KNOWN: dark smudges on walls are old-furniture shadows in the OLD bake; re-bake fixes. Original text: Decor props per room type (also replace the classic chandeliers/armchair/Persian rugs/zigzag pillows with modern picks) (free models: Poly Haven vases, books, plants, frames + procedural throws/cushions).
4. **Exposure**: brighter high-key look; re-bake with neutral 3500-4000K lights (`--lamp-watts`, lamp colours in `lightAnchors`).
5. **Re-export + re-bake** (`?export` then `bake.py`), copy to `public/baked/g2-house/`, tune `BAKE_EXPOSURE`.
6. **Cinematic tour**: ~15 composed slow shots auto-generated per room (eye level, 5 s each), plus free walk.
7. Later: comment pins on objects (homeowner feedback before work starts); style toggle; 2D-upload pipeline.

## Working notes
- Headless screenshots use SwiftShader: slow. Use `?q=fast`, small viewports, few shots.
- Bake on this 4-core CPU: ~4 min per floor at 1024 px / 256 spp.
- Commit after each step; pushing deploys production.
