"""
ĐẠI ĐẠO QUY NHẤT — TRẬN ÂM DƯƠNG BÁT QUÁI lấy NGUYÊN từ video mẫu tools/art/ref/dai_dao_taichi.mp4
  (nền đen, nét trắng; tâm trận cố định ở (360, 640) của khung 720×1280):
  · đoạn trận NỞ từng lớp (0,4s → 8,6s) lấy 24 khung → dai_dao_bloom.png (spritesheet 6×4, mỗi ô 384×384)
  · khung trận hoàn chỉnh (12s) → dai_dao_full.png 768×768 (giữ nguyên, game xoay + thu về 1 điểm)
  Ảnh TRẮNG, độ đục = độ sáng → game nhuộm màu bằng tint, chế độ ADD. Mép tròn làm mềm.
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
CELL, COLS, N = 384, 6, 24


def frame(t, tmp):
    p = os.path.join(tmp, 'f.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', SRC, '-frames:v', '1', p], check=True)
    return np.array(Image.open(p).convert('L')).astype(float)


def to_white(g, size):
    g = g[CY - R:CY + R, CX - R:CX + R]
    g = np.clip((g - 6) * 255 / 249, 0, 255)                             # bỏ nhiễu nền đen
    yy, xx = np.mgrid[0:2 * R, 0:2 * R].astype(float)
    r = np.hypot(xx - R, yy - R) / R
    g *= np.clip((1 - r) / 0.03, 0, 1)
    im = Image.fromarray(np.dstack([np.full_like(g, 255), np.full_like(g, 255), np.full_like(g, 255), g]).astype(np.uint8), 'RGBA')
    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        sheet = Image.new('RGBA', (CELL * COLS, CELL * (N // COLS)), (0, 0, 0, 0))
        for i in range(N):
            t = 0.4 + 8.2 * (i / (N - 1)) ** 0.9
            sheet.paste(to_white(frame(t, tmp), CELL), ((i % COLS) * CELL, (i // COLS) * CELL))
        sheet.save(os.path.join(VFX, 'dai_dao_bloom.png'))
        full = to_white(frame(12.0, tmp), 768)
        full.save(os.path.join(VFX, 'dai_dao_full.png'))
    pv = Image.new('RGBA', sheet.size, (26, 24, 40, 255))
    pv.alpha_composite(sheet)
    pv.convert('RGB').resize((sheet.width // 3, sheet.height // 3), Image.LANCZOS).save(os.path.join(OUT, 'dai_dao_bloom_preview.png'))


if __name__ == '__main__':
    main()
