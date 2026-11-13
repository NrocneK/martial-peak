"""
HƯ KHÔNG LIỆT PHÙNG — hố đen xoáy, lấy NGUYÊN từ video mẫu tools/art/ref/black_hole_sample.mp4 (4s, 60 khung/s,
góc nhìn chéo từ trên xuống — xoáy đã là hình bầu dục nằm trên mặt đất, không cần nén thêm).

  1) cắt khung hình (15 khung/s → 60 khung, vòng lặp 4s)
  2) bám tâm hố đen từng khung (trọng tâm vùng sáng) → hố đứng yên giữa khung (video có rung nhẹ)
  3) tách nền đất tối: lớp CỘNG SÁNG = ảnh − màu nền; bỏ vết nứt đất (xám, không bão hoà) trừ khi rất sáng
     (lõi trắng); giữ nguyên màu tím / trắng / tia xanh của mẫu
  4) lõi đen của hố (cộng sáng không vẽ được màu đen) → game vẽ riêng một đĩa đen mềm bên dưới
  → public/vfx/black_hole.png  (bảng khung COLS×ROWS, mỗi khung FW×FH)

  python3 -I tools/art/black_hole.py
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
FPS = 15
CW, CH = 440, 340                        # khung cắt quanh tâm hố (px video)
K = 0.6                                  # thu nhỏ khung khi xuất
COLS = 8
BG = np.array([28, 24, 20.])             # màu nền đất tối của video


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'ref', 'black_hole_sample.mp4'),
                        '-vf', f'fps={FPS}', os.path.join(td, 'f%03d.png')], check=True)
        names = sorted(n for n in os.listdir(td) if n.endswith('.png'))
        frames = [np.array(Image.open(os.path.join(td, n)).convert('RGB')).astype(float) for n in names]
    frames = [f for f in frames if f.mean() > 5]                              # bỏ khung đen đầu video
    out = []
    cens = []
    for a in frames:
        e = np.clip(a - BG, 0, 255)
        sat = a.max(2) - a.min(2)
        lum = a.mean(2)
        keep = np.maximum(np.clip((sat - 18) / 40, 0, 1), np.clip((lum - 150) / 60, 0, 1))   # bỏ vết nứt xám
        e = e * keep[..., None]
        # tâm xoáy = trọng tâm vùng tím sáng (lặp 3 lần, mỗi lần chỉ xét trong 160px quanh tâm cũ → bỏ tia văng xa)
        wgt = np.clip(lum - 90, 0, None) * (sat > 40)
        Yg, Xg = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        cy, cx = np.unravel_index(np.argmax(ndimage.gaussian_filter(wgt, 30)), wgt.shape)
        for _ in range(3):
            m = wgt * (np.hypot(Xg - cx, Yg - cy) < 160)
            cx, cy = (m * Xg).sum() / m.sum(), (m * Yg).sum() / m.sum()
        cens.append((cx, cy))
        out.append(e)
    # làm mượt quỹ đạo tâm (bỏ rung lắc nhỏ, giữ hố đứng yên)
    c = np.array(cens, float)
    jump = np.hypot(*np.diff(c, axis=0).T)
    print('dịch tâm giữa các khung (px):', np.percentile(jump, [50, 90, 100]).round(1))
    c = ndimage.uniform_filter1d(c, 3, axis=0, mode='nearest')
    print('tâm:', c[::6].round().tolist())
    n = len(out)
    ROWS = (n + COLS - 1) // COLS
    FW, FH = round(CW * K), round(CH * K)
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS), (0, 0, 0, 0))
    for i, (e, (cx, cy)) in enumerate(zip(out, c)):
        x0, y0 = int(round(cx - CW / 2)), int(round(cy - CH / 2))
        pad = np.zeros((CH, CW, 3))
        sx0, sy0 = max(0, x0), max(0, y0)
        sx1, sy1 = min(e.shape[1], x0 + CW), min(e.shape[0], y0 + CH)
        pad[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = e[sy0:sy1, sx0:sx1]
        # mép khung mờ dần (tia xanh ở rìa không bị cắt cứng)
        yy, xx = np.mgrid[0:CH, 0:CW]
        edge = np.clip(np.minimum.reduce([xx, yy, CW - 1 - xx, CH - 1 - yy]) / 24, 0, 1)
        pad *= edge[..., None]
        A = pad.max(2) / 255
        rgb = pad / np.maximum(A[..., None], 1e-3)
        fr = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((FW, FH), Image.LANCZOS)
        sheet.paste(fr, ((i % COLS) * FW, (i // COLS) * FH))
    sheet.save(os.path.join(VFX, 'black_hole.png'))
    print('black_hole', n, 'frames', FW, 'x', FH, 'sheet', sheet.size)
    # xem trước 4 khung trên nền game (cộng sáng)
    pv = Image.new('RGB', (FW * 4, FH), (26, 24, 40))
    sa = np.array(sheet).astype(float)
    for j, i in enumerate((0, n // 4, n // 2, 3 * n // 4)):
        fx, fy = (i % COLS) * FW, (i // COLS) * FH
        f = sa[fy:fy + FH, fx:fx + FW]
        m = np.clip(np.array([26, 24, 40.]) + f[..., :3] * f[..., 3:] / 255, 0, 255)
        pv.paste(Image.fromarray(m.astype(np.uint8)), (j * FW, 0))
    pv.save(os.path.join(OUT, 'black_hole_preview.png'))


if __name__ == '__main__':
    main()
