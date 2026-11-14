"""
HUYỀN HOÀNG CHUNG — TRẬN ĐỒ dưới chân, lấy NGUYÊN từ ảnh mẫu tools/art/ref/hoang_chung_array_ref.webp (nền đen):
  nền đen → ảnh cộng sáng: độ đục = kênh sáng nhất (trừ nền nhiễu), màu giữ nguyên.
  cắt vuông quanh tâm trận đồ, mép ngoài làm mờ tròn để không lộ khung.
  → public/vfx/hoang_chung_array.png 512×512 (game ép dẹt theo mặt đất + xoay chậm, chế độ ADD)
  python3 -I tools/art/hoang_chung_array.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
CX, CY, R = 368, 521, 318


def main():
    os.makedirs(OUT, exist_ok=True)
    a = np.array(Image.open(os.path.join(HERE, 'ref', 'hoang_chung_array_ref.webp')).convert('RGB')).astype(float)
    a = a[CY - R:CY + R, CX - R:CX + R]
    a = np.clip((a - 8) * 255 / 247, 0, 255)                             # bỏ nền đen nhiễu
    yy, xx = np.mgrid[0:2 * R, 0:2 * R].astype(float)
    r = np.hypot(xx - R, yy - R) / R
    a *= np.clip((1 - r) / 0.04, 0, 1)[..., None]                        # mép tròn mềm
    A = a.max(2) / 255
    col = a / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((512, 512), Image.LANCZOS)
    img.save(os.path.join(VFX, 'hoang_chung_array.png'))
    pv = Image.new('RGBA', (512, 512), (26, 24, 40, 255))
    pv.alpha_composite(img)
    pv.convert('RGB').save(os.path.join(OUT, 'hoang_chung_array_preview.png'))


if __name__ == '__main__':
    main()
