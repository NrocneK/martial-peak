"""
THẦN THỨC TRẢM — cánh tay khí vàng (từ ảnh mẫu tools/art/ref/phap_tuong_arms.png: pháp tướng nhiều tay, nắm đấm vàng
có vòng xuyến) + LƯỠI KIẾM NĂNG LƯỢNG bọc nắm tay, nối dài theo TRỤC CẲNG TAY (khuỷu → cổ tay → nắm đấm → mũi kiếm).

  1) cắt cánh tay trên-phải (nắm đấm + vòng xuyến + cẳng tay) bằng đường viền tay vẽ theo ảnh mẫu; phần dưới khuỷu
     (cánh tay trên) mờ dần → tay khí hiện ra từ hư không
  2) quầng sáng vàng mềm quanh tay (thay quầng đỏ của nền mẫu)
  3) KIẾM KHÍ BAO BỌC BÀN TAY: lớp khí mỏng ôm sát đường viền nắm đấm (viền sáng, trong để thấy tay), từ mép trên
     bàn tay mọc ra một lưỡi kiếm thẳng nằm đúng trên trục cẳng tay. Dựng bằng hàm khoảng cách → mép sắc, cân đối.
     Lớp vẽ: quầng ngoài · thân vàng · viền sáng mảnh · sống kiếm trắng · vân khí chạy dọc
  4) xoay cả hình cho trục cẳng tay DỰNG ĐỨNG; điểm xoay khi chém = khuỷu tay
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
BLADE_U0 = 21                            # chân lưỡi: khoảng cách (dọc trục, từ FIST_C) tới mép trên nắm đấm
BLADE_L = 110                            # FIST_C → mũi lưỡi
TIP = (FIST_C[0] + (FIST_C[0] - ELBOW[0]) / 64.27 * BLADE_L, FIST_C[1] + (FIST_C[1] - ELBOW[1]) / 64.27 * BLADE_L)  # mũi (trên trục kéo dài)


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

    # --- LƯỠI KIẾM NĂNG LƯỢNG theo trục cẳng tay
    SS = 3                                                                   # siêu mẫu chống răng cưa
    Y, X = np.mgrid[0:CH * SS, 0:CW * SS].astype(float) / SS
    fcx, fcy = C(*FIST_C)
    u = (X - fcx) * ux + (Y - fcy) * uy                                      # dọc trục từ tâm nắm đấm, + lên mũi
    v = (X - fcx) * nx + (Y - fcy) * ny                                      # ngang trục
    L = BLADE_L * UP                                                         # tâm cổ tay → mũi
    # (a) VỎ KIẾM KHÍ ôm sát bàn tay: khoảng cách tới mặt nạ nắm đấm (bo tròn góc), nở ra 3px
    fmask = Image.new('L', (CW * SS, CH * SS), 0)
    ImageDraw.Draw(fmask).polygon([(C(x, y)[0] * SS, C(x, y)[1] * SS) for x, y in FIST], fill=255)
    fm = ndimage.gaussian_filter(np.array(fmask).astype(float), 2.5 * UP * SS) > 127
    dE = (ndimage.distance_transform_edt(~fm) - ndimage.distance_transform_edt(fm)) / SS - 3 * UP
    # (b) LƯỠI KIẾM thẳng trên trục cẳng tay, mọc ra từ mép trên bàn tay: hai mép song song, vát nhọn 22% cuối,
    #     loe sáng ở chân; phần dưới chân chìm vào vỏ
    u0 = BLADE_U0 * UP                                                       # chỗ trục ló ra khỏi mép trên nắm đấm
    W = 6.5 * UP
    taper = W * (1 - 0.2 * np.clip((u - u0) / (L * 0.78), 0, 1))
    hw = np.where(u < L * 0.78, taper, W * 0.8 * np.clip((L - u) / (L * 0.22), 0, 1))
    hw = hw + 2.5 * UP * np.exp(-np.maximum(u - u0, 0) / (6 * UP))                  # loe sáng ở chân lưỡi
    dB = np.where(u < L, np.abs(v) - hw, np.hypot(v, u - L)) + np.maximum(u0 + 6 * UP - u, 0) ** 1.5 / (2 * UP) ** 0.5
    k = 8 * UP                                                               # hợp mượt vỏ + lưỡi
    hh = np.clip(0.5 + 0.5 * (dE - dB) / k, 0, 1)
    d = dE * (1 - hh) + dB * hh - k * hh * (1 - hh)
    aa = 0.9
    fill = np.clip(0.5 - d / aa, 0, 1)                                       # bên trong (mép sắc)
    rim = np.exp(-(d / (1.1 * UP)) ** 2)                                     # viền sáng mảnh
    glowO = np.exp(-np.maximum(d, 0) / (6 * UP)) * (d > 0)                   # quầng ngoài
    inner = np.clip(-d / W, 0, 1)                                            # 0 ở mép → 1 ở sống kiếm
    # thân: lưỡi đặc; vỏ quanh bàn tay chỉ là lớp khí mỏng + viền sáng (thấy rõ tay bên trong)
    solid = hh ** 1.5
    bodyA = fill * (0.16 + 0.66 * solid) * (0.75 + 0.25 * inner)
    core = np.exp(-(v / (1.4 * UP)) ** 2) * np.clip((u - u0 + 4 * UP) / (10 * UP), 0, 1) * np.clip((L * 0.97 - u) / (L * 0.12), 0, 1) * solid
    vein = (0.5 + 0.5 * np.sin(v / (1.8 * UP) * np.pi + np.sin(u / (11 * UP)) * 1.5)) * 0.22 * solid
    A = np.clip(np.maximum.reduce([bodyA, rim * (0.6 + 0.35 * solid), glowO * (0.3 + 0.15 * solid), core]), 0, 1)
    c_out = np.array([255, 150, 40.]); c_body = np.array([255, 200, 85.]); c_hot = np.array([255, 242, 190.])
    tt = np.clip(inner * 1.3 + vein, 0, 1)[..., None]
    col = c_body * (1 - tt) + c_hot * tt
    col = np.where((d > 0)[..., None], c_out, col)
    col = col * (1 - rim[..., None] * 0.6) + c_hot * rim[..., None] * 0.6
    col = col * (1 - core[..., None]) + np.array([255, 255, 250.]) * core[..., None]
    auraI = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((CW, CH), Image.LANCZOS)

    # đánh dấu khuỷu + mũi bằng 2 điểm phụ (để đo lại sau khi xoay), rồi xoay cho trục dựng đứng
    mk = Image.new('L', (CW, CH), 0)
    md = ImageDraw.Draw(mk)
    for (px, py), val in ((C(*ELBOW), 255), (C(*TIP), 128)):
        md.ellipse([px - 3, py - 3, px + 3, py + 3], fill=val)
    ang = np.degrees(np.arctan2(ux, -uy))                                    # độ nghiêng trục so với phương đứng
    armF = armF.rotate(ang, resample=Image.BICUBIC, expand=True)
    auraI = auraI.rotate(ang, resample=Image.BICUBIC, expand=True)
    mk = np.array(mk.rotate(ang, resample=Image.NEAREST, expand=True))
    bb = armF.getbbox()
    b2 = auraI.getbbox()
    bb = (min(bb[0], b2[0]), min(bb[1], b2[1]), max(bb[2], b2[2]), max(bb[3], b2[3]))
    armF, auraI = armF.crop(bb), auraI.crop(bb)
    mk = mk[bb[1]:bb[3], bb[0]:bb[2]]
    ey, ex = [c.mean() for c in np.nonzero(mk == 255)]
    ty, tx = [c.mean() for c in np.nonzero(mk == 128)]
    armF.save(os.path.join(VFX, 'qi_arm.png'))
    auraI.save(os.path.join(VFX, 'qi_aura.png'))
    print('qi_arm', armF.size, 'tilt', round(ang, 1), 'pivot(khuỷu)', round(ex / armF.width, 3), round(ey / armF.height, 3),
          'mũi', round(tx, 1), round(ty, 1), 'reach', round(ey - ty))

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
    # ảnh kiểm tra trục trên ảnh mẫu (chưa xoay)
    chk = Image.open(os.path.join(HERE, 'ref', 'phap_tuong_arms.png')).convert('RGB').resize((332 * 3, 328 * 3), Image.LANCZOS)
    dc = ImageDraw.Draw(chk)
    P = lambda x, y: ((x + CROP[0]) * 3, (y + CROP[1]) * 3)
    dc.line([P(*ELBOW), P(*TIP)], fill=(0, 255, 120), width=3)
    for p in (ELBOW, FIST_C, TIP):
        x, y = P(*p); dc.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 40, 40))
    chk.crop((450, 0, 950, 600)).save(os.path.join(OUT, 'qi_axis_check.png'))


if __name__ == '__main__':
    main()
