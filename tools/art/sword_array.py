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
from scipy import ndimage

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
    img = rearrange_trigrams(img)
    img.save(os.path.join(VFX, dst))
    print(dst, img.size)
    return img


# ---- 8 quẻ bát quái vòng ngoài: xếp lại theo Tiên Thiên Bát Quái (ảnh tools/art/ref/bat_quai_order.jpg), theo chiều kim
#      đồng hồ từ trên: Càn, Tốn, Khảm, Cấn, Khôn, Chấn, Ly, Đoài. Mỗi quẻ 3 hào, hào 1 (dưới) ở PHÍA TRONG (gần tâm).
#      1 = hào liền, 0 = hào đứt; thứ tự (trong, giữa, ngoài).
TRIGRAMS = [(1, 1, 1), (0, 1, 1), (0, 1, 0), (0, 0, 1), (0, 0, 0), (1, 0, 0), (1, 0, 1), (1, 1, 0)]
# hình học đo trên ảnh 512 (8 ô giống hệt nhau, chỉ xoay 45°): bán kính 3 hào (trong → ngoài), nửa dài hào, nửa dày,
# nửa khe hào đứt, vùng nền tối của ô quẻ
R_LINES = (156.0, 165.0, 174.0)
HALF_L, HALF_T, HALF_GAP = 19.5, 2.2, 5.5
CLEAR_R, CLEAR_S = (153.5, 177.0), 24.0


def rearrange_trigrams(img):
    a = np.array(img).astype(float)
    H, W = a.shape[:2]
    SS = 4
    yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(float) / SS
    C = 256.0
    # màu hào lấy từ chính ảnh (điểm sáng nhất trong ô quẻ trên cùng)
    top = a[78:104, 236:278]
    bright = top[top[..., 3] > 220][:, :3]
    bar_rgb = np.median(bright, axis=0) if len(bright) else np.array([255, 255, 255.])
    out = a.copy()
    for k, tri in enumerate(TRIGRAMS):
        th = np.radians(45 * k)
        ux, uy = np.sin(th), -np.cos(th)                                      # hướng ra ngoài
        tx, ty = np.cos(th), np.sin(th)                                       # hướng dọc hào
        r = (xx - C) * ux + (yy - C) * uy
        s_ = (xx - C) * tx + (yy - C) * ty
        clear = (r > CLEAR_R[0]) & (r < CLEAR_R[1]) & (np.abs(s_) < CLEAR_S)
        cov = np.zeros_like(r)
        for rr, solid in zip(R_LINES, tri):
            dr = np.abs(r - rr) - HALF_T
            ds = np.abs(s_) - HALF_L
            d = np.maximum(dr, ds)
            if not solid:
                d = np.maximum(d, HALF_GAP - np.abs(s_))
            cov = np.maximum(cov, np.clip(0.5 - d / 0.7, 0, 1))
        cl = clear.reshape(H, SS, W, SS).mean((1, 3))
        cv = cov.reshape(H, SS, W, SS).mean((1, 3))
        glow = ndimage.gaussian_filter(cv, 1.2) * 0.6
        m = cl > 0.5
        out[m, 3] = 0                                                         # xoá hào cũ (nền ô quẻ là đen = trong suốt)
        A = np.clip(np.maximum(cv, glow), 0, 1) * (cl > 0.01)
        out[..., :3] = np.where(A[..., None] > 0, bar_rgb, out[..., :3])
        out[..., 3] = np.maximum(out[..., 3], A * 255)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


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
