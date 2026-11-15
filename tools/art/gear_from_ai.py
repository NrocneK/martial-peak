"""
HÌNH TRANG BỊ 6 CẤP — lấy NGUYÊN từ ảnh mẫu bạn tạo (tools/art/ref/gear_t{1..6}_ai.webp, nền trắng), không vẽ lại:
  · mỗi cấp chọn 9 món dùng được (kiếm, đao, thương, quyền sáo, cung, phiến, y phục, giày, trang sức) theo hộp cắt BOXES
  · tách nền: loang từ mép hộp qua điểm gần trắng (giữ nguyên viền + thân món đồ), bỏ mảnh vụn / món bên cạnh lọt vào hộp
  · thu vừa khung vuông 66×66 (cạnh dài 62), giữ tỉ lệ, căn giữa
  → public/gear/<loại>_<cấp 0..5>.png (đè hình cũ; hình cầm tay / trong trận giữ nguyên)
  Bí bảo: chưa có ảnh mẫu → giữ hình cũ.
  python3 -I tools/art/gear_from_ai.py   (cần opencv)
"""
import os
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GEAR = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'gear')
REF = os.path.join(HERE, 'ref')
KEYS = ['wp_sword', 'wp_blade', 'wp_spear', 'wp_fist', 'wp_bow', 'wp_fan', 'clothes', 'shoes', 'accessory']
G3 = [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2)]   # lưới 3×3 (cột, hàng), ô 341px
BOXES = {
    1: [(50, 0, 294, 250), (389, 7, 627, 256), (723, 0, 970, 249), (1041, 37, 1309, 236), (1391, 8, 1625, 247),
        (1697, 45, 1975, 228), (34, 280, 303, 489), (1380, 271, 1632, 492), (1753, 263, 1941, 482)],
    2: [(25, 7, 240, 244), (280, 7, 489, 243), (774, 6, 988, 244), (1023, 15, 1232, 242), (1290, 6, 1475, 246),
        (1256, 290, 1489, 468), (1505, 258, 1742, 496), (774, 263, 984, 490), (1795, 8, 1943, 236)],
    3: [(29, 6, 336, 249), (381, 8, 685, 247), (715, 0, 998, 251), (28, 263, 353, 487), (384, 255, 684, 495),
        (1683, 32, 1989, 240), (1053, 264, 1332, 492), (1385, 255, 1660, 500), (1729, 256, 1938, 500)],
    4: [(c * 341 + 4, r * 341 + 4, c * 341 + 337, r * 341 + 337) for c, r in G3],
    5: [(c * 341 + 4, r * 341 + 4, c * 341 + 337, r * 341 + 337) for c, r in G3],
    6: [(0, 5, 325, 487), (341, 10, 645, 479), (622, 5, 982, 462), (1040, 15, 1305, 245), (1360, 6, 1658, 261),
        (1673, 18, 1991, 234), (1085, 255, 1350, 495), (1397, 256, 1654, 500), (1724, 256, 1968, 488)],
}
ONLY_BIGGEST = {(6, 'wp_spear')}
TOL = {(5, 'wp_sword'): 70, (5, 'wp_spear'): 90}                      # quầng / tia sáng nhạt quanh món đồ → bỏ                                       # thương cấp 6: cung bên cạnh lọt vào hộp


def cutout(crop, biggest=False, grid=False, tol=22, holes=False):
    h, w = crop.shape[:2]
    diff = np.abs(crop.astype(int) - 250).max(2)
    near = (diff < tol).astype(np.uint8)
    # đường kẻ lưới ở mép ô (ảnh 3×3) → coi như nền
    for ax in ((0, 1) if grid else ()):
        dark = (crop.mean(2) < 90).mean(ax)
        idx = np.nonzero(dark > 0.85)[0]
        if ax == 0: near[:, idx] = 1
        else: near[idx, :] = 1
    flood = near.copy()
    mask = np.zeros((h + 2, w + 2), np.uint8)
    for y in range(h):
        for x in (0, w - 1):
            if flood[y, x] == 1: cv2.floodFill(flood, mask, (x, y), 2, 0, 0, 4)
    for x in range(w):
        for y in (0, h - 1):
            if flood[y, x] == 1: cv2.floodFill(flood, mask, (x, y), 2, 0, 0, 4)
    fg = (flood != 2).astype(np.uint8)
    if holes:                                                           # cung: khoảng trắng kẹp giữa dây và thân cung cũng là nền
        n2, lab2, st2, _ = cv2.connectedComponentsWithStats(near * fg)
        for i in range(1, n2):
            if st2[i][4] > 150: fg[lab2 == i] = 0
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        areas = st[1:, 4]
        big = areas.max()
        keep = [i + 1 for i, a in enumerate(areas) if (a == big if biggest else a > big * 0.12)]
        fg = np.isin(lab, keep).astype(np.uint8)
    a = cv2.GaussianBlur(fg.astype(np.float32), (3, 3), 0.7)
    return np.dstack([crop[..., ::-1], (a * 255).astype(np.uint8)])


def main():
    pv = Image.new('RGBA', (66 * 9, 66 * 6), (26, 24, 40, 255))
    for t, boxes in BOXES.items():
        src = cv2.imread(os.path.join(REF, f'gear_t{t}_ai.webp'))
        for k, (x0, y0, x1, y1) in zip(KEYS, boxes):
            rgba = cutout(src[y0:y1, x0:x1], (t, k) in ONLY_BIGGEST, grid=t in (4, 5), tol=TOL.get((t, k), 48 if t == 5 else 22), holes=k == 'wp_bow')
            im = Image.fromarray(rgba, 'RGBA')
            im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox())
            s = 62 / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            out = Image.new('RGBA', (66, 66))
            out.alpha_composite(im, ((66 - im.width) // 2, (66 - im.height) // 2))
            out.save(os.path.join(GEAR, f'{k}_{t - 1}.png'))
            pv.alpha_composite(out, (KEYS.index(k) * 66, (t - 1) * 66))
    pv.resize((pv.width * 2, pv.height * 2), Image.LANCZOS).convert('RGB').save(os.path.join(HERE, 'out', 'gear_preview.png'))


if __name__ == '__main__':
    main()
