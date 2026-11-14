"""
TIÊN NGUYÊN LIÊN HOA — hoa sen lấy NGUYÊN từ ảnh mẫu tools/art/ref/lotus_ref.jpg (nền sao tím):
  · mặt nạ hoa: 3 mặt nạ tách nền đã tạo sẵn bằng rembg (tools/art/ref/lotus_mask_{birefnet,isnet,u2net}.png)
      - birefnet: đúng độ trong của cánh (cánh mờ → mờ) → làm độ đục
      - isnet ∪ u2net (mở rộng, làm mềm) → vùng hoa, để cắt bỏ các vệt sáng / tia nền lọt vào birefnet
  · 2 bóng người + cây giáo ở giữa nhuỵ → xoá, lấp bằng màu nhuỵ xung quanh
  · màu giữ nguyên ảnh gốc
  → public/vfx/lotus.png
  python3 -I tools/art/lotus.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
REF = os.path.join(HERE, 'ref')


def load(n):
    return np.array(Image.open(os.path.join(REF, n)).convert('L')).astype(float) / 255


def remove_figures(a):
    """xoá bóng người + giáo trong nhuỵ: điểm tối hơn hẳn vùng sáng quanh nó → lấp bằng màu lân cận"""
    x0, y0, x1, y1 = 505, 215, 680, 350
    sub = a[y0:y1, x0:x1].copy()
    lum = sub.mean(2)
    ref = ndimage.grey_closing(lum, size=(17, 17))
    m = (lum < ref - 18)
    m = ndimage.binary_dilation(m, iterations=2)
    w = (~m).astype(float)
    for _ in range(3):
        num = np.stack([ndimage.gaussian_filter(sub[..., c] * w, 5) for c in range(3)], 2)
        den = ndimage.gaussian_filter(w, 5)[..., None]
        fill = num / np.maximum(den, 1e-3)
        sub = np.where(m[..., None], fill, sub)
    soft = ndimage.gaussian_filter(m.astype(float), 1.2)[..., None]
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - soft) + sub * soft
    return a


def main():
    os.makedirs(OUT, exist_ok=True)
    a = np.array(Image.open(os.path.join(REF, 'lotus_ref.jpg')).convert('RGB')).astype(float)
    a = remove_figures(a)
    bi, isn, u2 = load('lotus_mask_birefnet.png'), load('lotus_mask_isnet.png'), load('lotus_mask_u2net.png')
    region = np.maximum(u2, (isn > 0.5) * 1.0)
    region = ndimage.binary_closing(region > 0.4, iterations=8)
    lab, n = ndimage.label(region)
    sizes = ndimage.sum(region, lab, range(1, n + 1))
    region = lab == (np.argmax(sizes) + 1)
    region = ndimage.binary_fill_holes(region)
    region = ndimage.gaussian_filter(ndimage.binary_dilation(region, iterations=10).astype(float), 8)
    A = np.clip(np.clip((bi - 0.04) / 0.8, 0, 1) * region, 0, 1)
    ys, xs = np.nonzero(A > 0.05)
    x0, x1, y0, y1 = xs.min() - 4, xs.max() + 4, ys.min() - 4, ys.max() + 4
    out = np.dstack([a, A * 255])[y0:y1, x0:x1]
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    W = 640
    img = img.resize((W, round(img.height * W / img.width)), Image.LANCZOS)
    img.save(os.path.join(VFX, 'lotus.png'))
    print('lotus', img.size, 'crop', x0, y0, x1, y1)
    pv = Image.new('RGBA', img.size, (26, 24, 40, 255))
    pv.alpha_composite(img)
    pv2 = Image.new('RGBA', img.size, (70, 90, 60, 255))
    pv2.alpha_composite(img)
    g = Image.new('RGB', (img.width * 2, img.height))
    g.paste(pv.convert('RGB'), (0, 0)); g.paste(pv2.convert('RGB'), (img.width, 0))
    g.save(os.path.join(OUT, 'lotus_preview.png'))


if __name__ == '__main__':
    main()
