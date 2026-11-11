"""
NGỰ KIẾM — hướng NW (quay lưng, chéo lên trái): giữ NGUYÊN thân + tay phải của khung đứng gốc, chỉ sửa tay trái.

Tay trái ở PHÍA GẦN, bên trái người xem: bắp tay áo phồng x17-24 / y29-36, cẳng tay tối y36-39, bàn tay x18-21 / y40-43.
  Xóa cẳng tay + bàn tay buông, vá lại vạt áo phía sau (xanh đậm, mép viền trái).
  khung 1 (đưa tay lên trước miệng): bắp tay vẫn buông, cẳng tay gập ra trước bị thân che → chỉ còn đầu khuỷu
  khung 2 (duỗi thẳng ra trước = chếch lên trái, xa người xem): xóa cả bắp tay buông, vá hông;
           vẽ cánh tay giơ chếch lên trái: tay áo trắng phồng ở vai (vân nếp như tay áo gốc),
           cẳng tay áo tối (đúng các màu G B 5 7 của cẳng tay gốc), mu bàn tay ở đầu (màu da gốc b Y S)

  python3 -I tools/art/ngu_kiem_nw.py → tools/art/out/ngu_kiem_nw.png (2 khung) + ngu_kiem_nw_preview.png
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
# vá vạt áo sau khi bỏ cẳng tay + bàn tay buông (dùng chung 2 khung)
PATCH_LOWER = [
    (37, 18, '20HKKHEEF'),
    (38, 18, '20HKKHEEF'),
    (39, 17, '20HKKHEE'),
    (40, 17, '20HKKHE'),
    (41, 16, '20HKKHEE'),
    (42, 17, '20UKKHE'),
    (43, 17, '20UXKHO'),
]
# vá hông khi bắp tay cũng vung lên (khung 2)
PATCH_UPPER = [
    (29, 18, '20HKK'),
    (30, 18, '.20HKKHE'),
    (31, 18, '.20HKKHE'),
    (32, 17, '..20HKKHE'),
    (33, 16, '...20HKKHE'),
    (34, 16, '...20HKKHE'),
    (35, 16, '...20HKEHE'),
    (36, 17, '..20HKEEF'),
]
POSE = {
    1: PATCH_LOWER + [
        (37, 18, '29BB92'),      # đầu khuỷu ló dưới bắp tay áo
        (38, 19, '2222'),
    ],
    2: PATCH_LOWER + PATCH_UPPER + [
        # cánh tay giơ chếch lên trái (xa dần người xem): mu bàn tay → cẳng tay áo tối → tay áo trắng phồng gắn vào vai
        (12 + 0, 4, '  222              '),
        (12 + 1, 4, ' 2bbY2             '),
        (12 + 2, 4, ' 2bbY2             '),
        (12 + 3, 4, '2bbbbS2            '),
        (12 + 4, 4, '2YbbSS2            '),
        (12 + 5, 4, ' 2SSS52            '),
        (12 + 6, 4, ' 2GBB552           '),
        (12 + 7, 4, '  2GBB552          '),
        (12 + 8, 4, '   2GBB5522222     '),
        (12 + 9, 4, '    2GB52eeedd2    '),
        (12 + 10, 4, '     222eeeddcc2   '),
        (12 + 11, 4, '      2eeeddccZa2  '),
        (12 + 12, 4, '      2eddcccZaT2  '),
        (12 + 13, 4, '       2ddccZaT02  '),
        (12 + 14, 4, '        2dcZaT0    '),
        (12 + 15, 4, '         2ZZT0     '),
        (12 + 16, 4, '          220      '),
    ],
}


def frame():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 3 * H, 7 * W, 4 * H))


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
    sheet.save(os.path.join(OUT, 'ngu_kiem_nw.png'))
    Z = 8
    ims = [frame(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_nw_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
