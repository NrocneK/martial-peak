"""
HÌNH NHÂN VẬT THEO CẢNH GIỚI (6 bộ) — lấy NGUYÊN từ ảnh mẫu bạn tạo (tools/art/ref/realm_{2..6}_ai.webp), bộ 1 = sprite gốc:
  1 Luyện Thể, Luyện Khí        → public/ui/hero_full.png khung 0 (sprite hiện tại)
  2 Trúc Cơ, Kim Đan, Nguyên Anh · 3 Hóa Thần, Luyện Hư, Hợp Thể · 4 Đại Thừa, Độ Kiếp
  5 Chân Tiên → Tiên Đế         · 6 Đạo Tổ
  · tách nền: loang từ mép ảnh qua các điểm gần màu nền (trắng / xám nhạt) — chính xác với ảnh pixel art, xoá luôn chữ "Dola AI"
  · thu về cỡ sprite gốc bằng lấy mẫu ĐIỂM GIỮA mỗi ô (giữ nét pixel sắc): thân người cao ~100 điểm ảnh như hero_full (106)
  · đặt lên khung chung 96×112, CHÂN đứng cùng một dòng (y=108), tâm thân cùng một cột → đổi cảnh giới không bị nhảy chỗ
  → public/ui/realm_{1..6}.png
  python3 -I tools/art/realm_sprites.py   (cần opencv: pip install opencv-python-headless)
"""
import os
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
REF = os.path.join(HERE, 'ref')
W, H, FOOT, BODY = 96, 112, 108, 100


def cut(path):
    bgr = cv2.imread(path)
    h, w = bgr.shape[:2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.int16)
    corners = np.concatenate([lab[:20, :20].reshape(-1, 3), lab[:20, -20:].reshape(-1, 3), lab[-20:, :20].reshape(-1, 3)])
    bg = np.median(corners, 0)
    near = (np.abs(lab - bg).sum(2) < 26).astype(np.uint8)              # gần màu nền (gồm bóng mờ, chữ trắng)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flood = near.copy()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        cv2.floodFill(flood, mask, (x, y), 2, 0, 0, flags=4 | (255 << 8))
    bgmask = flood == 2
    # chữ "Dola AI" nằm trong khung chữ góc dưới phải → xoá hẳn
    bgmask[int(h * 0.91):, int(w * 0.8):] = True
    a = (~bgmask).astype(np.uint8) * 255
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    rgba = np.dstack([bgr[..., ::-1], a])
    return rgba


def to_sprite(rgba):
    a = rgba[..., 3] > 0
    ys, xs = np.nonzero(a)
    top, bot = ys.min(), ys.max()
    k = (bot - top + 1) / BODY                                          # số điểm ảnh gốc / 1 điểm ảnh sprite
    nh, nw = int(rgba.shape[0] / k), int(rgba.shape[1] / k)
    yy = np.clip(((np.arange(nh) + 0.5) * k).astype(int), 0, rgba.shape[0] - 1)
    xx = np.clip(((np.arange(nw) + 0.5) * k).astype(int), 0, rgba.shape[1] - 1)
    small = rgba[yy][:, xx]
    sa = small[..., 3] > 0
    sys_, sxs = np.nonzero(sa)
    lower = sys_ > sys_.min() + (sys_.max() - sys_.min()) * 0.45        # tâm thân: trung vị cột của nửa dưới (bỏ tóc, áo choàng bay)
    cx = int(np.median(sxs[lower]))
    out = np.zeros((H, W, 4), np.uint8)
    oy, ox = FOOT - sys_.max(), W // 2 - cx
    for y in range(small.shape[0]):
        ty = y + oy
        if 0 <= ty < H:
            for x0 in range(small.shape[1]):
                tx = x0 + ox
                if 0 <= tx < W and small[y, x0, 3]:
                    out[ty, tx] = small[y, x0]
    return out


def main():
    base = np.array(Image.open(os.path.join(UI, 'hero_full.png')).convert('RGBA'))[:, :58]
    out = np.zeros((H, W, 4), np.uint8)
    ys, xs = np.nonzero(base[..., 3])
    lower = ys > ys.min() + (ys.max() - ys.min()) * 0.45
    oy, ox = FOOT - ys.max(), W // 2 - int(np.median(xs[lower]))
    out[oy:oy + base.shape[0], ox:ox + 58][base[..., 3] > 0] = base[base[..., 3] > 0]
    Image.fromarray(out, 'RGBA').save(os.path.join(UI, 'realm_1.png'))
    for i in range(2, 7):
        Image.fromarray(to_sprite(cut(os.path.join(REF, f'realm_{i}_ai.webp'))), 'RGBA').save(os.path.join(UI, f'realm_{i}.png'))
    pv = Image.new('RGBA', (W * 6, H), (26, 24, 40, 255))
    for i in range(6):
        pv.alpha_composite(Image.open(os.path.join(UI, f'realm_{i + 1}.png')), (i * W, 0))
    pv.resize((W * 6 * 3, H * 3), Image.NEAREST).convert('RGB').save(os.path.join(HERE, 'out', 'realm_preview.png'))


if __name__ == '__main__':
    main()
