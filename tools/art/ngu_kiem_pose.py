"""
Tư thế thi triển NGỰ KIẾM THUẬT (vẽ điểm ảnh trên khung đứng của nhân vật) — bản thử 2 hướng S, E.

  python3 -I tools/art/ngu_kiem_pose.py → tools/art/out/ngu_kiem_pose.png (khung 52x68: hàng S, E × cột [tư thế 1, tư thế 2])
                                           + tools/art/out/ngu_kiem_pose_preview.png (phóng to, đặt cạnh khung đứng gốc)

Tư thế 1: tay phải cầm kiếm NGƯỢC (phản thủ) — lưỡi dựng đứng vuông góc mặt đất, nằm sau cẳng tay;
          tay trái kết KIẾM ẤN trước ngực (ngón trỏ + ngón giữa duỗi thẳng, 3 ngón còn lại nắm chặt).
Tư thế 2: tay phải giữ nguyên; tay trái duỗi thẳng ra trước song song mặt đất, bàn tay vẫn kết kiếm ấn.
Kiếm vẽ ở đây chỉ để xem dáng — trong game gắn kiếm đúng loại + cấp ở điểm cầm.
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
    # tay phải (bên trái người xem): giữ nguyên, nắm tay cầm kiếm ngược — lưỡi dựng sau cánh tay, lộ phía trên vai
    sword_vertical(pen, 15, 17, 28)                         # mũi ngang tai, phần dưới khuất sau tay áo
    pen.rows(14, 37, """
oGGGo
""", PAL)
    pen.rows(14, 42, """
.oho
.oGo
..o.
""", PAL)
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
        # kiếm ấn trước ngực: cẳng tay chéo từ khuỷu vào giữa ngực, 2 ngón duỗi thẳng lên
        pen.rows(24, 25, """
..oo.oo......
..oaoao......
..oaoao......
.oabbbao.....
.oaabbcdo....
.ocbbcddo....
..ocdddunno..
...ounnuwxyoo
....onuwxxyyo
.....owxxyzo.
......oyyzo..
""", PAL)
    else:
        # tay trái duỗi ra trước (chéo nhẹ về phía người xem): ống tay áo rộng → cổ tay xanh → bàn tay, 2 ngón chĩa ra
        pen.rows(32, 28, """
.ooooo.......
owwxxyoo.....
owxxxyyyoo...
oxxyyyyzznoo.
.oyyyzzznubbo
..oyzzznubbaao
...ooooonuccao
........ooddao
.........oaao.
..........oo..
""", PAL)
    return im


# ---------------------------------------------------------------- hướng E (nhìn ngang sang phải)
def pose_e(n):
    im = frame('e')
    pen = Pen(im)
    # tay phải (phía gần): buông, nắm tay ở (26..29, 41..44) cầm kiếm ngược; lưỡi dựng sau cẳng tay (lệch về sau)
    sleeve = lambda xx, yy: 30 <= yy <= 40 and 21 <= xx <= 29        # khuất sau tay áo + cẳng tay
    sword_vertical(pen, 23, 19, 41, hidden=sleeve)                     # mũi ngang tai, lưỡi nằm dọc sau cẳng tay
    pen.rows(25, 40, """
oGGo
""", PAL)
    pen.rows(26, 45, """
oho
oGo
.o.
""", PAL)
    if n == 1:
        # kiếm ấn trước ngực: bàn tay trái hiện trước ngực, 2 ngón duỗi thẳng lên
        pen.rows(33, 26, """
.oo....
.oao...
.oaoo..
.oaoao.
oubbao.
nubcbdo
nucddo.
.oooo..
""", PAL)
    else:
        # tay trái duỗi thẳng ra trước, song song mặt đất: tay áo rộng rủ xuống dưới cánh tay → cổ tay xanh → bàn tay → 2 ngón chĩa thẳng
        pen.rows(32, 27, """
.oooooooooooooo......
owwwxxxxxyyynuooooo..
owxxxxxxyyyynubbaaaao
oxyyyyyyzzzznubccaaao
oxyyyyzzzzzoonuddooo.
.oyyzzzzzoo...oooo...
..ozzzzoo............
...oooo..............
""", PAL)
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
