"""
HÌNH NGỒI THIỀN THEO CẢNH GIỚI (tab Tu Luyện) — lấy NGUYÊN từ ảnh mẫu bạn tạo (tools/art/ref/meditate_{1..6}_ai.webp),
cùng cách nhóm cảnh giới với hình đứng (tools/art/realm_sprites.py):
  · tách nền loang từ mép (xoá luôn chữ "Dola AI"), thu nhỏ lấy mẫu điểm giữa ô (giữ nét pixel)
  · khung chung 128×112: vừa khít chiều cao 104 / chiều ngang 124, đáy bồ đoàn cùng dòng y=110, căn giữa
  → public/ui/meditate_{n}.png
  python3 -I tools/art/meditate_sprites.py   (cần opencv)
"""
import os
import numpy as np
from PIL import Image
from realm_sprites import cut

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
W, H, FOOT = 128, 112, 110


def fit(rgba):
    ys, xs = np.nonzero(rgba[..., 3] > 0)
    k = max((ys.max() - ys.min() + 1) / 104, (xs.max() - xs.min() + 1) / 124)
    nh, nw = int(rgba.shape[0] / k), int(rgba.shape[1] / k)
    yy = np.clip(((np.arange(nh) + 0.5) * k).astype(int), 0, rgba.shape[0] - 1)
    xx = np.clip(((np.arange(nw) + 0.5) * k).astype(int), 0, rgba.shape[1] - 1)
    s = rgba[yy][:, xx]
    ys, xs = np.nonzero(s[..., 3] > 0)
    s = s[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out = np.zeros((H, W, 4), np.uint8)
    oy, ox = FOOT - s.shape[0], (W - s.shape[1]) // 2
    out[oy:oy + s.shape[0], ox:ox + s.shape[1]] = s
    return out


def main():
    pv = Image.new('RGBA', (W * 6, H), (26, 24, 40, 255))
    for i in range(1, 7):
        src = os.path.join(HERE, 'ref', f'meditate_{i}_ai.webp')
        if not os.path.exists(src):
            continue
        im = Image.fromarray(fit(cut(src)), 'RGBA')
        im.save(os.path.join(UI, f'meditate_{i}.png'))
        pv.alpha_composite(im, ((i - 1) * W, 0))
    pv.resize((W * 6 * 3, H * 3), Image.NEAREST).convert('RGB').save(os.path.join(HERE, 'out', 'meditate_preview.png'))


if __name__ == '__main__':
    main()
