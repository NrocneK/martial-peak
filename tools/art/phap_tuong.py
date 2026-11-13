"""
PHÁP TƯỚNG THIÊN ĐỊA — 2 hình:

  A) PHÁP TƯỚNG = chính nhân vật (public/ui/hero_b_walk.png, khung đứng hướng S — nhìn thẳng như ảnh mẫu) phóng lớn,
     hoá thành thân KHÍ VÀNG như ảnh mẫu: phóng mượt, tô vàng theo độ sáng (áo trắng → vàng trắng rực, tóc/áo tối →
     hổ phách mờ), viền sáng quanh thân, lửa vàng bốc ngược lên từ thân.     → public/vfx/phap_tuong_avatar.png
  B) BÀN TAY CHƯỞNG: vẽ bằng hàm khoảng cách (mép sắc, cân đối) — lòng bàn tay mở, 4 ngón có đốt, ngón cái chếch ra,
     chỉ tay (đường tâm đạo, trí đạo, sinh đạo), nếp đốt ngón; thân vàng kim đổ bóng nổi khối, viền đậm, quầng sáng.
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
    U = 170                                                                    # px cho 1 đơn vị (bề ngang lòng bàn tay)
    SS = 3
    W, H = int(2.0 * U), int(2.75 * U)
    ys, xs = np.mgrid[0:H * SS, 0:W * SS].astype(float) / SS
    X = (xs - W / 2) / U
    Y = (ys - H * 0.07) / U - 0.95                                             # y = 0 ở chân ngón tay; y tăng xuống dưới
    # lòng bàn tay: hình thang bo góc (trên rộng 1.0, dưới 0.84), cao 1.05
    yy = np.clip(Y, 0, 1.05)
    half = 0.5 - 0.08 * (yy / 1.05)
    rr = 0.13
    qx = np.abs(X) - (half - rr); qy = np.abs(Y - 0.525) - (0.525 - rr)
    dP = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - rr
    # cổ tay
    qx = np.abs(X) - 0.36; qy = np.abs(Y - 1.3) - 0.3
    dW = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - 0.04
    d = smin(dP, dW, 0.22)
    creases = []
    # 4 ngón: tâm chân ngón, nửa bề rộng, dài, góc nghiêng (độ, + = nghiêng phải)
    for fx, fw, fl, fa in ((-0.36, 0.122, 0.80, -7), (-0.12, 0.13, 0.92, -2), (0.12, 0.126, 0.86, 3), (0.36, 0.108, 0.66, 9)):
        ux, uy = np.sin(np.radians(fa)), -np.cos(np.radians(fa))
        ax, ay = fx, 0.12
        bx, by = ax + ux * fl, ay + uy * fl
        dd, t = seg_d(X, Y, ax, ay, bx, by)
        dF = dd - fw * (1 - 0.18 * t)
        d = smin(d, dF, 0.035)
        for jt in (0.30, 0.62):                                               # nếp đốt ngón
            cx, cy = ax + ux * fl * jt, ay + uy * fl * jt
            w = fw * (1 - 0.18 * jt) * 0.75
            creases.append(((cx - uy * 0 - ux * 0 - w * -uy, cy - w * ux), (cx + w * -uy, cy + w * ux), 0.010))
    # ngón cái: chếch ra trái
    ta = np.radians(-48)
    ux, uy = np.sin(ta), -np.cos(ta)
    ax, ay = -0.40, 0.78
    bx, by = ax + ux * 0.66, ay + uy * 0.66
    dd, t = seg_d(X, Y, ax, ay, bx, by)
    dT = dd - 0.145 * (1 - 0.2 * t)
    d = smin(d, dT, 0.09)
    cx, cy = ax + ux * 0.66 * 0.55, ay + uy * 0.66 * 0.55
    w = 0.09
    creases.append(((cx - w * -uy, cy - w * ux), (cx + w * -uy, cy + w * ux), 0.010))
    # chỉ tay
    lines = [bez((0.49, 0.36), (0.15, 0.24), (-0.22, 0.30)),                  # tâm đạo
             bez((-0.47, 0.50), (0.0, 0.46), (0.33, 0.60)),                   # trí đạo
             bez((-0.44, 0.50), (-0.18, 0.85), (-0.12, 1.12)),                # sinh đạo (vòng quanh gò ngón cái)
             bez((0.05, 1.05), (0.06, 0.75), (0.02, 0.50))]                   # định mệnh (mờ)
    dl = np.full(X.shape, 1e9)
    for i, ln in enumerate(lines):
        dl = np.minimum(dl, polyline_d(X, Y, ln) + (0.004 if i == 3 else 0))
    dc = np.full(X.shape, 1e9)
    for p0, p1, wdt in creases:
        dc = np.minimum(dc, seg_d(X, Y, *p0, *p1)[0])
    px = 1.0 / U
    inside = np.clip(0.5 - d / px, 0, 1)
    # tô khối: vàng kim, sáng ở giữa, tối dần về mép (nổi khối), ánh sáng từ trên trái
    depth = np.clip(-d / 0.10, 0, 1)
    light = np.clip(0.55 + 0.45 * depth - 0.12 * Y + 0.08 * (-X), 0, 1.2)
    base = ramp(np.clip(light, 0, 1), [(0, (120, 60, 8)), (0.45, (215, 145, 35)), (0.75, (255, 205, 90)), (1.0, (255, 240, 185))])
    lineA = np.exp(-(dl / 0.012) ** 2) * 0.85 * (d < -0.02)
    crA = np.exp(-(dc / 0.010) ** 2) * 0.7 * (d < -0.01)
    col = base * (1 - lineA[..., None]) + np.array([150, 75, 10.]) * lineA[..., None]
    col = col * (1 - crA[..., None]) + np.array([160, 85, 15.]) * crA[..., None]
    # viền đậm + viền sáng mảnh phía trong
    edge = np.exp(-((d + 0.006) / 0.009) ** 2)
    col = col * (1 - edge[..., None] * 0.8) + np.array([110, 50, 5.]) * edge[..., None] * 0.8
    inner = np.exp(-((d + 0.03) / 0.012) ** 2) * (d < 0)
    col = np.clip(col + np.array([60, 50, 30.]) * inner[..., None], 0, 255)
    # quầng sáng ngoài
    glow = np.exp(-np.maximum(d, 0) / 0.09) * (d > 0)
    gcol = np.array([255, 190, 60.])
    A = np.maximum(inside * 0.96, glow * 0.55)
    out_rgb = col * inside[..., None] + gcol * (1 - inside[..., None])
    img = Image.fromarray(np.dstack([np.clip(out_rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)
    bb = img.getbbox(); img = img.crop(bb)
    # tâm lòng bàn tay (điểm chạm đất) theo tỉ lệ ảnh
    cxp = (W / 2 - bb[0]) / img.width
    cyp = ((0.55 + 0.95) * U + H * 0.07 - bb[1]) / img.height
    img.save(os.path.join(VFX, 'phap_tuong_palm.png'))
    print('palm', img.size, 'palm-center', round(cxp, 3), round(cyp, 3))
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
