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


SEAM_WV = (420, 650)                     # vùng có khe ngón (từ khớp ngón tới trước đầu ngón — bỏ gân mu bàn tay, móng)
WRIST_CUT = 230                          # bỏ phần cổ tay: giữ phía dưới đường cắt chéo (0.45x + 0.9y)


def palm():
    """Bàn tay chưởng = MU BÀN TAY úp xuống (góc nhìn từ trên của game), lấy nguyên nét vẽ từ hình 4 của bản phác thảo
    tools/art/ref/hand_back_sketch.png, tô thành tay lửa vàng theo phong cách ảnh mẫu palm_ref.png:
      · bóng chì của bản vẽ → độ sáng (chỗ sáng vàng trắng, chỗ đổ bóng cam)
      · nét chì (khớp ngón, móng, gân) → nét cam đỏ đậm, giữ nguyên chi tiết
      · viền trong sáng trắng vàng, quầng cam ngoài, vệt lửa bốc lên; cổ tay (trên trái) mờ dần"""
    UPS = 3
    g = np.array(Image.open(os.path.join(HERE, 'ref', 'hand_back_sketch.png')).convert('L').crop((310, 305, 570, 535))
                 .resize((260 * UPS, 230 * UPS), Image.LANCZOS)).astype(float)
    paper = ndimage.median_filter(g, 41)
    ink = np.clip((paper - g - 10) / 60, 0, 1)
    mk = Image.fromarray(((ink > 0.3) * 255).astype(np.uint8))
    ImageDraw.Draw(mk).line([(10, 165), (25, 140), (45, 118), (130, 60), (220, 22)], fill=255, width=8)   # khép cổ tay
    mm = ndimage.binary_dilation(np.array(mk) > 0, iterations=3)
    f = ndimage.binary_erosion(ndimage.binary_fill_holes(mm), iterations=3)
    lab, n = ndimage.label(f)
    f = lab == (np.argmax(ndimage.sum(f, lab, range(1, n + 1))) + 1)
    # đường viền NGÓN TAY (nét dài) → khe tách ngón; bỏ nét móng tay (vòng kín nhỏ) và mọi nét da / gân / nếp
    L = ndimage.binary_dilation(ink > 0.4, iterations=1)
    lab, n = ndimage.label(L)
    seam = np.zeros_like(L)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if np.hypot(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) > 110:
            seam[sl] |= lab[sl] == i + 1
    nail = ndimage.binary_fill_holes(seam) & ~seam
    nl, nn = ndimage.label(nail)
    small = np.isin(nl, [i + 1 for i, v in enumerate(ndimage.sum(nail, nl, range(1, nn + 1))) if v < 4000])
    seam &= ~ndimage.binary_dilation(small, iterations=6)
    PAD = 60
    f = np.pad(f, PAD); seam = np.pad(seam, PAD)
    H, W = f.shape
    yy, xx = np.mgrid[0:H, 0:W]
    # BỎ CỔ TAY: chỉ giữ bàn tay; chỗ cắt tan thành khí (mờ dần, không viền)
    wv = (xx - PAD) * 0.45 + (yy - PAD) * 0.9
    wvn = wv + 22 * ndimage.gaussian_filter(np.random.default_rng(4).standard_normal((H, W)), 9) * 9   # mép tan gợn sóng
    cutF = np.clip((wvn - WRIST_CUT) / 70, 0, 1) ** 1.3
    f = f & (wv > WRIST_CUT - 20)
    lab, n = ndimage.label(f)
    f = lab == (np.argmax(ndimage.sum(f, lab, range(1, n + 1))) + 1)
    seamIn = seam & ndimage.binary_erosion(f, iterations=4) & (wv > SEAM_WV[0]) & (wv < SEAM_WV[1])   # chỉ khe giữa các ngón
    f2 = f & ~ndimage.binary_dilation(seamIn, iterations=1)                  # từng ngón là một khối riêng
    fm = ndimage.gaussian_filter(f.astype(float), 1.0)
    din = ndimage.distance_transform_edt(f2)
    dEdge = ndimage.distance_transform_edt(f)
    dout = ndimage.distance_transform_edt(~f)
    # NĂNG LƯỢNG THUẦN: khối khí sáng theo độ dày (lõi trắng vàng → mép cam), vân năng lượng chảy nhẹ theo hướng ngón
    thick = ndimage.grey_dilation(din, size=41)
    t = np.clip(din / np.maximum(thick, 1), 0, 1)
    rng = np.random.default_rng(9)
    ang = 58
    r = ndimage.rotate(rng.random((H, W)), ang, reshape=False, mode='wrap')
    flow = ndimage.rotate(ndimage.gaussian_filter(r, (6, 30)), -ang, reshape=False, mode='wrap')
    flow = (flow - flow.mean()) / (flow.std() + 1e-6)
    e = np.clip(0.28 + 0.78 * t ** 0.8 + 0.06 * flow, 0, 1)
    col = ramp(e, [(0, (225, 85, 12)), (0.35, (255, 145, 32)), (0.65, (255, 205, 75)), (0.88, (255, 243, 185)), (1.0, (255, 255, 238))])
    sm = ndimage.gaussian_filter(seamIn.astype(float), 1.6)
    sm = np.clip(sm * 1.6, 0, 1)
    col = col * (1 - sm[..., None] * 0.6) + np.array([230, 105, 18.]) * sm[..., None] * 0.6   # khe giữa các ngón
    rimIn = np.exp(-((dEdge - 2.5) / 2.2) ** 2) * f * cutF
    col = col * (1 - rimIn[..., None] * 0.75) + np.array([255, 250, 220.]) * rimIn[..., None] * 0.75
    col = col * cutF[..., None] + np.array([255, 140, 30.]) * (1 - cutF[..., None])   # chỗ tan: chuyển cam, không xám
    bodyA = fm * np.clip(0.8 + 0.2 * t, 0, 1) * cutF
    bodyA = np.maximum(bodyA, rimIn * 0.95)
    # quầng + vệt lửa bốc lên
    halo = np.exp(-dout / 14) * (~f)
    src = np.maximum(f * 0.6 * cutF, halo)
    flame = src.copy()
    for k in range(1, 30):
        sh = np.zeros_like(src); sh[:-k * 3] = src[k * 3:]
        flame = np.maximum(flame, sh * 0.9 ** k)
    st = ndimage.gaussian_filter(rng.random((H, W)), (16, 2.2))
    st = (st - st.mean()) / (st.std() + 1e-6)
    flame = np.clip(flame * np.clip(0.6 + 0.6 * st, 0, 1.5), 0, 1) * (~f)
    fcol = ramp(flame, [(0, (120, 30, 0)), (0.4, (240, 110, 20)), (0.8, (255, 200, 70)), (1.0, (255, 240, 170))])
    A = np.maximum(bodyA, flame * 0.75 * np.clip((wv - WRIST_CUT + 10) / 60, 0, 1))
    rgb = np.where(f[..., None], col, fcol)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    bb = img.getbbox(); img = img.crop(bb)
    cy0, cx0 = [c.mean() for c in np.nonzero(f)]                             # điểm chạm đất = trọng tâm bàn tay
    cxp, cyp = (cx0 - bb[0]) / img.width, (cy0 - bb[1]) / img.height
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
