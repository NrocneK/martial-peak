"""
PHÁP TƯỚNG THIÊN ĐỊA — 2 hình:

  A) PHÁP TƯỚNG = chính nhân vật (public/ui/hero_b_walk.png, khung đứng hướng S — nhìn thẳng như ảnh mẫu) phóng lớn,
     hoá thành thân KHÍ VÀNG như ảnh mẫu: phóng mượt, tô vàng theo độ sáng (áo trắng → vàng trắng rực, tóc/áo tối →
     hổ phách mờ), viền sáng quanh thân, lửa vàng bốc ngược lên từ thân.     → public/vfx/phap_tuong_avatar.png
  B) BÀN TAY CHƯỞNG: lấy nguyên từ ảnh mẫu tools/art/ref/palm_ref.png (bàn tay lửa vàng úp xuống, nhìn nghiêng).
                                                                              → public/vfx/phap_tuong_palm.png

  python3 -I tools/art/phap_tuong.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')


def ramp(x, stops):
    x = np.clip(x, 0, 1)
    out = np.zeros(x.shape + (3,))
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        m = (x >= x0) & (x <= x1)
        k = ((x - x0) / (x1 - x0))[m][:, None]
        out[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    return out


def avatar():
    sheet = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    fr = sheet.crop((6 * 52, 0, 7 * 52, 68))                                  # hàng 0 = hướng S, khung 6 = đứng
    UPS = 6
    big = fr.resize((52 * 2, 68 * 2), Image.NEAREST).resize((52 * UPS, 68 * UPS), Image.LANCZOS)
    big = big.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(1.4))   # mượt nét pixel, vẫn giữ chi tiết
    a = np.array(big).astype(float)
    PADX, PADT, PADB = 70, 150, 30
    H0, W0 = a.shape[:2]
    W, H = W0 + 2 * PADX, H0 + PADT + PADB
    rgb = np.zeros((H, W, 3)); al = np.zeros((H, W))
    rgb[PADT:PADT + H0, PADX:PADX + W0] = a[..., :3]; al[PADT:PADT + H0, PADX:PADX + W0] = a[..., 3] / 255
    lum = rgb.mean(2) / 255
    body = ramp(lum ** 0.6, [(0, (150, 80, 15)), (0.35, (235, 150, 40)), (0.65, (255, 210, 95)), (1.0, (255, 250, 225))])
    bodyA = al * (0.7 + 0.3 * np.clip(lum * 1.4, 0, 1))
    # viền sáng quanh thân
    m = al > 0.5
    dist_out = ndimage.distance_transform_edt(~m)
    dist_in = ndimage.distance_transform_edt(m)
    rim = np.exp(-(dist_in / 3.0) ** 2) * m
    halo = np.exp(-dist_out / 9.0) * (~m)
    # lửa vàng bốc lên từ thân (kéo ngược lên + vân lửa dọc)
    rng = np.random.default_rng(11)
    src = np.maximum(rim, halo * 0.8)
    flame = src.copy()
    for k in range(1, 40):
        sh = np.zeros_like(src); sh[:-k * 3] = src[k * 3:]
        flame = np.maximum(flame, sh * 0.93 ** k)
    streak = ndimage.gaussian_filter(rng.random((H, W)), (14, 1.8))
    streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    flame = flame * np.clip(0.75 + 0.5 * streak, 0.15, 1.6)
    flameC = ramp(np.clip(flame, 0, 1), [(0, (0, 0, 0)), (0.3, (170, 80, 10)), (0.6, (255, 170, 40)), (1.0, (255, 235, 150))])
    # gộp kiểu cộng sáng
    add = flameC * np.clip(flame, 0, 1)[..., None] * 0.9
    add = add + body * bodyA[..., None]
    add = add + np.array([255, 245, 200.]) * (rim * 0.8)[..., None]
    add = np.clip(add, 0, 255)
    A = add.max(2) / 255
    out = Image.fromarray(np.dstack([add / np.maximum(A[..., None], 1e-3), A * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    bb = out.getbbox(); out = out.crop(bb)
    # chân nhân vật (đáy thân) theo tỉ lệ ảnh → game đặt chân pháp tướng
    foot = (PADT + H0 * 0.97 - bb[1]) / out.height
    out.save(os.path.join(VFX, 'phap_tuong_avatar.png'))
    print('avatar', out.size, 'foot', round(foot, 3))
    return out


# ---------------- BÀN TAY ----------------
def seg_d(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(px - ax - vx * t, py - ay - vy * t), t


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def polyline_d(px, py, pts):
    d = np.full(px.shape, 1e9)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_d(px, py, ax, ay, bx, by)[0])
    return d


def bez(p0, p1, p2, n=24):
    t = np.linspace(0, 1, n)[:, None]
    return list(map(tuple, (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + t ** 2 * np.array(p2)))


def palm():
    """Bàn tay chưởng lấy NGUYÊN từ ảnh mẫu tools/art/ref/palm_ref.png (bàn tay lửa vàng nhìn nghiêng, úp xuống):
    tách nền tối theo độ vàng (R cao, G > B) + lấp kín thân tay; mép trên (cánh tay + lửa bốc lên) và mép trái (cổ tay)
    mờ dần vì bị khung ảnh cắt. Giữ nguyên màu và nét vẽ của mẫu."""
    a = np.array(Image.open(os.path.join(HERE, 'ref', 'palm_ref.png')).convert('RGB')).astype(float)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    y = np.clip((R - 130) / 70, 0, 1) * np.clip((G - B - 15) / 50, 0, 1)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(y > 0.5, iterations=3))
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    sz = ndimage.sum(m, lab, range(1, n + 1))
    m = lab == (np.argmax(sz) + 1)
    al = np.maximum(y, ndimage.gaussian_filter(m.astype(float), 1.2))
    H, W = al.shape
    yy, xx = np.mgrid[0:H, 0:W]
    al *= np.clip(yy / 90, 0, 1) ** 1.3                                      # lửa / cánh tay phía trên mờ dần lên trời
    al *= np.clip((xx - 14) / 40, 0, 1)                                      # cổ tay bị khung cắt bên trái
    img = Image.fromarray(np.dstack([a, al * 255]).astype(np.uint8), 'RGBA')
    bb = img.getbbox(); img = img.crop(bb)
    # điểm chạm đất = giữa mép dưới lòng bàn tay
    cxp, cyp = (330 - bb[0]) / img.width, (385 - bb[1]) / img.height
    img.save(os.path.join(VFX, 'phap_tuong_palm.png'))
    print('palm', img.size, 'impact', round(cxp, 3), round(cyp, 3))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    av = avatar()
    pm = palm()
    pv = Image.new('RGBA', (av.width + pm.width + 30, max(av.height, pm.height) + 20), (26, 24, 40, 255))
    a = np.array(av).astype(float)
    bgp = np.full(a.shape[:2] + (3,), (26, 24, 40.))
    m = np.clip(bgp + a[..., :3] * a[..., 3:] / 255, 0, 255)
    pv.paste(Image.fromarray(m.astype(np.uint8)), (10, 10))
    pv.alpha_composite(pm, (av.width + 20, 10))
    pv.save(os.path.join(OUT, 'phap_tuong_preview.png'))


if __name__ == '__main__':
    main()
