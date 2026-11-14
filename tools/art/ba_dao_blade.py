"""
BÁ ĐAO — TÁCH THANH ĐAO từ ảnh mẫu tools/art/ref/ba_dao_blade_ref.png (nền trắng, có khói tím quanh thân):
  · mặt nạ rembg birefnet-general (tools/art/ref/ba_dao_blade_mask_birefnet.png): viền đao sắc nhưng dính 1 mảng khói
  · lọc khói: thân đao = điểm TỐI hoặc TÍM RỰC (rãnh phát sáng); khói = nhạt, ít bão hoà → bỏ.
    Lấy lõi tối/tím → đóng lỗ nhỏ (giữ viền sáng trắng sát thân đao) → giữ khối lớn nhất → giao với mặt nạ birefnet
  · gỡ nền trắng ở mép (F = a·C + (1-a)·255 → C) để không viền trắng trên nền tối
  · xoay cho thân đao NẰM NGANG, mũi sang PHẢI, chuôi bên trái (game xoay theo hướng chém)
  → public/vfx/ba_dao_blade.png
  python3 -I tools/art/ba_dao_blade.py
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


def main():
    os.makedirs(OUT, exist_ok=True)
    F = np.array(Image.open(os.path.join(REF, 'ba_dao_blade_ref.png')).convert('RGB')).astype(float)
    M = np.array(Image.open(os.path.join(REF, 'ba_dao_blade_mask_birefnet.png')).convert('L')).astype(float) / 255
    lum = F.mean(2)
    mx, mn = F.max(2), F.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    dark = lum < 125
    glow = (sat > 0.45) & (F[..., 2] > 140) & (F[..., 1] < 120)          # rãnh tím rực
    core = (dark | glow) & (M > 0.5)
    core = ndimage.binary_closing(core, iterations=4)
    core = ndimage.binary_fill_holes(core)
    lab, n = ndimage.label(core)
    core = lab == (np.argmax(ndimage.sum(core, lab, range(1, n + 1))) + 1)
    near = ndimage.binary_dilation(core, iterations=3)                   # viền sáng trắng sát thân đao vẫn giữ
    A = M * ndimage.gaussian_filter(near.astype(float), 0.8)
    C = (F - (1 - A[..., None]) * 255) / np.maximum(A[..., None], 0.05)
    C = np.where(A[..., None] > 0.97, F, C)
    img = Image.fromarray(np.dstack([np.clip(C, 0, 255), np.clip(A, 0, 1) * 255]).astype(np.uint8), 'RGBA')
    # hướng thân đao: trục chính của các điểm thuộc đao (PCA), chuôi = đầu có nhiều điểm tối dày hơn ở dưới-trái
    ys, xs = np.nonzero(core)
    cx, cy = xs.mean(), ys.mean()
    cov = np.cov(np.stack([xs - cx, ys - cy]))
    ev, evec = np.linalg.eigh(cov)
    ux, uy = evec[:, 1]
    if ux * (xs.max() - cx) + uy * (ys.min() - cy) < 0:                  # cho trục chỉ về phía mũi (trên-phải)
        ux, uy = -ux, -uy
    ang = np.degrees(np.arctan2(uy, ux))
    img = img.rotate(ang, resample=Image.BICUBIC, expand=True)           # PIL xoay ngược chiều kim đồng hồ → mũi sang phải
    img = img.crop(img.getbbox())
    # xoá khói tối còn dính TRÊN SỐNG ĐAO: sống đao = đường sáng trắng liền mạch ở mép trên thân (đoạn từ sau chắn tay
    # tới gần mũi) → trên mỗi cột, xoá mọi điểm nằm trên điểm sáng-trắng cao nhất của cột đó
    arr = np.array(img).astype(float)
    L = arr[..., :3].mean(2)
    sat2 = (arr[..., :3].max(2) - arr[..., :3].min(2)) / np.maximum(arr[..., :3].max(2), 1)
    spine = (L > 205) & (sat2 < 0.18) & (arr[..., 3] > 200)
    W_ = arr.shape[1]
    # mép trên của thân (điểm đục cao nhất mỗi cột); vùng khói = mép trên nhô cao bất thường so với 2 bên
    top = np.array([np.argmax(arr[:, x, 3] > 128) if (arr[:, x, 3] > 128).any() else arr.shape[0] for x in range(W_)], float)
    xr = np.arange(W_)
    base = ndimage.minimum_filter1d(ndimage.maximum_filter1d(top, 61), 61)   # mép trên "không khói" (lọc bỏ chỗ nhô lên)
    smoke = (top < base - 3) & (xr > W_ * 0.35) & (xr < W_ * 0.9)
    if smoke.any():
        sx = np.nonzero(smoke)[0]
        C0, C1 = sx.min() - 6, sx.max() + 6
        # điểm neo 2 bên ngoài vùng khói → nối bằng đường bậc 2 làm mép sống đao mới
        anc = np.r_[np.arange(C0 - 60, C0), np.arange(C1, C1 + 60)]
        cf = np.polyfit(anc, top[anc], 2)
        edge = np.polyval(cf, xr)
        yy = np.arange(arr.shape[0])[:, None]
        inside = ((xr >= C0) & (xr <= C1))[None, :]
        above = np.clip((edge[None, :] - 0.5 - yy) / 1.5, 0, 1)
        arr[..., 3] = np.where(inside, arr[..., 3] * (1 - above), arr[..., 3])
        print('vùng khói cột', C0, '→', C1)
    img = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    print('góc thân đao', round(ang, 1), 'kích thước', img.size)
    img.save(os.path.join(VFX, 'ba_dao_blade.png'))
    pv = Image.new('RGBA', (img.width + 20, img.height * 2 + 30), (26, 24, 40, 255))
    pv.alpha_composite(img, (10, 10))
    bg2 = Image.new('RGBA', img.size, (90, 70, 120, 255)); bg2.alpha_composite(img)
    pv.alpha_composite(bg2, (10, img.height + 20))
    pv.convert('RGB').save(os.path.join(OUT, 'ba_dao_blade_preview.png'))


if __name__ == '__main__':
    main()
