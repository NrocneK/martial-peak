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
from scipy import ndimage

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
FIST = [(22, 21), (30, 17), (40, 17), (50, 23), (55, 32), (57, 38), (52, 45), (40, 47), (30, 44), (23, 36), (21, 28)]  # nắm đấm
FORE_A, FORE_B = (54, 94), (58.5, 70)    # đường giữa cẳng tay (đo từ mặt nạ tay) → trục lưỡi kiếm
BLADE_Y = 38                              # chân lưỡi: ngang mép trên vòng xuyến
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
    a *= np.clip((112 - yy) / 42, 0, 1) ** 1.2
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

    # --- LƯỠI KIẾM NĂNG LƯỢNG nối dài THEO TRỤC CẲNG TAY (dựng bằng hàm khoảng cách → mép sắc, cân đối):
    #     trục = đường giữa cẳng tay đo từ ảnh mẫu, kéo thẳng qua cổ tay lên thành lưỡi kiếm (hai mép song song, vát nhọn
    #     22% cuối, loe sáng ở chân). Vỏ năng lượng ôm nắm đấm + cổ tay, hợp mượt vào chân lưỡi.
    #     Lớp vẽ: quầng ngoài · thân vàng · viền sáng mảnh · sống kiếm trắng · vân khí chạy dọc.
    #     Cuối cùng xoay cả ảnh cho trục cẳng tay DỰNG ĐỨNG (game xoay quanh cổ tay nằm trên trục).
    SS = 3                                                                   # siêu mẫu chống răng cưa
    Hh, Ww = CH * SS, CW * SS
    Y, X = np.mgrid[0:Hh, 0:Ww].astype(float) / SS
    C = lambda x, y: (ox + x * UP, oy + y * UP)
    ax_, ay_ = C(*FORE_A); bx_, by_ = C(*FORE_B)
    ux, uy = bx_ - ax_, by_ - ay_
    ul = np.hypot(ux, uy); ux, uy = ux / ul, uy / ul                         # hướng trục (lên trên)
    nx, ny = -uy, ux
    t0 = ((C(0, BLADE_Y)[1] - by_) / uy)                                    # chân lưỡi: điểm trên trục ngang mép trên vòng xuyến
    px0, py0 = bx_ + ux * t0, by_ + uy * t0
    u = (X - px0) * ux + (Y - py0) * uy                                      # dọc trục, + lên mũi
    v = (X - px0) * nx + (Y - py0) * ny                                      # ngang trục
    L = SW * 0.98                                                            # chiều dài lưỡi
    W = 7.5 * UP                                                             # nửa bề rộng lưỡi ở chân
    taper = W * (1 - 0.25 * np.clip(u / (L * 0.78), 0, 1))                  # thon nhẹ dần lên
    hw = np.where(u < L * 0.78, taper, W * 0.75 * np.clip((L - u) / (L * 0.22), 0, 1))  # vát nhọn mũi
    hw = hw + 6 * UP * np.exp(-np.maximum(u, 0) / (6 * UP)) * np.clip((u + 10 * UP) / (6 * UP), 0, 1)  # loe sáng ở chân lưỡi
    dB = np.where(u < L, np.abs(v) - hw, 1e4) + np.maximum(-12 * UP - u, 0) * 3   # chân lưỡi chìm dần vào vỏ
    # vỏ ôm theo ĐÚNG hình nắm đấm + đoạn cổ tay (khoảng cách tới mặt nạ, nở ra 4px) — không phải hình tròn
    fmask = Image.new('L', (CW * SS, CH * SS), 0)
    dr = ImageDraw.Draw(fmask)
    dr.polygon([(C(x, y)[0] * SS, C(x, y)[1] * SS) for x, y in FIST], fill=255)
    wr = 7 * UP * SS                                                         # cổ tay: đoạn trục từ vòng xuyến tới chân lưỡi
    for tt_ in np.linspace(-6 * UP, 0, 8):
        cx_, cy_ = (px0 + ux * tt_) * SS, (py0 + uy * tt_) * SS
        dr.ellipse([cx_ - wr, cy_ - wr, cx_ + wr, cy_ + wr], fill=255)
    fm = ndimage.gaussian_filter(np.array(fmask).astype(float), 3 * UP * SS) > 127   # bo tròn góc
    dE = (ndimage.distance_transform_edt(~fm) - ndimage.distance_transform_edt(fm)) / SS - 3 * UP
    k = 10 * UP                                                              # hợp mượt 2 hình
    hh = np.clip(0.5 + 0.5 * (dE - dB) / k, 0, 1)
    d = dE * (1 - hh) + dB * hh - k * hh * (1 - hh)
    aa = 0.9
    fill = np.clip(0.5 - d / aa, 0, 1)                                       # bên trong (mép sắc)
    rim = np.exp(-(d / (1.1 * UP)) ** 2)                                     # viền sáng mảnh
    glowO = np.exp(-np.maximum(d, 0) / (6 * UP)) * (d > 0)                   # quầng ngoài
    inner = np.clip(-d / W, 0, 1)                                            # sâu vào trong thân lưỡi
    onBlade = (u > 0) & (dB < dE)
    core = np.exp(-(v / (1.4 * UP)) ** 2) * onBlade * np.clip((L * 0.97 - u) / (L * 0.1), 0, 1)
    vein = (0.5 + 0.5 * np.sin(v / (1.6 * UP) * np.pi + np.sin(u / (9 * UP)) * 1.5)) * onBlade * 0.25
    inFist = ndimage.gaussian_filter(fm.astype(float), 3 * UP * SS) * np.clip((4 * UP - u) / (10 * UP), 0, 1)
    bodyA = fill * (0.7 + 0.3 * inner) * (0.12 + 0.88 * hh ** 1.5)        # lưỡi đặc; vỏ quanh nắm tay gần trong suốt (chỉ viền sáng)
    A = np.clip(np.maximum.reduce([bodyA, rim * (0.55 + 0.4 * hh), glowO * (0.25 + 0.2 * hh), core]), 0, 1)
    c_out = np.array([255, 150, 40.]); c_body = np.array([255, 205, 90.]); c_hot = np.array([255, 242, 190.])
    tt = np.clip(inner * 1.6 + vein, 0, 1)[..., None]
    col = c_body * (1 - tt) + c_hot * tt * 0.9 + c_body * tt * 0.1
    col = np.where((d > 0)[..., None], c_out, col)
    col = col * (1 - rim[..., None] * 0.6) + c_hot * rim[..., None] * 0.6
    col = col * (1 - core[..., None]) + np.array([255, 255, 250.]) * core[..., None]
    big = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    auraI = big.resize((CW, CH), Image.LANCZOS)

    # xoay cho trục cẳng tay dựng đứng
    ang = np.degrees(np.arctan2(ux, -uy))                                    # độ nghiêng trục so với phương đứng
    armF = armF.rotate(ang, resample=Image.BICUBIC, expand=True)
    auraI = auraI.rotate(ang, resample=Image.BICUBIC, expand=True)
    bb = armF.getbbox()
    b2 = auraI.getbbox()
    bb = (min(bb[0], b2[0]), min(bb[1], b2[1]), max(bb[2], b2[2]), max(bb[3], b2[3]))
    armF, auraI = armF.crop(bb), auraI.crop(bb)
    armF.save(os.path.join(VFX, 'qi_arm.png'))
    auraI.save(os.path.join(VFX, 'qi_aura.png'))
    # đo lại trên ảnh đã xoay: trục = cột sống kiếm sáng nhất; mũi = hàng trên cùng có lưỡi; cổ tay cách mũi (L + t0)
    au = np.array(auraI).astype(float)
    lum = au[..., :3].mean(2) * au[..., 3] / 255
    rows = slice(int(au.shape[0] * 0.1), int(au.shape[0] * 0.3))
    axx = float(np.argmax(lum[rows].sum(0)))
    col = au[:, int(axx), 3]
    tipy = float(np.nonzero(col > 60)[0].min())
    wy = tipy + (L + t0)
    print('qi_arm', armF.size, 'tilt', round(ang, 1), 'pivot', round(axx / armF.width, 3), round(wy / armF.height, 3),
          'reach', round(L + t0))
    ca = np.array(armF).astype(float); cb = np.array(auraI).astype(float)
    bg = np.full(ca.shape[:2] + (3,), (26, 24, 40.))
    m1 = bg * (1 - ca[..., 3:] / 255) + ca[..., :3] * ca[..., 3:] / 255
    m1 = np.clip(m1 + cb[..., :3] * cb[..., 3:] / 255, 0, 255)                  # cộng sáng như trong game
    comb = Image.fromarray(np.dstack([m1, np.full(ca.shape[:2], 255.)]).astype(np.uint8), 'RGBA')
    pv = Image.new('RGBA', (comb.width * 3 + 40, comb.height + 20), (26, 24, 40, 255))
    pv.alpha_composite(armF, (10, 10))
    pv.alpha_composite(auraI, (comb.width + 20, 10))
    pv.alpha_composite(comb, (comb.width * 2 + 30, 10))
    pv.save(os.path.join(OUT, 'qi_arm_preview.png'))


if __name__ == '__main__':
    main()
