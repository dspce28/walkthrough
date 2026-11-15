import type * as THREE from 'three';
import type { Room } from '../plan/types';

/**
 * A style kit turns a bare plan into a designed interior by rule. Everything style-specific lives here so a
 * new style (Royal, Heritage, Simple…) is a new kit, not new viewer code. Rules key off the room *type*,
 * never a particular house.
 */
export type RoomType = 'living' | 'dining' | 'kitchen' | 'bedroom' | 'bath' | 'office' | 'outdoor' | 'circulation' | 'utility';

export function roomType(room: Pick<Room, 'name'>): RoomType {
  const n = room.name.toLowerCase();
  if (/terrace|porch|balcony|yard|garden/.test(n)) return 'outdoor';
  if (/wash|toilet|bath|wc/.test(n)) return 'bath';
  if (/kitchen|pantry/.test(n)) return 'kitchen';
  if (/bed|guest|kids/.test(n)) return 'bedroom';
  if (/office|study|library/.test(n)) return 'office';
  if (/dining/.test(n)) return 'dining';
  if (/hall|living|lounge|drawing|family/.test(n)) return 'living';
  if (/lobby|passage|corridor|landing|stair|foyer|bay|dressing/.test(n)) return 'circulation';
  return 'utility';
}

export interface CeilingRule {
  /** room types that get a false ceiling */
  rooms: RoomType[];
  band: number; drop: number; shelf: number; minRoom: number;
}

export interface LightingRule {
  envIntensity: number;
  hemiIntensity: number;
  /** real-time lamp colours (also exported to the bake) */
  chandelier: string; pendant: string; ceiling: string;
  /** multiplier on the real-time interior lamp pool */
  lampBoost: number;
}

export interface StyleKit {
  id: string;
  name: string;
  /** material overrides keyed like viewer/materials.ts (`wall`, `floor:wood`, `walnut`, …) */
  materials: Record<string, () => THREE.Material>;
  ceiling: CeilingRule;
  lighting: LightingRule;
  /** room types that get rule-placed corner plants */
  decor?: { cornerPlants: RoomType[] };
}
