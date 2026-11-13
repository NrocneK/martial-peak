"""
VẠN KIẾM QUY TÔNG — trận pháp dưới chân, lấy NGUYÊN 2 ảnh mẫu (nền đen):
  · thường  : tools/art/ref/sword_array_white.jpg  → public/vfx/sword_array.png
  · thức tỉnh: tools/art/ref/sword_array_gold.jpg  → public/vfx/sword_array_aw.png
Tách nền đen theo kiểu cộng sáng (độ đục = độ sáng, màu giữ nguyên), cắt vuông quanh trận, 512×512.
Game đặt ảnh trong container nén dọc (mặt đất) và xoay ảnh bên trong → trận xoay trên mặt đất, không xoay trên màn hình.
  python3 -I tools/art/sword_array.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
N = 512


def conv(src, dst):
    a = np.array(Image.open(os.path.join(HERE, 'ref', src)).convert('RGB')).astype(float)
    a = np.clip(a - 10, 0, 255)                                              # bỏ nhiễu nền jpg
    A = a.max(2) / 255
    ys, xs = np.nonzero(A > 0.15)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    r = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 6
    rgb = a / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    img = img.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize((N, N), Image.LANCZOS)
    img.save(os.path.join(VFX, dst))
    print(dst, img.size)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    w = conv('sword_array_white.jpg', 'sword_array.png')
    g = conv('sword_array_gold.jpg', 'sword_array_aw.png')
    pv = Image.new('RGB', (N * 2, int(N * 0.6)), (26, 24, 40))
    for i, im in enumerate((w, g)):
        sq = im.resize((N, int(N * 0.6)), Image.LANCZOS)
        a = np.array(sq).astype(float)
        base = np.clip(np.full(a.shape[:2] + (3,), (26, 24, 40.)) + a[..., :3] * a[..., 3:] / 255, 0, 255)
        pv.paste(Image.fromarray(base.astype(np.uint8)), (i * N, 0))
    pv.save(os.path.join(OUT, 'sword_array_preview.png'))


if __name__ == '__main__':
    main()
