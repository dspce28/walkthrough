import { setStyleMaterials } from '../viewer/materials';
import type { StyleKit } from './kit';
import { modernLuxe } from './modernLuxe';

export * from './kit';
export const STYLES: Record<string, StyleKit> = { [modernLuxe.id]: modernLuxe };

let active: StyleKit = modernLuxe;
export const activeStyle = () => active;

/** Select the style before the 3D scene mounts (materials are cached per style). */
export function applyStyle(kit: StyleKit) {
  active = kit;
  setStyleMaterials(kit.materials);
}
