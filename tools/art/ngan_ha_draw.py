"""
NGÂN HÀ HÀN LƯU — VẼ MỚI (không cắt ghép), theo ảnh mẫu tools/art/ref/ngan_ha_beam_ref.jpg:
  tia băng thẳng (lõi trắng + quầng lam), các sợi khí xoắn quanh thân tia, cổng phát = vòng sáng lớn nhìn nghiêng
  (mặt vòng vuông góc với tia) + điểm loé + 2 vòng nhỏ dọc tia, điểm chạm = loé sáng + tia lửa băng.
  Tia nằm ngang (đầu trái → phải), game xoay theo hướng bắn.
  · ngan_ha_core.png   256×64  lõi + quầng (lặp ngang liền mạch → TileSprite, không kéo giãn)
  · ngan_ha_strand.png 256×64  3 sợi khí xoắn (lặp ngang liền mạch, game cuộn → sợi chảy dọc tia)
  · ngan_ha_ring.png   256×256 cổng phát, tâm ảnh = điểm phát tia
  · ngan_ha_hit.png    128×128 điểm chạm, tâm ảnh = điểm chạm
  · ngan_ha_ice.png    160×176  khối băng đóng băng mục tiêu: tinh thể cắt mặt theo mẫu tools/art/ref/ngan_ha_ice_ref.jpg, gốc = đáy giữa (chân quái)
  python3 -I tools/art/ngan_ha_draw.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
BLUE = np.array([70, 140, 255.])
CYAN = np.array([150, 225, 255.])
WHITE = np.array([245, 250, 255.])


def rgba(layers, shape):
    """cộng các lớp (độ sáng, màu) → RGBA cộng sáng: độ đục = kênh sáng nhất"""
    acc = np.zeros(shape + (3,))
    for inten, col in layers:
        acc += inten[..., None] * col
    acc = np.clip(acc, 0, 255)
    A = acc.max(2) / 255
    col = acc / np.maximum(A[..., None], 1e-3)
    return np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8)


def save(arr, name):
    Image.fromarray(arr, 'RGBA').save(os.path.join(VFX, name))


def core():
    W, H = 256, 64
    y = np.arange(H) - (H - 1) / 2
    x = np.arange(W)
    ripple = 1 + 0.08 * np.sin(x / W * 2 * np.pi * 2)[None, :]          # nhịp sáng nhẹ dọc tia (chu kỳ chia hết 256)
    c = np.exp(-(y / 2.2) ** 2)[:, None] * ripple
    g1 = np.exp(-(y / 6.5) ** 2)[:, None] * ripple
    g2 = np.exp(-(y / 15) ** 2)[:, None] * np.ones((1, W))
    save(rgba([(c * 1.0, WHITE), (g1 * 0.75, CYAN), (g2 * 0.35, BLUE)], (H, W)), 'ngan_ha_core.png')


def strand():
    W, H = 256, 64
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cy = (H - 1) / 2
    out = np.zeros((H, W))
    for i, (amp, k, ph, w) in enumerate([(9, 2, 0.0, 1.1), (7, 2, 2.1, 0.9), (12, 1, 4.2, 1.0)]):
        th = xx / W * 2 * np.pi * k + ph
        yc = cy + amp * np.sin(th)
        front = 0.45 + 0.55 * (0.5 + 0.5 * np.cos(th))                   # nửa vòng xoắn phía trước sáng hơn
        out += np.exp(-((yy - yc) / w) ** 2) * front
    soft = np.zeros_like(out)
    for dy in range(-3, 4):
        soft += np.roll(out, dy, 0) * np.exp(-(dy / 2.0) ** 2)
    save(rgba([(out * 0.9, WHITE), (soft * 0.25, CYAN)], (H, W)), 'ngan_ha_strand.png')


def ring():
    N = 256
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    x, y = xx - N / 2, yy - N / 2
    rx, ry = 34, 92
    d = np.sqrt((x / rx) ** 2 + (y / ry) ** 2)
    side = np.clip(1 - 0.45 * x / rx, 0.4, 1.4)                         # mép phía sau sáng dày hơn (nhìn nghiêng)
    band = np.exp(-((d - 0.97) / 0.2) ** 2) * side
    rim = np.exp(-((d - 1.02) / 0.035) ** 2) * side
    fill = np.clip(1 - d, 0, 1) ** 0.6 * 0.12
    flare = np.exp(-(x ** 2 + y ** 2) / (2 * 4.5 ** 2))
    flare_g = np.exp(-(x ** 2 + y ** 2) / (2 * 16 ** 2))
    small = np.zeros_like(d)
    for ox, srx, sry in ((40, 8, 26), (72, 7, 21)):                      # 2 vòng nhỏ dọc tia
        ds = np.sqrt(((x - ox) / srx) ** 2 + (y / sry) ** 2)
        small += np.exp(-((ds - 1) / 0.07) ** 2)
    rng = np.random.default_rng(7)
    sparks = np.zeros_like(d)
    for _ in range(26):                                                  # vụn sáng quanh vòng
        a = rng.uniform(0, 2 * np.pi)
        rr = rng.uniform(1.05, 1.3)
        px, py = np.cos(a) * rx * rr, np.sin(a) * ry * rr
        ln = rng.uniform(3, 7)
        ang = a + rng.uniform(-0.4, 0.4)
        ux, uy = np.cos(ang), np.sin(ang)
        along = (x - px) * ux + (y - py) * uy
        off = -(x - px) * uy + (y - py) * ux
        sparks += np.exp(-(off / 0.9) ** 2) * np.clip(1 - np.abs(along) / ln, 0, 1) * rng.uniform(0.5, 1)
    save(rgba([(band * 0.9, BLUE), (rim * 0.5, CYAN), (fill, BLUE), (small * 0.55, CYAN),
               (sparks * 0.9, CYAN), (flare * 1.2, WHITE), (flare_g * 0.6, CYAN)], (N, N)), 'ngan_ha_ring.png')


def hit():
    N = 128
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    x, y = xx - N / 2, yy - N / 2
    r2 = x ** 2 + y ** 2
    flare = np.exp(-r2 / (2 * 4 ** 2))
    glow = np.exp(-r2 / (2 * 13 ** 2))
    rng = np.random.default_rng(3)
    sparks = np.zeros_like(x)
    for _ in range(16):
        a = rng.uniform(0, 2 * np.pi)
        r0, ln = rng.uniform(8, 16), rng.uniform(8, 24)
        ux, uy = np.cos(a), np.sin(a)
        along = x * ux + y * uy - r0
        off = -x * uy + y * ux
        sparks += np.exp(-(off / 0.8) ** 2) * np.clip(1 - np.abs(along - ln / 2) / (ln / 2), 0, 1) * rng.uniform(0.5, 1)
    save(rgba([(flare * 1.3, WHITE), (glow * 0.7, CYAN), (sparks, CYAN)], (N, N)), 'ngan_ha_hit.png')


def ice():
    """khối băng kiểu tinh thể cắt mặt (theo ảnh mẫu tools/art/ref/ngan_ha_ice_ref.jpg, mẫu D/E):
    1 khối chính cao nhọn lệch + các mảnh tinh thể dựng quanh chân + vụn băng toả ra đất.
    Mỗi mảnh chia 2 mặt dọc sống (mặt trái sáng – mặt phải tối, nguồn sáng trên-trái), vệt sáng chéo, viền sáng."""
    from PIL import ImageDraw, ImageFilter
    S = 4
    W, H = 160, 176
    BASE = 168
    col_img = Image.new('RGB', (W * S, H * S), (0, 0, 0))
    a_img = Image.new('L', (W * S, H * S), 0)
    hl = Image.new('L', (W * S, H * S), 0)
    dc, da, dh = ImageDraw.Draw(col_img), ImageDraw.Draw(a_img), ImageDraw.Draw(hl)
    DARK = (38, 96, 214)
    MID = (58, 150, 238)
    LIGHT = (110, 214, 246)
    PALE = (176, 238, 252)

    def P(pts):
        return [(x * S, y * S) for x, y in pts]

    def mix(c1, c2, t):
        return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))

    def shard(cx, w, h, tilt, shoulder=0.7, lean=0.0, tone=0.5, alpha=225, by=BASE):
        """1 mảnh tinh thể: đáy rộng w, cao h, nghiêng tilt (rad); 2 mặt chia theo sống"""
        ux, uy = np.sin(tilt), -np.cos(tilt)
        px, py = np.cos(tilt), np.sin(tilt)
        hw = w / 2
        bl, br = (cx - px * hw, by - py * hw), (cx + px * hw, by + py * hw)
        sl = (cx + ux * h * shoulder - px * hw * 0.9, by + uy * h * shoulder - py * hw * 0.9)
        sr = (cx + ux * h * shoulder * 0.86 + px * hw * 0.85, by + uy * h * shoulder * 0.86 + py * hw * 0.85)
        tip = (cx + ux * h + px * hw * lean, by + uy * h + py * hw * lean)
        spine_b = (cx + px * hw * 0.15, by + py * hw * 0.15)
        left = [bl, sl, tip, spine_b]
        right = [spine_b, tip, sr, br]
        dc.polygon(P(left), fill=mix(MID, PALE, tone))
        dc.polygon(P(right), fill=mix(DARK, MID, tone))
        da.polygon(P([bl, sl, tip, sr, br]), fill=alpha)
        # mặt vát nhỏ sáng ở đỉnh trái
        cap = [sl, tip, (sl[0] * 0.45 + tip[0] * 0.55 + px * hw * 0.25, sl[1] * 0.45 + tip[1] * 0.55 + py * hw * 0.25)]
        dc.polygon(P(cap), fill=mix(LIGHT, PALE, 0.6 + tone * 0.4))
        # viền sáng + sống
        dh.line(P([bl, sl, tip]), fill=200, width=S)
        dh.line(P([tip, sr, br]), fill=90, width=S)
        dh.line(P([spine_b, tip]), fill=150, width=S)
        return (bl, sl, tip, sr, br)

    rng = np.random.default_rng(11)
    # khối phía sau (tối hơn)
    shard(104, 44, 92, 0.22, tone=0.15)
    shard(52, 40, 80, -0.25, tone=0.25)
    # KHỐI CHÍNH cao nhọn
    shard(82, 96, 156, 0.06, shoulder=0.62, lean=-0.35, tone=0.4, alpha=230)
    shard(70, 56, 118, -0.12, shoulder=0.7, lean=0.2, tone=0.65, alpha=230)       # khối phụ phía trước tạo mặt cắt
    # vệt sáng chéo trên khối chính (kiểu nét cọ ở mẫu D)
    for (x0, y0, x1, y1, w) in ((60, 132, 84, 36, 7), (94, 140, 104, 86, 4), (52, 156, 66, 112, 4), (104, 76, 96, 44, 3)):
        n = np.array([y1 - y0, x0 - x1], float); n /= np.hypot(*n)          # vệt thuôn 2 đầu (nét cọ)
        mx, my = (x0 * 0.4 + x1 * 0.6), (y0 * 0.4 + y1 * 0.6)
        q = [(x0, y0), (mx + n[0] * w / 2, my + n[1] * w / 2), (x1, y1), (mx - n[0] * w / 2, my - n[1] * w / 2)]
        dc.polygon(P(q), fill=mix(LIGHT, PALE, 0.5))
        dh.polygon(P(q), fill=60)
    # mảnh nhỏ phía trước quanh chân
    for cx, w, h, tilt, tone in ((40, 22, 50, -0.5, 0.6), (122, 20, 56, 0.45, 0.55), (62, 18, 36, -0.15, 0.8),
                                 (100, 18, 40, 0.2, 0.75), (24, 12, 26, -0.85, 0.7), (138, 12, 30, 0.8, 0.65)):
        shard(cx, w, h, tilt, shoulder=0.75, tone=tone, alpha=235)
    # vụn băng dưới đất toả ra (kiểu mẫu B)
    for cx, ln, tilt in ((10, 18, -1.25), (150, 20, 1.2), (30, 12, -1.0), (132, 13, 1.05), (9, 8, -1.4)):
        shard(cx, 5, ln, tilt, shoulder=0.85, tone=0.9, alpha=240)
    up = lambda im: im.resize((W, H), Image.LANCZOS)
    col = np.array(up(col_img)).astype(float)
    A = np.array(up(a_img)).astype(float) / 255
    e = np.array(up(hl)).astype(float) / 255
    g = np.array(up(hl).filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
    # nền màu đã nhân alpha khi thu nhỏ → chia lại để tránh viền đen
    cov = np.array(up(Image.fromarray((np.array(a_img) > 0).astype(np.uint8) * 255))).astype(float) / 255
    col = col / np.maximum(cov[..., None], 1e-3)
    col = col * (1 - e[..., None] * 0.8) + np.array([235, 250, 255.]) * e[..., None] * 0.8
    # hơi mờ dần xuống chân + chút sáng lan quanh viền
    yy = np.arange(H)[:, None] / H
    A = np.clip(A * (0.92 + 0.08 * yy) + g * 0.15, 0, 1)
    Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, 'ngan_ha_ice.png'))


def preview():
    bg = (26, 24, 40)
    pv = Image.new('RGB', (760, 380), bg)

    def put(name, x, y, w=None, tile=1):
        im = Image.open(os.path.join(VFX, name))
        if tile > 1:
            t = Image.new('RGBA', (im.width * tile, im.height))
            for i in range(tile):
                t.paste(im, (i * im.width, 0))
            im = t
        a = np.array(im).astype(float)
        base = np.array(pv.crop((x, y, x + im.width, y + im.height))).astype(float)
        o = np.clip(base + a[..., :3] * a[..., 3:] / 255, 0, 255)
        pv.paste(Image.fromarray(o.astype(np.uint8)), (x, y))
    put('ngan_ha_core.png', 128, 118, tile=2)
    put('ngan_ha_strand.png', 128, 118, tile=2)
    put('ngan_ha_ring.png', 0, 22)
    put('ngan_ha_hit.png', 576, 86)
    put('ngan_ha_ice.png', 590, 196)
    pv.save(os.path.join(OUT, 'ngan_ha_draw_preview.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    core(); strand(); ring(); hit(); ice(); preview()
