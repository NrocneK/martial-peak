"""
NGỰ KIẾM — hướng E: giữ NGUYÊN thân + tay phải của khung đứng gốc (hero_b_walk.png, hàng E),
chỉ vẽ lại tay trái theo đúng điểm ảnh của bản chép ảnh mẫu E (out/ngu_kiem_trace_e1/e2.png, chép bằng trace_ref.py).

Nhìn ngang sang phải thì tay trái ở PHÍA XA, nên chỉ phần nhô ra khỏi mép ngực/mặt mới lộ ra:
  - lấy điểm ảnh tay trái của bản chép (cùng cỡ điểm ảnh với sprite), dời theo mặt (mặt mẫu ↔ mặt sprite)
  - chỉ chép những điểm nằm trước mép thân của khung gốc (mép phải từng hàng) → tay nằm sau thân một cách tự nhiên
  - riêng bàn tay ở tư thế 1 (đưa lên trước miệng) chép trọn vì nó ở trước mặt

  python3 -I tools/art/ngu_kiem_e.py → tools/art/out/ngu_kiem_e.png (2 khung 52x68) + ngu_kiem_e_preview.png
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}

# Tư thế 1 — bản chép mẫu ở vùng tay bị nhiễu (lưới ảnh AI không đều), nên chép lại sạch theo đúng
# hình + màu của bàn tay và tay áo trong bản chép (x0 = 32): 2 ngón dựng trước miệng, lòng bàn tay ngang cằm,
# cổ tay áo xanh đậm, cẳng tay chéo xuống khuỷu, tay áo trắng rộng rủ phía trước.
POSE1 = [
    (22, 33, '0YS0'),
    (23, 33, '0bP0'),
    (24, 33, '0bS00'),
    (25, 32, '0bbSI0'),
    (26, 32, '0IYbbS0.000'),
    (27, 32, '0bbIbS00dZ0'),
    (28, 32, '0SSIS10deX0'),
    (29, 33, '0SPb0deeaU0'),
    (30, 33, '0B9KK0eeZU0'),
    (31, 34, '0KKN0ceXU0'),
    (32, 35, '0NK0cXWU0'),
    (33, 36, '00ZXWU0'),
    (34, 37, '0UUW0'),
    (35, 38, '000'),
]

# (ảnh chép, vùng tay trái trong ảnh chép, độ dời x, độ dời y, vùng bàn tay chép trọn)
POSES = {
    1: ('ngu_kiem_trace_e1.png', (52, 26, 66, 40), -19, -4, (52, 26, 58, 35)),
    2: ('ngu_kiem_trace_e2.png', (50, 23, 69, 34), -22, -4, None),
}


def frame_e():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 6 * H, 7 * W, 7 * H))


def front(im):
    """mép phải (điểm đục xa nhất) của thân ở từng hàng"""
    px = im.load()
    out = {}
    for y in range(H):
        xs = [x for x in range(W) if px[x, y][3]]
        out[y] = max(xs) if xs else -1
    return out


def pose(n):
    if n == 1:
        im = frame_e()
        px = im.load()
        for y, x0, row in POSE1:
            for i, ch in enumerate(row):
                if ch != '.':
                    px[x0 + i, y] = PAL[ch]
        return im
    src_name, (x0, y0, x1, y1), dx, dy, hand = POSES[n]
    src = Image.open(os.path.join(OUT, src_name)).convert('RGBA')
    sp = src.load()
    im = frame_e()
    px = im.load()
    fr = front(im)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = sp[x, y]
            if not c[3]:
                continue
            X, Y = x + dx, y + dy
            if not (0 <= X < W and 0 <= Y < H):
                continue
            in_hand = hand and hand[0] <= x < hand[2] and hand[1] <= y < hand[3]
            if in_hand or X >= fr[Y]:
                px[X, Y] = c
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_e.png'))
    Z = 8
    ims = [frame_e(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_e_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
