"""
NGỰ KIẾM — hướng S, 2 khung, dựng từ bản chép ảnh mẫu (tools/art/out/ngu_kiem_trace_s.png, chép bằng trace_ref.py).

  khung 1 = bản chép mẫu (tay trái dựng trước ngực), bỏ bóng đổ dưới chân.
  khung 2 = tay trái duỗi thẳng về phía người xem (vẽ lại từng điểm ảnh trên khung 1):
            - xóa cẳng tay + bàn tay của khung 1, vá lại ngực bằng nửa ngực đối xứng bên kia (thân đối xứng quanh x = 33)
            - bắp tay áo trắng ở vai giữ nguyên (chỉ cẳng tay quay ra trước)
            - cẳng tay chĩa thẳng vào người xem nên co ngắn lại: chỉ thấy MIỆNG ỐNG TAY ÁO (vòng tối) sau cổ tay
            - bàn tay dựng đứng, lòng bàn tay hướng người xem; dùng đúng 5 màu da + viền của bàn tay trong mẫu

  python3 -I tools/art/ngu_kiem_s.py → tools/art/out/ngu_kiem_s.png (2 khung) + _s_preview.png
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}
CX2 = 66                     # trục đối xứng thân: x' = 66 - x  (giữa mặt ở x = 33)


def load():
    im = Image.open(os.path.join(OUT, 'ngu_kiem_trace_s.png')).convert('RGBA')
    px = im.load()
    # bỏ bóng đổ: các điểm màu bóng (xanh tối) ở dải chân trở xuống, nằm ngoài đôi giày
    shadow = {PAL['7'][:3], PAL['9'][:3], PAL['A'][:3]}
    for y in range(62, im.height):
        for x in range(im.width):
            if px[x, y][3] and px[x, y][:3] in shadow and not (24 <= x <= 44 and y <= 69 and _boot_near(px, x, y)):
                px[x, y] = (0, 0, 0, 0)
    return im


def _boot_near(px, x, y):
    """giữ viền tối sát giày (màu nâu I/C/P) để giày không bị hở"""
    boot = {PAL[k][:3] for k in 'ICP8'}
    return any(px[x + dx, y + dy][:3] in boot and px[x + dx, y + dy][3]
               for dx in (-1, 0, 1) for dy in (-1, 0, 1))


def paint(im, x0, y0, rows):
    px = im.load()
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == ' ':
                continue
            px[x0 + i, y0 + j] = (0, 0, 0, 0) if ch == '.' else PAL[ch]


def pose2(f1):
    im = f1.copy()
    px = im.load()
    # 1) vá ngực: vùng tay của khung 1 (x 31..38, y 26..38) ← nửa ngực đối xứng
    for y in range(26, 39):
        for x in range(31, 39):
            sx = CX2 - x
            px[x, y] = px[sx, y]
    # nối mép trong của bắp tay áo trắng bị hở sau khi bỏ cẳng tay
    paint(im, 38, 33, [
        '0Z',
        '0Z',
        '0U',
        '0W',
        '00',
    ])
    # 2) miệng ống tay áo (cẳng tay chĩa thẳng vào người xem nên co lại thành vòng): viền tay áo trắng, lòng ống tối
    #    (vòng nằm SAU bàn tay — chỉ lộ vành dưới và hai bên)
    paint(im, 31, 31, [
        '   00000   ',
        '  0eeddZ0  ',
        ' 0e96669U0 ',
        '0ad96669UW0',
        '0aZ96669WX0',
        ' 0ZUUUWWX0 ',
        '  0000000  ',
    ])
    # 3) bàn tay ở gần người xem nên to hơn khung 1: dựng đứng, lòng bàn tay hướng ra trước,
    #    4 ngón khép (khe ngón màu da tối I), ngón cái chìa về phía ngực
    paint(im, 32, 25, [
        '  00 00  ',
        ' 0YbIbY0 ',
        ' 0bbIbb0 ',
        '00bbbbbb0',
        '0Yb0bbbV0',
        '0bYbbbbV0',
        ' 0bbbbVI0',
        ' 0IbbVVI0',
        '  0IVVI0 ',
        '   0000  ',
    ])
    return im


def main():
    f1 = load()
    f2 = pose2(f1)
    w, h = f1.size
    sheet = Image.new('RGBA', (w * 2, h), (0, 0, 0, 0))
    sheet.alpha_composite(f1, (0, 0))
    sheet.alpha_composite(f2, (w, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_s.png'))
    Z = 8
    pv = Image.new('RGBA', (w * 2 * Z + 30, h * Z + 20), (28, 52, 112, 255))
    pv.alpha_composite(f1.resize((w * Z, h * Z), Image.NEAREST), (10, 10))
    pv.alpha_composite(f2.resize((w * Z, h * Z), Image.NEAREST), (20 + w * Z, 10))
    pv.save(os.path.join(OUT, 'ngu_kiem_s_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
