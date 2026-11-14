"""
CỬU TIÊU THẦN LÔI — NỔ TÀN DƯ sau tia sét, lấy từ video mẫu tools/art/ref/lightning_residue.mp4 (giây 3.27 → 5.93):
cầu nổ trắng → lõi vàng + vòng sét lam → nhạt dần → khói đen tàn rồi tắt.
  · nền video là ô cờ tím tĩnh → dựng tấm nền = trung vị các khung sau khi hiệu ứng tắt (5.95–6.45s)
  · tách kiểu vẽ thường: phần sáng hơn nền giữ màu gốc, phần tối hơn nền (khói tàn) thành đen mờ
    → public/vfx/thunder_residue.png (+ _aw: lam → tím, giữ vàng)
  · vài khung đầu có tia sét của video phía trên cầu → xoá bằng mặt nạ elip mềm (game đã có tia sét riêng)
  python3 -I tools/art/lightning_residue.py   (cần ffmpeg)
"""
import os
import subprocess
import tempfile
import glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
SRC = os.path.join(HERE, 'ref', 'lightning_residue.mp4')
CROP = 'crop=560:620:90:150'
FPS = 15
X0, Y0, X1, Y1 = 40, 130, 520, 560          # khung cắt quanh cầu (toạ độ trong CROP)
CX, CY = 280.0, 350.0                        # tâm cầu
SC = 0.5                                     # thu nhỏ khung


def grab(tmp, ss, t, tag):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(t), '-i', SRC, '-vf', f'fps={FPS},{CROP}',
                    os.path.join(tmp, tag + '%03d.png')], check=True)
    return [np.array(Image.open(f).convert('RGB')).astype(float) for f in sorted(glob.glob(os.path.join(tmp, tag + '*.png')))]


def to_purple(rgba):
    """lam → tím (xoay sắc độ vùng lam/lục lam +45°), vàng giữ nguyên"""
    img = Image.fromarray(rgba[..., :3].astype(np.uint8)).convert('HSV')
    h = np.array(img).astype(float)
    hue = h[..., 0] * 360 / 255
    blue = (hue > 150) & (hue < 270)
    hue = np.where(blue, hue + 45, hue)
    h[..., 0] = (hue % 360) * 255 / 360
    rgb = np.array(Image.fromarray(h.astype(np.uint8), 'HSV').convert('RGB')).astype(float)
    return np.dstack([rgb, rgba[..., 3]])


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        bg = np.median(np.stack(grab(tmp, 5.95, 0.5, 'b')), 0)
        frames = grab(tmp, 3.0, 3.2, 's')[3:44]             # s004 … s044
    yy, xx = np.mgrid[0:bg.shape[0], 0:bg.shape[1]].astype(float)
    e = np.sqrt(((xx - CX) / 240) ** 2 + ((yy - CY) / 172) ** 2)
    bolt_mask = np.where(yy >= CY, 1.0, np.clip((1.0 - e) / 0.12, 0, 1))
    lb = bg.mean(2)
    adds = []
    for i, f in enumerate(frames):
        # tách kiểu vẽ thường (không cộng): sáng hơn nền → độ đục nhỏ nhất để màu không vượt 255
        # (chỗ trắng chói = đục hẳn, không lộ ô cờ); tối hơn nền → màu đen với độ đục theo mức tối (khói tàn)
        d = f - bg
        a_br = np.clip(np.max(np.clip(d - 6, 0, None) / np.maximum(255 - bg, 1), 2), 0, 1)
        col_br = np.clip(bg + d / np.maximum(a_br[..., None], 1e-3), 0, 255)
        dk = np.clip((lb - f.mean(2) - 4) / np.maximum(lb, 1), 0, 1)
        A = np.where(a_br > 0, a_br, dk)
        col = np.where((a_br > 0)[..., None], col_br, 0)
        if i < 6:
            A = A * bolt_mask
        a = np.dstack([col, A * 255])[Y0:Y1, X0:X1]
        size = (int((X1 - X0) * SC), int((Y1 - Y0) * SC))
        adds.append(np.array(Image.fromarray(a.astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)).astype(float))
    COLS = 8
    rows = (len(adds) + COLS - 1) // COLS
    fh, fw = adds[0].shape[:2]

    def sheet(lst):
        s = np.zeros((rows * fh, COLS * fw, 4))
        for i, im in enumerate(lst):
            s[(i // COLS) * fh:(i // COLS + 1) * fh, (i % COLS) * fw:(i % COLS + 1) * fw] = im
        return s
    sa = sheet(adds)
    save = lambda arr, n: Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(VFX, n))
    save(sa, 'thunder_residue.png'); save(to_purple(sa), 'thunder_residue_aw.png')
    # điểm neo: đáy cầu (mặt đất) & tâm
    print('frames', len(adds), 'fw', fw, 'fh', fh, 'cx', round((CX - X0) / (X1 - X0), 3), 'ground', round((CY + 165 - Y0) / (Y1 - Y0), 3))
    # xem thử trên nền tối của game
    pv = Image.new('RGB', (fw * 8, fh * 2), (26, 24, 40))
    for k, i in enumerate(range(0, len(adds), max(1, len(adds) // 8))[:8]):
        for r, src in enumerate((sa, to_purple(sa))):
            a = src[(i // COLS) * fh:(i // COLS + 1) * fh, (i % COLS) * fw:(i % COLS + 1) * fw]
            al = a[..., 3:] / 255
            base = np.full(a.shape[:2] + (3,), (26, 24, 40.)) * (1 - al) + a[..., :3] * al
            pv.paste(Image.fromarray(base.astype(np.uint8)), (k * fw, r * fh))
    pv.save(os.path.join(OUT, 'thunder_residue_preview.png'))


if __name__ == '__main__':
    main()
