"""
NGỰ KIẾM — hướng N (quay lưng hẳn): giữ NGUYÊN thân + tay phải của khung đứng gốc, chỉ sửa tay trái.

Tay trái ở bên trái người xem: bắp tay áo phồng x13-19 / y29-34, cẳng tay + bàn tay buông x14-19 / y35-41.
Nhân vật quay lưng nên khi tay trái đưa ra TRƯỚC thì cẳng tay + bàn tay bị thân che khuất:
  khung 1 (đưa tay lên trước miệng): bắp tay vẫn buông ở vai, khuỷu gập → chỉ còn thấy đầu khuỷu dưới tay áo
  khung 2 (duỗi thẳng ra trước):     cả bắp tay cũng vung ra trước → tay áo ở vai co ngắn lại, phần dưới khuất hẳn
Chỗ tay cũ để lại: tô trong suốt (ngoài thân) và viền lại mép lưng (x19).

  python3 -I tools/art/ngu_kiem_n.py → tools/art/out/ngu_kiem_n.png (2 khung) + ngu_kiem_n_preview.png
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}

# ' ' giữ nguyên, '.' trong suốt, còn lại = màu bảng sprite
POSE = {
    1: [
        (35, 14, '.2662'),       # đầu khuỷu (cẳng tay áo tối) ló dưới bắp tay áo
        (36, 14, '..22.2'),
        (37, 14, '.....2'),
        (38, 13, '......2'),
        (39, 13, '......2'),
        (40, 13, '......2'),
        (41, 14, '....2'),
    ],
    2: [
        (33, 12, '.2222222'),    # mép dưới tay áo ở vai (bắp tay đã vung ra trước)
        (34, 13, '......2'),
        (35, 14, '.....2'),
        (36, 14, '.....2'),
        (37, 14, '.....2'),
        (38, 13, '......2'),
        (39, 13, '......2'),
        (40, 13, '......2'),
        (41, 14, '....2'),
    ],
}


def frame():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 4 * H, 7 * W, 5 * H))


def pose(n):
    im = frame()
    px = im.load()
    for y, x0, row in POSE[n]:
        for i, ch in enumerate(row):
            if ch != ' ':
                px[x0 + i, y] = (0, 0, 0, 0) if ch == '.' else PAL[ch]
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_n.png'))
    Z = 8
    ims = [frame(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_n_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
