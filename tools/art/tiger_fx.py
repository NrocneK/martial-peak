"""
HỔ KHIẾU CHẤN — hư ảnh đầu hổ (tách từ ảnh mẫu tools/art/ref/ho_khieu_ref.webp, nét mực đen trắng trên nền xám).

1) Tách nền: nền xám phẳng nhưng lông hổ cũng có mảng xám gần màu nền → KHÔNG lọc theo màu mà LOANG từ mép ảnh
   (flood fill có ngưỡng) để chỉ bỏ phần nền nối liền với mép; phần xám bên trong con hổ giữ nguyên.
2) Cắt vùng đầu hổ + một phần dải mực xoáy quanh, thu về 320 px.
3) Thêm quầng sáng trắng mờ sau lưng (nét mực đen sẽ chìm trên nền tối của game nếu không có viền sáng).

  python3 -I tools/art/tiger_fx.py → public/vfx/tiger_head.png + tools/art/out/tiger_fx_preview.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
CROP = (130, 400, 940, 1250)
# đường bao ĐẦU hổ trong ảnh mẫu (đủ 2 tai + 2 bên má/bờm, cắt ngang trán để bỏ phần lưng phía trên)
HEAD = [(240, 440), (270, 450), (318, 476), (400, 468), (540, 460), (680, 465), (745, 468), (800, 452), (830, 446),
        (860, 500), (888, 580), (900, 680), (892, 770), (877, 830), (825, 950), (750, 1055), (675, 1160), (640, 1205),
        (600, 1222), (520, 1222), (480, 1205), (442, 1160), (405, 1085), (300, 980), (210, 875), (180, 780),
        (182, 650), (205, 548), (225, 470)]
SIZE = 320


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(os.path.join(HERE, 'ref', 'ho_khieu_ref.webp')).convert('RGB')
    w, h = src.size
    fill = src.copy()
    KEY = (255, 0, 255)
    seeds = [(x, 0) for x in range(0, w, 40)] + [(x, h - 1) for x in range(0, w, 40)] + \
            [(0, y) for y in range(0, h, 40)] + [(w - 1, y) for y in range(0, h, 40)]
    for sd in seeds:
        c = fill.getpixel(sd)
        if abs(c[0] - 166) < 18 and abs(c[1] - 164) < 18 and abs(c[2] - 168) < 18:
            ImageDraw.floodfill(fill, sd, KEY, thresh=22)
    a = np.array(fill)
    bgm = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
    alpha = (~bgm).astype(np.uint8) * 255
    rgba = np.dstack([np.array(src), alpha])
    # CẮT BÁM THEO TỪNG SỢI LÔNG:
    #  - lõi = đường bao đầu thu vào 60px → giữ nguyên
    #  - dải mép (đường bao nới ra 38px, trừ lõi): chỉ giữ điểm SÁNG (lông trắng/xám) nối liền với lõi
    #    → các sợi lông ló ra ngoài được giữ, mảng mực đen bên ngoài bị bỏ
    #  - lấp các lỗ kín (sọc đen nằm giữa các sợi lông) để không thủng
    from scipy import ndimage as nd
    hm = Image.new('L', src.size, 0)
    ImageDraw.Draw(hm).polygon(HEAD, fill=255)
    P = np.array(hm) > 0
    core = nd.binary_erosion(P, iterations=60)
    yy, xx = np.mgrid[0:h, 0:w]
    # trán giữa 2 tai: sọc đen chạm sát mép trên là của đầu hổ → giữ đến sát đường bao
    core |= nd.binary_erosion(P, iterations=6) & (yy < 600) & (xx > 300) & (xx < 770)
    outer = nd.binary_dilation(P, iterations=38)
    lum = np.array(src).astype(float).mean(2)
    bright = (lum > 105) & outer & ~bgm & ~((xx > 850) & (yy < 640))   # bỏ dải mực xoáy cạnh tai phải
    lab, _ = nd.label(bright | core)
    ids = np.unique(lab[core])
    keep = np.isin(lab, ids[ids > 0]) | core
    keep = nd.binary_fill_holes(keep)
    keep = nd.binary_opening(keep, iterations=1)                       # bỏ hạt lẻ
    soft = nd.gaussian_filter(keep.astype(float), 0.8)
    rgba[..., 3] = (rgba[..., 3].astype(float) * np.clip(soft * 1.3, 0, 1)).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA').crop(CROP)
    k = SIZE / max(img.size)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    # quầng sáng trắng sau lưng
    pad = 24
    canvas = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    halo = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sil = Image.new('L', canvas.size, 0)
    sil.paste(img.getchannel('A'), (pad, pad))
    sil = sil.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(9))
    halo.putalpha(sil.point(lambda v: int(v * 0.75)))
    hp = np.array(halo)
    hp[..., :3] = (255, 248, 230)
    # (bỏ quầng sáng viền ngoài — tạo thành rìa giới hạn lộ rõ)
    canvas.alpha_composite(img, (pad, pad))
    # ĐỔI STYLE giống sóng xung kích (mẫu video): ánh sáng năng lượng xanh lam trên nền đen, hoà trộn cộng sáng.
    #   lông trắng → sáng xanh lam/trắng, mảng xám → xanh đậm mờ, nét mực đen → trong suốt (khe tối giữa các vệt sáng)
    a = np.array(canvas).astype(float)
    lum = a[..., :3].mean(2) / 255 * (a[..., 3] / 255)
    t = np.clip((lum - 0.18) / 0.82, 0, 1) ** 1.25
    stops = [(0.0, (8, 40, 60)), (0.35, (30, 120, 160)), (0.65, (90, 200, 220)), (0.85, (170, 240, 245)), (1.0, (245, 255, 255))]
    col = np.zeros(t.shape + (3,))
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        m = (t >= x0) & (t <= x1)
        k = ((t - x0) / (x1 - x0))[m][:, None]
        col[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    alpha = np.clip(t * 1.15, 0, 1)
    sharp = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
    glow = np.array(sharp.filter(ImageFilter.GaussianBlur(4))).astype(float)
    glow[..., :3] = (60, 190, 230)
    glow[..., 3] *= 0.9
    canvas = Image.fromarray(glow.astype(np.uint8), 'RGBA')
    canvas.alpha_composite(sharp)
    canvas.save(os.path.join(ROOT, 'public', 'vfx', 'tiger_head.png'))
    pv = Image.new('RGBA', (canvas.width + 20, canvas.height + 20), (16, 14, 26, 255))
    pv.alpha_composite(canvas, (10, 10))
    pv.save(os.path.join(OUT, 'tiger_fx_preview.png'))
    print('ok', canvas.size)


if __name__ == '__main__':
    main()
