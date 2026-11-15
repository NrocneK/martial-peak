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
from scipy import ndimage
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GEAR = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'gear')
REF = os.path.join(HERE, 'ref')
KEYS = ['wp_sword', 'wp_blade', 'wp_spear', 'wp_fist', 'wp_bow', 'wp_fan', 'clothes', 'shoes', 'accessory']
G3 = [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2)]   # lưới 3×3 (cột, hàng), ô 341px
BOXES = {
    1: [(50, 0, 294, 250), (389, 7, 627, 256), (723, 0, 970, 249), (1041, 37, 1309, 236), (1391, 8, 1625, 247),
        (1697, 45, 1975, 228), (34, 280, 303, 489), (1380, 271, 1632, 492), (1753, 263, 1941, 482)],
    2: [(25, 7, 240, 244), (280, 7, 489, 243), (774, 6, 988, 244), (1000, 0, 1260, 260), (278, 258, 492, 494),
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
                         [(222, 160), (280, 160), (280, 215), (222, 215)],
                         [(120, 92), (132, 88), (162, 120), (152, 130)]],          # mẩu thân tên còn sót
         # cung Linh: bỏ 2 móc bạc ở đầu dây + dây cũ → nối dây thẳng vào cánh cung (LINES)
         (2, 'wp_bow'): [[(92, 36), (156, 34), (157, 60), (115, 84), (92, 84)],
                         [(18, 128), (54, 128), (56, 172), (30, 176), (16, 170)],
                         [(106, 70), (47, 168), (36, 160), (95, 64)], [(78, 78), (106, 78), (106, 114), (78, 114)]]}
# quầng sáng nhạt giữa các vòng dây ngoài mặt ngọc (tâm x, y, bán kính, độ sáng tối thiểu) → trong suốt
GLOW_OUT = {(6, 'accessory'): (122, 125, 86, 195)}
# chỉ giữ phần trong đa giác (toạ độ trong hộp): găng Linh lấy CHIẾC BÊN PHẢI của cặp (chiếc trái lỗi hai đầu đều là nắm tay)
KEEP_POLY = {}
OUTLINE_ADD = {(4, 'wp_blade'): 150}                                      # lấy thêm phần nằm trong nét viền đen (lưỡi đao sáng bị bỏ)
OUTLINE_ONLY = set()                                                  # chỉ giữ phần nằm trong nét viền đen
# xoá điểm sáng nhạt trong đa giác (vòng sáng xoáy quanh găng Thánh), giữ nét viền & thân găng
PALE_ERASE = {(5, 'wp_fist'): [[(0, 85), (85, 85), (75, 125), (50, 150), (25, 170), (0, 170)],
                               [(252, 236), (333, 236), (333, 264), (252, 264)]]}
# xoá điểm sáng nhạt nằm bên phải nét viền đen ngoài cùng của từng hàng (vòng sáng bên phải găng Thánh): (y0, y1, x tối thiểu)
RIGHT_OF_OUTLINE = {(5, 'wp_fist'): (100, 337, 200)}
PALE_GAPS = {(2, 'accessory')}                                        # khe sáng nhạt giữa các nút thắt → trong suốt
CORD = {(2, 'wp_spear'), (3, 'wp_spear')}                             # nối lại sợi dây mảnh treo tua bị rembg bỏ
MIRROR_PAIR = {}                            # (độ chồng của 2 chiếc, góc xoay để nắm tay hướng lên)
LINES = {(3, 'wp_bow'): [((48, 179), (248, 31), (215, 240, 246), 3)],   # dây cung Tiên bị đứt chỗ mũi tên cũ
         (2, 'wp_bow'): [((158, 58), (46, 177), (105, 160, 105), 2)]}
ROTATE = {(2, 'wp_fist'): 180}                                        # xoay cho nắm tay hướng lên như các bậc khác
FLOOD = {(5, 'wp_sword'): 70, (5, 'wp_blade'): 60}                    # lưỡi trắng gần như nền


def cutout(crop, m, biggest=False, holes=False, flood_tol=0, solid_holes=False):
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
        bgish = not solid_holes and wf > 0.75 and (dark > (0.25 if holes else 0.4) or (holes and st[i][4] > 60))
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


def piece(rgba, poly, M, size):
    """cắt phần trong đa giác (toạ độ tuyệt đối trong ảnh mẫu, rgba bắt đầu từ 0,0) rồi biến đổi affine M sang khung size"""
    m = np.zeros(rgba.shape[:2], np.uint8); cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    m = cv2.GaussianBlur(m, (3, 3), 0)
    pc = rgba.copy(); pc[..., 3] = (pc[..., 3].astype(int) * m // 255).astype(np.uint8)
    return cv2.warpAffine(pc, M, size, flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))


def under(top, bottom):
    """top đè lên bottom (RGBA uint8)"""
    return np.array(Image.alpha_composite(Image.fromarray(bottom, 'RGBA'), Image.fromarray(top, 'RGBA')))


def linh_fist(src, msk):
    """Găng Linh: cặp găng mẫu có chiếc trái lỗi (2 đầu đều là nắm tay). Sửa theo chú thích:
       đầu dưới chiếc trái (1b) ← nắm tay 1a của chiếc găng đơn (thu nhỏ); đầu trên chiếc trái (2b) ← cổ găng 2a của chiếc phải"""
    H, W = src.shape[:2]
    full = cutout(src, msk)                                             # toàn ảnh, toạ độ tuyệt đối
    base = full.copy()
    al = np.ascontiguousarray(base[..., 3])
    cv2.fillPoly(al, [np.array([(1050, 118), (1060, 90), (1080, 40), (1105, 8), (1160, 8), (1190, 20), (1192, 64), (1160, 67), (1151, 72),
                                (1144, 100), (1138, 125), (1128, 140), (1118, 155), (1105, 175), (1100, 218), (1015, 218),
                                (1008, 150)], np.int32)], 0)                                       # bỏ nguyên chiếc trái
    base[..., 3] = al
    T = np.float32([[1, 0, -80], [0, 1, -37]])                          # 2a (cổ găng + vòng đai chiếc phải) → chỗ chiếc trái
    p2 = piece(full, [(1150, 72), (1180, 66), (1215, 83), (1234, 110), (1226, 136), (1197, 161), (1136, 143), (1143, 125),
                      (1149, 100)], T, (W, H))
    M = cv2.getRotationMatrix2D((115, 380), 13, 0.6)                    # 1a: nắm tay găng đơn (kèm vòng đai, nằm dưới đai 2a)
    M[0, 2] += 1085 - 115; M[1, 2] += 118 - 380
    p1 = piece(full, [(30, 380), (70, 345), (110, 345), (175, 380), (175, 430), (160, 470), (130, 495), (60, 495), (15, 460)],
               M, (W, H))
    out = under(base, under(p1, p2))[0:260, 1000:1260]                  # chiếc phải nằm trên các mảnh ghép
    # viền tối 2px quanh hình ghép (mép trái cổ găng mới không có nét viền)
    solid = (out[..., 3] > 128).astype(np.uint8)
    ring = cv2.dilate(solid, np.ones((5, 5), np.uint8)).astype(bool) & ~solid.astype(bool)
    out[ring] = (18, 32, 24, 255)
    return out


def build(t, k, src, msk, box):
    x0, y0, x1, y1 = box
    if (t, k) == (2, 'wp_fist'):
        return linh_fist(src, msk)
    rgba = cutout(src[y0:y1, x0:x1], msk[y0:y1, x0:x1], (t, k) in ONLY_BIGGEST, holes=k == 'wp_bow', flood_tol=FLOOD.get((t, k), 0),
                  solid_holes=k in ('wp_sword', 'wp_blade'))
    crgb = src[y0:y1, x0:x1][..., ::-1].astype(float)
    al = np.ascontiguousarray(rgba[..., 3])
    if (t, k) in KEEP_POLY:
        km = np.zeros_like(al); cv2.fillPoly(km, [np.array(KEEP_POLY[(t, k)], np.int32)], 1); al = al * km
    if (t, k) in OUTLINE_ADD:
        dark = cv2.morphologyEx((crgb.mean(2) < OUTLINE_ADD[(t, k)]).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        al = np.maximum(al, (ndimage.binary_fill_holes(dark) * 255).astype(np.uint8))
        rgba[..., :3] = np.where((al > 0)[..., None] & (rgba[..., 3] < 250)[..., None], crgb, rgba[..., :3]).astype(np.uint8)
    if (t, k) in OUTLINE_ONLY:
        dark = cv2.morphologyEx((crgb.mean(2) < 110).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        inside = ndimage.binary_fill_holes(dark).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(inside)
        big = [i for i in range(1, n) if st[i][4] > st[1:, 4].max() * 0.3]
        al = al * cv2.dilate(np.isin(lab, big).astype(np.uint8), np.ones((3, 3), np.uint8))
    if (t, k) in PALE_ERASE:
        pm = np.zeros_like(al)
        for poly in PALE_ERASE[(t, k)]: cv2.fillPoly(pm, [np.array(poly, np.int32)], 1)
        al[(pm == 1) & (crgb.min(2) > 150)] = 0
    if (t, k) in RIGHT_OF_OUTLINE:
        ya, yb, xm = RIGHT_OF_OUTLINE[(t, k)]
        dk = crgb.mean(2) < 70
        for y in range(ya, min(yb, al.shape[0])):
            xs = np.nonzero(dk[y, xm:])[0]
            if len(xs): al[y, xm + xs.max() + 1:] = 0
    if (t, k) in PALE_GAPS:
        pale = (crgb.min(2) > 175).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(pale, connectivity=4)
        for i in range(1, n):
            if st[i][4] >= 25: al[lab == i] = 0
    if (t, k) in CORD:
        strong = (np.abs(crgb - 250).max(2) > 95).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(strong)
        fgd = cv2.dilate((al > 128).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        for i in range(1, n):
            c = lab == i
            if (c & fgd).any() and st[i][4] < 2000: al[c & (al < 200)] = 255
        rgba[..., :3] = np.where((al > 0)[..., None] & (rgba[..., 3] < 200)[..., None], crgb[..., :3], rgba[..., :3]).astype(np.uint8)
    rgba[..., 3] = al
    if (t, k) in GLOW_OUT:
        gx, gy, gr, gl = GLOW_OUT[(t, k)]
        yy, xx = np.mgrid[:rgba.shape[0], :rgba.shape[1]]
        rgba[..., 3][(np.hypot(xx - gx, yy - gy) > gr) & (rgba[..., :3].mean(2) > gl)] = 0
    if (t, k) in ERASE:
        al = np.ascontiguousarray(rgba[..., 3])
        for poly in ERASE[(t, k)]:
            cv2.fillPoly(al, [np.array(poly, np.int32)], 0)
        rgba[..., 3] = al
    for (p0, p1, col, th) in LINES.get((t, k), []):                     # vẽ lại dây cung (nối chỗ đứt / nối thẳng vào cánh cung)
        lm = np.zeros(rgba.shape[:2], np.uint8)
        cv2.line(lm, p0, p1, 255, th, cv2.LINE_AA)
        f = lm[..., None] / 255.0
        rgba[..., :3] = (rgba[..., :3] * (1 - f) + np.array(col) * f).astype(np.uint8)
        rgba[..., 3] = np.maximum(rgba[..., 3], lm)
    if (t, k) in PALE_ERASE:                                            # mảnh sáng vụn tách rời còn sót → bỏ
        al = np.ascontiguousarray(rgba[..., 3])
        n, lab, st, _ = cv2.connectedComponentsWithStats((al > 40).astype(np.uint8))
        if n > 2:
            big = st[1:, 4].max()
            for i in range(1, n):
                if st[i][4] < big * 0.01: al[lab == i] = 0
        # vụn trắng bám sát viền ngoài: điểm sáng nhạt không có điểm tối/màu nào trong bán kính 2 về phía ngoài
        pale = (rgba[..., :3].min(2) > 200) & (al > 0)
        edge = cv2.dilate((al == 0).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        al[pale & edge] = 0
        rgba[..., 3] = al
    return rgba


def main():
    pv = Image.new('RGBA', (66 * 9, 66 * 6), (26, 24, 40, 255))
    for t, boxes in BOXES.items():
        src = cv2.imread(os.path.join(REF, f'gear_t{t}_ai.webp'))
        msk = np.array(Image.open(os.path.join(REF, f'gear_t{t}_mask.png')).convert('L')).astype(float) / 255
        for k, (x0, y0, x1, y1) in zip(KEYS, boxes):
            rgba = build(t, k, src, msk, (x0, y0, x1, y1))
            im = Image.fromarray(rgba, 'RGBA')
            im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
            if (t, k) in ROTATE:
                im = im.rotate(ROTATE[(t, k)], expand=True)
            if (t, k) in MIRROR_PAIR:                                    # ghép đôi: chiếc găng đúng + bản lật gương của nó
                ov, rot = MIRROR_PAIR[(t, k)]
                im = im.rotate(rot, expand=True)
                pair = Image.new('RGBA', (round(im.width * (2 - ov)), im.height))
                pair.alpha_composite(im.transpose(Image.FLIP_LEFT_RIGHT), (pair.width - im.width, 0))
                pair.alpha_composite(im, (0, 0))
                im = pair
            s = 64 / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            out = Image.new('RGBA', (66, 66))
            out.alpha_composite(im, ((66 - im.width) // 2, (66 - im.height) // 2))
            out.save(os.path.join(GEAR, f'{k}_{t - 1}.png'))
            pv.alpha_composite(out, (KEYS.index(k) * 66, (t - 1) * 66))
    pv.resize((pv.width * 2, pv.height * 2), Image.LANCZOS).convert('RGB').save(os.path.join(HERE, 'out', 'gear_preview.png'))


if __name__ == '__main__':
    main()
