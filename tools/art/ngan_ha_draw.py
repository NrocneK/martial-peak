"""
NGÂN HÀ HÀN LƯU — VẼ MỚI (không cắt ghép), theo ảnh mẫu tools/art/ref/ngan_ha_beam_ref.jpg:
  tia băng thẳng (lõi trắng + quầng lam), các sợi khí xoắn quanh thân tia, cổng phát = vòng sáng lớn nhìn nghiêng
  (mặt vòng vuông góc với tia) + điểm loé; vòng nhỏ tách riêng (game cho trôi dọc tia), điểm chạm = loé sáng + tia lửa băng.
  Tia nằm ngang (đầu trái → phải), game xoay theo hướng bắn.
  · ngan_ha_core.png   256×64  lõi + quầng (lặp ngang liền mạch → TileSprite, không kéo giãn)
  · ngan_ha_strand.png 256×64  3 sợi khí xoắn (lặp ngang liền mạch, game cuộn → sợi chảy dọc tia)
  · ngan_ha_ring.png   256×256 cổng phát, tâm ảnh = điểm phát tia
  · ngan_ha_ring_s.png 48×112  vòng nhỏ trôi dọc tia rồi mờ dần
  · ngan_ha_missile.png 192×48 tên lửa truy kích (đầu thoi vân điện + đuôi thuôn), vẽ theo mẫu
  · ngan_ha_snow.png   32×32   hoa tuyết nhỏ (vụn khi băng vỡ)
  · ngan_ha_hit.png    128×128 điểm chạm, tâm ảnh = điểm chạm
  · khối băng đóng băng: tách từ ảnh mẫu → tools/art/ngan_ha_ice.py
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
    save(rgba([(band * 0.9, BLUE), (rim * 0.5, CYAN), (fill, BLUE),
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


def ring_s():
    """vòng nhỏ trôi dọc tia (tách khỏi cổng phát): elip đứng, tâm ảnh = tâm vòng"""
    W, H = 48, 112
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    x, y = xx - W / 2, yy - H / 2
    d = np.sqrt((x / 13) ** 2 + (y / 44) ** 2)
    side = np.clip(1 - 0.4 * x / 13, 0.5, 1.4)
    rim = np.exp(-((d - 1) / 0.07) ** 2) * side
    halo = np.exp(-((d - 1) / 0.22) ** 2) * side
    save(rgba([(rim * 0.8, CYAN), (halo * 0.35, BLUE)], (H, W)), 'ngan_ha_ring_s.png')


def missile():
    """tên lửa truy kích theo mẫu: đầu hình thoi sáng (vân điện trắng bên trong) + đuôi mảnh thuôn dài phía sau.
    Bay sang PHẢI; mũi ở x≈178, tâm đầu ở x=150 → game đặt gốc (0.78, 0.5)"""
    from PIL import ImageDraw, ImageFilter
    W, H = 192, 48
    cy = (H - 1) / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    y = yy - cy
    hx, hl, hh = 150, 28, 11
    d = np.abs(xx - hx) / hl + np.abs(y) / hh                            # thoi
    body = np.clip(1 - d, 0, 1) ** 0.6
    glow = np.exp(-(np.maximum(d - 0.7, 0) / 0.45) ** 2) * (d < 3)
    halo = np.exp(-((xx - hx) ** 2 / (2 * 16 ** 2) + y ** 2 / (2 * 7 ** 2)))
    # đuôi: nêm mảnh từ sau đầu kéo dài về trái, mờ dần
    u = np.clip((xx - 8) / (hx - 14 - 8), 0, 1)                          # 0 ở cuối đuôi → 1 sát đầu
    w = 0.8 + 5.5 * u ** 1.6
    blend = np.clip((hx + 6 - xx) / 26, 0, 1)                           # đuôi hoà dần vào đầu, không có đường cắt
    tail = np.exp(-(y / w) ** 2) * u ** 1.3 * blend
    tail_core = np.exp(-(y / (w * 0.35)) ** 2) * u ** 2 * blend
    wisp = np.exp(-((y - 2.5 * u) / (w * 0.6)) ** 2) * u ** 2.2 * 0.5 * blend   # làn khí phụ lệch nhẹ
    # vân điện trắng trong đầu
    S = 4
    cr = Image.new('L', (W * S, H * S), 0)
    dr = ImageDraw.Draw(cr)
    rng = np.random.default_rng(5)
    for _ in range(5):
        px, py = hx - hl * 0.7, cy + rng.uniform(-3, 3)
        pts = [(px * S, py * S)]
        while px < hx + hl * 0.75:
            px += rng.uniform(5, 9)
            py = cy + rng.uniform(-1, 1) * hh * 0.6 * (1 - abs(px - hx) / hl)
            pts.append((px * S, py * S))
        dr.line(pts, fill=255, width=S)
    crack = np.array(cr.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))).astype(float) / 255
    crack *= (d < 0.92)
    win = np.clip(np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]) / 8, 0, 1)   # tắt hẳn trước mép → không lộ khung
    halo, glow = halo * win, glow * win
    save(rgba([(halo * 0.35, BLUE), (glow * 0.6, BLUE), (body * 0.55, CYAN), (crack * 0.9, WHITE),
               (tail * 0.55, CYAN), (wisp * 0.8, BLUE), (tail_core * 0.6, WHITE)], (H, W)), 'ngan_ha_missile.png')


def snow():
    """hoa tuyết nhỏ 6 cánh (vụn khi băng vỡ)"""
    from PIL import ImageDraw, ImageFilter
    N, S = 32, 8
    im = Image.new('L', (N * S, N * S), 0)
    dr = ImageDraw.Draw(im)
    c = N * S / 2
    R = 13 * S
    for i in range(6):
        a = i * np.pi / 3 - np.pi / 2
        ux, uy = np.cos(a), np.sin(a)
        dr.line([(c, c), (c + ux * R, c + uy * R)], fill=255, width=int(1.6 * S))
        for t, ln in ((0.45, 0.32), (0.72, 0.22)):                       # nhánh chữ V
            bx, by = c + ux * R * t, c + uy * R * t
            for s in (-1, 1):
                b = a + s * np.pi / 3
                dr.line([(bx, by), (bx + np.cos(b) * R * ln, by + np.sin(b) * R * ln)], fill=255, width=int(1.2 * S))
    dr.ellipse([c - 2.2 * S, c - 2.2 * S, c + 2.2 * S, c + 2.2 * S], fill=255)
    line = np.array(im.resize((N, N), Image.LANCZOS)).astype(float) / 255
    g = np.array(im.resize((N, N), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6))).astype(float) / 255
    save(rgba([(g * 0.7, CYAN), (line, WHITE)], (N, N)), 'ngan_ha_snow.png')


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
    put('ngan_ha_missile.png', 300, 260)
    put('ngan_ha_snow.png', 560, 270)
    put('ngan_ha_ring_s.png', 640, 230)
    pv.save(os.path.join(OUT, 'ngan_ha_draw_preview.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    core(); strand(); ring(); ring_s(); missile(); snow(); hit(); preview()
