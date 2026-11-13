"""
PHÁP TƯỚNG THIÊN ĐỊA — 2 hình:

  A) PHÁP TƯỚNG = chính nhân vật (public/ui/hero_b_walk.png, khung đứng hướng S — nhìn thẳng như ảnh mẫu) phóng lớn,
     hoá thành thân KHÍ VÀNG như ảnh mẫu: phóng mượt, tô vàng theo độ sáng (áo trắng → vàng trắng rực, tóc/áo tối →
     hổ phách mờ), viền sáng quanh thân, lửa vàng bốc ngược lên từ thân.     → public/vfx/phap_tuong_avatar.png
  B) BÀN TAY CHƯỞNG: mu bàn tay úp xuống, nét vẽ từ tools/art/ref/hand_back_sketch.png (hình 4), tô theo kiểu tay lửa
     của ảnh mẫu tools/art/ref/palm_ref.png.
                                                                              → public/vfx/phap_tuong_palm.png

  python3 -I tools/art/phap_tuong.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
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


# ---- BÀN TAY NĂNG LƯỢNG: dáng canh theo hình 4 của bản phác thảo (toạ độ px trên khung phác thảo phóng ×3, 780×690),
#      vẽ lại hoàn toàn bằng đường cong trơn — mỗi ngón là một ống cong thon dần (Bézier bậc 2), mu bàn tay là một khối
#      bo tròn; KHÔNG dùng nét chì (không gân, không móng, không nếp da)
HAND_BACK = [(100, 180), (225, 30), (310, 75), (460, 165), (545, 215), (610, 280), (560, 320), (470, 360), (380, 385),
             (300, 375), (255, 370), (170, 320), (130, 250)]
FINGERS = [  # (gốc, giữa, đầu ngón), nửa bề rộng ở gốc → ở đầu, độ hoà vào mu bàn tay
    (((200, 330), (205, 450), (262, 598)), (46, 30), 30),     # ngón cái
    (((365, 370), (440, 500), (503, 632)), (38, 26), 14),     # ngón trỏ
    (((480, 340), (545, 460), (630, 612)), (39, 27), 14),     # ngón giữa
    (((545, 250), (615, 390), (680, 560)), (28, 21), 10),     # ngón áp út
    (((612, 282), (672, 382), (712, 472)), (21, 16), 8),     # ngón út
]
WRIST_FADE = (190, 300)                  # bỏ cổ tay: mờ dần theo đường chéo 0.45x + 0.9y


def palm():
    """Bàn tay chưởng = MU BÀN TAY NĂNG LƯỢNG THUẦN úp xuống: khối khí sáng mượt (lõi trắng vàng → mép cam) theo từng
    ngón, viền sáng mảnh, quầng + lửa bốc lên; cổ tay tan thành khí."""
    SS = 2
    PAD = 70
    W, H = 780 + 2 * PAD, 690 + 2 * PAD
    yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(float) / SS
    X, Y = xx - PAD, yy - PAD
    # mu bàn tay: đa giác bo tròn (làm mượt mặt nạ rồi lấy khoảng cách có dấu)
    mk = Image.new('L', (W * SS, H * SS), 0)
    ImageDraw.Draw(mk).polygon([((x + PAD) * SS, (y + PAD) * SS) for x, y in HAND_BACK], fill=255)
    m = ndimage.gaussian_filter(np.array(mk).astype(float), 14 * SS) > 127
    dPalm = (ndimage.distance_transform_edt(~m) - ndimage.distance_transform_edt(m)) / SS
    parts = [(dPalm, 150.0)]                                                   # mu bàn tay: lõi dịu, không loá trắng
    d = dPalm
    for (p0, p1, p2), (w0, w1), kk in FINGERS:
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        dl = np.hypot(dx, dy)
        p0 = (p0[0] - dx / dl * 70, p0[1] - dy / dl * 70)                    # gốc ngón ăn sâu vào mu bàn tay (khớp liền)
        w0, w1 = w0 + 3, w1 + 3
        tt = np.linspace(0, 1, 28)
        pts = [((1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u ** 2 * p2[0],
                (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u ** 2 * p2[1]) for u in tt]
        df = np.full(X.shape, 1e9)
        for i in range(len(pts) - 1):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]
            dd, tseg = seg_d(X, Y, ax, ay, bx, by)
            u = (i + tseg) / (len(pts) - 1)
            w = (w0 + (w1 - w0) * u) * (1 + 0.07 * np.exp(-((u - 0.5) / 0.07) ** 2) + 0.05 * np.exp(-((u - 0.75) / 0.05) ** 2))   # khớp ngón hơi nở
            w = w * np.where(u > 0.85, np.sqrt(np.clip(1 - ((u - 0.85) / 0.17) ** 2, 0.25, 1)), 1)   # đầu ngón bo tròn
            df = np.minimum(df, dd - w)
        parts.append((df, (w0 + w1) / 2))
        d = smin(d, df, kk)
    # độ "sâu" trong từng khối → lõi sáng riêng mỗi ngón; chỗ giáp nhau tự thành rãnh cam (không vẽ nét)
    # một khối liền: sáng dần từ mép vào trong (mép cam → thân vàng → lõi vàng trắng ở giữa mu bàn tay), không có lõi
    # riêng từng ngón (tránh ngón tay thành que phát sáng)
    t = 0.55 * np.clip(-d / 22, 0, 1) ** 0.8 + 0.45 * np.clip(-d / 110, 0, 1)
    t = ndimage.gaussian_filter(t, 2 * SS)
    inside = np.clip(0.5 - d * SS / 1.5, 0, 1)
    nz = ndimage.gaussian_filter(np.random.default_rng(12).standard_normal(X.shape), 18 * SS)
    nz = nz / (np.abs(nz).max() + 1e-6)                                       # khí cuộn nhẹ bên trong (không sọc)
    e = np.clip(0.14 + 0.72 * t + 0.14 * nz, 0, 1)
    col = ramp(e, [(0, (230, 90, 15)), (0.35, (255, 148, 34)), (0.65, (255, 208, 80)), (0.88, (255, 244, 190)), (1.0, (255, 255, 240))])
    rim = np.exp(-((d + 2.5) / 2.0) ** 2)
    col = col * (1 - rim[..., None] * 0.7) + np.array([255, 250, 222.]) * rim[..., None] * 0.7
    # cổ tay tan thành khí (mép gợn)
    wv = X * 0.45 + Y * 0.9
    wn = wv + ndimage.gaussian_filter(np.random.default_rng(4).standard_normal(X.shape), 10 * SS) * 10 * SS * 2.5
    cut = np.clip((wn - WRIST_FADE[0]) / (WRIST_FADE[1] - WRIST_FADE[0]), 0, 1) ** 1.4
    col = col * cut[..., None] + np.array([255, 135, 25.]) * (1 - cut[..., None])   # chỗ tan: cam, không xám
    bodyA = np.maximum(inside * (0.82 + 0.18 * t), rim * inside * 0.95) * cut
    # quầng + lửa bốc lên
    rng = np.random.default_rng(5)
    halo = np.exp(-np.maximum(d, 0) / 16) * (d > 0)
    src = np.maximum(inside * 0.55, halo) * np.clip((wv - WRIST_FADE[0] - 40) / 80, 0, 1)
    flame = src.copy()
    for k in range(1, 32):
        sh = np.zeros_like(src); sh[:-k * 3 * SS] = src[k * 3 * SS:]
        flame = np.maximum(flame, sh * 0.9 ** k)
    st = ndimage.gaussian_filter(rng.random(X.shape), (16 * SS, 2.2 * SS))
    st = (st - st.mean()) / (st.std() + 1e-6)
    flame = np.clip(flame * np.clip(0.6 + 0.6 * st, 0, 1.5), 0, 1) * (1 - inside)
    fcol = ramp(flame, [(0, (150, 50, 0)), (0.4, (245, 120, 25)), (0.8, (255, 200, 70)), (1.0, (255, 240, 170))])
    A = np.maximum(bodyA, flame * 0.7)
    wi = np.clip(bodyA / np.maximum(A, 1e-4), 0, 1)[..., None]
    rgb = col * wi + fcol * (1 - wi)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)
    bb = img.getbbox(); img = img.crop(bb)
    ys_, xs_ = np.nonzero((inside * cut)[::SS, ::SS] > 0.5)
    cxp, cyp = (xs_.mean() - bb[0]) / img.width, (ys_.mean() - bb[1]) / img.height
    img.save(os.path.join(VFX, 'phap_tuong_palm.png'))
    print('palm', img.size, 'center', round(cxp, 3), round(cyp, 3))
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
