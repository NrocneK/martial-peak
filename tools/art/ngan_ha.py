"""
NGÂN HÀ HÀN LƯU — luồng sáng băng lấy từ video mẫu tools/art/ref/ngan_ha.mp4 (cảnh chơi game, nền rừng thu cam):
  · tia sáng đi từ gậy nhân vật (845,260) tới quái (1125,60) trên khung 1610×720
  · mỗi khung: xoay quanh điểm đầu cho tia nằm NGANG (đầu trái → cuối phải), cắt dải quanh tia
  · tách theo MÀU: tia lam/lục lam/trắng, nền cam-nâu → độ đục = độ "lam hơn đỏ" + lõi trắng sát tia;
    màu: trắng ở chỗ gốc trắng chói, còn lại lam băng
  · che thanh máu xanh của giao diện gần điểm đầu
  → public/vfx/ngan_ha_beam.png (bảng khung, game kéo dài theo khoảng cách và chạy lặp), cộng sáng
  → public/vfx/ngan_ha_core.png (trung vị theo thời gian: thân tia ổn định, vẽ cố định bên dưới)
  · ẢNH MẪU THÊM tools/art/ref/ngan_ha_beam_ref.jpg (nền xám tối): lấy CỔNG PHÁT (vòng sáng lớn + điểm loé + 2 vòng nhỏ)
    và TIA LỬA ĐIỂM CHẠM; tách cộng sáng (trừ nền xám ước lượng), bỏ 2 quả cầu xám (trong vùng cầu chỉ giữ phần lam,
    lỗ do cầu che vòng sáng → lấp từ xung quanh)
    → public/vfx/ngan_ha_emit.png (gốc = điểm loé), public/vfx/ngan_ha_impact.png (gốc = điểm chạm); hướng tia trong ảnh 18.2°
  python3 -I tools/art/ngan_ha.py  (cần ffmpeg)
"""
import os
import subprocess
import tempfile
import glob
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
SRC = os.path.join(HERE, 'ref', 'ngan_ha.mp4')
SX, SY, EX, EY = 845, 262, 1125, 62
T0, T1, FPS = 1.0, 3.0, 15
BACK, AHEAD, HALF = 30, 400, 120                     # cắt: sau điểm đầu, trước, nửa bề cao dải
SC = 0.5


def key(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blue = np.clip((b - r - 20) / 110, 0, 1) * np.clip((b - 90) / 80, 0, 1) * np.clip((g / np.maximum(b, 1) - 0.42) / 0.15, 0, 1)   # bỏ tím (vòng giao diện)
    white = np.clip((a.min(2) - 205) / 40, 0, 1)
    near = ndimage.maximum_filter(blue, 9) > 0.3                     # lõi trắng chỉ tính khi sát vùng lam
    A = np.clip(np.maximum(blue, white * near), 0, 1)
    A = ndimage.grey_closing(A, size=(5, 5))                           # lấp lỗ tối dọc lõi tia (viền trắng-lam bị nền pha)
    return ndimage.gaussian_filter(A, 0.8)


def main():
    os.makedirs(OUT, exist_ok=True)
    ang = np.degrees(np.arctan2(EY - SY, EX - SX))
    L = np.hypot(EX - SX, EY - SY)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(T0), '-t', str(T1 - T0), '-i', SRC, '-vf', f'fps={FPS}',
                        os.path.join(tmp, 'f%03d.png')], check=True)
        files = sorted(glob.glob(os.path.join(tmp, 'f*.png')))
        frames = []
        for f in files:
            a = np.array(Image.open(f).convert('RGB')).astype(float)
            A = key(a)
            A[228:256, 740:870] = 0                                       # thanh máu giao diện
            A[:, :480] = 0                                                # bảng thống kê bên trái
            # HÌNH tia (độ đục) lấy đúng từ video; MÀU lấy theo độ sáng gốc: chỗ trắng chói → trắng, còn lại lam băng
            # (không lấy màu điểm ảnh gốc vì lẫn nền cam / vật thể tối đi ngang qua tia)
            wh = np.clip((a.min(2) - 150) / 80, 0, 1)[..., None]
            col = np.array([80, 185, 255.]) * (1 - wh) + np.array([240, 250, 255.]) * wh
            img = Image.fromarray(np.dstack([col, A * 255]).astype(np.uint8), 'RGBA')
            img = img.rotate(ang, center=(SX, SY), resample=Image.BICUBIC)   # PIL xoay ngược chiều kim → tia về ngang
            img = img.crop((SX - BACK, SY - HALF, SX + AHEAD, SY + HALF))
            img = img.resize((int((BACK + AHEAD) * SC), int(2 * HALF * SC)), Image.LANCZOS)
            frames.append(np.array(img).astype(float))
    fh, fw = frames[0].shape[:2]
    # LÕI ỔN ĐỊNH: thân tia chính có mặt ở phần lớn các khung (bách phân vị 70 theo thời gian) — giữ vân khí của video,
    # làm mượt dọc chiều tia để lấp chỗ vật thể đi ngang che tia; vẽ cố định bên dưới lớp động → luồng khí rõ, không chập chờn
    st = np.stack(frames)
    pa = np.percentile(st[..., 3], 70, 0) / 255
    pw = np.percentile(np.stack([f[..., 0] for f in frames]), 70, 0)        # kênh đỏ cao = chỗ trắng
    x0 = int(BACK * SC)
    x1 = x0 + int(np.hypot(EX - SX, EY - SY) * SC)
    band = np.zeros_like(pa); band[int(HALF * SC) - 22:int(HALF * SC) + 22, :] = 1      # chỉ thân tia chính, bỏ dòng khí lạc
    band = ndimage.gaussian_filter(band, 3)
    xs = np.arange(fw)
    taper = np.clip((xs - x0 + 4) / 8, 0, 1) * np.clip((x1 + 14 - xs) / 16, 0, 1)
    ca = ndimage.gaussian_filter(pa * band, (0.7, 4)) * taper[None, :]
    ca = np.clip(ca * 1.5, 0, 1) ** 0.8
    wv = ndimage.gaussian_filter(pw * band, (0.7, 4))
    wh = np.clip((wv - 140) / 80, 0, 1)[..., None] * np.clip(ca * 1.2, 0, 1)[..., None]
    ccol = np.array([90, 190, 255.]) * (1 - wh) + np.array([245, 252, 255.]) * wh
    Image.fromarray(np.dstack([ccol, ca * 255]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, 'ngan_ha_core.png'))
    # lớp động: đậm hơn (độ đục ^0.65)
    for fr in frames:
        fr[..., 3] = 255 * (fr[..., 3] / 255) ** 0.65
    COLS = 5
    rows = (len(frames) + COLS - 1) // COLS
    sheet = np.zeros((rows * fh, COLS * fw, 4))
    for i, fr in enumerate(frames):
        sheet[(i // COLS) * fh:(i // COLS + 1) * fh, (i % COLS) * fw:(i % COLS + 1) * fw] = fr
    Image.fromarray(sheet.astype(np.uint8), 'RGBA').save(os.path.join(VFX, 'ngan_ha_beam.png'))
    print('frames', len(frames), 'fw', fw, 'fh', fh, 'start x', round(BACK / (BACK + AHEAD), 4), 'len', round(L * SC, 1))
    pv = Image.new('RGB', (fw * 2, fh * 6), (26, 24, 40))
    for i in range(12):
        fr = frames[i * len(frames) // 12]
        base = np.clip(np.full(fr.shape[:2] + (3,), (26, 24, 40.)) + fr[..., :3] * fr[..., 3:] / 255, 0, 255)
        pv.paste(Image.fromarray(base.astype(np.uint8)), ((i % 2) * fw, (i // 2) * fh))
    pv.save(os.path.join(OUT, 'ngan_ha_preview.png'))


def ref_parts():
    a = np.array(Image.open(os.path.join(HERE, 'ref', 'ngan_ha_beam_ref.jpg')).convert('RGB')).astype(float)
    mx = a.max(2)
    small = mx[::4, ::4]
    bg = ndimage.gaussian_filter(ndimage.grey_opening(small, size=(31, 31)), 4)
    bg = np.array(Image.fromarray(bg.astype(np.float32), 'F').resize((a.shape[1], a.shape[0]), Image.BICUBIC))
    d = np.clip(a - bg[..., None] - 4, 0, 255)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blue = np.clip((b - np.maximum(r, g) - 10) / 60, 0, 1)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    s1 = (xx - 100) ** 2 + (yy - 193) ** 2 < 31 ** 2
    s2 = (xx - 656) ** 2 + (yy - 379) ** 2 < 36 ** 2
    add = d.copy()
    for sp in (s1, s2):
        add[sp] = d[sp] * blue[sp][:, None]
    # lấp lỗ quả cầu 1 trong vòng sáng: màu cộng từ xung quanh (mờ chuẩn hoá)
    w = (~s1).astype(float)
    den = np.maximum(ndimage.gaussian_filter(w, 9), 1e-3)
    fill = np.stack([ndimage.gaussian_filter(add[..., c] * w, 9) / den for c in range(3)], 2)
    add[s1] = np.maximum(add[s1], fill[s1])
    A = add.max(2) / 255
    col = add / np.maximum(A[..., None], 1e-3)
    rgba = np.dstack([np.clip(col, 0, 255), A * 255])

    def cut(x0, y0, x1, y1, name, ox, oy):
        part = rgba[y0:y1, x0:x1].copy()
        hh, ww = part.shape[:2]
        fy = np.clip(np.minimum(np.arange(hh), hh - 1 - np.arange(hh)) / 22, 0, 1)
        fx = np.clip(np.minimum(np.arange(ww), ww - 1 - np.arange(ww)) / 22, 0, 1)
        part[..., 3] *= (fy[:, None] * fx[None, :]) ** 1.5                   # mép mềm, không lộ khung cắt
        im = Image.fromarray(part.astype(np.uint8), 'RGBA')
        im.save(os.path.join(VFX, name))
        print(name, im.size, 'origin', round((ox - x0) / (x1 - x0), 4), round((oy - y0) / (y1 - y0), 4))
    cut(36, 78, 290, 348, 'ngan_ha_emit.png', 148, 213)
    cut(555, 295, 700, 425, 'ngan_ha_impact.png', 622, 372)


if __name__ == '__main__':
    main()
    ref_parts()
