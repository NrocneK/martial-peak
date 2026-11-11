"""
Chép lại pixel art phóng to (ảnh mẫu) về đúng lưới điểm ảnh gốc của nó — mỗi ô lưới → 1 điểm ảnh.

  python3 -I tools/art/trace_ref.py <ảnh> <x0> <y0> <x1> <y1> <bước_x> <lệch_x> <bước_y> <lệch_y> <ra.png>

Bước/lệch lưới đo bằng cách dò nhịp biên màu (xem find_grid). Mỗi ô lấy trung vị phần lõi (bỏ mép bị nhòe),
điểm gần màu nền → trong suốt; màu được quy về bảng màu sprite (hero_palette.json).
"""
import json
import os
import sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = json.load(open(os.path.join(HERE, 'hero_palette.json')))
KEYS = list(PAL)
ARR = np.array([PAL[k][:3] for k in KEYS], float)
# thêm màu vàng (kiếm/vòng) để không bị ép sang màu da
EXTRA = np.array([[232, 184, 72], [150, 100, 36], [250, 230, 160]], float)


def find_grid(img, box, lo, hi):
    c = img[box[1]:box[3], box[0]:box[2]]
    out = []
    for axis in (1, 0):
        g = np.abs(np.diff(c, axis=axis)).sum(2).sum(1 - axis)
        best = (0, 0, 0)
        for p in np.arange(lo, hi, 0.01):
            for o in np.arange(0, p, 0.25):
                idx = np.arange(o, len(g) - 1, p).astype(int)
                sc = g[idx].mean()
                if sc > best[0]:
                    best = (sc, p, o)
        out.append(best[1:])
    return out   # [(bước_x, lệch_x), (bước_y, lệch_y)] tính từ góc box


def trace(img, box, gx, gy, quant=True):
    bg = img[3, 3]
    x0, y0, x1, y1 = box
    (px, ox), (py, oy) = gx, gy
    nx, ny = int((x1 - x0 - ox) / px), int((y1 - y0 - oy) / py)
    out = Image.new('RGBA', (nx, ny), (0, 0, 0, 0))
    o = out.load()
    for j in range(ny):
        for i in range(nx):
            cx0, cy0 = x0 + ox + i * px, y0 + oy + j * py
            a, b = int(cy0 + py * 0.3), int(cy0 + py * 0.7) + 1
            c, d = int(cx0 + px * 0.3), int(cx0 + px * 0.7) + 1
            blk = img[a:b, c:d].reshape(-1, 3)
            col = np.median(blk, 0)
            if np.abs(col - bg).sum() < 40:
                continue
            if quant:
                allc = np.vstack([ARR, EXTRA])
                k = ((allc - col) ** 2).sum(1).argmin()
                col = allc[k]
            o[i, j] = (int(col[0]), int(col[1]), int(col[2]), 255)
    return out


if __name__ == '__main__':
    p = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    gx = (float(sys.argv[6]), float(sys.argv[7]))
    gy = (float(sys.argv[8]), float(sys.argv[9]))
    img = np.array(Image.open(p).convert('RGB')).astype(float)
    trace(img, (x0, y0, x1, y1), gx, gy).save(sys.argv[10])
    print('ok')
