"""
ĐẠI ĐẠO QUY NHẤT — TRẬN ÂM DƯƠNG BÁT QUÁI lấy NGUYÊN từ video mẫu tools/art/ref/dai_dao_taichi.mp4
  (nền đen, nét trắng; tâm trận cố định ở (360, 640) của khung 720×1280).
  Video cứ ~1,1s thêm 1 VÒNG mới (phóng ra rồi ổn định lại) → 13 lớp. Cách làm (theo đề xuất):
  1) mỗi lớp lấy 1 khung ĐÃ ỔN ĐỊNH (ngay trước khi vòng kế tiếp xuất hiện)
  2) căn kích thước đồng bộ: video thu nhỏ cả trận mỗi khi thêm vòng → so khớp HỒ SƠ VÒNG (độ sáng trung bình theo bán kính,
     không phụ thuộc góc xoay) giữa 2 lớp liền nhau để tìm tỉ lệ, sao cho các vòng cũ TRÙNG KHÍT ở mọi lớp
  3) ghép các lớp vào spritesheet cùng một hệ toạ độ (lớp cuối: mép ngoài ở 0,96 nửa ô) → game hiện lần lượt, hoà mờ chuyển lớp
  → public/vfx/dai_dao_layers.png (4×4 ô 512×512, dùng 13 ô). Ảnh TRẮNG, độ đục = độ sáng → game nhuộm bằng tint, ADD.
  Cần ffmpeg.   python3 -I tools/art/dai_dao.py
"""
import os
import subprocess
import tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
SRC = os.path.join(HERE, 'ref', 'dai_dao_taichi.mp4')
CX, CY, R = 360, 640, 340
STAGES = [1.0, 2.1, 3.2, 4.3, 5.4, 6.5, 7.6, 8.7, 9.8, 10.9, 12.0, 13.1, 14.5]   # giây: khung ổn định của từng lớp
CELL, COLS = 512, 4
EDGE = 0.96


def frame(t, tmp):
    p = os.path.join(tmp, 'f.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', SRC, '-frames:v', '1', p], check=True)
    g = np.array(Image.open(p).convert('L')).astype(float)[CY - R:CY + R, CX - R:CX + R]
    return np.clip((g - 6) * 255 / 249, 0, 255)


YY, XX = np.mgrid[0:2 * R, 0:2 * R].astype(float)
RR = np.hypot(XX - R, YY - R)


def profile(g):
    idx = np.clip(RR.astype(int), 0, R)
    return np.bincount(idx.ravel(), g.ravel(), R + 1) / np.maximum(np.bincount(idx.ravel(), None, R + 1), 1)


def outer(g):
    v = RR[g > 60]
    return np.percentile(v, 99.5)


def match(pa, ra, pb):
    """tỉ lệ s: bán kính r của lớp a ↔ r·s của lớp b, khớp hồ sơ vòng trong phạm vi lớp a"""
    best, bs = -9, 1
    r = np.arange(4, int(ra * 0.97))
    a = pa[r]
    a = (a - a.mean()) / (a.std() + 1e-6)
    for s in np.arange(0.55, 1.25, 0.002):
        rb = r * s
        if rb.max() >= R:
            continue
        b = np.interp(rb, np.arange(R + 1), pb)
        b = (b - b.mean()) / (b.std() + 1e-6)
        c = (a * b).mean()
        if c > best:
            best, bs = c, s
    return bs, best


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        G = [frame(t, tmp) for t in STAGES]
    P = [profile(g) for g in G]
    O = [outer(g) for g in G]
    # tỉ lệ từng lớp về hệ toạ độ của lớp CUỐI (nhân dồn từ cuối ngược về đầu)
    n = len(G)
    scale = [1.0] * n
    for k in range(n - 2, -1, -1):
        s, c = match(P[k], O[k], P[k + 1])
        scale[k] = scale[k + 1] * s
        print(f'lớp {k + 1}→{k + 2}: tỉ lệ {s:.3f} (khớp {c:.2f})')
    px = EDGE * (CELL / 2) / O[-1]                                       # px video (hệ lớp cuối) → px ô
    rows = (n + COLS - 1) // COLS
    sheet = Image.new('RGBA', (CELL * COLS, CELL * rows), (0, 0, 0, 0))
    for k, g in enumerate(G):
        g = g * np.clip((1 - RR / R) / 0.02, 0, 1)
        k_ = scale[k] * px
        big = max(1, round(2 * R * k_))
        im = Image.fromarray(g.astype(np.uint8), 'L').resize((big, big), Image.LANCZOS)
        cv = Image.new('L', (CELL, CELL), 0)
        off = (CELL - big) // 2
        cv.paste(im, (off, off)) if off >= 0 else cv.paste(im.crop((-off, -off, -off + CELL, -off + CELL)), (0, 0))
        a = np.array(cv)
        w = np.full_like(a, 255)
        sheet.paste(Image.fromarray(np.dstack([w, w, w, a]), 'RGBA'), ((k % COLS) * CELL, (k // COLS) * CELL))
    sheet.save(os.path.join(VFX, 'dai_dao_layers.png'))
    print('số lớp', n)
    pv = Image.new('RGBA', sheet.size, (26, 24, 40, 255))
    pv.alpha_composite(sheet)
    pv.convert('RGB').resize((sheet.width // 4, sheet.height // 4), Image.LANCZOS).save(os.path.join(OUT, 'dai_dao_layers_preview.png'))


if __name__ == '__main__':
    main()
