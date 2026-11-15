import { createPlanBuilder } from '../dsl';
import type { HousePlan } from '../types';

/**
 * G+2 row house, 12 ft clear width. Ported from the hand-drawn sketches (1 grid square = 1 ft,
 * road at the top / y < 0). Ground floor is 44 ft deep incl. wash yard; first and second floors
 * are 38 ft plus a 4-5 ft cantilevered front extension.
 */
export function buildG2House(): HousePlan {
  const b = createPlanBuilder({
    id: 'g2-house',
    name: 'G+2 House',
    floorHeight: 10,
    ceilingHeight: 9.5,
    levels: [
      { name: 'Ground Floor', size: '12′ × 44′' },
      { name: 'First Floor', size: '12′ × 38′ + 5′ front' },
      { name: 'Second Floor', size: '12′ × 38′ + 5′ front' },
    ],
    extents: [[0, 0, 12, 44], [0, -5, 12, 38], [0, -5, 12, 38]],
    street: { yRoad: -18 },
  });
  const { wall, lintel, door, win, slider, railing, flight, landing, floor, room, item, itemC, art, planter, slab } = b;
  const P = b.plan;

  /* ---------------- GROUND FLOOR ---------------- */
  {
    const L = 0;
    slab(L, -1, -5, 13, 45, { z0: -0.3, z1: 0, ground: true });
    // side walls with TV and temple niches
    wall(L, -1, -1, 0, 38); wall(L, 12, -1, 13, 4); wall(L, 12.6, 4, 13, 11); lintel(L, 12, 4, 12.6, 11, 7.6);
    wall(L, 12, 11, 13, 16); wall(L, 12.6, 16, 13, 19); lintel(L, 12, 16, 12.6, 19, 7.4); wall(L, 12, 19, 13, 38);
    // wash-yard compound walls
    wall(L, -1, 38, 0, 45, 0, 7); wall(L, 12, 38, 13, 45, 0, 7); wall(L, -1, 44, 13, 45, 0, 7);
    // front
    wall(L, 0, -1, 1, 0); win(L, 'h', 1, 7, -1, 0, { curtain: 1 }); wall(L, 7, -1, 8, 0);
    door(L, 'h', 8, 12, -1, 0, { width: 3.8, double: true, swing: 1, head: 7.5 });
    // row 21: glass pocket slider + wall
    wall(L, 3, 20, 12, 21); slider(L, 'h', 0, 3, 20, 21);
    // row 30
    door(L, 'h', 0, 3, 29, 30, { width: 2.7, swing: -1, hinge: 'a1' }); wall(L, 3, 29, 9, 30); wall(L, 9, 29, 12, 30, 0, 4.5);
    // stair to first floor
    flight(L, 'x', 3, 9, 30, 33, 0, 8, 5); landing(L, 9, 30, 12, 33, 5); flight(L, 'y', 30, 24, 9, 12, 5, 8, 10);
    lintel(L, 8.85, 24, 9, 29, 5.2);
    P.stairArrows.push({ level: L, pts: [[3.4, 31.5], [10.5, 31.5], [10.5, 24.6]] });
    // washroom
    wall(L, 3, 32.83, 12, 33.17); door(L, 'v', 33, 36, 3, 4, { width: 2.5, swing: 1, hinge: 'a1' }); wall(L, 3, 36, 4, 37);
    // row 38
    door(L, 'h', 0, 3, 37, 38, { width: 2.7, swing: 1, hinge: 'a1' }); wall(L, 3, 37, 12, 38);
    // finishes and rooms
    floor(L, 0, -5, 12, -1, 'stone'); floor(L, 0, -1, 12, 21, 'marble'); floor(L, 0, 20.4, 12, 30, 'tile2');
    floor(L, 0, 29.6, 3.5, 38, 'tile2'); floor(L, 4, 33.17, 12, 37, 'tile'); floor(L, 0, 38, 12, 44, 'stone');
    room(L, 'Main Hall', 0, 0, 12, 20, '12′ × 20′', 6, 10.6); room(L, 'Kitchen', 0, 21, 12, 29, '12′ × 8′', 5.6, 25.4);
    room(L, 'Passage', 0, 30, 3, 37, '3′ wide', 1.5, 34.6); room(L, 'Washroom', 4, 33, 12, 37, '8′ × 4′', 8, 33.75);
    room(L, 'Wash Yard', 0, 38, 12, 44, '12′ × 6′', 5, 41.3); room(L, 'Entrance porch', 0, -5, 12, -1, 'under 1st-floor extension', 6, -3);
    P.dashed.push({ level: L, rect: [-1, -5, 13, -1] });

    // main hall
    item(L, 'rug', 3.3, 3.5, 0, 6.2, 8, { color: 'burgundy' });
    item(L, 'sofa', 0.2, 4, 3, 7, 2.8, { label: '3-seat sofa', model: 'Sofa_01', pillows: true });
    item(L, 'sofa', 1.6, 0.4, 0, 4.8, 2.7, { label: 'Loveseat', model: 'sofa_03' });
    item(L, 'coffeeTable', 4.6, 5.6, 0, 2.8, 3.8, { label: 'Centre table' });
    item(L, 'tvUnit', 11.1, 4, 1, 7, 1.5, { label: 'TV unit' });
    item(L, 'console', 10.9, 2.2, 1, 1.6, 1.1);
    item(L, 'temple', 11.1, 16, 1, 3, 1.5, { label: 'Temple' });
    item(L, 'diningTable', 3.9, 13, 0, 2.9, 5, { label: 'Dining 6-seat' });
    for (const yy of [13.2, 14.75, 16.3]) { item(L, 'diningChair', 2.3, yy - 0.05, 3, 1.6, 1.6); item(L, 'diningChair', 6.8, yy - 0.05, 1, 1.6, 1.6); }
    item(L, 'crockery', 4.2, 18.7, 2, 4.8, 1.3, { label: 'Crockery unit' });
    itemC(L, 'plant', 0.8, 12.1, 2); itemC(L, 'plant', 7.4, 0.8, 1.6); itemC(L, 'plant', 11.2, 12.4, 1.6);
    itemC(L, 'chandelier', 6, 7.5, 2.4); itemC(L, 'chandelier', 5.35, 15.5, 2);
    art(L, 'v', 5.2, 2, 0, 1, 4.4, 6.2, 'art1'); art(L, 'v', 7.6, 2, 0, 1, 4.4, 6.2, 'art2');
    art(L, 'v', 9.9, 1.2, 0, 1, 4.6, 6.0, 'art3'); art(L, 'v', 13.6, 3.6, 0, 1, 4.2, 6.6, 'art3');
    // kitchen
    item(L, 'counter', 3.2, 21, 0, 5.8, 2, { label: 'Serving table', h: 3.1, up: [[0, 5.8]] });
    for (const xx of [4.2, 5.6, 7.0, 8.4]) itemC(L, 'barStool', xx, 23.7, 1.3);
    item(L, 'counter', 9.5, 21, 1, 8, 2.5, { label: 'Kitchen platform', hob: 1.4, chimney: 9.4, up: [[0, 3.4]], purifier: true });
    itemC(L, 'pendant', 4.6, 22.6, 1.2); itemC(L, 'pendant', 7.4, 22.6, 1.2);
    item(L, 'clock', 3.4, 28.9, 2, 1.0, 0.1, { z: 6.4 });
    item(L, 'fridge', 3.2, 26.7, 2, 2.6, 2.3, { label: 'Fridge', h: 6.2 });
    item(L, 'counter', 5.9, 27, 2, 3.6, 2, { label: 'Sink', sink: 0.9, up: [[0, 3.6]] });
    // washroom
    item(L, 'vanity', 4.3, 35.4, 2, 2, 1.6, { label: 'Basin' }); item(L, 'wc', 7.2, 34.8, 2, 1.7, 2.2, { label: 'WC' });
    item(L, 'shower', 9.4, 33.2, 0, 2.6, 3.8, { label: 'Shower' });
    // wash yard
    item(L, 'counter', 3, 38, 0, 3, 1.2, { label: 'Undertop washbasin', sink: 0.6, h: 2.7 });
    item(L, 'counter', 6, 38, 0, 4, 1.2, { label: 'Wash counter', h: 2.7 });
    item(L, 'washingMachine', 10, 38, 0, 2, 2, { label: 'Washing machine' });
    item(L, 'waterTank', 10, 40, 0, 2, 4, { label: 'Water tank' });
    item(L, 'dryingRack', 1, 42.3, 0, 6, 1.2, { label: 'Drying rack' });
    item(L, 'basket', 7.2, 41, 0, 1.4, 1.1);
    itemC(L, 'plant', 0.8, 40.6, 1.6); itemC(L, 'plant', 8.6, 43.2, 1.6);
    art(L, 'v', 31, 2.4, 0, 1, 4.4, 6.0, 'art2');
  }

  /* ---------------- FIRST FLOOR ---------------- */
  {
    const L = 1;
    slab(L, -1, -5, 13, 24); slab(L, -1, 24, 9, 33); slab(L, -1, 33, 13, 38);
    wall(L, -1, -5, 0, 38); wall(L, 12, -1, 13, 38); wall(L, 12, -5, 13, -1, 0, 3.4);
    // extension: washroom front wall with ventilator, balcony railing, partition
    win(L, 'h', 0, 7, -5, -4.5, { offset: 2.4, width: 2.2, sill: 6, head: 7.5 }); wall(L, 6.83, -4.5, 7.17, -1); railing(L, 'h', 7.17, 12, -4.8);
    // row 0
    wall(L, 0, -1, 4, 0); door(L, 'h', 4, 7, -1, 0, { width: 2.5, offset: 0.4, swing: -1, hinge: 'a2' });
    win(L, 'h', 7, 9, -1, 0, { curtain: 1 }); door(L, 'h', 9, 12, -1, 0, { width: 2.75, swing: -1, hinge: 'a2' });
    // row 21
    wall(L, 0, 20, 9, 21); door(L, 'h', 9, 12, 20, 21, { width: 2.75, swing: -1, hinge: 'a2' });
    // col 9, row 30
    door(L, 'v', 21, 24, 8, 9, { width: 2.6, swing: -1, hinge: 'a1' }); wall(L, 8, 24, 9, 29); wall(L, 6, 29, 9, 30);
    // stair to second floor (as drawn: starts at column 7)
    flight(L, 'x', 6, 9, 30, 33, 0, 4, 2.5); landing(L, 9, 31.5, 12, 33, 2.5); landing(L, 9, 30, 12, 31.5, 3.125);
    flight(L, 'y', 30, 24, 9, 12, 3.125, 11, 10);
    P.stairArrows.push({ level: L, pts: [[6.3, 31.5], [10.5, 31.5], [10.5, 24.6]] });
    // rear washroom
    wall(L, 5, 32.83, 12, 33.17); door(L, 'v', 33, 37, 4.83, 5.17, { width: 2.4, offset: 0.5, swing: 1, hinge: 'a1' });
    // row 38
    wall(L, 0, 37, 2, 38); win(L, 'h', 2, 5, 37, 38, { curtain: -1 }); wall(L, 5, 37, 12, 38);
    floor(L, 0, -4.5, 6.83, -1, 'tile'); floor(L, 7.17, -4.8, 12, -1, 'stone'); floor(L, 0, -1, 12, 21, 'wood');
    floor(L, 8, 20, 12, 24, 'marble'); floor(L, 0, 21, 8, 29, 'wood'); floor(L, 0, 29, 6, 33, 'wood');
    floor(L, 0, 33, 5, 37, 'wood'); floor(L, 5.17, 33.17, 12, 37, 'tile');
    room(L, 'Master Bedroom', 0, 0, 12, 20, '12′ × 20′', 6.4, 17.3); room(L, 'Washroom', 0, -5, 7, -1, '7′ × 4′', 3.5, -1.55);
    room(L, 'Balcony', 7, -5, 12, -1, '5′ × 4′', 9.6, -1.6); room(L, '2nd Bedroom', 0, 21, 8, 29, '8′ × 8′', 5.1, 28.6);
    room(L, 'Stair lobby', 9, 21, 12, 24, '3′ × 3′', 10.5, 22.5); room(L, 'Dressing lobby', 2, 29, 6, 33, '4′ × 4′', 4, 31.4);
    room(L, 'Bay', 2, 33, 5, 37, '3′ × 4′', 3.5, 33.7); room(L, 'Washroom', 5, 33, 12, 37, '7′ × 4′', 8.6, 33.75);

    // master bedroom
    item(L, 'rug', 2.5, 4.6, 0, 7, 8.6, { color: 'blue' });
    item(L, 'bed', 0.1, 5.9, 3, 6.2, 6.8, { label: 'King bed', color: 'burgundy' });
    item(L, 'nightstand', 0.1, 4.3, 3, 1.5, 1.4); item(L, 'nightstand', 0.1, 12.2, 3, 1.5, 1.4);
    item(L, 'bench', 7.1, 7.2, 3, 3.6, 1.4, { label: 'Bench' });
    item(L, 'tvUnit', 10.6, 6.2, 1, 5.6, 1.5, { label: 'TV unit', compact: true });
    item(L, 'wardrobe', 0, 13.9, 3, 6, 2, { label: 'Wardrobe' });
    item(L, 'dresser', 10.6, 13.2, 1, 3.2, 1.4, { label: 'Dresser' });
    item(L, 'desk', 10, 2.2, 1, 3.6, 2, { label: 'Writing desk', lamp: true });
    item(L, 'diningChair', 8.4, 3.2, 3, 1.6, 1.6);
    item(L, 'armchair', 0.3, 0.4, 3, 2.8, 2.6, { label: 'Armchair' });
    itemC(L, 'sideTable', 3.6, 1.1, 1.3);
    itemC(L, 'plant', 0.8, 3.6, 1.4); itemC(L, 'chandelier', 5.5, 9, 2.2);
    art(L, 'v', 7.2, 1.8, 0, 1, 5, 6.6, 'art3'); art(L, 'v', 9.4, 1.8, 0, 1, 5, 6.6, 'art1');
    // front washroom
    item(L, 'shower', 0.1, -4.45, 0, 2.8, 3.4, { label: 'Shower' }); item(L, 'wc', 3.1, -4.5, 0, 1.7, 2.2, { label: 'WC' });
    item(L, 'vanity', 4.9, -4.5, 0, 1.7, 1.6, { label: 'Basin' });
    // balcony
    item(L, 'outdoorSet', 7.4, -3.95, 1, 2.8, 4.4, { label: 'Bistro set' }); planter(L, 9.3, -4.6, 11.9, -4.05);
    // 2nd bedroom
    item(L, 'rug', 1.6, 22, 0, 5.4, 6.4, { color: 'blue' });
    item(L, 'bed', 0.1, 22.7, 3, 5, 6.3, { label: 'Queen bed', color: 'navy' });
    item(L, 'nightstand', 0.1, 21.3, 3, 1.25, 1.4); item(L, 'nightstand', 0.1, 27.8, 3, 1.2, 1.4);
    item(L, 'wallTv', 7.75, 24.6, 1, 3, 0.2, { label: 'Wall TV' });
    item(L, 'wardrobe', 0, 29, 3, 8, 2, { label: 'Wardrobes' });
    item(L, 'desk', 2.2, 35.2, 2, 2.6, 1.7, { label: 'Study desk', lamp: true });
    item(L, 'diningChair', 2.7, 33.5, 0, 1.6, 1.6);
    art(L, 'h', 1.6, 3, 21, 1, 4.6, 6.4, 'art2');
    // rear washroom
    item(L, 'vanity', 5.5, 35.4, 2, 1.9, 1.6, { label: 'Basin' }); item(L, 'wc', 7.8, 34.8, 2, 1.7, 2.2, { label: 'WC' });
    item(L, 'shower', 9.8, 33.2, 0, 2.2, 3.8, { label: 'Shower' });
    itemC(L, 'plant', 11.3, 21.6, 1.2);
  }

  /* ---------------- SECOND FLOOR ---------------- */
  {
    const L = 2;
    slab(L, -1, -5, 13, 24); slab(L, -1, 24, 9, 33); slab(L, -1, 33, 13, 38);
    slab(3, -1, 20, 13, 38); // roof over the enclosed rear part
    wall(L, -1, 20, 0, 38); wall(L, 12, 20, 13, 38); wall(L, -1, -5, 0, 20, 0, 3.4); wall(L, 12, -5, 13, 20, 0, 3.4);
    railing(L, 'h', 0, 12, -4.8);
    wall(L, 0, 20, 1, 21); win(L, 'h', 1, 4, 20, 21, { curtain: 1 }); wall(L, 4, 20, 5, 21);
    door(L, 'h', 5, 8, 20, 21, { width: 2.75, swing: 1, hinge: 'a1' }); wall(L, 8, 20, 9, 21);
    door(L, 'h', 9, 12, 20, 21, { width: 2.75, swing: -1, hinge: 'a2' });
    door(L, 'v', 21, 24, 8, 9, { width: 2.6, swing: -1, hinge: 'a2' }); wall(L, 8, 24, 9, 33);
    wall(L, 0, 32.83, 5, 33.17); wall(L, 4, 33, 5, 34); door(L, 'v', 34, 37, 4, 5, { width: 2.4, swing: -1, hinge: 'a1' });
    railing(L, 'h', 9, 12, 33.15);
    wall(L, 0, 37, 5, 38); win(L, 'h', 5, 10, 37, 38, {}); wall(L, 10, 37, 12, 38);
    floor(L, 0, -4.8, 12, 20, 'deck'); floor(L, 8, 20, 12, 24, 'marble'); floor(L, 0, 20.4, 8, 33, 'wood');
    floor(L, 0, 33.17, 4, 37, 'tile'); floor(L, 4, 33, 12, 37, 'tile2');
    room(L, 'Open Terrace', 0, -5, 12, 20, '12′ × 25′', 6, 10.2); room(L, 'Office Room', 0, 21, 8, 29, '8′ × 8′', 4.6, 29.6);
    room(L, 'Pantry', 0, 29, 8, 33, '8′ × 4′', 6.8, 30.6); room(L, 'Toilet', 0, 33, 4, 37, '4′ × 4′', 2.6, 35.6);
    room(L, 'Rear lobby', 5, 33, 12, 37, '7′ × 4′', 8.5, 34.6); room(L, 'Stair landing', 9, 21, 12, 24, '3′ × 3′', 10.5, 22.5);

    // office
    item(L, 'rug', 0.6, 23.4, 0, 5.6, 5.6, { color: 'blue' });
    item(L, 'desk', 0.7, 24.9, 2, 4.8, 2.4, { label: 'Executive desk', exec: true, lamp: true });
    item(L, 'officeChair', 2.2, 27.4, 2, 1.9, 1.9);
    item(L, 'visitorChair', 0.9, 22.8, 0, 1.9, 1.9); item(L, 'visitorChair', 3.1, 22.8, 0, 1.9, 1.9);
    item(L, 'console', 4.7, 21, 0, 2.8, 1.1, { label: 'Console' });
    item(L, 'bookshelf', 6.9, 24.4, 1, 5.2, 1.1, { label: 'Bookshelf' });
    itemC(L, 'pendant', 3.1, 26.1, 1.2);
    art(L, 'v', 24.6, 3.4, 0, 1, 4.4, 6.6, 'art3');
    // pantry
    item(L, 'counter', 0, 31, 2, 3.5, 1.83, { label: 'Sink + hob', sink: 1.6, hob: 0.05, induction: true, up: [[0, 3.5]] });
    item(L, 'fridge', 3.6, 31.2, 2, 1.7, 1.6, { label: 'Small fridge', h: 3.1, upper: true });
    item(L, 'microwave', 3.65, 31.4, 2, 1.6, 1.2, { z: 3.15 });
    // toilet + lobby
    item(L, 'wc', 0.3, 34.8, 2, 1.7, 2.2, { label: 'WC' });
    item(L, 'vanity', 0.15, 33.2, 3, 1.0, 1.2, { label: 'Basin', wall: true });
    item(L, 'storage', 5.4, 35.8, 2, 4.6, 1.2, { label: 'Storage cabinets' });
    itemC(L, 'plant', 11.2, 36.1, 1.6); itemC(L, 'plant', 5.6, 34.0, 1.2);
    // terrace
    item(L, 'pergola', 0, -4.9, 0, 12, 9, { label: 'Pergola over' });
    P.dashed.push({ level: L, rect: [0, -4.9, 12, 4.1] });
    item(L, 'sofa', 0.6, -1.4, 3, 4.6, 2.6, { label: 'Outdoor sofa', model: 'painted_wooden_sofa' });
    item(L, 'loungeChair', 8.4, -0.8, 1, 2, 2.2); item(L, 'loungeChair', 8.4, 1.4, 1, 2, 2.2);
    item(L, 'coffeeTable', 4.6, -0.4, 0, 2.4, 3, { outdoor: true });
    planter(L, 0.6, -4.5, 11.4, -3.9);
    item(L, 'swing', 1, 6.5, 0, 5.4, 2.4, { label: 'Swing (jhula)' });
    item(L, 'roundTable', 4, 12.4, 0, 3.6, 3.6, { label: 'Outdoor dining' });
    item(L, 'visitorChair', 4.85, 10.6, 0, 1.9, 1.9); item(L, 'visitorChair', 4.85, 15.9, 2, 1.9, 1.9);
    item(L, 'visitorChair', 2.3, 13.25, 3, 1.9, 1.9); item(L, 'visitorChair', 7.4, 13.25, 1, 1.9, 1.9);
    planter(L, 0.2, 9.5, 0.9, 19.6); planter(L, 11.1, 5, 11.8, 16.5);
  }

  /* ---------------- WALKTHROUGH ---------------- */
  P.viewpoints = [
    { name: 'Street view', x: 6, y: -24, level: 0, heading: 0, pitch: 0.12 },
    { name: 'Main Hall, from the door', x: 10, y: 1.2, level: 0, heading: -0.38, pitch: 0.08 },
    { name: 'Dining and temple', x: 2.2, y: 11.5, level: 0, heading: 0.55 },
    { name: 'Kitchen', x: 1.5, y: 22, level: 0, heading: 0.75 },
    { name: 'Wash yard', x: 1.5, y: 39.5, level: 0, heading: 1.0 },
    { name: 'Master Bedroom', x: 10.5, y: 18.5, level: 1, heading: Math.PI + 0.45 },
    { name: 'Balcony', x: 10, y: -2.6, level: 1, heading: Math.PI + 0.5 },
    { name: '2nd Bedroom', x: 7.2, y: 22.6, level: 1, heading: -0.75 },
    { name: 'Office Room', x: 6.4, y: 24.2, level: 2, heading: -1.0, pitch: 0.12 },
    { name: 'Office pantry', x: 6.2, y: 29.3, level: 2, heading: -0.75, pitch: 0.28 },
    { name: 'Open Terrace', x: 10.5, y: 17.5, level: 2, heading: Math.PI + 0.35 },
  ];
  P.tour = [[10, -12], [10, -1.5], [10, 2], [9.6, 8], [9.6, 13], [9.8, 18.6], [3, 19.2], [1.5, 20.5], [1.5, 24], [1.5, 29.5], [1.6, 31.5], [3.4, 31.5], [9, 31.5], [10.5, 31.5], [10.5, 29.5], [10.5, 24], [10.5, 22.5],
    [10.5, 20.5], [10.3, 17.5], [8.2, 13], [8.4, 6], [9.6, 1.8], [10.4, 0.3], [10.4, -0.8], [10, -3], [10.4, -0.8], [10.4, 1], [8.4, 8], [9.6, 17], [10.5, 20.5], [10.5, 22.5], [8.5, 22.4], [7.2, 22.6], [7.2, 28.4], [5.3, 28.3], [4.6, 29.9], [4.6, 31.5],
    [6.2, 31.5], [9, 31.5], [10.5, 32.3], [10.5, 30.8], [10.5, 24], [10.5, 22.5], [8.5, 22.5], [6.6, 23.3], [6.6, 29.6], [6.6, 24], [8.5, 22.5], [10.5, 22.5], [10.5, 20.5], [10.5, 17], [8, 11], [6, 4]];

  P.schedule = [
    [['Main Hall', ['3-seat sofa and loveseat in an L, marble-top centre table, bordered rug', 'Walnut TV unit with side shelves in the wall niche', '6-seat dining table, crockery unit on the kitchen wall', 'Marble and walnut temple in its niche', 'Entry console with mirror, two chandeliers, plants, framed art']],
      ['Kitchen', ['Serving table with 4 bar stools, pendant lights and wall cabinets', '7′ platform with hob and chimney at the front end, water purifier on the wall', 'Fridge and sink counter on the rear wall']],
      ['Washroom', ['Basin with mirror near the door, WC in the middle, glass-screened shower at the right']],
      ['Wash Yard', ['Undertop washbasin and wash counter', 'Washing machine, water tank, drying rack, plants']]],
    [['Master Bedroom', ['King bed with upholstered headboard, two nightstands with lamps, foot bench', '6′ wardrobe, dresser with mirror, TV unit', 'Writing desk and chair, reading armchair with side table', 'Rug, chandelier, curtains, framed art']],
      ['Washroom (front)', ['Shower at the far end, WC, basin with mirror, high ventilator']],
      ['Balcony', ['Bistro table with two folding chairs, planter along the railing']],
      ['2nd Bedroom', ['Queen bed, two nightstands, wall-mounted TV, rug', '8′ run of wardrobes, study desk at the rear window']],
      ['Washroom (rear)', ['Basin, WC and shower']]],
    [['Office Room', ['Executive desk with lounge chair and two visitor chairs', 'Full-height bookshelf, console under the window, rug, pendant light']],
      ['Pantry', ['Counter with sink and 2-zone induction hob, wall cabinets', 'Under-counter small fridge with a microwave above']],
      ['Toilet and rear lobby', ['WC and wall basin', 'Storage cabinets under the rear window, plants']],
      ['Open Terrace', ['Timber pergola with outdoor sofa, two lounge chairs and a low table', 'Swing (jhula), round outdoor dining table for four', 'Planters along the front and both sides']]],
  ];
  return P;
}
