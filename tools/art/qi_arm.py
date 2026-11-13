"""
THẦN THỨC TRẢM (mới) — cánh tay khí vàng cầm kiếm, lấy từ ảnh mẫu tools/art/ref/phap_tuong_arms.png
(pháp tướng nhiều tay, nắm đấm vàng có vòng xuyến).

  1) cắt cánh tay trên-phải (nắm đấm + vòng xuyến + cẳng tay) bằng đường viền tay vẽ theo ảnh mẫu (không tách bằng màu
     được vì quầng đỏ cam quanh tay trùng màu phần tối của tay)
  2) giữ nguyên nét vẽ trong tay, cẳng tay mờ dần về phía khuỷu (tay khí hiện ra từ hư không)
  3) quầng sáng vàng mềm quanh tay (thay quầng đỏ của nền mẫu)
  4) LUỒNG KIẾM KHÍ bọc nắm tay rồi vuốt nhọn lên trên thành lưỡi — ảnh riêng, cùng khung để game chồng khít + chớp nháy
  → public/vfx/qi_arm.png, qi_aura.png      (dựng đứng: mũi ở trên, khuỷu ở dưới; điểm xoay = cổ tay)

  python3 -I tools/art/qi_arm.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
UP = 3                                   # phóng ảnh mẫu (ảnh gốc nhỏ) — tay trong game cao ~70px

# đường viền cánh tay trong khung cắt (x 200..295, y 45..180 của ảnh mẫu), theo chiều kim đồng hồ từ đỉnh nắm đấm
CROP = (200, 45, 295, 180)
ARM = [(22, 21), (30, 17), (40, 17), (50, 23), (55, 32), (57, 37), (66, 38), (76, 40), (80, 46), (77, 54),
       (72, 60), (73, 70), (74, 82), (72, 95), (68, 106), (61, 116), (50, 121), (38, 120), (28, 115),
       (29, 104), (37, 92), (44, 80), (44, 70), (36, 66), (33, 58), (36, 51), (32, 44), (25, 36), (21, 28)]
FIST_TOP = (36, 19)                      # chỗ lưỡi kiếm nhô ra khỏi nắm tay
FIST_BOT = (40, 44)                      # chuôi kiếm phía dưới nắm tay (bị tay che)


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
    # cẳng tay mờ dần về khuỷu (tay khí từ hư không)
    yy = np.arange(big.height)[:, None] / UP
    a *= np.clip((122 - yy) / 40, 0, 1) ** 0.8
    # đẩy màu về vàng khí: sáng hơn, ấm, giữ nét
    lum = arm.mean(2, keepdims=True) / 255
    gold = np.array([255, 205, 110]) * (0.55 + 0.6 * lum) + np.array([60, 50, 30]) * lum ** 3
    arm = np.clip(arm * 0.45 + gold * 0.55, 0, 255)

    # khung lớn: thêm chỗ cho luồng kiếm khí phía trên
    SW = 120 * UP                                                            # chiều dài luồng kiếm khí trên nắm tay
    PAD = 26 * UP
    CW, CH = w * UP + 2 * PAD, h * UP + SW + PAD
    ox, oy = PAD, SW
    # --- tay + quầng vàng mềm
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    armI = Image.fromarray(np.dstack([arm, a * 255]).astype(np.uint8), 'RGBA')
    canvas.alpha_composite(armI, (ox, oy))
    al = np.array(canvas)[..., 3].astype(float)
    glow = np.array(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5 * UP))).astype(float)
    g = np.zeros((CH, CW, 4))
    g[..., :3] = (255, 170, 50)
    g[..., 3] = np.clip(glow * 1.3, 0, 255) * 0.75
    armF = Image.fromarray(g.astype(np.uint8), 'RGBA')
    armF.alpha_composite(canvas)

    # --- LUỒNG KIẾM KHÍ bọc nắm tay: bao tròn quanh nắm đấm rồi vuốt thành lưỡi nhọn phía trên, mép như lửa cháy,
    #     vân khí chảy dọc thân, lõi trắng vàng → cam ở mép (game vẽ chồng kiểu cộng sáng + chớp nháy)
    rng = np.random.default_rng(7)
    cx, cy = ox + 39 * UP, oy + 31 * UP                                      # tâm nắm đấm
    ux, uy = FIST_TOP[0] - FIST_BOT[0], FIST_TOP[1] - FIST_BOT[1]
    ul = np.hypot(ux, uy); ux, uy = ux / ul, uy / ul; nx, ny = -uy, ux
    Y, X = np.mgrid[0:CH, 0:CW].astype(float)
    U = ((X - cx) * ux + (Y - cy) * uy)                                       # dọc trục (px), + = lên mũi
    V = ((X - cx) * nx + (Y - cy) * ny)                                       # ngang trục (px)
    L, RF = SW * 1.05, 27 * UP
    u = U / L
    wv = np.where(u < 0, RF * np.sqrt(np.clip(1 - (U / (RF * 1.35)) ** 2, 0, 1)),
                  RF * (0.62 * np.clip(1 - u, 0, 1) ** 0.85 + 0.38 * np.exp(-u * 7)))
    side = np.sign(V)
    noise = np.zeros_like(U)
    for f, amp in ((5, 0.16), (11, 0.09), (23, 0.05)):                       # mép lửa: sóng dọc trục, mỗi bên lệch pha
        ph = rng.uniform(0, 6.3, 2)
        noise += amp * np.sin(u * f * np.pi + np.where(side > 0, ph[0], ph[1]))
    wv = wv * (1 + noise)
    r = np.abs(V) / np.maximum(wv, 1e-3)
    inside = np.clip((1 - r) * 2.4, 0, 1) * (wv > 2)
    inside = inside * inside * (3 - 2 * inside)
    tipf = np.clip((1.0 - u) / 0.12, 0, 1)
    streak = 0.75 + 0.25 * np.sin(V / (2.2 * UP) + 3 * np.sin(u * 9)) * np.clip(u * 4, 0, 1)
    A = inside * tipf * streak
    # bên trong nắm đấm mờ bớt để thấy nét tay qua lớp khí
    fist = np.exp(-(((X - cx) / (18 * UP)) ** 2 + ((Y - cy) / (16 * UP)) ** 2))
    A = np.clip(A * 1.15, 0, 1) * (1 - 0.5 * fist)
    t = np.clip(r, 0, 1)[..., None]
    col = np.array([255, 250, 225]) * (1 - t) ** 2 + np.array([255, 200, 80]) * 2 * t * (1 - t) + np.array([255, 130, 30]) * t ** 2
    aura = np.dstack([col, np.clip(A, 0, 1) * 255])
    halo = np.array(Image.fromarray((np.clip(A, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4 * UP))).astype(float)
    hl = np.zeros((CH, CW, 4)); hl[..., :3] = (255, 160, 40); hl[..., 3] = halo * 0.6
    auraI = Image.fromarray(hl.astype(np.uint8), 'RGBA')
    auraI.alpha_composite(Image.fromarray(aura.astype(np.uint8), 'RGBA'))

    bb = armF.getbbox()
    b2 = auraI.getbbox()
    bb = (min(bb[0], b2[0]), min(bb[1], b2[1]), max(bb[2], b2[2]), max(bb[3], b2[3]))
    armF, auraI = armF.crop(bb), auraI.crop(bb)
    armF.save(os.path.join(VFX, 'qi_arm.png'))
    auraI.save(os.path.join(VFX, 'qi_aura.png'))
    wrist = (ox + FIST_BOT[0] * UP - bb[0], oy + 70 * UP - bb[1])           # điểm xoay ≈ cổ tay/cẳng tay
    tipd = (oy + 70 * UP) - (cy - L)                                         # cổ tay → mũi luồng khí (px ảnh)
    print('qi_arm', armF.size, 'pivot', round(wrist[0] / armF.width, 3), round(wrist[1] / armF.height, 3), 'tip', round(tipd))
    comb = armF.copy(); comb.alpha_composite(auraI)
    pv = Image.new('RGBA', (comb.width * 3 + 40, comb.height + 20), (26, 24, 40, 255))
    pv.alpha_composite(armF, (10, 10))
    pv.alpha_composite(auraI, (comb.width + 20, 10))
    pv.alpha_composite(comb, (comb.width * 2 + 30, 10))
    pv.save(os.path.join(OUT, 'qi_arm_preview.png'))


if __name__ == '__main__':
    main()
