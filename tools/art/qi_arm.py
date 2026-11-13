"""
THẦN THỨC TRẢM (mới) — cánh tay khí vàng cầm kiếm, lấy từ ảnh mẫu tools/art/ref/phap_tuong_arms.png
(pháp tướng nhiều tay, nắm đấm vàng có vòng xuyến).

  1) cắt cánh tay trên-phải (nắm đấm + vòng xuyến + cẳng tay) bằng đường viền tay vẽ theo ảnh mẫu (không tách bằng màu
     được vì quầng đỏ cam quanh tay trùng màu phần tối của tay)
  2) giữ nguyên nét vẽ trong tay, cẳng tay mờ dần về phía khuỷu (tay khí hiện ra từ hư không)
  3) vẽ thêm thanh kiếm khí xuyên qua nắm đấm (lưỡi nhô lên trên, nằm DƯỚI lớp nắm tay → nhìn như đang nắm chuôi)
  4) quầng sáng vàng mềm quanh cả tay + kiếm (thay quầng đỏ của nền mẫu)
  → public/vfx/qi_arm.png      (dựng đứng: mũi kiếm ở trên, khuỷu ở dưới; điểm xoay = cổ tay)

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

    # khung lớn: thêm chỗ cho kiếm phía trên
    SW = 120 * UP                                                            # chiều dài lưỡi kiếm trên nắm tay
    PAD = 14 * UP
    CW, CH = w * UP + 2 * PAD, h * UP + SW + PAD
    ox, oy = PAD, SW
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    # --- kiếm khí (vẽ siêu mẫu ×4 rồi thu)
    S = 4
    sw = Image.new('RGBA', (CW * S, CH * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(sw)
    tx, ty = (ox + FIST_TOP[0] * UP) * S, (oy + FIST_TOP[1] * UP) * S
    bx, by = (ox + FIST_BOT[0] * UP) * S, (oy + FIST_BOT[1] * UP) * S
    vx, vy = tx - bx, ty - by
    vl = np.hypot(vx, vy); ux, uy = vx / vl, vy / vl; nx, ny = -uy, ux
    tipx, tipy = tx + ux * SW * S * 0.92, ty + uy * SW * S * 0.92
    bw = 5.5 * UP * S                                                        # nửa bề rộng lưỡi
    base = [(bx + nx * bw, by + ny * bw), (tx + nx * bw, ty + ny * bw)]
    pre = (tipx - ux * 18 * UP * S, tipy - uy * 18 * UP * S)
    blade = [base[0], base[1], (pre[0] + nx * bw * 0.85, pre[1] + ny * bw * 0.85), (tipx, tipy),
             (pre[0] - nx * bw * 0.85, pre[1] - ny * bw * 0.85), (tx - nx * bw, ty - ny * bw), (bx - nx * bw, by - ny * bw)]
    d.polygon(blade, fill=(255, 196, 80, 235))
    d.polygon([(bx + nx * bw * 0.45, by + ny * bw * 0.45), (pre[0] + nx * bw * 0.3, pre[1] + ny * bw * 0.3), (tipx, tipy),
               (pre[0] - nx * bw * 0.3, pre[1] - ny * bw * 0.3), (bx - nx * bw * 0.45, by - ny * bw * 0.45)], fill=(255, 238, 180, 255))
    d.line([(bx, by), (tipx - ux * 6 * S, tipy - uy * 6 * S)], fill=(255, 255, 240, 255), width=int(1.6 * UP * S))
    # chắn kiếm ngay trên nắm tay
    gx, gy = tx + ux * 0.5 * UP * S, ty + uy * 0.5 * UP * S
    gw = 15 * UP * S
    d.polygon([(gx + nx * gw, gy + ny * gw), (gx + ux * 4 * UP * S, gy + uy * 4 * UP * S), (gx - nx * gw, gy - ny * gw),
               (gx - ux * 3 * UP * S, gy - uy * 3 * UP * S)], fill=(255, 180, 60, 255))
    d.ellipse([gx - 3 * UP * S, gy - 3 * UP * S, gx + 3 * UP * S, gy + 3 * UP * S], fill=(255, 245, 200, 255))
    sw = sw.resize((CW, CH), Image.LANCZOS)
    canvas.alpha_composite(sw)
    # --- tay (đè lên chuôi kiếm)
    armI = Image.fromarray(np.dstack([arm, a * 255]).astype(np.uint8), 'RGBA')
    canvas.alpha_composite(armI, (ox, oy))
    # --- quầng sáng vàng
    al = np.array(canvas)[..., 3].astype(float)
    glow = np.array(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5 * UP))).astype(float)
    g = np.zeros((CH, CW, 4))
    g[..., :3] = (255, 170, 50)
    g[..., 3] = np.clip(glow * 1.3, 0, 255) * 0.75
    fin = Image.fromarray(g.astype(np.uint8), 'RGBA')
    fin.alpha_composite(canvas)
    bb = fin.getbbox()
    fin = fin.crop(bb)
    fin.save(os.path.join(VFX, 'qi_arm.png'))
    wrist = (ox + FIST_BOT[0] * UP - bb[0], oy + 70 * UP - bb[1])           # điểm xoay ≈ cổ tay/cẳng tay
    print('qi_arm', fin.size, 'pivot', round(wrist[0] / fin.width, 3), round(wrist[1] / fin.height, 3))
    pv = Image.new('RGBA', (fin.width * 2 + 30, fin.height + 20), (26, 24, 40, 255))
    pv.alpha_composite(fin, (10, 10))
    pv.alpha_composite(fin.transpose(Image.FLIP_LEFT_RIGHT), (fin.width + 20, 10))
    pv.save(os.path.join(OUT, 'qi_arm_preview.png'))


if __name__ == '__main__':
    main()
