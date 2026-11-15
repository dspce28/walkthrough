/**
 * House plan schema.
 *
 * This is the contract between "where a plan comes from" and "how it is rendered".
 * Phase 1 writes it by hand (src/plan/houses/g2House.ts). Phase 2 (upload a 2D drawing)
 * must produce exactly this shape; the 2D plan view, the 3D model and the walkthrough
 * are all generated from it and contain no house-specific code.
 *
 * Coordinates are in feet. x runs across the plot width, y runs from the road (front, y<0)
 * to the rear, z is height above the level's finished floor. One level = one storey.
 */

export type Rect = [x1: number, y1: number, x2: number, y2: number];
export type Axis = 'h' | 'v'; // h: element runs along x, v: element runs along y

export type WallKind = 'wall' | 'parapet' | 'lintel';
export interface Wall {
  level: number;
  rect: Rect;
  z0?: number; // default 0
  z1?: number; // default ceiling height
  kind?: WallKind;
}

/**
 * A door or window placed in a wall cell. The cell spans a1..a2 along `axis` and t1..t2 across it.
 * The builder fills the rest of the cell with wall, adds lintel/sill and frames.
 */
export interface Opening {
  level: number;
  type: 'door' | 'window' | 'slider';
  axis: Axis;
  a1: number; a2: number; t1: number; t2: number;
  width?: number;   // clear width; default door 2.6 / window full cell
  offset?: number;  // from a1 to the opening; default centred (door) or 0 (window)
  head?: number;    // default 7 (door) / 7.5 (window)
  sill?: number;    // window only, default 2.5
  swing?: 1 | -1;   // door leaf opens towards +t (1) or -t (-1)
  hinge?: 'a1' | 'a2';
  double?: boolean;
  curtain?: 1 | -1; // window curtains on the +t or -t side
}

export interface Railing { level: number; axis: Axis; a1: number; a2: number; t: number; height?: number }

/** Straight stair flight rising from z0 to z1 along `axis` between `from` and `to` (from->to is the up direction). */
export interface StairFlight { level: number; axis: 'x' | 'y'; from: number; to: number; c1: number; c2: number; z0: number; z1: number; risers: number }
export interface Landing { level: number; rect: Rect; z: number }

export type Finish = 'marble' | 'wood' | 'tile' | 'tile2' | 'stone' | 'deck';
export interface FloorFinish { level: number; rect: Rect; finish: Finish }

export interface Slab { level: number; rect: Rect; z0?: number; z1?: number; ground?: boolean }

export interface Room { level: number; name: string; rect: Rect; dim: string; label?: [number, number] }

/** Furniture and fixtures. Footprint is w (along local x) by d (local depth); the front faces +depth. rot = quarter turns. */
export interface Item {
  level: number;
  type: ItemType;
  x: number; y: number; rot: 0 | 1 | 2 | 3;
  w: number; d: number; h?: number;
  label?: string;
  /** Free-form per-type options (colour, sink position, etc.). */
  o?: Record<string, unknown>;
}

export type ItemType =
  | 'sofa' | 'armchair' | 'loungeChair' | 'diningChair' | 'visitorChair' | 'officeChair' | 'barStool' | 'bench'
  | 'coffeeTable' | 'diningTable' | 'sideTable' | 'roundTable' | 'outdoorSet' | 'console'
  | 'tvUnit' | 'temple' | 'crockery' | 'wardrobe' | 'dresser' | 'desk' | 'bookshelf' | 'nightstand' | 'storage'
  | 'bed' | 'rug' | 'plant' | 'planter' | 'chandelier' | 'pendant' | 'art' | 'clock' | 'wallTv'
  | 'counter' | 'fridge' | 'microwave' | 'vanity' | 'wc' | 'shower' | 'washingMachine' | 'waterTank' | 'dryingRack'
  | 'pergola' | 'swing' | 'basket';

export interface Viewpoint { name: string; x: number; y: number; level: number; heading: number; pitch?: number }

export interface HousePlan {
  id: string;
  name: string;
  floorHeight: number;
  ceilingHeight: number;
  levels: { name: string; size: string }[];
  /** Plan-view extents per level for drawings: [xmin, ymin, xmax, ymax] of the built area. */
  extents: Rect[];
  slabs: Slab[];
  walls: Wall[];
  openings: Opening[];
  railings: Railing[];
  flights: StairFlight[];
  landings: Landing[];
  floors: FloorFinish[];
  rooms: Room[];
  items: Item[];
  /** Plan-only annotations */
  stairArrows: { level: number; pts: [number, number][] }[];
  dashed: { level: number; rect: Rect }[];
  /** Walkthrough */
  viewpoints: Viewpoint[];
  tour: [number, number][];
  street: { yRoad: number };
  schedule?: [string, string[]][][];
}
