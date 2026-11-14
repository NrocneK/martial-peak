"""
NGÂN HÀ HÀN LƯU — VẼ MỚI (không cắt ghép), theo ảnh mẫu tools/art/ref/ngan_ha_beam_ref.jpg:
  tia băng thẳng (lõi trắng + quầng lam), các sợi khí xoắn quanh thân tia, cổng phát = vòng sáng lớn nhìn nghiêng
  (mặt vòng vuông góc với tia) + điểm loé + 2 vòng nhỏ dọc tia, điểm chạm = loé sáng + tia lửa băng.
  Tia nằm ngang (đầu trái → phải), game xoay theo hướng bắn.
  · ngan_ha_core.png   256×64  lõi + quầng (lặp ngang liền mạch → TileSprite, không kéo giãn)
  · ngan_ha_strand.png 256×64  3 sợi khí xoắn (lặp ngang liền mạch, game cuộn → sợi chảy dọc tia)
  · ngan_ha_ring.png   256×256 cổng phát, tâm ảnh = điểm phát tia
  · ngan_ha_hit.png    128×128 điểm chạm, tâm ảnh = điểm chạm
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


def preview():
    bg = (26, 24, 40)
    pv = Image.new('RGB', (760, 300), bg)

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
    pv.save(os.path.join(OUT, 'ngan_ha_draw_preview.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    core(); strand(); ring(); hit(); preview()
