"""
Sheet RA ĐÒN của nhân vật trong trận (tư thế thường), vẽ CÁNH TAY MỚI trên 8 hình đứng đã duyệt (tools/art/out/hero_b_base_*.png).

  python3 -I tools/art/attack_battle.py   → public/ui/hero_b_atk.png (8 hàng hướng × 10 cột, khung 52x68)
                                            + src/config/heroAttack.ts (vị trí bàn tay / góc cánh tay theo khung)
                                            + tools/art/out/hero_b_atk_preview.gif

Cột 0..5  = VUNG (kiếm, đao): giơ tay lấy đà ra sau-lên → chém vòng qua trước → vung theo đà → thu về.
Cột 6..9  = KÉO CUNG: tay trái duỗi đẩy cung về hướng mục tiêu, tay phải kéo dây về sát vai → giữ → buông.
Cách vẽ: gỡ cánh tay đang buông khỏi hình (vá chỗ trống bằng màu áo cùng hàng), rồi vẽ lại cánh tay từ VAI:
tay áo trắng phồng thu nhỏ dần → cổ tay áo sẫm → nắm tay màu da; đổ bóng theo hướng sáng trên-trái; viền 1px.
Hướng nhìn thẳng (s / n) cánh tay đưa về phía camera nên ngắn lại (phối cảnh). Tay khuất (w / nw tay phải) vẽ SAU thân.
Hướng ra đòn = hướng nhân vật quay mặt (nhân vật quay về phía mục tiêu khi ra đòn).
"""
import math
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
W, H = 52, 68
AIM = {'s': 90, 'sw': 135, 'w': 180, 'nw': 225, 'n': 270, 'ne': 315, 'e': 0, 'se': 45}
FORE = {'s': 0.5, 'n': 0.5, 'e': 1.0, 'w': 1.0, 'se': 0.8, 'sw': 0.8, 'ne': 0.8, 'nw': 0.8}   # co phần dọc hướng nhìn
ARM_LEN = 12.5
OUTLINE = (18, 14, 28)
SLEEVE = [(127, 127, 144), (197, 197, 211), (235, 230, 233)]
CUFF = [(26, 26, 40), (38, 39, 61)]
SKIN = [(165, 127, 107), (221, 178, 153), (245, 205, 180)]

# Vai + vùng cánh tay đang buông (x0, y0, x1, y1) cần gỡ; None = tay khuất (không gỡ, vẽ sau thân)
ARMS = {
    's': {'R': ((18, 29), (12, 27, 21, 44)), 'L': ((34, 29), (32, 27, 41, 44))},
    'se': {'R': ((20, 31), (13, 29, 24, 47)), 'L': ((32, 29), (29, 28, 37, 38))},
    'e': {'R': ((26, 31), (21, 29, 31, 47)), 'L': ((24, 30), None)},
    'ne': {'R': ((31, 31), (27, 29, 37, 46)), 'L': ((25, 30), None)},
    'n': {'R': ((34, 29), (32, 27, 41, 44)), 'L': ((18, 29), (12, 27, 21, 44))},
    'nw': {'R': ((32, 30), None), 'L': ((21, 30), (15, 28, 25, 46))},
    'w': {'R': ((26, 30), None), 'L': ((25, 31), (19, 29, 30, 47))},
    'sw': {'R': ((20, 27), (14, 24, 23, 40)), 'L': ((32, 29), (29, 27, 39, 47))},
}
# tay nằm SAU thân (phía xa camera)
BEHIND = {'R': {'w', 'nw'}, 'L': {'e', 'ne'}}


def unit(deg):
    a = math.radians(deg)
    return math.cos(a), math.sin(a)


def arm_vec(d, deg, length=ARM_LEN):
    """Vector vai → bàn tay trên màn hình, có co phối cảnh theo hướng nhìn"""
    ux, uy = unit(deg)
    ax, ay = unit(AIM[d])
    along = ux * ax + uy * ay
    f = FORE[d]
    vx, vy = ux + ax * along * (f - 1), uy + ay * along * (f - 1)
    return vx * length, vy * length


def erase_and_patch(img, box):
    """Gỡ vùng cánh tay; điểm bị gỡ nằm GIỮA thân (cùng hàng còn điểm đặc hai bên) được vá bằng màu điểm gần nhất phía trong"""
    x0, y0, x1, y1 = box
    a = img[:, :, 3] > 0
    gone = np.zeros_like(a)
    gone[y0:y1, x0:x1] = a[y0:y1, x0:x1]
    out = img.copy()
    out[gone] = 0
    keep = a & ~gone
    lum = img[:, :, :3].astype(int) @ np.array([30, 59, 11]) // 100
    patched = np.zeros_like(a)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not gone[y, x]:
                continue
            left = [xx for xx in range(x - 1, -1, -1) if keep[y, xx]]
            right = [xx for xx in range(x + 1, W) if keep[y, xx]]
            if not (left and right):
                continue
            # lấy màu từ phía TRONG thân (về giữa x = 26), bỏ qua điểm viền tối
            inward = right if x < 26 else left
            src = next((xx for xx in inward if lum[y, xx] > 60), inward[0])
            out[y, x] = img[y, src]
            patched[y, x] = True
    # làm mịn chỗ vá: mỗi điểm vá lấy màu xuất hiện nhiều nhất trong 3x3 quanh nó
    sm = out.copy()
    for y, x in zip(*np.where(patched)):
        cols = {}
        for yy in range(max(0, y - 1), min(H, y + 2)):
            for xx in range(max(0, x - 1), min(W, x + 2)):
                if out[yy, xx, 3]:
                    k = tuple(out[yy, xx, :3])
                    cols[k] = cols.get(k, 0) + 1
        if cols:
            sm[y, x, :3] = max(cols, key=cols.get)
    return sm


def draw_arm(canvas, sh, hand, pull=False):
    """Vẽ cánh tay từ vai sh tới bàn tay hand lên canvas (RGBA numpy)"""
    sx, sy = sh
    hx, hy = hand
    dx, dy = hx - sx, hy - sy
    L = max(1e-3, math.hypot(dx, dy))
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    for y in range(H):
        for x in range(W):
            px, py = x + 0.5 - sx, y + 0.5 - sy
            t = (px * ux + py * uy) / L
            v = px * nx + py * ny
            col = None
            if -0.15 <= t <= 0.86:
                r = 3.1 - 0.9 * max(0, t)                      # tay áo phồng ở vai, thu dần
                if t > 0.74:
                    r = 2.2
                if abs(v) <= r:
                    lit = (nx * -0.7 + ny * -0.7) * (1 if v < 0 else -1)   # mặt hướng về trên-trái sáng hơn
                    if t > 0.74:
                        col = CUFF[1] if lit > 0 else CUFF[0]
                    else:
                        e = r - abs(v)
                        col = SLEEVE[2] if (lit > 0 and e > 0.6) else SLEEVE[1] if e > 0.8 else SLEEVE[0]
            if math.hypot(x + 0.5 - hx, y + 0.5 - hy) <= 1.9:
                d2 = (x + 0.5 - hx) * -0.7 + (y + 0.5 - hy) * -0.7
                col = SKIN[2] if d2 > 0.4 else SKIN[1] if d2 > -0.6 else SKIN[0]
            if col:
                canvas[y, x, :3] = col
                canvas[y, x, 3] = 255


def outline(img):
    a = img[:, :, 3] > 0
    pad = np.pad(a, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    edge = nb & ~a
    img[edge, :3] = OUTLINE
    img[edge, 3] = 255
    return img


def lerp_ang(a, b, t):
    d = (b - a + 540) % 360 - 180
    return a + d * t


REST_HAND = {'s': (16, 40), 'se': (19, 43), 'e': (27, 43), 'ne': (33, 41), 'n': (36, 40), 'nw': (34, 37), 'w': (27, 41), 'sw': (17, 36)}


def swing_angles(d):
    """Góc cánh tay (độ) cho 6 khung vung; tay phải của nhân vật nằm ở phía aim + 90°"""
    aim = AIM[d]
    sh, rh = ARMS[d]['R'][0], REST_HAND[d]
    rest = math.degrees(math.atan2(rh[1] - sh[1], rh[0] - sh[0]))
    def mix(*parts):
        x = sum(w * math.cos(math.radians(g)) for g, w in parts)
        y = sum(w * math.sin(math.radians(g)) for g, w in parts)
        return math.degrees(math.atan2(y, x))
    # lấy đà: lên + ra sau + về phía tay phải · chém: qua trước, hơi cao · kết: xuống-trước, chéo sang phía tay trái
    wind = mix((aim + 180, 0.8), (270, 1.3), (aim + 90, 0.6))
    mid = mix((aim, 1.0), (270, 0.3))
    end = mix((aim, 0.6), (90, 1.0), (aim - 90, 0.6))
    w2m = (mid - wind + 540) % 360 - 180
    return [lerp_ang(rest, wind, 0.55), wind, wind + w2m * 0.5, mid, end, lerp_ang(end, rest, 0.5)]


def main():
    cols = 10
    sheet = np.zeros((H * len(DIRS), W * cols, 4), np.uint8)
    ts = {}
    frames_by = {}
    for r, d in enumerate(DIRS):
        base = np.array(Image.open(os.path.join(HERE, 'out', f'hero_b_base_{d}.png')).convert('RGBA'))
        arms = ARMS[d]
        (rsh, rbox), (lsh, lbox) = arms['R'], arms['L']
        body_r = erase_and_patch(base, rbox) if rbox else base
        body_rl = erase_and_patch(body_r, lbox) if lbox else body_r
        info = {'swing': [], 'draw': []}
        frames = []
        # ---- vung
        for ang in swing_angles(d):
            vx, vy = arm_vec(d, ang)
            hand = (rsh[0] + vx, rsh[1] + vy)
            canvas = np.zeros((H, W, 4), np.uint8)
            behind = d in BEHIND['R'] and ang != swing_angles(d)[3] and ang != swing_angles(d)[4]
            if behind:
                draw_arm(canvas, rsh, hand)
                m = body_r[:, :, 3] > 0
                canvas[m] = body_r[m]
            else:
                canvas = body_r.copy()
                draw_arm(canvas, rsh, hand)
            frames.append(outline(canvas))
            info['swing'].append([round(hand[0], 1), round(hand[1], 1), round(math.degrees(math.atan2(vy, vx)), 1), 0 if behind else 1])
        # ---- kéo cung: tay trái duỗi về hướng mục tiêu, tay phải kéo dây về vai (0: nâng, 1-2: kéo căng, 3: buông)
        aim = AIM[d]
        ax, ay = arm_vec(d, aim)
        for k, pull in enumerate([0.35, 0.9, 1.0, 0.2]):
            lhand = (lsh[0] + ax, lsh[1] + ay)
            # tay phải: từ chỗ dây cung (gần tay trái) kéo dần về vai phải
            sx_, sy_ = lhand[0] - ax * 0.25, lhand[1] - ay * 0.25
            rhand = (sx_ + (rsh[0] + ax * 0.15 - sx_) * pull, sy_ + (rsh[1] + ay * 0.15 - sy_) * pull)
            canvas = np.zeros((H, W, 4), np.uint8)
            back = [s for s in ('L', 'R') if d in BEHIND[s]]
            for side, sh, hd in (('L', lsh, lhand), ('R', rsh, rhand)):
                if side in back:
                    draw_arm(canvas, sh, hd)
            m = body_rl[:, :, 3] > 0
            canvas[m] = body_rl[m]
            for side, sh, hd in (('L', lsh, lhand), ('R', rsh, rhand)):
                if side not in back:
                    draw_arm(canvas, sh, hd)
            frames.append(outline(canvas))
            info['draw'].append([round(lhand[0], 1), round(lhand[1], 1), round(rhand[0], 1), round(rhand[1], 1), 0 if 'L' in back else 1])
        for c, fr in enumerate(frames):
            sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = fr
        frames_by[d] = frames
        ts[d] = info
    Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'public', 'ui', 'hero_b_atk.png'))
    lines = ['// TỰ SINH bởi tools/art/attack_battle.py — đừng sửa tay.',
             '// Hoạt ảnh ra đòn trên hero_b_atk.png (khung 52x68). swing: 6 khung vung kiếm / đao — [tay phải x, y, góc cánh tay (độ), trước thân 1/0].',
             '// draw: 4 khung kéo cung — [tay trái x, y (giữ cung), tay phải x, y (kéo dây), tay trái trước thân 1/0].',
             'export const HERO_ATTACK: Record<string, { swing: number[][]; draw: number[][] }> = {']
    for d in DIRS:
        lines.append(f"  {d}: {{ swing: {ts[d]['swing']}, draw: {ts[d]['draw']} }},")
    lines.append('};')
    lines.append('export const ATTACK_COLS = { swing: 0, draw: 6, total: 10 };')
    open(os.path.join(ROOT, 'src', 'config', 'heroAttack.ts'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    # xem trước: mỗi hướng 1 hàng, phóng 3 lần
    S = 3
    pv = Image.new('RGBA', (W * cols * S, H * len(DIRS) * S), (36, 58, 112, 255))
    pv.alpha_composite(Image.fromarray(sheet, 'RGBA').resize((W * cols * S, H * len(DIRS) * S), Image.NEAREST))
    pv.save(os.path.join(HERE, 'out', 'hero_b_atk_preview.png'))
    print('→ public/ui/hero_b_atk.png · src/config/heroAttack.ts')


main()
