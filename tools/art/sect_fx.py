"""
TƯ LIỆU HOẠT ẢNH NỀN TÔNG MÔN (lobby / menu) cho src/ui/sectFx.ts — từ ảnh nền gốc tools/art/ref/{nền}_orig.jpg:
  · ĐẢO BAY: cắt từng đảo nhỏ lơ lửng ra ảnh riêng (GrabCut trong hộp đảo) → public/ui/sect/{nền}_i{n}.png,
    rồi vá chỗ trống trên ảnh nền (cv2.inpaint) để đảo nhấp nhô vài điểm ảnh không lộ bóng đảo cũ → public/ui/{nền}.jpg
  · THÁC: mặt nạ điểm ảnh nước (sáng, xanh nhạt) trong các hộp thác → public/ui/sect/{nền}_fall.png
  · LINH KHÍ: mặt nạ các dòng suối xanh ngọc phát sáng (bỏ trời, cổng truyền tống) → public/ui/sect/{nền}_qi.png
  (mặt nạ cắt sát vùng có điểm ảnh, kèm toạ độ góc) → in ra đoạn TS để chép vào src/config/sectFx.ts
  python3 -I tools/art/sect_fx.py
"""
import os
import shutil
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
REF = os.path.join(HERE, 'ref')
OUT = os.path.join(UI, 'sect')

BG = {
    'bg_lobby_wide': dict(
        # hộp bao từng đảo (x0, y0, x1, y1[, mờ đáy]) — chỉ đảo nhỏ trôi giữa trời, không dính thác / núi.
        # `mờ đáy` = số hàng dưới cùng: đảo chìm dần vào mây → giữ nguyên nền ở đó, ảnh đảo mờ dần về 0
        islands=[(1104, 0, 1206, 112), (1164, 136, 1276, 270), (1404, 186, 1486, 280), (414, 286, 536, 428, 26), (490, 450, 550, 504)],
        falls=[(895, 405, 945, 500), (938, 505, 970, 585), (1138, 500, 1182, 615), (1218, 505, 1250, 585),
               (230, 635, 290, 910), (18, 615, 60, 700), (402, 440, 424, 575), (1520, 350, 1550, 470)],
        qi_skip=[(0, 0, 2000, 235), (860, 770, 1150, 970)],             # trời (viền mây, vầng trăng) + cổng truyền tống (đã có xoáy riêng)
    ),
    'bg_lobby_tall': dict(
        islands=[(408, 0, 522, 114), (478, 140, 582, 268), (576, 290, 610, 338)],
        falls=[(212, 408, 252, 500), (198, 500, 242, 555), (252, 500, 282, 580), (448, 500, 502, 640), (528, 505, 562, 600), (44, 385, 78, 455)],
        qi_skip=None,                                                   # bản dọc không có suối linh khí (chỉ cổng truyền tống)
    ),
}


def segment(bgr, box):
    """GrabCut trong hộp đảo (rembg chỉ bắt được mái đình, bỏ mất phần đá cùng tông xanh với trời).
    Viền hộp = chắc chắn nền (trừ cạnh chạm mép ảnh); lõi giữa hộp = chắc chắn đảo."""
    x0, y0, x1, y1 = box
    p = 8
    X0, Y0, X1, Y1 = max(0, x0 - p), max(0, y0 - p), min(bgr.shape[1], x1 + p), min(bgr.shape[0], y1 + p)
    crop = bgr[Y0:Y1, X0:X1]
    gm = np.full(crop.shape[:2], cv2.GC_PR_BGD, np.uint8)
    gm[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = cv2.GC_PR_FGD
    w, h = x1 - x0, y1 - y0
    cx, cy = x0 - X0 + w // 2, y0 - Y0 + h // 2
    gm[cy - h // 8:cy + h // 8, cx - w // 8:cx + w // 8] = cv2.GC_FGD
    edge = np.ones(crop.shape[:2], bool)
    edge[2:-2, 2:-2] = False
    if Y0 == 0:
        edge[:2] = False                                               # cạnh trên chạm mép ảnh: không ép là nền
    gm[edge] = cv2.GC_BGD
    bm, fm = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(crop, gm, None, bm, fm, 10, cv2.GC_INIT_WITH_MASK)
    a = np.where((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    k, lab, st, _ = cv2.connectedComponentsWithStats(a)
    if k > 1:
        a = np.where(lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])), 255, 0).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 0.6)                                 # mép mềm 1 điểm ảnh
    return a[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0]


def save_mask(m, path):
    """Lưu mặt nạ (0..255) cắt sát vùng có điểm ảnh → (x, y, w, h)"""
    ys, xs = np.nonzero(m)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    a = m[y0:y1, x0:x1]
    Image.fromarray(np.dstack([np.full(a.shape + (3,), 255, np.uint8), a]), 'RGBA').save(path, optimize=True)
    return int(x0), int(y0), int(x1 - x0), int(y1 - y0)


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    for name, cfg in BG.items():
        orig = os.path.join(REF, f'{name}_orig.jpg')
        if not os.path.exists(orig):
            shutil.copy(os.path.join(UI, f'{name}.jpg'), orig)
        bgr = cv2.imread(orig)
        H, W = bgr.shape[:2]
        ts = [f"  {name[3:]}: {{ w: {W}, h: {H},", '    islands: [']
        # --- đảo bay
        hole = np.zeros((H, W), np.uint8)
        for n, bx in enumerate(cfg['islands']):
            x0, y0, x1, y1 = bx[:4]
            fade = bx[4] if len(bx) > 4 else 0
            m = segment(bgr, (x0, y0, x1, y1))
            hm = cv2.dilate((m > 20).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
            if fade:
                hm[-fade:] = 0
                ramp = np.ones(m.shape[0], np.float32)
                ramp[-fade:] = np.linspace(1, 0, fade)
                m = (m * ramp[:, None]).astype(np.uint8)
            Image.fromarray(np.dstack([bgr[y0:y1, x0:x1, ::-1], m]), 'RGBA').save(os.path.join(OUT, f'{name}_i{n}.png'))
            hole[y0:y1, x0:x1] |= hm
            ts.append(f"      {{ src: '{name}_i{n}', x: {x0}, y: {y0}, w: {x1 - x0}, h: {y1 - y0} }},")
        ts.append('    ],')
        patched = cv2.inpaint(bgr, hole, 9, cv2.INPAINT_TELEA)
        cv2.imwrite(os.path.join(UI, f'{name}.jpg'), patched, [cv2.IMWRITE_JPEG_QUALITY, 90])
        # --- mặt nạ thác + linh khí (theo màu ảnh gốc)
        b, g, r = (bgr[..., i].astype(int) for i in range(3))
        water = (b > 200) & (g > 185) & (b - r > 25)
        fall = np.zeros((H, W), np.uint8)
        for x0, y0, x1, y1 in cfg['falls']:
            fall[y0:y1, x0:x1] = water[y0:y1, x0:x1] * 255
        fall = cv2.GaussianBlur(fall, (0, 0), 0.7)
        masks = [('fall', fall)]
        if cfg['qi_skip'] is not None:
            masks.append(('qi', qi_mask(b, g, r, cfg)))
        for key, m in masks:
            x, y, w, h = save_mask(m, os.path.join(OUT, f'{name}_{key}.png'))
            ts.append(f"    {key}: {{ src: '{name}_{key}', x: {x}, y: {y}, w: {w}, h: {h} }},")
        ts.append('  },')
        print('\n'.join(ts))


def qi_mask(b, g, r, cfg):
    """Dòng suối linh khí: xanh ngọc đậm, sáng (bỏ trời, cổng truyền tống, thác)"""
    qi = ((g > 190) & (b > 215) & (r < 150) & (g - r > 70)).astype(np.uint8) * 255
    for x0, y0, x1, y1 in cfg['qi_skip'] + cfg['falls']:
        qi[y0:y1, x0:x1] = 0
    k, lab, st, _ = cv2.connectedComponentsWithStats(qi)                # bỏ đốm lẻ (< 12 điểm ảnh)
    qi = np.where(np.isin(lab, [i for i in range(1, k) if st[i, cv2.CC_STAT_AREA] >= 12]), 255, 0).astype(np.uint8)
    return cv2.GaussianBlur(cv2.dilate(qi, np.ones((3, 3), np.uint8)), (0, 0), 1.2)


if __name__ == '__main__':
    main()
