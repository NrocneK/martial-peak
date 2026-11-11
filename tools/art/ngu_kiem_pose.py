"""
Tư thế thi triển NGỰ KIẾM THUẬT (vẽ điểm ảnh trên khung đứng của nhân vật) — bản thử 2 hướng S, E.

  python3 -I tools/art/ngu_kiem_pose.py → tools/art/out/ngu_kiem_pose.png (khung 52x68: hàng S, E × cột [tư thế 1, tư thế 2])
                                           + tools/art/out/ngu_kiem_pose_preview.png (phóng to, đặt cạnh khung đứng gốc)

Tay phải: tạm giữ nguyên dáng đứng gốc (theo yêu cầu).
Tư thế 1: tay trái kết KIẾM ẤN dựng trước ngực/mặt (ngón trỏ + ngón giữa duỗi thẳng, 3 ngón còn lại nắm chặt).
Tư thế 2: tay trái duỗi thẳng ra trước song song mặt đất, bàn tay vẫn kết kiếm ấn (tham khảo tools/art/ref).
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
W, H = 52, 68

# bảng màu lấy từ sprite gốc
OL = (18, 14, 28, 255)          # viền
OL2 = (4, 4, 11, 255)
SK1, SK2, SK3, SK4 = (245, 205, 180, 255), (221, 178, 153, 255), (193, 151, 129, 255), (165, 127, 107, 255)   # da: sáng → tối
SL1, SL2, SL3, SL4 = (242, 240, 246, 255), (223, 221, 228, 255), (197, 197, 211, 255), (156, 158, 177, 255)   # tay áo trắng
CF1, CF2, CF3 = (79, 100, 151, 255), (59, 73, 118, 255), (38, 39, 61, 255)                                    # cổ tay áo xanh đậm
RB1, RB2 = (53, 65, 105, 255), (32, 33, 50, 255)                                                              # vạt áo tối
# kiếm (chỉ để xem dáng)
BL1, BL2, BLO = (236, 242, 252, 255), (176, 188, 212, 255), (40, 44, 72, 255)
GD1, GD2 = (232, 184, 72, 255), (150, 100, 36, 255)
GR = (110, 30, 40, 255)


def frame(d):
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    r = DIRS.index(d)
    return sh.crop((6 * W, r * H, 7 * W, r * H + H))


class Pen:
    def __init__(self, im):
        self.im = im
        self.px = im.load()

    def p(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.p(x, y, c)

    def get(self, x, y):
        return self.px[x, y]

    def rows(self, x0, y0, art, pal):
        """vẽ theo lưới chữ: mỗi ký tự = 1 điểm ('.' = bỏ qua)"""
        for j, line in enumerate(art.strip('\n').split('\n')):
            for i, ch in enumerate(line):
                if ch != '.':
                    self.p(x0 + i, y0 + j, pal[ch])


# bàn tay kết KIẾM ẤN (to, rõ như mẫu): 2 ngón trỏ + giữa duỗi thẳng lên (tách nhau bằng nét viền), 3 ngón nắm lại
HAND = """
..o.o...
.oaobo..
.oacbo..
.oacbo..
oaacbbo.
oabbccdo
obccddo.
.odddo..
"""

PAL = {'o': OL, 'O': OL2, 'a': SK1, 'b': SK2, 'c': SK3, 'd': SK4, 'w': SL1, 'x': SL2, 'y': SL3, 'z': SL4,
       'u': CF1, 'v': CF2, 'n': CF3, 'r': RB1, 'R': RB2, 'B': BL1, 'C': BL2, 'k': BLO, 'g': GD1, 'G': GD2, 'h': GR}


def sword_vertical(pen, x, y_tip, y_guard, hidden=None):
    """kiếm dựng đứng mũi hướng lên: lưỡi 2 điểm (x, x+1) có viền, khâu ngang, chuôi + núm dưới nắm tay"""
    hidden = hidden or (lambda xx, yy: False)
    for yy in range(y_tip, y_guard):
        for xx, c in ((x - 1, BLO), (x, BL1), (x + 1, BL2), (x + 2, BLO)):
            if yy == y_tip and xx in (x - 1, x + 2):
                continue
            if not hidden(xx, yy):
                pen.p(xx, yy, c)
    pen.p(x, y_tip - 1, BLO)
    pen.p(x + 1, y_tip - 1, BLO)


# ---------------------------------------------------------------- hướng S (nhìn thẳng)
def pose_s(n):
    im = frame('s')
    pen = Pen(im)
    # tay phải: giữ nguyên dáng đứng gốc
    # tay trái (bên phải người xem): xóa cẳng tay + bàn tay đang buông, vá lại vạt áo
    for y in range(36, 43):
        for x in range(33, 40):
            if pen.get(x, y)[3]:
                pen.p(x, y, RB1 if x < 36 else (RB2 if x < 38 else OL))
    pen.rows(33, 36, """
rrRRo
rrRRo
rrRRo
rrRo.
rrRo.
rrRo.
rRo..
""", PAL)
    if n == 1:
        # kiếm ấn trước miệng (mẫu): cẳng tay chéo từ khuỷu (thấp, bên phải) lên tay ở cằm; tay áo trắng rủ dưới cẳng tay
        pen.rows(32, 24, """
.ognuo.....
.ounnvo....
..onnnvo...
..owwnnvo..
.owxxwnnvo.
.owxxxyyvno
.owxxyyyzoo
..oxyyyyzzo
..owxyyyzzo
...oxyyzzzo
...oyyzzzo.
....ozzzo..
.....ooo...
""", PAL)
        pen.rows(31, 16, HAND, PAL)
    else:
        # tay trái chĩa thẳng về phía người xem: bàn tay dựng 2 ngón, vòng vàng + cổ tay xanh, miệng tay áo trắng
        pen.rows(28, 28, """
oggGgGo.
ounnnno.
owxxyyo.
owxyyzzo
.oyzzzo.
..ooo...
""", PAL)
        pen.rows(28, 21, HAND, PAL)
    return im


# ---------------------------------------------------------------- hướng E (nhìn ngang sang phải)
def pose_e(n):
    im = frame('e')
    pen = Pen(im)
    # tay phải (phía gần): giữ nguyên dáng đứng gốc
    if n == 1:
        # theo mẫu: 2 ngón dựng trước miệng (đầu ngón ngang mũi), nắm tay ngang cằm;
        # cẳng tay chéo xuống khuỷu phía trước, tay áo trắng rộng rủ dưới cẳng tay
        pen.rows(33, 20, """
..ognuo......
..ounnvo.....
...onnnvo....
...owwnnvo...
..owxxwnnnvo.
..owxxxyyvnno
..owxxyyyzooo
...oxyyyyzzo.
...owxyyyzzo.
....oxyyzzzo.
....oyyzzzo..
.....ozzzo...
......ooo....
""", PAL)
        pen.rows(34, 13, HAND, PAL)
    else:
        # theo mẫu: tay duỗi thẳng ngang ngực — bắp tay áo trắng phồng rủ, cẳng tay bó xanh đậm, vòng vàng ở cổ tay,
        # bàn tay dựng đứng 2 ngón chỉ lên
        pen.rows(30, 23, """
.oooooooooooo
owwxxxyuuuuug
owxxxyyvvvvvG
oxyyyzznnnnnG
oxyyzzzoooooo
.oyzzzzo.....
..ozzzzo.....
...oooo......
""", PAL)
        pen.rows(43, 19, HAND, PAL)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0))
    for r, f in enumerate((pose_s, pose_e)):
        for c in (1, 2):
            sheet.alpha_composite(f(c), (W * (c - 1), H * r))
    sheet.save(os.path.join(OUT, 'ngu_kiem_pose.png'))
    S = 6
    pv = Image.new('RGBA', (W * 3 * S + 40, H * 2 * S + 20), (33, 58, 114, 255))
    for r, d in enumerate(('s', 'e')):
        pv.alpha_composite(frame(d).resize((W * S, H * S), Image.NEAREST), (10, 10 + r * H * S))
        for c in (0, 1):
            pv.alpha_composite(sheet.crop((W * c, H * r, W * c + W, H * r + H)).resize((W * S, H * S), Image.NEAREST), (10 + (c + 1) * (W * S + 10), 10 + r * H * S))
    ImageDraw.Draw(pv).text((14, 12), 'goc / tu the 1 / tu the 2', fill=(255, 230, 160))
    pv.save(os.path.join(OUT, 'ngu_kiem_pose_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
