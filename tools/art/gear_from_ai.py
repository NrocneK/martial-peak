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
ERASE = {   # 6 cây thương: bỏ dây tua rua (Đạo: tua che thân thương → vẽ lại đoạn thân ở LINES)
         (1, 'wp_spear'): [[(168, 100), (205, 98), (205, 172), (138, 172), (138, 135), (160, 112)]],
         (2, 'wp_spear'): [[(180, 64), (218, 56), (218, 168), (148, 168), (148, 120), (175, 95)]],
         (3, 'wp_spear'): [[(218, 88), (242, 80), (242, 188), (168, 188), (168, 135), (200, 110)]],
         (4, 'wp_spear'): [[(208, 145), (214, 128), (226, 128), (232, 150), (262, 175), (262, 318), (140, 318), (140, 240), (185, 185)]],
         (5, 'wp_spear'): [[(222, 125), (240, 112), (252, 125), (262, 160), (262, 300), (150, 300), (150, 230), (195, 170)]],
         (6, 'wp_spear'): [[(118, 240), (125, 175), (160, 150), (222, 145), (226, 158), (250, 160), (250, 292), (140, 292)]],
         (3, 'wp_sword'): [[(281, 48), (287, 39), (300, 34), (310, 34), (310, 110), (275, 178), (225, 178), (225, 125), (268, 92), (276, 70)]],   # kiếm Tiên: bỏ dây tua
         (3, 'wp_bow'): [[(55, 30), (125, 30), (125, 100), (55, 100)],
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
# chỉ giữ phần trong đa giác (toạ độ trong hộp). Thương Thánh: chỉ giữ đầu + thân, bỏ đường cong sáng phía sau
KEEP_POLY = {(5, 'wp_spear'): [(320, 4), (332, 14), (301, 70), (287, 94), (270, 108), (250, 124), (232, 130),
                               (30, 334), (8, 334), (8, 318), (206, 108), (218, 92), (226, 62), (262, 38)]}
HEAD_OUTLINE = {(5, 'wp_spear'): 125}                                 # vùng y < giá trị: chỉ giữ phần trong nét viền tối (bỏ quầng sáng)
# vẽ quầng sáng tròn mềm phía sau món đồ: (tâm x, y, bán kính, màu, độ đục tối đa)
GLOW_RADIAL = {}
# vòng sáng (hình nhẫn) phía sau món đồ: (tâm x, y, bán kính, độ dày nét, màu)
GLOW_RING = {(5, 'wp_spear'): (247, 92, 74, 5, (255, 232, 170))}
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
LINES = {(6, 'wp_spear'): [((240, 153 - 0), (138, 282), (20, 14, 35), 12), ((240, 153), (138, 282), (52, 40, 92), 7),
                          ((238, 154), (137, 281), (96, 80, 150), 2)],
         (3, 'wp_bow'): [((48, 179), (248, 31), (215, 240, 246), 3)],   # dây cung Tiên bị đứt chỗ mũi tên cũ
         (2, 'wp_bow'): [((158, 58), (46, 177), (105, 160, 105), 2)]}
ROTATE = {}
# Đồng bộ góc: kiếm/đao/thương/cung xoay để đường nối 2 đầu xa nhất (mũi–chuôi, đầu cánh cung–đầu cánh cung) nghiêng đúng 45°
AXIS45 = {'wp_sword', 'wp_blade', 'wp_spear', 'wp_bow'}
# Găng: tách 2 chiếc, xoay mỗi chiếc thẳng đứng (nắm tay hướng lên), xếp cạnh nhau. Đạo: 2 chiếc chạm nhau → cắt theo đường này
TIP_FLIP = {(3, 'wp_sword')}                                         # mũi ở đầu dưới-trái sau khi xoay → quay 180°
GLOVE_CUT = {6: [(167, 0), (167, 60), (150, 95), (120, 125), (102, 145), (100, 230)]}
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
    # Biến đổi tìm bằng khớp điểm đặc trưng SIFT + RANSAC (3 mẫu cùng bộ vẽ → khớp khít):
    #   chiếc phải → chiếc trái: phần đai + nắm tay chiếc phải trùng phần đai + đầu dưới chiếc trái
    #   găng đơn → chiếc phải: phần đai + nắm tay găng đơn trùng phần đai + nắm tay chiếc phải
    T_RL = np.float32([[1.016, 0.002, -90.835], [-0.002, 1.016, -31.289]])
    T_SR = np.float32([[0.729, 0.121, 1023.461], [-0.121, 0.729, -114.088]])
    T_SL = (np.vstack([T_RL, [0, 0, 1]]) @ np.vstack([T_SR, [0, 0, 1]]))[:2].astype(np.float32)
    p2 = piece(full, [(1157, 73), (1190, 69), (1215, 83), (1234, 110), (1226, 136), (1197, 161), (1133, 143), (1140, 125),
                      (1146, 100), (1150, 80)], T_RL, (W, H))                       # 2a: cổ găng + đai chiếc phải → thay 2b
    p1 = piece(full, [(30, 380), (70, 345), (110, 345), (175, 380), (175, 430), (160, 470), (130, 495), (60, 495), (15, 460)],
               T_SL, (W, H))                                            # 1a: nắm tay găng đơn → thay 1b
    out = under(base, under(p1, p2))[0:260, 1000:1260]                  # chiếc phải nằm trên các mảnh ghép
    solid = (out[..., 3] > 128).astype(np.uint8)                        # nét viền mảnh 1px quanh hình ghép
    ring = cv2.dilate(solid, np.ones((3, 3), np.uint8)).astype(bool) & ~solid.astype(bool)
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
    if (t, k) in HEAD_OUTLINE:
        yl = HEAD_OUTLINE[(t, k)]
        dark = cv2.morphologyEx((crgb.mean(2) < 110).astype(np.uint8), cv2.MORPH_CLOSE,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        inside = cv2.dilate(ndimage.binary_fill_holes(dark).astype(np.uint8), np.ones((3, 3), np.uint8))
        cv2.line(inside, (196, 136), (256, 74), 1, 11)                  # giữ phần cổ nối đầu thương với thân
        al[:yl] = al[:yl] * inside[:yl]
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
    if (t, k) in GLOW_RADIAL:
        gx, gy, gr, gc, ga, gcore = GLOW_RADIAL[(t, k)]
        yy, xx = np.mgrid[:rgba.shape[0], :rgba.shape[1]]
        d = np.hypot(xx - gx, yy - gy) / gr
        e = np.clip((d - gcore) / (1 - gcore), 0, 1); e = e * e * (3 - 2 * e)   # lõi sáng đặc tới gcore·bán kính rồi mờ dần
        ga_ = (ga * (1 - e)).astype(np.uint8)
        glow = np.dstack([np.full(d.shape + (3,), gc, np.uint8), ga_])
        rgba = np.array(Image.alpha_composite(Image.fromarray(glow, 'RGBA'), Image.fromarray(rgba, 'RGBA')))
    if (t, k) in GLOW_RING:
        gx, gy, gr, gw, gc = GLOW_RING[(t, k)]
        yy, xx = np.mgrid[:rgba.shape[0], :rgba.shape[1]]
        dist = np.abs(np.hypot(xx - gx, yy - gy) - gr)
        core = np.clip(1 - dist / (gw / 2), 0, 1)                       # nét vòng sáng đặc
        halo = np.exp(-(dist / (gw * 1.6)) ** 2) * 0.55                 # tỏa sáng mềm hai bên nét
        a_ = np.clip(np.maximum(core, halo) * 255, 0, 255).astype(np.uint8)
        col = np.where(core[..., None] > 0.5, np.array([255, 250, 230]), np.array(gc)).astype(np.uint8)
        ring = np.dstack([col, a_])
        rgba = np.array(Image.alpha_composite(Image.fromarray(ring, 'RGBA'), Image.fromarray(rgba, 'RGBA')))
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


def tip_angle(a):
    """góc (độ, trục y hướng lên) của đường nối 2 điểm xa nhau nhất trên hình, đo từ đầu dưới lên đầu trên"""
    ys, xs = np.nonzero(a)
    h = cv2.convexHull(np.stack([xs, ys], 1).astype(np.int32))[:, 0, :].astype(float)
    d = ((h[:, None] - h[None]) ** 2).sum(2); i, j = np.unravel_index(d.argmax(), d.shape)
    p, q = h[i], h[j]
    if p[1] < q[1]: p, q = q, p
    return np.degrees(np.arctan2(p[1] - q[1], q[0] - p[0]))


def upright(g, flip=False):
    """xoay 1 chiếc găng cho trục dài thẳng đứng (góc xoay nhỏ nhất, giữ nắm tay hướng lên); flip: xoay thêm 180°"""
    n, lab, st, _ = cv2.connectedComponentsWithStats((g[..., 3] > 60).astype(np.uint8))
    if n > 2:                                                           # chỉ giữ khối lớn nhất (bỏ vụn của chiếc kia)
        big = 1 + np.argmax(st[1:, 4]); g = g * cv2.dilate((lab == big).astype(np.uint8), np.ones((3, 3), np.uint8))[..., None]
    im = Image.fromarray(g, 'RGBA'); im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
    a = np.array(im)[..., 3] > 100
    ys, xs = np.nonzero(a); ev, vec = np.linalg.eigh(np.cov(np.vstack([xs, -ys])))
    ang = np.degrees(np.arctan2(vec[1, 1], vec[0, 1]))                  # hướng trục dài, y hướng lên
    rot = (90 - ang + 90) % 180 - 90                                    # về [-90, 90)
    im = im.rotate(rot + (180 if flip else 0), resample=Image.BICUBIC, expand=True)
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())


def glove_pair(t, rgba):
    if t == 2:                                                          # Linh: chiếc ghép (nắm tay + cổ găng) và bản lật gương
        j = np.array(Image.open(os.path.join(REF, 'linh_glove_joined.png')).convert('RGBA'))
        R, L = upright(j, flip=True), upright(j[:, ::-1].copy(), flip=True)   # ngón cái hướng vào trong như các bậc khác
    else:
        al = rgba[..., 3]
        if t in GLOVE_CUT:
            h, w = al.shape; cut = GLOVE_CUT[t]
            lm = np.zeros((h, w), np.uint8)
            cv2.fillPoly(lm, [np.array([(0, 0)] + cut + [(0, h)], np.int32)], 1)
            parts = [rgba * lm[..., None], rgba * (1 - lm)[..., None]]
        else:
            n, lab, st, _ = cv2.connectedComponentsWithStats((al > 60).astype(np.uint8))
            ids = sorted(range(1, n), key=lambda i: -st[i][4])[:2]
            ids.sort(key=lambda i: st[i][0])                            # trái → phải
            parts = []
            for i in ids:
                mk = cv2.dilate((lab == i).astype(np.uint8), np.ones((3, 3), np.uint8))
                parts.append(rgba * mk[..., None])
        L, R = upright(parts[0].astype(np.uint8)), upright(parts[1].astype(np.uint8))
    gap = int(max(L.width, R.width) * 0.08)
    hh = max(L.height, R.height)
    out = Image.new('RGBA', (L.width + gap + R.width, hh))
    out.alpha_composite(L, (0, hh - L.height)); out.alpha_composite(R, (L.width + gap, hh - R.height))   # chân găng thẳng hàng
    return np.array(out)


def main():
    pv = Image.new('RGBA', (66 * 9, 66 * 6), (26, 24, 40, 255))
    for t, boxes in BOXES.items():
        src = cv2.imread(os.path.join(REF, f'gear_t{t}_ai.webp'))
        msk = np.array(Image.open(os.path.join(REF, f'gear_t{t}_mask.png')).convert('L')).astype(float) / 255
        for k, (x0, y0, x1, y1) in zip(KEYS, boxes):
            rgba = build(t, k, src, msk, (x0, y0, x1, y1))
            if k == 'wp_fist':
                rgba = glove_pair(t, rgba)
            im = Image.fromarray(rgba, 'RGBA')
            im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
            if k in AXIS45:
                im = im.rotate(45 - tip_angle(np.array(im)[..., 3] > 100) + (180 if (t, k) in TIP_FLIP else 0),
                               resample=Image.BICUBIC, expand=True)
                im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
            if k == 'wp_bow':                                            # cánh cung cùng một phía (dưới-phải), dây phía trên-trái
                ys, xs = np.nonzero(np.array(im)[..., 3] > 100)
                if ((xs - im.width / 2) + (ys - im.height / 2)).mean() < 0:
                    im = im.transpose(Image.TRANSVERSE)                 # lật qua đường chéo 45° (giữ nguyên góc nghiêng)
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
