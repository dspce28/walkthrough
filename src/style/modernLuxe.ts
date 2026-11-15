import { groutMap, pbr, std } from '../viewer/materials';
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
    // wet areas: large grey stone-look tiles
    'floor:tile': () => pbr('large_grey_tiles', 4, { color: '#e2dfda', roughness: 0.3, noRough: true }),
  },
  ceiling: { rooms: ['living', 'dining', 'kitchen', 'bedroom', 'office'], band: 1.6, drop: 1.0, shelf: 0.4, minRoom: 6 },
  lighting: { envIntensity: 0.75, hemiIntensity: 0.55, chandelier: '#ffe2bf', pendant: '#ffe7c9', ceiling: '#fff1e0', lampBoost: 1.15 },
};
