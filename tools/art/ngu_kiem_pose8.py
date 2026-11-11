"""
Tư thế thi triển NGỰ KIẾM đủ 8 hướng (bản giản lược ở cỡ sprite 52x68) — tay phải giữ dáng đứng gốc.
  Tư thế 1: tay trái kết kiếm ấn trước miệng.   Tư thế 2: tay trái duỗi thẳng ra trước, vẫn kết kiếm ấn.

  E, SE : ghép cánh tay trái cắt từ ảnh mẫu (ngu_kiem_pose_ref.py)
  W, SW : lật gương lớp tay của E, SE rồi khớp lại theo mặt
  S     : vẽ tay (ngu_kiem_pose.py)
  N, NE, NW: nhìn từ sau lưng — tay trái phần lớn bị thân che, chỉ lộ tay áo / bàn tay ló ra

  python3 -I tools/art/ngu_kiem_pose8.py → public/ui/hero_cast_ngukiem.png (hàng = s,sw,w,nw,n,ne,e,se; cột = tư thế 1, 2)
                                           + tools/art/out/ngu_kiem_pose8_preview.png
"""
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ngu_kiem_pose as hp            # noqa: E402
import ngu_kiem_pose_ref as rp        # noqa: E402

W, H = 52, 68
DIRS = hp.DIRS
ROOT = hp.ROOT
OUT = hp.OUT
PAL = hp.PAL


def frame(d):
    return hp.frame(d)


def overlay(base, comp):
    """lớp điểm ảnh khác nhau giữa khung đã ghép tay và khung gốc"""
    a, b = np.array(base), np.array(comp)
    m = (a != b).any(2)
    o = np.zeros_like(b)
    o[m] = b[m]
    return Image.fromarray(o)


def erase_skin(im, box, fill):
    """xóa bàn tay buông (điểm da) trong vùng box, tô lại bằng màu vạt áo"""
    px = im.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b, a = px[x, y]
            if a and r > 150 and r - b > 40:
                px[x, y] = fill


def pose_e(n):
    return rp.compose(n, frame('e'))


def pose_se(n):
    base = frame('se')
    erase_skin(base, (31, 37, 40, 46), hp.SL3)       # bàn tay trái đang buông bên phải người xem
    return rp.compose(n, base, dx=0 if n == 1 else -2)


def mirrored(src_dir, dst_dir, n, fn, dx):
    """lật lớp tay của hướng nguồn sang hướng đối xứng"""
    b = frame(src_dir)
    if src_dir == 'se':
        erase_skin(b, (31, 37, 40, 46), hp.SL3)
    ov = overlay(b, fn(n)).transpose(Image.FLIP_LEFT_RIGHT)
    ov = ov.transform(ov.size, Image.AFFINE, (1, 0, -dx, 0, 1, 0))
    dst = frame(dst_dir)
    if dst_dir == 'sw':
        erase_skin(dst, (11, 37, 22, 46), hp.SL3)
    dst.alpha_composite(ov)
    return dst


def pose_back(d, n):
    """N / NE / NW: lưng quay về người xem"""
    im = frame(d)
    pen = hp.Pen(im)
    if d == 'n':
        erase_skin(im, (12, 37, 19, 42), hp.RB2)
        if n == 1:   # khuỷu tay trái nhô ra bên hông (tay đang đưa lên trước miệng)
            pen.rows(11, 27, """
..ooo.
.owxyo
owxyzo
owyzzo
.ozzo.
..oo..
""", PAL)
        else:        # tay duỗi thẳng ra trước: chỉ thấy vai áo nâng lên
            pen.rows(11, 25, """
..oooo
.owxxy
owxyyz
.ozzzo
..oo..
""", PAL)
        return im
    # NE / NW: vẽ cho NE rồi lật cho NW
    if n == 1:
        pen.rows(8, 27, """
..ooo.
.owxyo
owxyzo
owyzzo
.ozzo.
..oo..
""", PAL)
    else:
        # bàn tay kết ấn ló ra bên phải đầu, cẳng tay bó xanh chéo lên
        pen.rows(32, 16, """
...o.o.
..oaobo
..oacbo
.oaacbo
.obbcdo
.ognddo
onnvoo.
nnvo...
""", PAL)
    return im


def build():
    rows = {}
    for n in (1, 2):
        rows.setdefault('e', {})[n] = pose_e(n)
        rows.setdefault('se', {})[n] = pose_se(n)
        rows.setdefault('w', {})[n] = mirrored('e', 'w', n, pose_e, 1)
        rows.setdefault('sw', {})[n] = mirrored('se', 'sw', n, pose_se, 1)
        rows.setdefault('s', {})[n] = hp.pose_s(n)
        rows.setdefault('n', {})[n] = pose_back('n', n)
        ne = pose_back('ne', n)
        rows.setdefault('ne', {})[n] = ne
        ov = overlay(frame('ne'), ne).transpose(Image.FLIP_LEFT_RIGHT)
        nw = frame('nw')
        # khớp NW theo thân: thân NE x 6..36, NW x 16..46 → lật rồi giữ nguyên (đối xứng quanh tâm khung)
        nw.alpha_composite(ov)
        rows.setdefault('nw', {})[n] = nw
    sheet = Image.new('RGBA', (W * 2, H * 8), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for n in (1, 2):
            sheet.alpha_composite(rows[d][n], (W * (n - 1), H * r))
    return sheet


def main():
    sheet = build()
    sheet.save(os.path.join(ROOT, 'public', 'ui', 'hero_cast_ngukiem.png'))
    Z = 4
    pv = Image.new('RGBA', (8 * (W * Z + 6) + 6, 3 * H * Z + 20), (28, 52, 112, 255))
    for i, d in enumerate(DIRS):
        x = 6 + i * (W * Z + 6)
        pv.alpha_composite(frame(d).resize((W * Z, H * Z), Image.NEAREST), (x, 6))
        for n in (1, 2):
            pv.alpha_composite(sheet.crop((W * (n - 1), H * i, W * n, H * i + H)).resize((W * Z, H * Z), Image.NEAREST), (x, 6 + n * H * Z + 4 * n))
    pv.save(os.path.join(OUT, 'ngu_kiem_pose8_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
