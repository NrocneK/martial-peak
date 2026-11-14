"""
BÁ ĐAO TRẢM (đại trùng tu: XOAY ĐAO) — VÒNG ĐAO KHÍ XOÁY, vẽ mới, nhìn TỪ TRÊN XUỐNG (game ép dẹt theo mặt đất + xoay nhanh):
  · 2 vệt chém hình lưỡi liềm đối xứng chạy quanh vòng tròn: ĐẦU vệt dày + sáng (mép lưỡi đao trắng), ĐUÔI mảnh + mờ dần
    (vệt nhoè chuyển động) — chiều xoay: ngược chiều kim đồng hồ trên ảnh (đầu vệt ở góc lớn nhất)
  · BÓNG ĐAO: ở đầu mỗi vệt chém có 1 thanh đao (nhìn từ trên: chuôi ở tâm, mũi đao chạm vòng) + 3 bóng mờ đuổi theo sau
  · các sợi gió xoáy mảnh bên trong, bụi sáng li ti văng ở mép ngoài
  · chiều xoay trong game: THEO chiều kim đồng hồ trên màn hình (đầu vệt đi trước)
  · màu: lõi trắng → tím hồng → tím đậm (cùng tông Bá Đao 0xe080ff / 0xb040ff), ảnh cộng sáng (ADD)
  → public/vfx/ba_dao_spin.png 512×512, tâm ảnh = chỗ nhân vật đứng; mép ngoài vệt chém ở ~0,9 nửa ảnh
  python3 -I tools/art/ba_dao_spin.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
N = 512
WHITE = np.array([255, 250, 255.])
PINK = np.array([240, 140, 255.])
PURPLE = np.array([150, 60, 255.])


def main():
    os.makedirs(OUT, exist_ok=True)
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    x, y = xx - N / 2, yy - N / 2
    r = np.hypot(x, y) / (N / 2)
    th = np.arctan2(y, x) % (2 * np.pi)
    core = np.zeros((N, N)); glow = np.zeros((N, N)); haze = np.zeros((N, N))
    SPAN = 1.55 * np.pi                                                  # độ dài vệt chém (góc)
    for arm in range(2):
        a0 = arm * np.pi
        ur = ((th - a0) % (2 * np.pi)) / SPAN                             # 0 = cuối đuôi, 1 = đầu vệt
        on = np.exp(-(np.maximum(ur - 1, 0) / 0.035) ** 2) * (ur < 1.25)   # qua đầu vệt tắt mềm (không cắt thẳng)
        u = np.clip(ur, 0, 1)
        ramp = u ** 2.2
        rc = 0.78 + 0.06 * u                                              # bán kính vệt (đầu hơi loe ra ngoài)
        w = 0.025 + 0.11 * u ** 1.5                                       # bề dày vệt: đầu dày, đuôi mảnh
        # mép ngoài sắc (lưỡi đao), mép trong loãng dần
        d = r - rc
        edge = np.exp(-(np.maximum(d, 0) / (0.012 + 0.01 * u)) ** 2) * np.exp(-(np.minimum(d, 0) / w) ** 2)
        core += on * edge * ramp * np.exp(-(np.maximum(d, 0) / 0.01) ** 2) * (np.abs(d) < w * 0.5)
        glow += on * edge * ramp
        haze += on * np.exp(-(d / (w * 2.5)) ** 2) * u ** 1.4 * 0.5
        # đầu vệt: loé trắng mũi lưỡi đao
        hx, hy = np.cos(a0 + SPAN) * 0.84, np.sin(a0 + SPAN) * 0.84
        core += np.exp(-(((x / (N / 2) - hx) ** 2 + (y / (N / 2) - hy) ** 2) / (2 * 0.025 ** 2))) * 1.2
    # sợi gió xoáy bên trong (xoắn ốc mảnh)
    swirl = np.zeros((N, N))
    for k, (rr0, ph) in enumerate(((0.35, 0.3), (0.5, 2.2), (0.62, 4.0), (0.45, 5.1))):
        spiral = rr0 + 0.12 * ((th - ph) % (2 * np.pi)) / (2 * np.pi)
        u = ((th - ph) % (2 * np.pi)) / (2 * np.pi)
        swirl += np.exp(-((r - spiral) / 0.008) ** 2) * u ** 2 * 0.55
    # bụi sáng văng ở mép ngoài
    rng = np.random.default_rng(8)
    dust = np.zeros((N, N))
    for _ in range(70):
        a = rng.uniform(0, 2 * np.pi); rr = rng.uniform(0.82, 0.98)
        px, py = np.cos(a) * rr * N / 2, np.sin(a) * rr * N / 2
        dust += np.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * rng.uniform(0.8, 1.8) ** 2)) * rng.uniform(0.4, 1)
    # bóng đao ở đầu mỗi vệt chém: thanh đao hướng tâm + 3 bóng mờ trễ dần (vệt nhoè)
    from PIL import ImageDraw, ImageFilter
    S2 = 3
    bl = Image.new('L', (N * S2, N * S2), 0)
    ed = Image.new('L', (N * S2, N * S2), 0)
    db, de = ImageDraw.Draw(bl), ImageDraw.Draw(ed)
    C = N * S2 / 2
    RAD = N / 2 * S2

    def blade(ang, a8):
        ux, uy = np.cos(ang), np.sin(ang)
        vx, vy = np.cos(ang + np.pi / 2), np.sin(ang + np.pi / 2)        # phía lưỡi = phía đi trước (theo chiều xoay)
        P = lambda rr, w: (C + (ux * rr + vx * w) * RAD, C + (uy * rr + vy * w) * RAD)
        # lưỡi đao cong: sống thẳng, lưỡi phình về phía trước, mũi vát nhọn
        spine = [P(0.17, -0.012), P(0.62, -0.014), P(0.80, 0.0)]
        edge = [P(0.80, 0.0), P(0.70, 0.045), P(0.45, 0.04), P(0.17, 0.026)]
        db.polygon(spine + edge, fill=a8)
        de.line(edge, fill=a8, width=2 * S2)                             # mép lưỡi sáng
        db.polygon([P(0.15, -0.04), P(0.17, -0.04), P(0.17, 0.05), P(0.15, 0.05)], fill=a8)   # chắn tay
        db.line([P(0.05, 0), P(0.15, 0)], fill=int(a8 * 0.8), width=3 * S2)                   # chuôi
    for arm in range(2):
        head = arm * np.pi + SPAN
        for g, a8 in ((0.0, 255), (-0.16, 120), (-0.32, 70), (-0.48, 40)):
            blade(head + g, a8)
    bl = np.array(bl.resize((N, N), Image.LANCZOS)).astype(float) / 255
    ed = np.array(ed.resize((N, N), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))).astype(float) / 255
    blg = np.array(Image.fromarray((bl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(float) / 255
    fade = np.clip((1 - r) / 0.06, 0, 1)
    acc = (core[..., None] * WHITE + glow[..., None] * PINK * 0.85 + haze[..., None] * PURPLE * 0.6
           + swirl[..., None] * PINK + dust[..., None] * WHITE * 0.8
           + bl[..., None] * np.array([230, 200, 255.]) * 0.75 + ed[..., None] * WHITE + blg[..., None] * PURPLE * 0.5) * fade[..., None]
    acc = np.clip(acc, 0, 255)
    A = acc.max(2) / 255
    col = acc / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    img.save(os.path.join(VFX, 'ba_dao_spin.png'))
    pv = Image.new('RGBA', (N * 2, N), (26, 24, 40, 255))
    pv.alpha_composite(img)
    pv.alpha_composite(img.resize((N, int(N * 0.55))), (N, int(N * 0.225)))
    pv.convert('RGB').resize((N, N // 2)).save(os.path.join(OUT, 'ba_dao_spin_preview.png'))


if __name__ == '__main__':
    main()
