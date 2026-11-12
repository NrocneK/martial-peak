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
CROP = (215, 395, 915, 1275)          # chỉ phần đầu hổ (bỏ dải mực xoáy quanh)
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
    img = Image.fromarray(rgba, 'RGBA').crop(CROP)
    # mép mềm 1px để khỏi răng cưa + mờ dần ra rìa theo hình elip (khung cắt không để lại cạnh thẳng)
    al = np.array(img.getchannel('A').filter(ImageFilter.GaussianBlur(1.2))).astype(float)
    hh, ww = al.shape
    yy, xx = np.mgrid[0:hh, 0:ww].astype(float)
    rr = np.hypot((xx - ww / 2) / (ww / 2), (yy - hh * 0.47) / (hh * 0.53))
    al *= np.clip((1.0 - rr) / 0.3, 0, 1) ** 1.2           # mờ dần rất rộng → không thấy rìa
    img.putalpha(Image.fromarray(al.astype(np.uint8)))
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
    canvas.save(os.path.join(ROOT, 'public', 'vfx', 'tiger_head.png'))
    pv = Image.new('RGBA', (canvas.width + 20, canvas.height + 20), (28, 26, 40, 255))
    pv.alpha_composite(canvas, (10, 10))
    pv.save(os.path.join(OUT, 'tiger_fx_preview.png'))
    print('ok', canvas.size)


if __name__ == '__main__':
    main()
