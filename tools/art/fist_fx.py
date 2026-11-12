"""
BĂNG SƠN QUYỀN — hiệu ứng dựng theo 2 ảnh mẫu (tools/art/ref/bang_quyen_shock_ref.jpg, bang_quyen_crack_ref.jpg).

Mẫu 1 (đòn thường — chấn động ra xung quanh): một ĐĨA sáng nằm trên mặt đất (nhìn chéo), viền ngoài vàng rực, lòng đĩa
  cam trong, các VẾT NỨT tỏa thẳng từ tâm + vài vòng tròn mảnh đồng tâm, tâm nóng trắng; bụi cát bung xòe lên hai bên,
  một tia sáng mảnh dựng thẳng ở tâm, đá vụn văng.
Mẫu 2 (thức tỉnh — thêm một đợt địa chấn nứt vỡ): MẠNG VẾT NỨT phát sáng vàng (ô đá vỡ kiểu tổ ong) loang ra từ tâm,
  sáng ở giữa, mờ dần ra ngoài; một cột sáng lửa vàng bốc lên; đá vỡ bay.
Màu giữ như mẫu: trắng vàng → vàng → cam → nâu cam. Mọi hình đối xứng quanh tâm nên dùng chung mọi hướng.

  python3 -I tools/art/fist_fx.py → public/vfx/fist_{disc,dust,crack,pillar,mask}.png + tools/art/out/fist_fx_preview.png
"""
import math
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
K = 0.62                       # mặt đất nhìn chéo: trục dọc co còn 62%
SS = 2
STOPS = [(0.00, (90, 30, 6)), (0.30, (190, 80, 12)), (0.55, (250, 150, 30)), (0.78, (255, 210, 80)), (1.00, (255, 252, 225))]


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def to_img(inten, alpha, w, h, glow=0):
    col = ramp(inten)
    rgba = np.dstack([col, np.clip(alpha, 0, 1)[..., None] * 255]).reshape(h, SS, w, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    img = Image.fromarray(np.clip(np.dstack([prem / np.maximum(am, 1e-3), am]), 0, 255).astype(np.uint8), 'RGBA')
    if glow:
        g = img.filter(ImageFilter.GaussianBlur(glow))
        ga = np.array(g).astype(float)
        ga[..., 3] *= 0.8
        out = Image.fromarray(ga.astype(np.uint8), 'RGBA')
        out.alpha_composite(img)
        return out
    return img


def ground(w, h):
    """toạ độ mặt đất (đã trải trục dọc) chuẩn hoá: r = 1 ở mép đĩa"""
    Y, X = np.mgrid[0:h * SS, 0:w * SS].astype(float)
    u = (X + 0.5) / (w * SS) * 2 - 1
    v = ((Y + 0.5) / (h * SS) * 2 - 1)
    u, v = u * 1.08, v * 1.08
    return np.hypot(u, v), np.arctan2(v, u)


def disc(w=512):
    h = int(w * K)
    r, th = ground(w, h)
    rng = np.random.default_rng(7)
    rim = np.zeros_like(r)                                   # bỏ viền tròn ngoài (theo góp ý)
    edge = np.clip((1 - r) / 0.35, 0, 1) ** 1.2              # mép ngoài mờ dần, không thành đường tròn
    fill = edge * (0.30 + 0.1 * (1 - r))
    # vết nứt thẳng tỏa từ tâm: nhiều tia góc ngẫu nhiên, mảnh dần ra ngoài, hơi gãy khúc
    cracks = np.zeros_like(r)
    for ang in rng.uniform(0, 2 * math.pi, 46):
        jag = 0.006 * np.sin(r * 23 + ang * 5)                      # gần như thẳng, chỉ gãy nhẹ
        d = np.abs(np.sin(th - ang - jag)) * np.maximum(r, 0.05)
        width = 0.004 + 0.010 * (1 - r)
        cracks = np.maximum(cracks, np.exp(-(d / width) ** 2) * (np.cos(th - ang) > 0) * (r < 0.96) * rng.uniform(0.5, 1))
    rings = np.zeros_like(r)                                 # bỏ các vòng tròn đồng tâm
    cracks = cracks * edge
    hot = np.exp(-(r / 0.16) ** 2)
    # bỏ các vết nứt thẳng (theo góp ý): lòng đĩa chỉ còn quầng sáng cam loang mềm + vân khói nhẹ cho khỏi phẳng
    swirl = 0.5 + 0.5 * np.sin(th * 7 + r * 9) * np.sin(th * 3 - r * 5)
    fill = fill * (0.75 + 0.5 * swirl)
    inten = np.clip(0.35 + 0.65 * np.maximum(hot, 0.35 * swirl * edge), 0, 1)
    alpha = np.clip(fill + hot, 0, 1) * (r < 1.0)
    return to_img(inten, alpha, w, h, glow=4)


def dust(w=360, h=220):
    """bụi cát bung xòe lên hai bên (nhìn ngang), gốc ở giữa đáy"""
    Y, X = np.mgrid[0:h * SS, 0:w * SS].astype(float)
    x = (X + 0.5) / (w * SS) * 2 - 1
    y = 1 - (Y + 0.5) / (h * SS)                     # 0 = đáy … 1 = đỉnh
    ang = np.arctan2(y + 0.02, x)                    # 0 = phải, π/2 = thẳng lên
    rr = np.hypot(x, y * 1.2)
    rng = np.random.default_rng(3)
    rays = np.zeros_like(x)
    for a0 in np.concatenate([rng.uniform(0.25, 1.15, 9), rng.uniform(1.99, 2.9, 9)]):
        rays = np.maximum(rays, np.exp(-((ang - a0) / 0.05) ** 2) * rng.uniform(0.4, 1))
    body = rays * np.clip(rr / 0.25, 0, 1) * np.clip(1 - rr, 0, 1) ** 1.3
    alpha = np.clip(body * 1.4, 0, 1) * 0.85
    inten = 0.45 + 0.4 * body
    img = to_img(inten, alpha, w, h)
    return img.filter(ImageFilter.GaussianBlur(2.5))


def crack(w=560):
    """mạng vết nứt tổ ong phát sáng (Voronoi) loang từ tâm, nhìn chéo"""
    h = int(w * K)
    r, th = ground(w, h)
    rng = np.random.default_rng(11)
    n = 150
    pr = np.sqrt(rng.uniform(0, 1, n)) * 1.05
    pa = rng.uniform(0, 2 * math.pi, n)
    px, py = pr * np.cos(pa), pr * np.sin(pa)
    gx, gy = r * np.cos(th), r * np.sin(th)
    d = np.stack([(gx - px[i]) ** 2 + (gy - py[i]) ** 2 for i in range(n)])
    d.sort(axis=0)
    edge = np.sqrt(d[1]) - np.sqrt(d[0])                  # ~0 ở đường ranh giữa 2 ô
    width = 0.010 + 0.016 * np.clip(1 - r, 0, 1)
    lines = np.exp(-(edge / width) ** 2)
    # vài vết nứt chính tỏa từ tâm, sáng + dày hơn
    main = np.zeros_like(r)
    for ang in rng.uniform(0, 2 * math.pi, 9):
        jag = 0.03 * np.sin(r * 11 + ang * 3)
        dd = np.abs(np.sin(th - ang - jag)) * r
        main = np.maximum(main, 0.8 * np.exp(-(dd / (0.007 + 0.012 * (1 - r))) ** 2) * (np.cos(th - ang) > 0) * (r < 0.85))
    fade = np.clip(1 - r / 1.0, 0, 1) ** 0.9
    hot = np.exp(-(r / 0.22) ** 2)
    a = np.clip(np.maximum(lines * 0.9, main) * fade * 1.3 + hot * 0.5, 0, 1)
    inten = np.clip(0.5 + 0.5 * np.maximum(main, hot) + 0.25 * lines * fade, 0, 1)
    return to_img(inten, a, w, h, glow=5)


def pillar(w=140, h=300):
    """cột sáng lửa vàng bốc lên (nhìn ngang), gốc ở giữa đáy, loe ra ở chân, mờ dần lên trên"""
    Y, X = np.mgrid[0:h * SS, 0:w * SS].astype(float)
    x = (X + 0.5) / (w * SS) * 2 - 1
    y = 1 - (Y + 0.5) / (h * SS)
    width = 0.24 + 0.7 * np.exp(-y / 0.18) + 0.06 * np.sin(y * 19)
    wave = 0.08 * np.sin(y * 9 + 1.2) * y
    d = np.abs(x - wave) / width
    core = np.clip(1 - d, 0, 1)
    alpha = core ** 1.2 * np.clip(1 - y, 0, 1) ** 1.1 * np.clip(y / 0.06, 0, 1) * 0.9   # chân cột mờ, không cắt cứng
    inten = 0.45 + 0.55 * core ** 2
    return to_img(inten, alpha, w, h, glow=8)


def mask(w=256):
    """mặt nạ lan ra: đĩa (nhìn chéo) đặc ở giữa, MÉP MỀM ~30% → phóng to dần để lộ hiệu ứng từ tâm ra ngoài"""
    h = int(w * K)
    r, _ = ground(w, h)
    a = np.clip((1.0 - r) / 0.3, 0, 1) ** 1.5
    return to_img(np.ones_like(r), a, w, h)


def main():
    os.makedirs(OUT, exist_ok=True)
    imgs = {'disc': disc(), 'dust': dust(), 'crack': crack(), 'pillar': pillar(), 'mask': mask()}
    for k, im in imgs.items():
        im.save(os.path.join(ROOT, 'public', 'vfx', f'fist_{k}.png'))
    pv = Image.new('RGBA', (1600, 380), (20, 18, 24, 255))
    x = 10
    for k in ('disc', 'dust', 'crack', 'pillar'):  # (mask không cần xem)
        pv.alpha_composite(imgs[k], (x, 10))
        x += imgs[k].width + 10
    pv.save(os.path.join(OUT, 'fist_fx_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
