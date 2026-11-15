"""
HÌNH TRANG BỊ 6 CẤP — lấy NGUYÊN từ ảnh mẫu bạn tạo (tools/art/ref/gear_t{1..6}_ai.webp, nền trắng), không vẽ lại:
  · mỗi cấp chọn 9 món dùng được (kiếm, đao, thương, quyền sáo, cung, phiến, y phục, giày, trang sức) theo hộp cắt BOXES
  · tách nền: mặt nạ rembg isnet (tools/art/ref/gear_t*_mask.png) + gỡ nền trắng ở mép, khe trắng kẹp giữa (cung) → trong suốt
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
    2: [(25, 7, 240, 244), (280, 7, 489, 243), (774, 6, 988, 244), (25, 270, 233, 493), (278, 258, 492, 494),
        (1256, 290, 1489, 468), (1505, 258, 1742, 496), (774, 263, 984, 490), (1795, 8, 1943, 236)],
    3: [(29, 6, 336, 249), (381, 8, 685, 247), (715, 0, 998, 251), (28, 263, 353, 487), (384, 255, 684, 495),
        (1683, 32, 1989, 240), (1053, 264, 1332, 492), (1385, 255, 1660, 500), (1729, 256, 1938, 500)],
    4: [(c * 341 + 4, r * 341 + 4, c * 341 + 337, r * 341 + 337) for c, r in G3],
    5: [(c * 341 + 4, r * 341 + 4, c * 341 + 337, r * 341 + 337) for c, r in G3],
    6: [(0, 5, 325, 487), (341, 10, 645, 479), (622, 5, 982, 462), (1040, 15, 1305, 245), (1360, 6, 1658, 261),
        (1673, 18, 1991, 234), (1085, 255, 1350, 495), (1397, 256, 1654, 500), (1724, 256, 1968, 488)],
}
ONLY_BIGGEST = {(6, 'wp_spear')}
# xoá bớt chi tiết thừa (toạ độ trong hộp cắt): cung cấp Tiên bỏ mũi tên (lông đuôi, thân tên ngoài thân cung, đầu tên)
ERASE = {(3, 'wp_bow'): [[(55, 30), (125, 30), (125, 100), (55, 100)],
                         [(85, 55), (100, 50), (192, 132), (178, 145)],
                         [(222, 160), (280, 160), (280, 215), (222, 215)]]}
# quầng sáng nhạt giữa các vòng dây ngoài mặt ngọc (tâm x, y, bán kính, độ sáng tối thiểu) → trong suốt
GLOW_OUT = {(6, 'accessory'): (122, 125, 86, 195)}
FLOOD = {(5, 'wp_sword'): 70, (5, 'wp_blade'): 60}                    # lưỡi trắng gần như nền


def cutout(crop, m, biggest=False, holes=False, flood_tol=0):
    """crop: BGR; m: mặt nạ rembg (0..1) cùng hộp. Độ đục = mặt nạ; vùng gần trắng kẹp trong món đồ (khe cung, lỗ ngọc bội)
    → trong suốt; gỡ nền trắng ở mép (F = a·C + (1−a)·255 → C) để không còn viền trắng"""
    a = np.clip((m - 0.1) / 0.8, 0, 1)
    rgb = crop[..., ::-1].astype(float)
    from scipy import ndimage
    lum = rgb.mean(2)
    white = np.abs(rgb - 250).max(2) < 14
    solid = a > 0.5
    # Phân loại từng vùng "lỗ" (lỗ trong mặt nạ rembg + mảng gần trắng nằm trong món đồ):
    #   · gần trắng VÀ bị viền đen (nét viền pixel art) bao quanh → nền lọt vào (lỗ ngọc bội, khe nút thắt) → trong suốt
    #   · còn lại (vệt sáng trên lưỡi kiếm/đao, bao bởi màu sáng của thân) → giữ đặc, không bị xén đen
    hole = ndimage.binary_fill_holes(solid) & ~solid
    cand = (hole | (white & solid)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand, connectivity=4)
    k5 = np.ones((5, 5), np.uint8)
    bgm = np.zeros_like(solid)
    for i in range(1, n):
        comp = lab == i
        if st[i][4] < 6:
            if hole[comp].all(): a[comp] = 1
            continue
        ring = cv2.dilate(comp.astype(np.uint8), k5).astype(bool) & ~comp
        wf = white[comp].mean()
        dark = (lum[ring] < 120).mean() if ring.any() else 0
        bgish = wf > 0.75 and (dark > (0.25 if holes else 0.4) or (holes and st[i][4] > 60))
        if bgish: a[comp] = 0; bgm |= comp
        elif hole[comp].any() and not holes: a[comp] = np.maximum(a[comp], 1.0)
    if not holes:                                                       # mặt nạ mờ một nửa ở giữa món đồ (xén đen) → đặc hẳn
        inner = cv2.erode(ndimage.binary_fill_holes(a > 0.5).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2).astype(bool)
        a[inner & ~cv2.dilate(bgm.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)] = 1
    if flood_tol:                                                       # lưỡi trắng sát nền: lấy vùng không nối với mép qua điểm gần trắng
        h, w = crop.shape[:2]
        near = (np.abs(rgb - 250).max(2) < flood_tol).astype(np.uint8)
        fm = np.zeros((h + 2, w + 2), np.uint8)
        for y in range(h):
            for x in (0, w - 1):
                if near[y, x] == 1: cv2.floodFill(near, fm, (x, y), 2, 0, 0, 4)
        for x in range(w):
            for y in (0, h - 1):
                if near[y, x] == 1: cv2.floodFill(near, fm, (x, y), 2, 0, 0, 4)
        a = np.maximum(a, cv2.erode((near != 2).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(float))
    # mảng trắng nối ra mép hộp = nền
    wl = white.astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(wl, connectivity=4)
    h, w = wl.shape
    for i in range(1, n):
        x, y, bw, bh = st[i][:4]
        if x == 0 or y == 0 or x + bw == w or y + bh == h: a[lab == i] = 0
    fg = (a > 0.3).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        areas = st[1:, 4]
        big = areas.max()
        keep = [i + 1 for i, ar in enumerate(areas) if (ar == big if biggest else ar > big * 0.12)]
        a = a * cv2.dilate(np.isin(lab, keep).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(float)
    c = (rgb - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 0.15)
    c = np.where(a[..., None] > 0.95, rgb, c)
    return np.dstack([np.clip(c, 0, 255), a * 255]).astype(np.uint8)


def main():
    pv = Image.new('RGBA', (66 * 9, 66 * 6), (26, 24, 40, 255))
    for t, boxes in BOXES.items():
        src = cv2.imread(os.path.join(REF, f'gear_t{t}_ai.webp'))
        msk = np.array(Image.open(os.path.join(REF, f'gear_t{t}_mask.png')).convert('L')).astype(float) / 255
        for k, (x0, y0, x1, y1) in zip(KEYS, boxes):
            rgba = cutout(src[y0:y1, x0:x1], msk[y0:y1, x0:x1], (t, k) in ONLY_BIGGEST, holes=k == 'wp_bow', flood_tol=FLOOD.get((t, k), 0))
            if (t, k) in GLOW_OUT:
                gx, gy, gr, gl = GLOW_OUT[(t, k)]
                yy, xx = np.mgrid[:rgba.shape[0], :rgba.shape[1]]
                rgba[..., 3][(np.hypot(xx - gx, yy - gy) > gr) & (rgba[..., :3].mean(2) > gl)] = 0
            if (t, k) in ERASE:
                al = np.ascontiguousarray(rgba[..., 3])
                for poly in ERASE[(t, k)]:
                    cv2.fillPoly(al, [np.array(poly, np.int32)], 0)
                rgba[..., 3] = al
            im = Image.fromarray(rgba, 'RGBA')
            im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
            s = 64 / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            out = Image.new('RGBA', (66, 66))
            out.alpha_composite(im, ((66 - im.width) // 2, (66 - im.height) // 2))
            out.save(os.path.join(GEAR, f'{k}_{t - 1}.png'))
            pv.alpha_composite(out, (KEYS.index(k) * 66, (t - 1) * 66))
    pv.resize((pv.width * 2, pv.height * 2), Image.LANCZOS).convert('RGB').save(os.path.join(HERE, 'out', 'gear_preview.png'))


if __name__ == '__main__':
    main()
