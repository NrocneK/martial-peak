"""
LIỆT HỎA PHÙ (thức tỉnh) — LỬA XANH + VỤ NỔ XOÁY trước khi tắt lửa.

1) Đổi màu sang lửa xanh: lấy độ sáng của các ảnh lửa đỏ đã có (burn_in/loop/out, fire_blast, fire_ring) rồi tô lại
   theo dải xanh: xanh đậm → xanh lam → lam ngọc → trắng xanh → public/vfx/<tên>_blue.png
2) Vụ nổ xoáy (theo ảnh mẫu thứ 2: khối lửa cuộn xoáy dẹt trên mặt đất, lõi trắng, vòng sóng sát đất, tia sáng tỏa ra,
   tàn lửa văng) — vẽ bằng công thức, tông xanh, nhìn chéo → public/vfx/fire_swirl_blue.png (dải 14 khung 256×200)

  python3 -I tools/art/fire_blue.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
BLUE = [(0.0, (6, 20, 70)), (0.3, (20, 70, 200)), (0.55, (40, 150, 255)), (0.75, (90, 210, 255)),
        (0.9, (190, 240, 255)), (1.0, (250, 255, 255))]


def ramp(t, stops=BLUE):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def recolor(name):
    im = np.array(Image.open(os.path.join(VFX, name + '.png')).convert('RGBA')).astype(float)
    lum = (im[..., 0] * 0.3 + im[..., 1] * 0.55 + im[..., 2] * 0.15) / 255
    col = ramp(lum ** 0.9 * 1.05)
    Image.fromarray(np.dstack([col, im[..., 3]]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, name + '_blue.png'))


def swirl(n=14, w=256, h=200, k=0.55):
    frames = []
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx, cy = w / 2, h * 0.62
    for f in range(n):
        u = f / (n - 1)
        R = 0.25 + 0.75 * (1 - (1 - min(1, u * 1.5)) ** 2.5)
        fade = np.clip(1.3 - u ** 1.3 * 1.3, 0, 1)
        X, Y = (xx - cx) / (w * 0.42), (yy - cy) / (w * 0.42 * k)
        r = np.hypot(X, Y)
        th = np.arctan2(Y, X)
        # khối lửa cuộn: nhiều dải xoắn ốc sáng (xoay theo thời gian), dày ở giữa, mỏng ra mép
        spiral = np.zeros_like(r)
        for arms, tw, w0 in ((3, 4.0, 1.0), (2, 2.4, 0.7), (5, 6.5, 0.4)):
            spiral += w0 * np.clip(np.sin(arms * th + tw * r * 3 - u * 9), 0, 1) ** 2
        body = np.clip(1 - r / R, 0, 1) ** 0.7
        dome = np.clip(1 - np.hypot(X, (Y + 0.35 * R) * 1.3) / (R * 0.75), 0, 1)       # khối lửa nhô lên phía trên
        core = np.exp(-(np.hypot(X, Y + 0.15 * R) / (0.28 * R + 1e-3)) ** 2)
        ring = np.exp(-((r - R * 1.08) / 0.035) ** 2) * (u > 0.1)                       # vòng sóng sát đất
        rays = np.zeros_like(r)
        for a0 in (0.3, 1.2, 2.1, 2.9, 3.8, 4.6, 5.5):
            rays += np.exp(-((np.sin(th - a0)) / 0.025) ** 2) * (np.cos(th - a0) > 0) * np.clip(1 - r / (R * 1.6), 0, 1) * (r > R * 0.5)
        inten = np.clip(body * (0.35 + 0.5 * spiral) + dome * 0.5 + core * 1.1 + ring * 0.8 + rays * 0.7, 0, 1)
        alpha = np.clip(body * (0.5 + 0.6 * spiral) + dome * 0.7 + core + ring * 0.9 + rays * 0.8, 0, 1) * fade
        col = ramp(inten)
        img = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
        g = np.array(img.filter(ImageFilter.GaussianBlur(5))).astype(float)
        g[..., :3] = (60, 150, 255)
        g[..., 3] *= 0.7
        out = Image.fromarray(g.astype(np.uint8), 'RGBA')
        out.alpha_composite(img)
        frames.append(out)
    sheet = Image.new('RGBA', (w * n, h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.alpha_composite(fr, (w * i, 0))
    return sheet


def main():
    os.makedirs(OUT, exist_ok=True)
    for nm in ('burn_in', 'burn_loop', 'burn_out', 'fire_blast', 'fire_ring'):
        recolor(nm)
    sw = swirl()
    sw.save(os.path.join(VFX, 'fire_swirl_blue.png'))
    pv = Image.new('RGBA', (256 * 7, 200 * 3), (14, 14, 24, 255))
    for i in range(14):
        pv.alpha_composite(sw.crop((256 * i, 0, 256 * i + 256, 200)), ((i % 7) * 256, (i // 7) * 200))
    lp = Image.open(os.path.join(VFX, 'burn_loop_blue.png'))
    pv.alpha_composite(lp.crop((0, 0, 256 * 4, 201)).resize((1024, 200)), (0, 400))
    pv.save(os.path.join(OUT, 'fire_blue_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
