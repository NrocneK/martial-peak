"""
BỘ ICON + KHUNG GIAO DIỆN — lấy NGUYÊN từ ảnh mẫu bạn tạo (tools/art/ref/icons_ai.webp, uikit_ai.webp, nền trắng):
  · mặt nạ tách nền: rembg isnet-general-use → tools/art/ref/{icons_ai,uikit_ai}_mask.png
  · gỡ nền trắng ở mép (F = a·C + (1−a)·255 → C) để không viền trắng trên nền tối
  · icon: lưới 5 cột × 6 hàng (ô 320×~370), mỗi icon cắt sát + đặt giữa ô vuông 128px → public/ui/ic_<tên>.png
  · khung: cắt từng mảnh (khung nút, khung bảng, dải tiêu đề, nút vàng, viên tiền tệ, khung chân dung, thanh tiến độ)
    → public/ui/k_<tên>.png (giao diện dùng border-image 9 mảnh để co giãn không méo góc)
  python3 -I tools/art/ui_from_ai.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
REF = os.path.join(HERE, 'ref')

# (hàng, cột) trên ảnh icon → tên file (giữ tên cũ để giao diện không phải đổi)
ICONS = {
    (0, 0): 'home', (0, 1): 'cultivate', (0, 3): 'bag', (0, 4): 'forge',
    (1, 1): 'settings', (1, 2): 'trophy',
    (2, 1): 'herb', (2, 2): 'quest', (2, 3): 'linh', (2, 4): 'stage',
    (3, 0): 'alchemy', (3, 1): 'ore', (3, 3): 'essence',
    (4, 1): 'skill', (4, 2): 'core', (4, 3): 'hero',
}
# khung giao diện: tên → hộp cắt trên uikit_ai.webp (2000×2000)
KIT = {
    'btn': (125, 85, 440, 395),            # ô vuông nền tím than viền vàng
    'btn_on': (555, 85, 860, 385),         # ô vuông vàng (đang chọn)
    'panel': (955, 95, 1910, 845),         # bảng nội dung có hoa văn góc
    'banner': (95, 900, 1900, 1290),       # dải tiêu đề cuộn giấy
    'gold': (105, 1270, 625, 1625),        # nút vàng lớn
    'gold2': (110, 1700, 625, 1925),       # nút vàng viền tím
    'pill': (720, 1325, 1415, 1610),       # viên tiền tệ + nút cộng
    'avatar': (1505, 1320, 1880, 1745),    # khung chân dung tròn
    'bar': (720, 1810, 1640, 1880),        # thanh tiến độ (đầu phải bị chữ watermark che → lật đầu trái sang)
}


def cutout(name):
    F = np.array(Image.open(os.path.join(REF, name + '.webp')).convert('RGB')).astype(float)
    m = np.array(Image.open(os.path.join(REF, name + '_mask.png')).convert('L')).astype(float) / 255
    A = np.clip((m - 0.08) / 0.84, 0, 1)
    C = (F - (1 - A[..., None]) * 255) / np.maximum(A[..., None], 0.08)
    C = np.where(A[..., None] > 0.96, F, C)
    return np.dstack([np.clip(C, 0, 255), A * 255]).astype(np.uint8)


def wipe_mark(rgba, box):
    rgba[box[1]:box[3], box[0]:box[2], 3] = 0


def save_icon(ic, x0, y0, cw, ch, name):
    if True:
        arr = ic[y0:y0 + ch, x0:x0 + cw].copy()
        lab, n = ndimage.label(arr[..., 3] > 24)
        keep = np.zeros(arr.shape[:2], bool)
        for j, sl in enumerate(ndimage.find_objects(lab)):              # chỉ giữ mảng có tâm nằm ở phần giữa ô (bỏ mép icon bên cạnh)
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            if 0.09 * cw < cx < 0.91 * cw and 0.07 * ch < cy < 0.93 * ch:
                keep |= lab == j + 1
        arr[..., 3] = np.where(ndimage.binary_dilation(keep, iterations=2), arr[..., 3], 0)
        if name in FILL:                                                # vật màu sáng gần trắng (phong thư): mặt nạ ăn mất lòng → lấp đặc
            src = np.array(Image.open(os.path.join(REF, FILL[name])).convert('RGB'))[y0:y0 + ch, x0:x0 + cw]
            solid = ndimage.binary_fill_holes(arr[..., 3] > 60)
            hole = solid & (arr[..., 3] < 250)
            arr[..., :3] = np.where(hole[..., None], src, arr[..., :3])
            arr[..., 3] = np.where(solid, 255, arr[..., 3])
        cell = Image.fromarray(arr, 'RGBA')
        bb = cell.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        cell = cell.crop(bb)
        s = 120 / max(cell.size)
        cell = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.LANCZOS)
        out = Image.new('RGBA', (128, 128))
        out.alpha_composite(cell, ((128 - cell.width) // 2, (128 - cell.height) // 2))
        out.save(os.path.join(UI, f'ic_{name}.png'))


# bộ icon bổ sung (icons2_ai.webp 2000×1333, lưới 3×2, ô ~667×640 bắt đầu y≈40)
FILL = {'mail': 'icons2_ai.webp'}
ICONS2 = {(0, 0): 'pill', (0, 1): 'mail', (0, 2): 'notice', (1, 0): 'gear', (1, 1): 'boots', (1, 2): 'pendant'}


def main():
    ic = cutout('icons_ai')
    wipe_mark(ic, (1300, 1860, 1540, 1950))                             # chữ "Dola AI"
    for (r, c), name in ICONS.items():
        save_icon(ic, c * 320, 60 + r * 370, 320, 370, name)
    ic2 = cutout('icons2_ai')
    wipe_mark(ic2, (1700, 1190, 1960, 1290))
    for (r, c), name in ICONS2.items():
        save_icon(ic2, c * 667, 40 + r * 640, 667, 640, name)
    # nút điều hướng bát giác (octa_ai.webp 793×672): thường (trái) + đang chọn (phải)
    oc = cutout('octa_ai')
    for name, (x0, x1) in (('nav', (0, 396)), ('nav_on', (396, 793))):
        arr = oc[:, x0:x1].copy()
        lab, n = ndimage.label(arr[..., 3] > 24)
        big = np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1
        keepm = ndimage.binary_dilation(lab == big, iterations=4)
        a = np.where(keepm, arr[..., 3], 0)
        inner = ndimage.binary_erosion(ndimage.binary_fill_holes(a > 128), iterations=3)
        hole = inner & (a < 250)
        if hole.any():                                                  # lòng nút bị mặt nạ ăn (quầng sáng) → lấy lại màu gốc của ảnh mẫu
            src = np.array(Image.open(os.path.join(REF, 'octa_ai.webp')).convert('RGB'))[:, x0:x1]
            arr[..., :3] = np.where(hole[..., None], src, arr[..., :3])
        a = np.where(inner, 255, a)                                     # lòng nút đặc
        arr[..., 3] = a
        im = Image.fromarray(arr, 'RGBA')
        im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()).save(os.path.join(UI, f'k_{name}.png'))
    kit = cutout('uikit_ai')
    wipe_mark(kit, (1880, 1790, 2000, 2000))
    for name, box in KIT.items():
        arr = kit[box[1]:box[3], box[0]:box[2]].copy()
        lab, n = ndimage.label(arr[..., 3] > 24)
        if n:                                                           # chỉ giữ mảnh lớn nhất (bỏ mép mảnh bên cạnh)
            big = np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1
            arr[..., 3] = np.where(ndimage.binary_dilation(lab == big, iterations=3), arr[..., 3], 0)
        im = Image.fromarray(arr, 'RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
        if name == 'bar':
            cap = im.crop((0, 0, 70, im.height)).transpose(Image.FLIP_LEFT_RIGHT)
            w = Image.new('RGBA', (im.width + 10, im.height))
            w.alpha_composite(im.crop((0, 0, im.width - 60, im.height)))
            w.alpha_composite(cap, (w.width - 70, 0))
            im = w
        if name in ('panel', 'btn', 'btn_on', 'pill'):                  # lòng khung đặc hoàn toàn (mặt nạ tách nền để lòng hơi trong)
            ar = np.array(im)
            solid = ndimage.binary_fill_holes(ar[..., 3] > 128)
            ar[..., 3] = np.where(ndimage.binary_erosion(solid, iterations=3), 255, ar[..., 3])
            im = Image.fromarray(ar, 'RGBA')
        im.save(os.path.join(UI, f'k_{name}.png'))
        print(name, im.size)
    # ô vuông "đang chọn": cùng khung tím than, viền vàng sáng hơn + quầng vàng ấm ở mép trong (chữ vẫn đọc rõ)
    b = np.array(Image.open(os.path.join(UI, 'k_btn.png'))).astype(float)
    rgb = b[..., :3]
    gold = (rgb[..., 0] > rgb[..., 2] + 40) & (b[..., 3] > 100)
    rgb[gold] = np.clip(rgb[gold] * 1.25 + 20, 0, 255)
    inside = (b[..., 3] > 200) & ~ndimage.binary_dilation(gold, iterations=2)
    dist = ndimage.distance_transform_edt(inside)
    glow = np.exp(-dist / 18)[..., None] * inside[..., None]
    rgb[:] = rgb * (1 - glow * 0.55) + np.array([255, 196, 90.]) * glow * 0.55
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), b[..., 3]]).astype(np.uint8), 'RGBA').save(os.path.join(UI, 'k_btn_hi.png'))
    # bản co giãn 9 mảnh sạch: giữ nguyên 4 góc hoa văn (S px), cạnh = 1 dải mỏng giữa mỗi cạnh (đường viền thẳng)
    # kéo dài, lòng = màu nền → border-image không kéo méo hoa văn
    for src, dst, S in (('k_panel', 'k_panel9', 190), ('k_btn', 'k_btn9', 92), ('k_btn_hi', 'k_btn_hi9', 92)):
        P = np.array(Image.open(os.path.join(UI, src + '.png'))).astype(np.uint8)
        h, w = P.shape[:2]
        n = S * 2 + 8
        out = np.zeros((n, n, 4), np.uint8)
        out[:] = np.median(P[h // 2 - 20:h // 2 + 20, w // 2 - 20:w // 2 + 20].reshape(-1, 4), 0).astype(np.uint8)
        out[:S, :S] = P[:S, :S]; out[:S, n - S:] = P[:S, w - S:]
        out[n - S:, :S] = P[h - S:, :S]; out[n - S:, n - S:] = P[h - S:, w - S:]
        mx, my = w // 2, h // 2
        out[:S, S:n - S] = P[:S, mx:mx + 1]; out[n - S:, S:n - S] = P[h - S:, mx:mx + 1]
        out[S:n - S, :S] = P[my:my + 1, :S]; out[S:n - S, n - S:] = P[my:my + 1, w - S:]
        Image.fromarray(out, 'RGBA').save(os.path.join(UI, dst + '.png'))
    # bảng xem trước
    pv = Image.new('RGBA', (128 * 8, 128 * 3), (26, 24, 40, 255))
    for i, name in enumerate(list(ICONS.values()) + list(ICONS2.values())):
        pv.alpha_composite(Image.open(os.path.join(UI, f'ic_{name}.png')), ((i % 8) * 128, (i // 8) * 128))
    pv.convert('RGB').save(os.path.join(HERE, 'out', 'icons_preview.png'))


if __name__ == '__main__':
    main()
