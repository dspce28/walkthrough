"""Re-encode an 8-bit sRGB lightmap to a new range without re-baking: python rescale.py bake.json [cap]"""
import json, os, sys
import numpy as np
from PIL import Image

meta_path = sys.argv[1]; cap = float(sys.argv[2]) if len(sys.argv) > 2 else 4.0
d = os.path.dirname(meta_path); meta = json.load(open(meta_path))
dec = lambda v: np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
enc = lambda v: np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
for l in meta['levels']:
    p = os.path.join(d, l['image'])
    lin = dec(np.asarray(Image.open(p).convert('RGB'), dtype=np.float32) / 255) * l['scale']
    lit = lin[lin.max(axis=2) > 1e-4]
    new = min(float(np.percentile(lit, 98.0)), cap) if lit.size else l['scale']
    Image.fromarray((np.clip(enc(np.clip(lin / new, 0, 1)), 0, 1) * 255 + 0.5).astype(np.uint8)).save(p)
    print(f"{l['image']}: scale {l['scale']:.2f} -> {new:.2f}")
    l['scale'] = new
json.dump(meta, open(meta_path, 'w'), indent=1)
