"""
HƯ KHÔNG LIỆT PHÙNG — VỤ NỔ khi hố đen sụp, lấy từ video mẫu tools/art/ref/black_hole_explosion.mp4
(bỏ 4s đầu — cảnh nhắm bắn; vụ nổ bắt đầu ≈ 3.4s, tắt dần tới ≈ 7s; máy quay đứng yên trong đoạn này).

  1) nền sạch = khung cuối video (8.8s, chỉ còn nền sương xám), xoá vệt tím còn sót giữa khung bằng làm mờ trung vị
  2) mỗi khung tách thành 2 lớp:
       · PHÁT SÁNG (cộng sáng) = ảnh − nền  → tím, xanh ngọc, tia sáng, vòng xung kích, hoa văn tím trên đất
       · BÓNG TỐI (phủ đen)    = nền − ảnh  → khối vật chất đen của vụ nổ
     giữ nguyên màu mẫu
  3) máy quay của video nhìn thấp (mặt đất nén ≈ 0.37) → kéo dọc ×STRETCH cho khớp góc nhìn game (≈ 0.6)
  → public/vfx/bh_blast_glow.png, bh_blast_dark.png  (bảng khung COLS cột, mỗi khung FW×FH; tâm nổ = TX, TY theo tỉ lệ)

  python3 -I tools/art/black_hole_blast.py
"""
import os
import subprocess
import tempfile
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
VID = os.path.join(HERE, 'ref', 'black_hole_explosion.mp4')
T0, T1, FPS = 3.4, 6.6, 20
CX, CY = 368, 300                        # tâm vụ nổ trên mặt đất (px video)
X0, X1, Y0, Y1 = 158, 578, 40, 414       # vùng cắt (tia sáng bay cao phía trên)
STRETCH = 1.5                            # kéo dọc cho khớp góc nhìn game
K = 0.5                                  # thu nhỏ khi xuất
COLS = 8


def grab(td, ss, fps=None, n=None):
    args = ['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-i', VID]
    if fps:
        args += ['-t', str(T1 - T0), '-vf', f'fps={fps}']
    if n:
        args += ['-frames:v', str(n)]
    subprocess.run(args + [os.path.join(td, 'f%03d.png')], check=True)
    return [np.array(Image.open(os.path.join(td, f)).convert('RGB')).astype(float) for f in sorted(os.listdir(td))]


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        bg = grab(td, 8.8, n=1)[0]
    with tempfile.TemporaryDirectory() as td:
        frames = grab(td, T0, fps=FPS)
    # xoá vệt tím còn sót ở giữa nền (làm mờ trung vị vùng giữa)
    sm = np.dstack([ndimage.median_filter(bg[..., c], size=41) for c in range(3)])
    yy, xx = np.mgrid[0:bg.shape[0], 0:bg.shape[1]]
    m = np.clip(1 - np.hypot((xx - CX) / 110, (yy - CY) / 60) + 0.5, 0, 1)[..., None]
    bg = bg * (1 - m) + sm * m
    W, Hh = X1 - X0, Y1 - Y0
    FW, FH = round(W * K), round(Hh * STRETCH * K)
    n = len(frames)
    rows = (n + COLS - 1) // COLS
    glowS = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
    darkS = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
    ey, ex = np.mgrid[0:Hh, 0:W]
    edge = np.clip(np.minimum.reduce([ex, ey, W - 1 - ex, Hh - 1 - ey]) / 20, 0, 1)
    for i, f in enumerate(frames):
        f = f[Y0:Y1, X0:X1]; b = bg[Y0:Y1, X0:X1]
        add = np.clip(f - b - 4, 0, 255) * edge[..., None]
        A = add.max(2) / 255
        rgb = add / np.maximum(A[..., None], 1e-3)
        g = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
        dk = np.clip((b.mean(2) - f.mean(2) - 6) / 55, 0, 1) * edge
        d = Image.fromarray(np.dstack([np.zeros((Hh, W, 3)), dk * 235]).astype(np.uint8), 'RGBA')
        g = g.resize((FW, FH), Image.LANCZOS); d = d.resize((FW, FH), Image.LANCZOS)
        glowS.paste(g, ((i % COLS) * FW, (i // COLS) * FH))
        darkS.paste(d, ((i % COLS) * FW, (i // COLS) * FH))
    glowS.save(os.path.join(VFX, 'bh_blast_glow.png'))
    darkS.save(os.path.join(VFX, 'bh_blast_dark.png'))
    tx, ty = (CX - X0) / W, (CY - Y0) / Hh
    print('bh_blast', n, 'frames', FW, 'x', FH, 'sheet', glowS.size, 'tâm', round(tx, 3), round(ty, 3))
    # xem trước trên nền game: phủ đen rồi cộng sáng
    ga, da = np.array(glowS).astype(float), np.array(darkS).astype(float)
    pick = [0, 3, 6, 10, 16, 24, 34, 48]
    pv = Image.new('RGB', (FW * len(pick), FH), (26, 24, 40))
    for j, i in enumerate(pick):
        if i >= n:
            continue
        fx, fy = (i % COLS) * FW, (i // COLS) * FH
        base = np.full((FH, FW, 3), (26, 24, 40.))
        dd = da[fy:fy + FH, fx:fx + FW, 3:] / 255
        base = base * (1 - dd)
        gg = ga[fy:fy + FH, fx:fx + FW]
        base = np.clip(base + gg[..., :3] * gg[..., 3:] / 255, 0, 255)
        pv.paste(Image.fromarray(base.astype(np.uint8)), (j * FW, 0))
    pv.save(os.path.join(OUT, 'bh_blast_preview.png'))


if __name__ == '__main__':
    main()
