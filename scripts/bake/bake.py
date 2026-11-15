"""
Offline light bake for the web walkthrough (Blender 5.x, runs headless via the `bpy` module or `blender -b -P`).

Input : house.glb (from the web app's ?export mode, or a designer's SketchUp model exported to glTF)
        lights.json (fixtures: position in plan feet, strength, colour; sun position)
Output: <out>/baked.glb        architecture per level with a second UV set (TEXCOORD_1) for the lightmap
        <out>/lm_L<n>.png      lightmap per level (sRGB-encoded irradiance, scaled by `scale` in meta)
        <out>/bake.json        { levels: [{ level, image, scale }] }
        <out>/preview.png      optional path-traced still from a camera (--preview)

Coordinates: plan (x, y, height) -> three.js (x, height, y) -> Blender (x, -y, height).

Usage:
  python scripts/bake/bake.py house.glb lights.json out/ --res 2048 --samples 256 --hdri sky.hdr [--preview x,y,z,heading] [--only-preview]
"""
import argparse
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('glb'); ap.add_argument('lights'); ap.add_argument('out')
ap.add_argument('--res', type=int, default=2048)
ap.add_argument('--samples', type=int, default=256)
ap.add_argument('--hdri', default='')
ap.add_argument('--hdri-strength', type=float, default=1.0)
ap.add_argument('--sun-strength', type=float, default=4.0)
ap.add_argument('--lamp-watts', type=float, default=450.0, help='Blender watts for a fixture of strength 1 (scene units are feet)')
ap.add_argument('--preview', default='', help='x,y,z,heading in plan feet/radians for a path-traced check render')
ap.add_argument('--preview-size', default='960x600')
ap.add_argument('--only-preview', action='store_true')
ap.add_argument('--levels', default='', help='comma list of levels to bake (default all)')
a = ap.parse_args(argv)
os.makedirs(a.out, exist_ok=True)
L = json.load(open(a.lights))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = a.samples
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 2
scene.cycles.transparent_max_bounces = 8
scene.render.threads_mode = 'AUTO'

bpy.ops.import_scene.gltf(filepath=a.glb)
meshes = [o for o in scene.objects if o.type == 'MESH']
print(f'imported {len(meshes)} meshes', flush=True)


def plan_to_blender(x, y, h):
    return Vector((x, -y, h))


# ---------------- lighting ----------------
world = bpy.data.worlds.new('World'); scene.world = world
world.use_nodes = True
nt = world.node_tree
bg = nt.nodes['Background']
if a.hdri:
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(a.hdri)
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
else:
    bg.inputs['Color'].default_value = (0.75, 0.82, 0.9, 1)
bg.inputs['Strength'].default_value = a.hdri_strength

# sun: three.js position (x, y_up, z) -> blender (x, -z, y), pointing at the house centre
sx, sy, sz = L['sun']
sun_pos = Vector((sx, -sz, sy)); target = Vector((6, -18, 10))
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = a.sun_strength; sun.angle = math.radians(1.2)
sun.color = (1.0, 0.95, 0.88)
so = bpy.data.objects.new('Sun', sun); scene.collection.objects.link(so)
so.rotation_euler = (target - sun_pos).to_track_quat('-Z', 'Y').to_euler()


def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


for i, an in enumerate(L['anchors']):
    ld = bpy.data.lights.new(f'Lamp{i}', 'POINT')
    ld.energy = a.lamp_watts * an['strength']
    ld.shadow_soft_size = 0.35
    ld.color = hex_rgb(an['color'])
    lo = bpy.data.objects.new(f'Lamp{i}', ld); scene.collection.objects.link(lo)
    lo.location = plan_to_blender(an['x'], an['y'], an['z'])

# glass panes: let light through (they would otherwise darken the rooms behind windows)
for o in meshes:
    names = [m.name for m in o.data.materials if m]
    if any(n.startswith('glass') for n in names):
        o.visible_shadow = False
        o.visible_diffuse = False
        o.visible_transmission = False

# ---------------- preview render ----------------
if a.preview:
    x, y, z, h = map(float, a.preview.split(','))
    cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = 18; cam_d.sensor_width = 36
    cam = bpy.data.objects.new('Cam', cam_d); scene.collection.objects.link(cam)
    cam.location = plan_to_blender(x, y, z)
    look = plan_to_blender(x + math.sin(h), y + math.cos(h), z - 0.08)
    cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    w, hgt = map(int, a.preview_size.split('x'))
    scene.render.resolution_x, scene.render.resolution_y = w, hgt
    scene.render.resolution_percentage = 100
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = 0.0
    scene.render.filepath = os.path.join(a.out, 'preview.png')
    print('rendering preview…', flush=True)
    bpy.ops.render.render(write_still=True)
    print('preview written', flush=True)
    if a.only_preview:
        sys.exit(0)

# ---------------- bake architecture lightmaps ----------------
levels = sorted({int(o.name.split('|')[1][1:]) for o in meshes if o.name.startswith('arch|')})
if a.levels:
    levels = [l for l in levels if l in {int(v) for v in a.levels.split(',')}]
scene.cycles.use_denoising = False
scene.render.bake.margin = 6
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = False

meta = {'levels': []}
baked_objs = []
for lv in levels:
    # re-read the scene each time: joining deletes the source objects
    parts = [o for o in scene.objects if o.type == 'MESH' and o.name.startswith(f'arch|L{lv}|') and 'glass' not in o.name and 'curtain' not in o.name]
    if not parts:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = f'baked|L{lv}'
    me = ob.data
    base_uv = me.uv_layers[0]
    lm = me.uv_layers.new(name='lightmap')
    me.uv_layers.active = lm
    base_uv.active_render = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    img = bpy.data.images.new(f'lm_L{lv}', a.res, a.res, float_buffer=True)
    for m in me.materials:
        if not m:
            continue
        m.use_nodes = True
        n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; n.name = 'BAKE_TARGET'
        m.node_tree.nodes.active = n
    print(f'baking level {lv} ({len(me.polygons)} faces) at {a.res}px, {a.samples} spp…', flush=True)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, use_clear=True)

    # denoise with Intel Open Image Denoise's lightmap filter (pip install pyoidn); fall back to a small blur
    px = np.empty(a.res * a.res * 4, dtype=np.float32); img.pixels.foreach_get(px)
    px = np.ascontiguousarray(px.reshape(a.res, a.res, 4)[:, :, :3])
    try:
        import pyoidn
        px = np.asarray(pyoidn.denoise(px, filter_type=pyoidn.OIDN_FILTER_TYPE_RT_LIGHTMAP), dtype=np.float32)
        print('  denoised with OIDN (RTLightmap)', flush=True)
    except Exception as e:  # noqa: BLE001
        print(f'  OIDN unavailable ({e}); using blur', flush=True)
        k = np.array([1, 4, 6, 4, 1], dtype=np.float32); k /= k.sum()
        for axis in (0, 1):
            px = sum(np.roll(px, s - 2, axis=axis) * k[s] for s in range(5))
    lit = px[px.max(axis=2) > 1e-4]
    # encoding range: LED strips and their hot spots would dominate a high percentile, so cap it and let them clip
    scale = min(float(np.percentile(lit, 98.0)), 4.0) if lit.size else 1.0
    enc = np.clip(px / scale, 0, 1)
    enc = np.where(enc <= 0.0031308, enc * 12.92, 1.055 * np.power(enc, 1 / 2.4) - 0.055)
    out = bpy.data.images.new(f'lm8_L{lv}', a.res, a.res, alpha=False)
    out.colorspace_settings.name = 'Non-Color'
    rgba = np.concatenate([enc, np.ones((a.res, a.res, 1), np.float32)], axis=2).ravel()
    out.pixels.foreach_set(rgba)
    path = os.path.join(a.out, f'lm_L{lv}.png')
    out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    meta['levels'].append({'level': lv, 'image': f'lm_L{lv}.png', 'scale': scale})
    print(f'level {lv}: scale {scale:.3f} -> {path}', flush=True)
    baked_objs.append(ob)

# strip textures before export: the web app re-applies its own PBR materials by name
for ob in baked_objs:
    for m in ob.data.materials:
        if m and m.node_tree:
            for n in list(m.node_tree.nodes):
                if n.type == 'TEX_IMAGE':
                    m.node_tree.nodes.remove(n)
bpy.ops.object.select_all(action='DESELECT')
for ob in baked_objs:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(a.out, 'baked.glb'), export_format='GLB', use_selection=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT', export_yup=True)
json.dump(meta, open(os.path.join(a.out, 'bake.json'), 'w'), indent=1)
print('done', flush=True)
