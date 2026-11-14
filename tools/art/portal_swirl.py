"""
TRUYỀN TỐNG TRẬN — vòng xoáy lấy NGUYÊN từ ảnh mẫu tools/art/ref/portal_swirl_ref.webp (nền trắng):
  · gỡ nền trắng: độ đục = độ "không trắng" của điểm ảnh, giữ nguyên màu sáng của mẫu
  · bỏ chấm đen ở tâm (lấp bằng màu xung quanh), mép tròn mềm
  → public/ui/portal_swirl.png 384×384 (giao diện Sảnh xoay ảnh bằng CSS, hòa trộn "screen" lên cổng)
  python3 -I tools/art/portal_swirl.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')


def main():
    F = np.array(Image.open(os.path.join(HERE, 'ref', 'portal_swirl_ref.webp')).convert('RGB')).astype(float)
    N = F.shape[0]
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    cx, cy = 432, 437                                                   # tâm xoáy (chấm đen)
    dot = np.hypot(xx - cx, yy - cy) < 16
    for _ in range(4):                                                  # lấp chấm đen bằng màu xung quanh
        w = (~dot).astype(float)
        for c in range(3):
            num = ndimage.gaussian_filter(F[..., c] * w, 8)
            F[..., c] = np.where(dot, num / np.maximum(ndimage.gaussian_filter(w, 8), 1e-3), F[..., c])
    A = np.clip((255 - F.min(2)) / 255 * 1.6, 0, 1)
    C = F                                                               # giữ màu sáng gốc của mẫu (vòng xoáy phát sáng)
    R = N / 2 - 6
    r = np.hypot(xx - cx, yy - cy)
    A *= np.clip((R - r) / 60, 0, 1)
    img = Image.fromarray(np.dstack([np.clip(C, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    # căn tâm xoáy vào giữa ảnh vuông
    half = int(min(cx, cy, N - cx, N - cy))
    img = img.crop((cx - half, cy - half, cx + half, cy + half)).resize((384, 384), Image.LANCZOS)
    img.save(os.path.join(UI, 'portal_swirl.png'))
    print('ok', img.size)


if __name__ == '__main__':
    main()
