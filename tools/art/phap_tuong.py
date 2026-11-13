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


K_GROUND = 0.6                           # nén mặt đất của góc nhìn game
# mẫu = hướng SW (ngón tay chỉ xuống trái); xoay trên mặt đất ngược chiều kim đồng hồ 45° mỗi hướng
PALM_DIRS = [('sw', 0)]                  # dùng 1 góc (SW, đúng mẫu) cho mọi hướng


def palm():
    """Bàn tay chưởng = MU BÀN TAY úp xuống, ngón duỗi thẳng — lấy nguyên dáng + khối sáng tối từ ảnh mẫu
    tools/art/ref/hand_back_ref.png (bàn tay thật trong tia sét tím), hoá thành tay NĂNG LƯỢNG VÀNG:
      · tách tay theo màu da (bỏ sét tím + nền trắng), phóng ×UPS, làm mượt viền
      · độ sáng của da (khe ngón, khớp, khối mu bàn tay) → độ sáng năng lượng (làm mịn để mất vân da, giữ dáng ngón)
      · viền sáng, quầng + lửa vàng bốc lên; phía cổ tay (bên phải) tan thành khí"""
    UPS = 4
    src = Image.open(os.path.join(HERE, 'ref', 'hand_back_ref.png')).convert('RGB')
    a = np.array(src).astype(float)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    skin = (R - B > 18) & (R > 140) & (G > 110)
    pale = (R > 170) & (G > 130) & (np.abs(R - B) < 60) & (a.min(2) < 245)   # da nhạt / hồng (ngón cái, mép phải)
    skin = skin | (pale & ndimage.binary_dilation(skin, iterations=4))
    m = ndimage.binary_fill_holes(ndimage.binary_closing(skin, iterations=2))
    lab, n = ndimage.label(m)
    m = lab == (np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1)
    # lấy trọn vùng nằm trong đường viền tím đậm bao quanh bàn tay của mẫu (gồm đầu ngón cái, mép phải)
    outl = (B - R > 30) & (a.mean(2) < 175)
    m = ndimage.binary_fill_holes(m | (outl & ndimage.binary_dilation(m, iterations=7)))
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, structure=np.ones((3, 3)), iterations=3))
    PAD = 14
    m = np.pad(m, PAD); a = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    h0, w0 = m.shape
    H, W = h0 * UPS, w0 * UPS
    mb = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float) / 255
    mb = ndimage.gaussian_filter(mb, 4.0 * UPS / 3)                           # viền trơn (ảnh mẫu rất nhỏ, viền răng cưa)
    f0 = mb > 0.5
    lum = np.array(Image.fromarray(a.mean(2).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float)
    lum = ndimage.gaussian_filter(lum, 1.6 * UPS / 3)                         # mất vân da, giữ khe ngón + khối
    inside_l = lum[f0]
    ln0 = np.clip((lum - np.percentile(inside_l, 5)) / (np.percentile(inside_l, 97) - np.percentile(inside_l, 5)), 0, 1)
    out = {}
    for name, rot in PALM_DIRS:
        mbr, ln = ground_rot(mb, rot), ground_rot(ln0 * f0, rot)
        out[name] = palm_render(mbr, ln, UPS)
    return out


def ground_rot(img, deg):
    """Xoay trên MẶT ĐẤT (không phải trên màn hình): giãn dọc 1/K → xoay → nén dọc K; khung đủ rộng để không bị xén."""
    h, w = img.shape
    S = int(np.hypot(h, w / 1.0) / K_GROUND * 1.05) + 8
    im = Image.fromarray(img.astype(np.float32), 'F').resize((w, int(round(h / K_GROUND))), Image.BICUBIC)
    can = Image.new('F', (S, S), 0.0)
    can.paste(im, ((S - im.width) // 2, (S - im.height) // 2))
    can = can.rotate(deg, resample=Image.BICUBIC)
    can = can.resize((S, int(round(S * K_GROUND))), Image.BICUBIC)
    return np.array(can).astype(float)


def palm_render(mb, ln, UPS):
    """Tô năng lượng vàng cho mặt nạ bàn tay mb (0..1) + độ sáng ln: lõi theo độ sáng da mẫu, viền sáng, quầng + lửa
    bốc thẳng lên (lửa vẽ SAU khi xoay nên luôn bốc lên trên màn hình)."""
    H, W = mb.shape
    f = mb > 0.5
    din = ndimage.distance_transform_edt(f)
    dout = ndimage.distance_transform_edt(~f)
    fm = ndimage.gaussian_filter(f.astype(float), 1.0)
    e = np.clip(0.08 + 0.62 * np.clip(ln, 0, 1) ** 1.25 + 0.14 * np.clip(din / (10 * UPS), 0, 1), 0, 1)
    col = ramp(e, [(0, (225, 85, 12)), (0.35, (255, 145, 32)), (0.65, (255, 205, 78)), (0.88, (255, 243, 188)), (1.0, (255, 255, 238))])
    rim = np.exp(-((din - 2.0) / 1.8) ** 2) * f
    col = col * (1 - rim[..., None] * 0.7) + np.array([255, 250, 222.]) * rim[..., None] * 0.7
    bodyA = np.maximum(fm * (0.85 + 0.15 * np.clip(ln, 0, 1)), rim * 0.95)
    rng = np.random.default_rng(5)
    halo = np.exp(-dout / (3 * UPS)) * (~f)
    srcF = np.maximum(f * 0.55, halo)
    flame = srcF.copy()
    step = max(1, UPS // 2)
    for k in range(1, 30):
        sh = np.zeros_like(srcF); sh[:-k * step] = srcF[k * step:]
        flame = np.maximum(flame, sh * 0.9 ** k)
    st = ndimage.gaussian_filter(rng.random((H, W)), (3 * UPS, 0.5 * UPS))
    st = (st - st.mean()) / (st.std() + 1e-6)
    flame = np.clip(flame * np.clip(0.6 + 0.6 * st, 0, 1.5), 0, 1) * (~f)
    fcol = ramp(flame, [(0, (150, 50, 0)), (0.4, (245, 120, 25)), (0.8, (255, 200, 70)), (1.0, (255, 240, 170))])
    A = np.maximum(bodyA, flame * 0.7)
    wi = np.clip(bodyA / np.maximum(A, 1e-4), 0, 1)[..., None]
    rgb = col * wi + fcol * (1 - wi)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    bb = img.getbbox(); img = img.crop(bb)
    ys_, xs_ = np.nonzero(f)
    return img, ((xs_.mean() - bb[0]) / img.width, (ys_.mean() - bb[1]) / img.height)


def main():
    os.makedirs(OUT, exist_ok=True)
    avatar()
    res = palm()
    img, (cx, cy) = res['sw']
    img.save(os.path.join(VFX, 'phap_tuong_palm.png'))
    print('palm', img.size, 'center', round(cx, 3), round(cy, 3))

if __name__ == '__main__':
    main()
