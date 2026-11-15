import * as THREE from 'three';
import { groutMap, pbr, std, tex } from '../viewer/materials';

/** Upholstery: our own colour, only the fabric's surface relief from the texture (its baked colour is unsuitable). */
const fabric = (id: string, color: string, tileFt = 1.2) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, normalMap: tex(id, 'nor', tileFt) });
import type { StyleKit } from './kit';

/**
 * Modern Luxe: bright, high-key contemporary Indian interior (reference: Yantram Studio apartment walkthrough).
 * White large-format marble floors with fine joints, light greige textured walls, bright white ceilings,
 * perimeter false ceilings with warm LED coves, neutral-warm (~3500 K) lighting.
 */
const whiteMarble = () => pbr('marble_01', 4, { color: '#f8f6f2', roughness: 0.08, noRough: true, envMapIntensity: 1.3, aoMap: groutMap(4), aoMapIntensity: 1 });

export const modernLuxe: StyleKit = {
  id: 'modern-luxe',
  name: 'Modern Luxe',
  materials: {
    wall: () => pbr('plastered_wall', 6, { color: '#efe9df', roughness: 0.9, normalScale: 0.3 }),
    ceiling: () => std('#faf8f4', 0.95, 0, { emissive: '#3c3a36' }),
    slab: () => std('#f7f5f1', 0.95, 0, { emissive: '#3c3a36' }),
    ceilingBand: () => std('#fbfaf7', 0.85, 0, { emissive: '#3c3a36' }),
    // living, dining, bedrooms, office and kitchen all get the same white marble (plan finishes wood/tile2/marble)
    'floor:marble': whiteMarble,
    'floor:wood': whiteMarble,
    'floor:tile2': whiteMarble,
    // joinery: white oak veneer, grey oak accents, painted door frames, champagne metal
    walnut: () => pbr('white_oak_veneer', 3, { color: '#f3ece2' }),
    walnutD: () => pbr('grey_oak_veneer_01', 3, { color: '#e6ded4' }),
    door: () => pbr('white_oak_veneer', 4, { color: '#efe7dc' }),
    doorPanel: () => std('#ddd5ca', 0.5),
    frame: () => std('#ece7df', 0.45),
    brass: () => std('#cfb37c', 0.3, 1),
    // feature walls: book-matched marble behind the TV, oak fluting, bouclé bed panels, warm stone arch
    tvBack: () => pbr('marble_01', 5, { color: '#f4f1ec', roughness: 0.12, noRough: true, envMapIntensity: 1.2 }),
    tvFlute: () => pbr('white_oak_veneer', 2, { color: '#e9dccb' }),
    'feature:panel': () => fabric('wool_boucle', '#ddd3c6', 0.8),
    'feature:stone': () => pbr('marble_01', 4, { color: '#ece3d4', roughness: 0.3, noRough: true }),
    // upholstery: muted velvet instead of saturated burgundy / navy
    burgundy: () => fabric('velour_velvet', '#9c8273'),
    navy: () => fabric('velour_velvet', '#7d8790'),
    // upholstery and decor props
    boucle: () => fabric('wool_boucle', '#ece6dc', 0.6),
    outdoorFabric: () => fabric('wool_boucle', '#d9d2c6', 0.9),
    knit: () => fabric('wool_boucle', '#cdbba3', 0.4),
    accentSage: () => fabric('velour_velvet', '#9ba38d'),
    accentClay: () => fabric('velour_velvet', '#b88c71'),
    ceramicMatte: () => std('#efebe4', 0.55),
    darkMetal: () => std('#2e2c29', 0.4, 0.85),
    pampas: () => std('#e3d3b6', 1),
    pampasStem: () => std('#c9b48f', 0.9),
    bookA: () => std('#d8cfc2', 0.8), bookB: () => std('#7c8a86', 0.8), bookC: () => std('#b3a089', 0.8),
    // wet areas: large grey stone-look tiles
    'floor:tile': () => pbr('large_grey_tiles', 4, { color: '#e2dfda', roughness: 0.3, noRough: true }),
  },
  ceiling: { rooms: ['living', 'dining', 'kitchen', 'bedroom', 'office'], band: 1.6, drop: 1.0, shelf: 0.4, minRoom: 6 },
  decor: { cornerPlants: ['living', 'bedroom', 'office', 'dining'] },
  lighting: { envIntensity: 0.75, hemiIntensity: 0.55, chandelier: '#ffe2bf', pendant: '#ffe7c9', ceiling: '#fff1e0', lampBoost: 1.15 },
};
