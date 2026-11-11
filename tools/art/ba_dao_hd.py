"""
BÁ ĐAO — vết chém vòng đao khí dùng ẢNH GỐC (tools/art/ref/ba_dao_ring_ref.png = vết chém hướng SE), dựng đủ 8 hướng.

1) Tách nền: ảnh là hiệu ứng tự phát sáng trên nền xám G≈(38,38,38). Mỗi điểm được "gỡ" khỏi nền:
     sáng hơn nền → alpha = độ vượt nền lớn nhất / (255 − G), màu = G + (c − G)/alpha   (phần sáng + quầng tím)
     tối hơn nền  → alpha = (G − c)/G, màu tối gốc                                       (khói đao khí đen)
2) Không xoay cả ảnh (vòng đang nằm nghiêng trên mặt đất, xoay sẽ dựng vòng lên → sai phối cảnh). Thay vào đó
   trải vòng theo góc trên elip của nó rồi CUỘN cho nhát chém sáng (đang ở ~45° = SE) trượt tới hướng cần:
     E 0° · SE 45° · S 90° · SW 135° · W 180° · NW 225° · N 270° · NE 315°   (góc màn hình, y hướng xuống)
   Bù phối cảnh: bề dày vòng nhân theo f(θ) = 1 + 0.35·sinθ (mép trước dày, mép sau mỏng) — chia f nguồn, nhân f đích.
3) Thu về 256 px (cạnh dài), lưu public/vfx/ba_dao_slash_<hướng>.png (nền trong suốt).

  python3 -I tools/art/ba_dao_hd.py → public/vfx/ba_dao_slash_*.png + tools/art/out/ba_dao_hd_preview.png
"""
import math
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
G = 38.0
CX, CY, A, B = 216.0, 236.0, 172.0, 122.0      # elip của vòng trong ảnh mẫu (đo theo đường bao)
SRC_DEG = 45.0                                  # nhát chém trong ảnh mẫu nằm ở hướng SE
DIRS = {'e': 0, 'se': 45, 's': 90, 'sw': 135, 'w': 180, 'nw': 225, 'n': 270, 'ne': 315}
SIZE = 256


def unblend(img):
    c = img.astype(float)
    up = np.clip((c - G) / (255 - G), 0, 1).max(2)
    dn = np.clip((G - 6 - c) / G, 0, 1).min(2) * 1.6     # tối hẳn đều cả 3 kênh mới là khói đen
    alpha = np.maximum(up, dn)
    col = np.where(up[..., None] >= dn[..., None],
                   G + (c - G) / np.maximum(up, 1e-3)[..., None],
                   c * 0.6)
    a = np.clip((alpha - 0.10) / 0.90, 0, 1)               # bỏ quầng nền mờ
    # chỉ giữ dải vòng (trong hệ elip): ngoài dải là nền / quầng → trong suốt, mép mềm
    h, w = c.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    r = np.hypot((xx - CX) / A, (yy - CY) / B)
    a *= np.clip((0.30 - np.abs(r - 0.97)) / 0.10, 0, 1)
    out = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
    return out


def sample(img, x, y):
    """lấy mẫu song tuyến (RGBA đã nhân alpha để không viền tối)"""
    h, w = img.shape[:2]
    outside = (x < 0) | (y < 0) | (x > w - 1.001) | (y > h - 1.001)     # ngoài ảnh nguồn → trong suốt
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    p = img.astype(float)
    p[..., :3] *= p[..., 3:4] / 255
    v = (p[y0, x0] * (1 - fx) * (1 - fy) + p[y0, x0 + 1] * fx * (1 - fy)
         + p[y0 + 1, x0] * (1 - fx) * fy + p[y0 + 1, x0 + 1] * fx * fy)
    a = np.maximum(v[..., 3:4], 1e-3)
    v[..., :3] = v[..., :3] * 255 / a
    v[outside] = 0
    return np.clip(v, 0, 255).astype(np.uint8)


def f(th):
    return 1 + 0.35 * np.sin(th)


def roll(rgba, deg):
    h, w = rgba.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    u, v = (xx - CX) / A, (yy - CY) / B
    r = np.hypot(u, v)
    th = np.arctan2(v, u)
    d = math.radians(deg - SRC_DEG)
    ths = th - d
    rs = 1 + (r - 1) * f(ths) / f(th)
    return sample(rgba, CX + A * rs * np.cos(ths), CY + B * rs * np.sin(ths))


def main():
    os.makedirs(OUT, exist_ok=True)
    src = np.array(Image.open(os.path.join(HERE, 'ref', 'ba_dao_ring_ref.png')).convert('RGB'))
    rgba = unblend(src)
    outs = {}
    for name, deg in DIRS.items():
        im = Image.fromarray(rgba if deg == SRC_DEG else roll(rgba, deg), 'RGBA')
        bb = im.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox()
        im = im.crop(bb)
        k = SIZE / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'public', 'vfx', f'ba_dao_slash_{name}.png'))
        outs[name] = im
    # xem thử: lưới 3×3 theo hướng, nhân vật ở giữa
    cell = 300
    pv = Image.new('RGBA', (cell * 3, cell * 3), (26, 24, 40, 255))
    pos = {'nw': (0, 0), 'n': (1, 0), 'ne': (2, 0), 'w': (0, 1), 'e': (2, 1), 'sw': (0, 2), 's': (1, 2), 'se': (2, 2)}
    for name, (cxg, cyg) in pos.items():
        im = outs[name]
        pv.alpha_composite(im, (cxg * cell + (cell - im.width) // 2, cyg * cell + (cell - im.height) // 2))
    hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
    hero = hero.resize((104, 136), Image.NEAREST)
    pv.alpha_composite(hero, (cell + (cell - 104) // 2, cell + (cell - 136) // 2))
    pv.save(os.path.join(OUT, 'ba_dao_hd_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
