"""
THẦN THỨC TRẢM — cánh tay khí vàng (từ ảnh mẫu tools/art/ref/phap_tuong_arms.png: pháp tướng nhiều tay, nắm đấm vàng
có vòng xuyến) + LƯỠI KIẾM NĂNG LƯỢNG bọc nắm tay, nối dài theo TRỤC CẲNG TAY (khuỷu → cổ tay → nắm đấm → mũi kiếm).

  1) cắt cánh tay trên-phải (nắm đấm + vòng xuyến + cẳng tay) bằng đường viền tay vẽ theo ảnh mẫu; phần dưới khuỷu
     (cánh tay trên) mờ dần → tay khí hiện ra từ hư không
  2) quầng sáng vàng mềm quanh tay (thay quầng đỏ của nền mẫu)
  3) xoay tay cho trục cẳng tay DỰNG ĐỨNG; điểm xoay khi chém = khuỷu tay
  4) KIẾM KHÍ theo ảnh mẫu tools/art/ref/qi_sword_ref.png (luồng năng lượng bọc lưỡi kiếm, xuất phát từ đốc): ở đây năng
     lượng xuất phát từ BÀN TAY — quầng khí ôm sát nắm đấm, bốc ngược lên thành lưỡi lửa nhập vào luồng khí của mẫu
     (lấy nguyên từ ảnh mẫu, tách nền tối kiểu cộng sáng) kéo dài thành hình lưỡi kiếm trên trục cẳng tay
  → public/vfx/qi_arm.png, qi_aura.png  (cùng khung để game chồng khít; lớp khí chớp nháy riêng)

  python3 -I tools/art/qi_arm.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
UP = 3                                   # phóng ảnh mẫu (ảnh gốc nhỏ)

# toạ độ trong khung cắt (x 200..295, y 45..180 của ảnh mẫu)
CROP = (200, 45, 295, 180)
ARM = [(22, 21), (30, 17), (40, 17), (50, 23), (55, 32), (57, 37), (66, 38), (76, 40), (80, 46), (77, 54),
       (72, 60), (73, 70), (74, 82), (72, 95), (68, 106), (61, 116), (50, 121), (38, 120), (28, 115),
       (29, 104), (37, 92), (44, 80), (44, 70), (36, 66), (33, 58), (36, 51), (32, 44), (25, 36), (21, 28)]
ELBOW = (75, 102)                        # khuỷu tay
FIST_C = (53.6, 41.4)                    # cổ tay (điểm bạn đánh dấu) — trục cẳng tay: khuỷu → điểm này
FIST = [(22, 21), (30, 17), (40, 17), (50, 23), (55, 32), (57, 38), (52, 45), (40, 47), (30, 44), (23, 36), (21, 28)]  # bàn tay (nắm đấm)
FIST_CTR = (38.5, 31)                    # giữa nắm tay (chỗ chuôi kiếm laser)
BLADE_TILT = 30                          # lưỡi khí nghiêng so với trục cẳng tay (độ, ngược kim đồng hồ: 12h → 11h)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(os.path.join(HERE, 'ref', 'phap_tuong_arms.png')).convert('RGB').crop(CROP)
    w, h = src.size
    big = src.resize((w * UP, h * UP), Image.LANCZOS)
    m = Image.new('L', big.size, 0)
    ImageDraw.Draw(m).polygon([(x * UP, y * UP) for x, y in ARM], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    arm = np.array(big).astype(float)
    a = np.array(m).astype(float) / 255
    # trục cẳng tay (hướng lên mũi)
    ux, uy = FIST_C[0] - ELBOW[0], FIST_C[1] - ELBOW[1]
    ul = np.hypot(ux, uy); ux, uy = ux / ul, uy / ul
    nx, ny = -uy, ux
    # phần dưới khuỷu (cánh tay trên) mờ dần
    yy, xx = np.mgrid[0:big.height, 0:big.width].astype(float) / UP
    te = (xx - ELBOW[0]) * ux + (yy - ELBOW[1]) * uy
    a *= np.clip((te + 2) / 16, 0, 1) ** 1.2
    # đẩy màu về vàng khí: sáng hơn, ấm, giữ nét
    lum = arm.mean(2, keepdims=True) / 255
    gold = np.array([255, 205, 110]) * (0.55 + 0.6 * lum) + np.array([60, 50, 30]) * lum ** 3
    arm = np.clip(arm * 0.45 + gold * 0.55, 0, 255)

    # khung lớn: thêm chỗ cho lưỡi kiếm phía trên-trái
    PT, PL, PAD = 112 * UP, 30 * UP, 20 * UP
    CW, CH = w * UP + PL + PAD, h * UP + PT + PAD
    ox, oy = PL, PT
    C = lambda x, y: (ox + x * UP, oy + y * UP)
    # --- tay + quầng vàng mềm
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    canvas.alpha_composite(Image.fromarray(np.dstack([arm, a * 255]).astype(np.uint8), 'RGBA'), (ox, oy))
    al = np.array(canvas)[..., 3].astype(float)
    glow = np.array(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5 * UP))).astype(float)
    g = np.zeros((CH, CW, 4))
    g[..., :3] = (255, 170, 50)
    g[..., 3] = np.clip(glow * 1.3, 0, 255) * 0.75
    armF = Image.fromarray(g.astype(np.uint8), 'RGBA')
    armF.alpha_composite(canvas)

    # --- xoay tay cho trục cẳng tay DỰNG ĐỨNG (kèm mặt nạ nắm tay + điểm đánh dấu khuỷu / giữa nắm tay)
    ang = np.degrees(np.arctan2(ux, -uy))
    fmI = Image.new('L', (CW, CH), 0)
    ImageDraw.Draw(fmI).polygon([C(x, y) for x, y in FIST], fill=255)
    mk = Image.new('L', (CW, CH), 0)
    md = ImageDraw.Draw(mk)
    for (px, py), val in ((C(*ELBOW), 255), (C(*FIST_CTR), 128)):
        md.ellipse([px - 3, py - 3, px + 3, py + 3], fill=val)
    armF = armF.rotate(ang, resample=Image.BICUBIC, expand=True)
    fm = np.array(fmI.rotate(ang, resample=Image.BILINEAR, expand=True)).astype(float) / 255
    mk = np.array(mk.rotate(ang, resample=Image.NEAREST, expand=True))
    # thêm chỗ phía trên cho lưỡi kiếm khí
    TOPX, LEFTX = 330, 300
    W2, H2 = armF.width + LEFTX, armF.height + TOPX
    armC = Image.new('RGBA', (W2, H2), (0, 0, 0, 0)); armC.alpha_composite(armF, (LEFTX, TOPX)); armF = armC
    fm = np.pad(fm, ((TOPX, 0), (LEFTX, 0)))
    mk = np.pad(mk, ((TOPX, 0), (LEFTX, 0)))
    ey, ex = [c.mean() for c in np.nonzero(mk == 255)]
    fy, fx = [c.mean() for c in np.nonzero(mk == 128)]

    # --- KIẾM KHÍ theo ảnh mẫu tools/art/ref/qi_sword_ref.png: lấy NGUYÊN luồng năng lượng của mẫu (phần trên đốc kiếm,
    #     bỏ phần lưỡi kim loại), tách nền tối theo kiểu cộng sáng (năng lượng = ảnh − màu nền)
    ref = np.array(Image.open(os.path.join(HERE, 'ref', 'qi_sword_ref.png')).convert('RGB')).astype(float)
    reg = ref[0:488, 290:420]
    bgc = np.median(np.concatenate([reg[:, :8], reg[:, -8:]], 1), axis=1, keepdims=True)   # màu nền từng hàng (nền loang)
    e = np.clip(reg - bgc, 0, 255)
    e = np.clip((e - 10) * 1.1, 0, 255)                                      # bỏ quầng nền rất mờ
    hh_ = e.shape[0]
    e *= np.clip((hh_ - 1 - np.arange(hh_)) / 70, 0, 1)[:, None, None] ** 1.3   # đáy luồng khí mờ dần (chỗ lưỡi kim loại)
    BL_W, BL_H = 210, 470                                                    # kích thước luồng khí trên ảnh tay (px)
    eI = Image.fromarray(e.astype(np.uint8), 'RGB').resize((BL_W, BL_H), Image.LANCZOS)
    blade = np.zeros((H2, W2, 3))
    bx0 = int(round(fx - BL_W * (63 / 130)))                                 # trục luồng khí trong mẫu ở cột ≈ 353 (63/130 khung)
    by1 = int(round(fy - 0.0 * UP))                                          # đáy luồng khí ở giữa nắm tay
    blade[by1 - BL_H:by1, bx0:bx0 + BL_W] = np.array(eI).astype(float)

    # --- KHÍ BỌC BÀN TAY: quầng ôm sát nắm đấm + lưỡi lửa bốc ngược lên nhập vào luồng khí phía trên
    rng = np.random.default_rng(3)
    dist = ndimage.distance_transform_edt(fm < 0.5)
    wrap = np.where(fm >= 0.5, 0.1, np.exp(-dist / (4 * UP)) * 0.6)                # trong tay mỏng → thấy rõ nắm tay
    rim = np.exp(-((dist - 1.5 * UP) / (2.5 * UP)) ** 2) * (fm < 0.5)
    wrap = np.maximum(wrap, rim * 0.55)
    flame = wrap.copy()
    for k_ in range(1, 26):                                                  # kéo ngược lên thành lưỡi lửa
        sh = np.zeros_like(wrap); sh[:-k_ * 4] = wrap[k_ * 4:]
        flame = np.maximum(flame, sh * 0.9 ** k_)
    streak = ndimage.gaussian_filter(rng.random((H2, W2)), (9, 1.4))
    streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    flame = flame * np.clip(0.8 + 0.45 * streak, 0.2, 1.5)
    flame *= np.clip(1 - np.abs(np.arange(W2)[None, :] - fx) / (40 * UP), 0, 1) ** 0.6   # gom về phía trục
    # lưỡi khí + lửa bốc lên nghiêng về hướng 11 giờ (xoay quanh giữa nắm tay); quầng ôm tay giữ nguyên
    rotF = lambda arr: np.array(Image.fromarray(arr.astype(np.float32), 'F').rotate(BLADE_TILT, resample=Image.BILINEAR, center=(fx, fy)))
    flame = rotF(flame)
    blade = np.dstack([rotF(blade[..., c]) for c in range(3)])
    flame = np.maximum(flame, wrap * np.clip(0.7 + 0.4 * streak, 0.3, 1.2))
    fys = np.nonzero(fm.max(1) > 0.5)[0]
    below = np.clip((np.arange(H2)[:, None] - fys.max() + 2 * UP) / (6 * UP), 0, 1)   # không cho lửa rủ xuống dưới nắm tay
    flame *= 1 - below
    stops = [(0.0, (0, 0, 0)), (0.25, (150, 70, 10)), (0.5, (255, 165, 50)), (0.75, (255, 215, 120)), (1.0, (255, 250, 230))]
    fl = np.clip(flame, 0, 1)
    wcol = np.zeros(fl.shape + (3,))
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        mm = (fl >= x0) & (fl <= x1)
        kq = ((fl - x0) / (x1 - x0))[mm][:, None]
        wcol[mm] = np.array(c0) * (1 - kq) + np.array(c1) * kq
    add = np.clip(blade + wcol, 0, 255)                                      # cộng sáng 2 lớp
    A = add.max(2) / 255
    rgb = add / np.maximum(A[..., None], 1e-3)
    auraI = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA')

    bb = armF.getbbox()
    b2 = auraI.getbbox()
    bb = (min(bb[0], b2[0]), min(bb[1], b2[1]), max(bb[2], b2[2]), max(bb[3], b2[3]))
    armF, auraI = armF.crop(bb), auraI.crop(bb)
    ex, ey, fx, fy = ex - bb[0], ey - bb[1], fx - bb[0], fy - bb[1]
    bys, bxs = np.nonzero(blade.max(2) > 40)                                # mũi lưỡi khí: điểm xa nhất theo hướng nghiêng
    dvx, dvy = -np.sin(np.radians(BLADE_TILT)), -np.cos(np.radians(BLADE_TILT))
    j_ = np.argmax((bxs - (fx + bb[0])) * dvx + (bys - (fy + bb[1])) * dvy)
    tx, ty = bxs[j_] - bb[0], bys[j_] - bb[1]
    armF.save(os.path.join(VFX, 'qi_arm.png'))
    auraI.save(os.path.join(VFX, 'qi_aura.png'))
    print('qi_arm', armF.size, 'tilt', round(ang, 1), 'pivot(khuỷu)', round(ex / armF.width, 3), round(ey / armF.height, 3),
          'reach', round(float(np.hypot(ex - tx, ey - ty))), 'lệch góc', round(float(np.degrees(np.arctan2(tx - ex, ey - ty))), 2))

    ca = np.array(armF).astype(float); cb = np.array(auraI).astype(float)
    bg = np.full(ca.shape[:2] + (3,), (26, 24, 40.))
    m1 = bg * (1 - ca[..., 3:] / 255) + ca[..., :3] * ca[..., 3:] / 255
    m1 = np.clip(m1 + cb[..., :3] * cb[..., 3:] / 255, 0, 255)                  # cộng sáng như trong game
    comb = Image.fromarray(np.dstack([m1, np.full(ca.shape[:2], 255.)]).astype(np.uint8), 'RGBA')
    m2 = np.clip(bg + cb[..., :3] * cb[..., 3:] / 255, 0, 255)
    auraV = Image.fromarray(np.dstack([m2, np.full(ca.shape[:2], 255.)]).astype(np.uint8), 'RGBA')
    pv = Image.new('RGBA', (comb.width * 3 + 40, comb.height + 20), (26, 24, 40, 255))
    pv.alpha_composite(armF, (10, 10))
    pv.alpha_composite(auraV, (comb.width + 20, 10))
    pv.alpha_composite(comb, (comb.width * 2 + 30, 10))
    pv.save(os.path.join(OUT, 'qi_arm_preview.png'))


if __name__ == '__main__':
    main()
