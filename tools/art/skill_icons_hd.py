"""
ICON KỸ NĂNG HD (256x256) — dựng bằng hình học khoảng cách (SDF) + chiếu sáng + nhiễu, không vẽ tay từng điểm.

  python3 -I tools/art/skill_icons_hd.py [id ...]   → tools/art/out/skills_hd/<id>.png + tools/art/out/skills_hd/_sheet.png

Dựng ở 512x512 rồi thu về 256x256 (khử răng cưa). Mọi toạ độ thiết kế theo thang 0..256.
Vật liệu:
  metal  — kim loại: màu theo hướng pháp tuyến phản chiếu "trời / đất" (dải sáng gắt kiểu chrome) + đốm loá
  solid  — vật thể thường (gỗ, da, vải, giấy): khuếch tán + chút bóng, có thể phủ vân
  energy — năng lượng tự phát sáng: lõi trắng → màu → mép, kèm quầng sáng (bloom)
Lửa / sét / khói: nhiễu fbm uốn miền, đường gãy khúc phân dạng.
"""
import math
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'skills_hd')
S = 512                     # độ phân giải dựng
U = S / 256                 # 1 đơn vị thiết kế = U điểm ảnh dựng
YY, XX = np.mgrid[0:S, 0:S].astype(np.float32)
X = (XX + 0.5) / U
Y = (YY + 0.5) / U
RNG = np.random.default_rng(7)


# ============================================================== màu
def C(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def lerp(a, b, t):
    t = np.asarray(t, np.float32)
    return a + (b - a) * t[..., None] if t.ndim else a + (b - a) * t


def ramp(stops, t):
    """stops: [(vị trí, màu hex)] tăng dần; t: mảng 0..1 → ảnh màu"""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(1e-6, p1 - p0))[m]
        out[m] = C(c0) + (C(c1) - C(c0)) * k[:, None]
    return out


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ============================================================== SDF (đơn vị thiết kế; âm = bên trong)
def circle(cx, cy, r):
    return np.hypot(X - cx, Y - cy) - r


def ellipse(cx, cy, rx, ry, rot=0.0):
    c, s = math.cos(rot), math.sin(rot)
    x = (X - cx) * c + (Y - cy) * s
    y = -(X - cx) * s + (Y - cy) * c
    k = np.hypot(x / rx, y / ry)
    return (k - 1) * min(rx, ry)


def box(cx, cy, hw, hh, r=0.0, rot=0.0):
    c, s = math.cos(rot), math.sin(rot)
    x = np.abs((X - cx) * c + (Y - cy) * s) - hw + r
    y = np.abs(-(X - cx) * s + (Y - cy) * c) - hh + r
    return np.hypot(np.maximum(x, 0), np.maximum(y, 0)) + np.minimum(np.maximum(x, y), 0) - r


def seg(x0, y0, x1, y1, r0, r1=None):
    """đoạn thẳng dày (bán kính r0 → r1, đầu tròn)"""
    r1 = r0 if r1 is None else r1
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1
    t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
    return np.hypot(X - (x0 + dx * t), Y - (y0 + dy * t)) - (r0 + (r1 - r0) * t)


def poly(pts):
    p = np.asarray(pts, np.float32).reshape(-1, 2)
    d = np.full(X.shape, 1e9, np.float32)
    inside = np.zeros(X.shape, bool)
    for i in range(len(p)):
        a, b = p[i], p[i - 1]
        e = b - a
        wx, wy = X - a[0], Y - a[1]
        t = np.clip((wx * e[0] + wy * e[1]) / (e @ e + 1e-9), 0, 1)
        d = np.minimum(d, np.hypot(wx - e[0] * t, wy - e[1] * t))
        cond = ((Y >= a[1]) != (Y >= b[1])) & (X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1] + 1e-9) + a[0])
        inside ^= cond
    return np.where(inside, -d, d)


def bez(pts, n=48):
    """điểm trên đường cong Bezier (bậc tuỳ ý)"""
    P = np.asarray(pts, np.float32).reshape(-1, 2)
    out = []
    for i in range(n + 1):
        t = i / n
        Q = P.copy()
        while len(Q) > 1:
            Q = Q[:-1] * (1 - t) + Q[1:] * t
        out.append(Q[0])
    return np.array(out)


def stroke(points, r0, r1=None, rmid=None):
    """nét dày dọc đường gấp khúc; bán kính r0 → (rmid ở giữa) → r1"""
    r1 = r0 if r1 is None else r1
    P = np.asarray(points, np.float32)
    n = len(P) - 1
    d = np.full(X.shape, 1e9, np.float32)
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n

        def rad(t):
            if rmid is None:
                return r0 + (r1 - r0) * t
            return (r0 + (rmid - r0) * (t / 0.5)) if t < 0.5 else (rmid + (r1 - rmid) * ((t - 0.5) / 0.5))
        d = np.minimum(d, seg(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], rad(t0), rad(t1)))
    return d


def ring(cx, cy, r, w):
    return np.abs(np.hypot(X - cx, Y - cy) - r) - w / 2


def arc(cx, cy, r, a0, a1, w, taper=True):
    """cung (độ: 0 = phải, 90 = xuống), dày w; taper: hai đầu thuôn nhọn kiểu vệt chém"""
    ang = np.degrees(np.arctan2(Y - cy, X - cx))
    ang = (ang - a0) % 360
    span = (a1 - a0) % 360 or 360
    t = np.clip(ang / span, 0, 1)
    inside = ang <= span
    ww = w * (np.clip(np.sin(np.pi * t), 0, 1) ** 0.7 if taper else 1)
    d = np.abs(np.hypot(X - cx, Y - cy) - r) - ww / 2
    return np.where(inside, d, 99)


def U_(*ds):
    return np.minimum.reduce(ds)


def sub(a, b):
    return np.maximum(a, -b)


def inter(a, b):
    return np.maximum(a, b)


# ============================================================== nhiễu
def fbm(scale=40.0, octaves=5, seed=0, warp=0.0):
    """nhiễu fbm 0..1 (thang thiết kế: scale = cỡ hạt lớn nhất)"""
    rng = np.random.default_rng(seed)
    out = np.zeros(X.shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cell = scale / (2 ** o)
        n = int(256 / cell) + 3
        g = rng.random((n, n)).astype(np.float32)
        z = ndimage.map_coordinates(g, [Y / cell, X / cell], order=3, mode='wrap')
        out += z * amp
        tot += amp
        amp *= 0.5
    out /= tot
    if warp:
        w2 = fbm(scale * 0.8, 3, seed + 99)
        out = ndimage.map_coordinates(out, [YY + (w2 - 0.5) * warp * U, XX + (fbm(scale * 0.8, 3, seed + 77) - 0.5) * warp * U], order=1, mode='reflect')
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


# ============================================================== bức vẽ
class Canvas:
    def __init__(self):
        self.rgb = np.zeros((S, S, 3), np.float32)
        self.a = np.zeros((S, S), np.float32)

    def over(self, col, alpha):
        alpha = np.clip(alpha, 0, 1)[..., None]
        col = np.broadcast_to(col, self.rgb.shape)
        self.rgb = self.rgb * (1 - alpha) + col * alpha
        self.a = self.a + (1 - self.a) * alpha[..., 0]

    def add(self, col, k=1.0):
        self.rgb = self.rgb + np.broadcast_to(col, self.rgb.shape) * k

    def screen(self, col, alpha):
        alpha = np.clip(alpha, 0, 1)[..., None]
        self.rgb = 1 - (1 - self.rgb) * (1 - np.broadcast_to(col, self.rgb.shape) * alpha)


def cov(d, soft=1.0):
    """độ phủ khử răng cưa từ SDF (soft = độ nhoè tính theo điểm ảnh dựng)"""
    return np.clip(0.5 - d * U / soft, 0, 1)


def blur(img, sigma):
    s = sigma * U
    if img.ndim == 3:
        return np.stack([ndimage.gaussian_filter(img[..., i], s) for i in range(img.shape[2])], -1)
    return ndimage.gaussian_filter(img, s)


L = np.array([-0.55, -0.7, 0.75], np.float32)
L /= np.linalg.norm(L)
H = L + np.array([0, 0, 1], np.float32)
H /= np.linalg.norm(H)


def normals(d, bevel, dome=False):
    """pháp tuyến từ SDF: mép vát dày `bevel` (đơn vị thiết kế); dome = cả khối phồng tròn"""
    t = np.clip(-d / bevel, 0, 1)
    h = (1 - (1 - t) ** 2) if not dome else np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1))
    h = h * bevel
    gy, gx = np.gradient(h * U)
    n = np.stack([-gx, -gy, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n


def shadow(cv, d, off=(3, 5), sigma=4, k=0.55):
    m = cov(d)
    m = ndimage.shift(m, (off[1] * U, off[0] * U), order=1)
    cv.over(C('#03020a'), blur(m, sigma) * k)


def solid(cv, d, base, light=None, dark=None, bevel=6, spec=0.35, shin=24, tex=None, tex_k=0.0, outline='#0b0710', ow=1.2, dome=False, grad=None):
    """vật thể thường: khuếch tán + đốm loá nhẹ; tex: nhiễu 0..1 làm vân"""
    base = C(base)
    light = C(light) if light else np.minimum(1, base * 1.45 + 0.08)
    dark = C(dark) if dark else base * 0.38
    n = normals(d, bevel, dome)
    dif = np.clip(n @ L, 0, 1)
    if grad is not None:
        dif = dif * 0.6 + grad * 0.4
    col = np.where(dif[..., None] < 0.55, lerp(dark, base, dif / 0.55), lerp(base, light, (dif - 0.55) / 0.45))
    if tex is not None:
        col = col * (1 - tex_k + tex_k * 2 * tex[..., None])
    sp = np.clip(n @ H, 0, 1) ** shin * spec
    col = col + sp[..., None]
    if outline:
        cv.over(C(outline), cov(d - ow))
    cv.over(col, cov(d))


def metal(cv, d, tint='#c8d4ea', bevel=5, outline='#0b0710', ow=1.2, dome=False, k=1.0):
    """kim loại: phản chiếu trời sáng / chân trời gắt / đất tối, nhuộm theo tint"""
    n = normals(d, bevel, dome)
    r = n[..., 1] * 0.9 + n[..., 0] * 0.45                    # hướng phản chiếu (âm = nhìn lên trời)
    env = ramp([(0, '#ffffff'), (0.28, '#e8eef8'), (0.44, '#7a8496'), (0.5, '#2a2e3a'), (0.62, '#5a6274'), (0.85, '#9aa4b6'), (1, '#4a5060')], (r + 1) / 2)
    t = C(tint)
    col = env * (0.35 + 0.65 * t) * k + t * 0.12
    sp = np.clip(n @ H, 0, 1) ** 60 * 1.2
    col = col + sp[..., None]
    if outline:
        cv.over(C(outline), cov(d - ow))
    cv.over(np.clip(col, 0, 1.4), cov(d))


GOLD = '#f2c050'
SILVER = '#d8e2f2'


def energy(cv, d, color, core='#ffffff', width=6, glow=14, glow_k=0.9, edge=None, alpha=1.0):
    """năng lượng tự phát sáng: quầng mềm + mép màu + lõi sáng"""
    c = C(color)
    m = cov(d)
    g = blur(m, glow)
    cv.add(c * 0.9, 0)
    cv.rgb += c * g[..., None] * glow_k * alpha
    t = np.clip(-d / width, 0, 1)
    col = lerp(C(edge) if edge else c * 0.8, c, smooth(0, 0.35, t))
    col = lerp(col, C(core), smooth(0.35, 1, t))
    cv.over(col, m * alpha)


def bloom(cv, mask, color, sigma=12, k=0.8):
    cv.rgb += C(color) * blur(np.clip(mask, 0, 1), sigma)[..., None] * k


def sparkle(cv, x, y, r, color='#ffffff', k=1.0):
    """điểm lấp lánh 4 cánh"""
    d = U_(seg(x - r, y, x + r, y, r * 0.09, r * 0.09), seg(x, y - r, x, y + r, r * 0.09, r * 0.09))
    star = np.clip(1 - (np.abs(X - x) * np.abs(Y - y)) / (r * 0.6), 0, 1) * np.clip(1 - np.hypot(X - x, Y - y) / r, 0, 1)
    bloom(cv, star, color, 2, 1.2 * k)
    cv.rgb += C(color) * (star ** 2)[..., None] * 1.5 * k
    cv.rgb += C('#ffffff') * cov(circle(x, y, r * 0.12))[..., None] * k
    _ = d


def particles(cv, n, color, region=(30, 30, 226, 226), rmin=0.6, rmax=1.8, seed=1, k=1.0):
    rng = np.random.default_rng(seed)
    acc = np.zeros(X.shape, np.float32)
    for _ in range(n):
        x, y = rng.uniform(region[0], region[2]), rng.uniform(region[1], region[3])
        r = rng.uniform(rmin, rmax)
        acc += np.clip(1 - np.hypot(X - x, Y - y) / r, 0, 1) * rng.uniform(0.5, 1)
    bloom(cv, acc, color, 2.5, 1.2 * k)
    cv.rgb += C('#ffffff') * np.clip(acc * 1.2, 0, 1)[..., None] * 0.8 * k


def lightning(x0, y0, x1, y1, rough=0.22, depth=6, seed=3):
    rng = np.random.default_rng(seed)
    pts = [np.array([x0, y0], float), np.array([x1, y1], float)]
    for _ in range(depth):
        new = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            m = (a + b) / 2
            e = b - a
            nrm = np.array([-e[1], e[0]]) / (np.hypot(*e) + 1e-6)
            m = m + nrm * rng.normal() * np.hypot(*e) * rough
            new += [m, b]
        pts = new
    return np.array(pts)


def bolt(cv, pts, color, r=2.2, glow=10):
    d = stroke(pts, r, r * 0.4)
    bloom(cv, cov(d), color, glow, 1.6)
    bloom(cv, cov(d), color, 3, 1.2)
    cv.over(C('#ffffff'), cov(d))


def fire(cv, d, seed=1, scale=26, glow=16, palette=None, k=1.0, rise=True):
    """lửa: hình (SDF) mềm + nhiễu kéo dài theo chiều dọc (lưỡi lửa liếm lên), đỉnh ngọn thuôn tắt dần"""
    pal = palette or [(0, '#2a0602'), (0.22, '#8a1806'), (0.45, '#e8400c'), (0.66, '#ff8a1e'), (0.84, '#ffc84a'), (1, '#fff2c0')]
    rng = np.random.default_rng(seed)
    tot = np.zeros(X.shape, np.float32)
    amp, sm = 1.0, 0.0
    for o in range(5):
        cx, cy = scale / (2 ** o) * 0.55, scale / (2 ** o) * 1.6       # hạt dẹt ngang, dài dọc
        n = int(256 / min(cx, cy)) + 4
        g = rng.random((n, n)).astype(np.float32)
        tot += ndimage.map_coordinates(g, [Y / cy, X / cx], order=3, mode='wrap') * amp
        sm += amp
        amp *= 0.55
    nz = tot / sm
    nz = (nz - nz.min()) / (nz.max() - nz.min() + 1e-6)
    inside = np.clip(-d / 20, 0, 1) ** 0.8
    top = smooth(0, 1, (Y - Y[cov(d) > 0.5].min()) / 120) if rise and (cov(d) > 0.5).any() else 1
    v = np.clip(inside * 0.88 + (nz - 0.5) * 1.3, 0, 1) * (0.85 + 0.15 * top) * smooth(-2, 10, -d)   # không tràn ra ngoài hình
    a = smooth(0.1, 0.3, v)
    col = ramp(pal, np.clip(v * 1.05, 0, 1))
    bloom(cv, a * v, '#ff6a18', glow, 0.7 * k)
    cv.rgb = cv.rgb * (1 - a[..., None]) + col * a[..., None]
    cv.a = np.maximum(cv.a, a)


# ============================================================== nền + khung
FRAMES = {
    'weapon': dict(tint='#d4def0', gem='#9fd8ff', line='#e8f0ff'),
    'active': dict(tint='#f4c55a', gem='#ff5a4a', line='#ffe8a0'),
    'passive': dict(tint='#7ae0c0', gem='#5affc8', line='#c8fff0'),
}
INNER = box(128, 128, 112, 112, 20)
OUTER = box(128, 128, 126, 126, 30)


def background(cv, color, accent=None, seed=0):
    c = C(color)
    a = C(accent) if accent else c
    r = np.hypot(X - 128, Y - 120) / 150
    base = lerp(C('#070a1c'), C('#16204a'), np.clip(1 - r, 0, 1) ** 1.5)
    base = base + c * (np.clip(1 - r * 1.25, 0, 1) ** 2)[..., None] * 0.55
    clouds = fbm(70, 5, seed + 11, warp=30)
    base = base + a * ((clouds - 0.45) * 0.28)[..., None] * np.clip(1 - r * 0.8, 0, 1)[..., None]
    # tia sáng mờ toả từ tâm
    ang = np.arctan2(Y - 120, X - 128)
    rays = (np.sin(ang * 9 + seed) * 0.5 + 0.5) ** 6 * np.clip(1 - r, 0, 1) * 0.12
    base = base + c * rays[..., None]
    # viền tối (vignette)
    base = base * (1 - smooth(0.55, 1.05, r) * 0.6)[..., None]
    cv.over(base, cov(INNER))


def frame(cv, group, color):
    F = FRAMES[group]
    # bóng khung đổ vào lòng
    inner_sh = np.clip(1 - np.clip(-INNER, 0, 12) / 12, 0, 1) * cov(INNER)
    cv.over(C('#000000'), inner_sh * 0.55)
    band = sub(OUTER, box(128, 128, 114, 114, 22))
    cv.over(C('#05030a'), cov(OUTER + 1.5) * (1 - cov(INNER - 1)))
    metal(cv, band + 1.2, F['tint'], bevel=6, outline=None)
    # rãnh + chỉ mảnh
    groove = ring_box(128, 128, 120, 120, 26, 1.2)
    cv.over(C('#140c08'), cov(groove) * 0.8)
    metal(cv, ring_box(128, 128, 114.5, 114.5, 22, 1.6), F['tint'], bevel=1.2, outline=None)
    # ke góc: hai thanh kim loại ôm góc + hình thoi gắn đá quý
    for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        cx, cy = 128 - sx * 108, 128 - sy * 108
        br = U_(seg(cx, cy, cx + sx * 40, cy, 3.4, 1.4), seg(cx, cy, cx, cy + sy * 40, 3.4, 1.4),
                seg(cx + sx * 8, cy + sy * 8, cx + sx * 24, cy + sy * 8, 1.6, 0.8), seg(cx + sx * 8, cy + sy * 8, cx + sx * 8, cy + sy * 24, 1.6, 0.8))
        metal(cv, br, F['tint'], bevel=2, ow=1.4)
        gd = poly([cx, cy - 11, cx + 11, cy, cx, cy + 11, cx - 11, cy])
        metal(cv, gd, F['tint'], bevel=4, ow=1.6)
        gem(cv, cx, cy, 5.2, F['gem'])
    # đá quý giữa cạnh trên + dưới
    for cy in (6, 250):
        metal(cv, ellipse(128, cy, 16, 8), F['tint'], bevel=3, ow=1.5)
        gem(cv, 128, cy, 5.5, color)


def ring_box(cx, cy, hw, hh, r, w):
    return np.abs(box(cx, cy, hw, hh, r)) - w / 2


def gem(cv, cx, cy, r, color):
    d = circle(cx, cy, r)
    n = normals(d, r, dome=True)
    c = C(color)
    dif = np.clip(n @ L, 0, 1)
    col = lerp(c * 0.25, c, dif) + np.clip(n @ H, 0, 1)[..., None] ** 40 * 1.5
    bloom(cv, cov(d), color, 3, 0.5)
    cv.over(C('#05030a'), cov(d - 1))
    cv.over(col, cov(d))


# ============================================================== chi tiết dùng chung
def unit(x0, y0, x1, y1):
    L_ = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L_, (y1 - y0) / L_
    return L_, ux, uy, -uy, ux


def sword(cv, x0, y0, x1, y1, w=11, grip=26, tint=SILVER, guard_tint=GOLD, wrap='#7a1a24', tassel=True, glow=None):
    """kiếm: chuôi (x0,y0) → mũi (x1,y1); bản rộng w; sống giữa sáng / hai nửa lưỡi khác tông"""
    L_, ux, uy, nx, ny = unit(x0, y0, x1, y1)
    gx, gy = x0 + ux * grip, y0 + uy * grip
    tip0 = L_ - w * 1.8
    hw = w / 2
    P = lambda t, s: (x0 + ux * t + nx * s, y0 + uy * t + ny * s)
    left = poly([*P(grip, 0), *P(grip, hw), *P(tip0, hw), x1, y1, *P(tip0 + w * 0.2, 0)])
    right = poly([*P(grip, 0), *P(grip, -hw), *P(tip0, -hw), x1, y1, *P(tip0 + w * 0.2, 0)])
    blade = U_(left, right)
    if glow:
        bloom(cv, cov(blade), glow, 10, 0.9)
    shadow(cv, blade)
    metal(cv, blade, tint, bevel=2.5)
    # nửa lưỡi khuất tối hơn + đường sống
    cv.over(C('#1a2030'), cov(right) * 0.35)
    ridge = seg(*P(grip + 6, 0), *P(L_ - 6, 0), 0.7, 0.3)
    cv.over(C('#ffffff'), cov(ridge) * 0.9)
    # chuôi quấn vải: vân chéo
    gripd = seg(x0, y0, gx, gy, 4.2)
    stripes = (np.sin(((X - x0) * ux + (Y - y0) * uy) * 1.1 + ((X - x0) * nx + (Y - y0) * ny) * 0.9) * 0.5 + 0.5)
    solid(cv, gripd, wrap, bevel=3, tex=stripes, tex_k=0.35, spec=0.2)
    # khâu chắn: cong 2 đầu
    gd = stroke(bez([P(grip - 4, w * 1.35), P(grip + 3, 0), P(grip - 4, -w * 1.35)]), 3.4, 3.4, 4.6)
    metal(cv, gd, guard_tint, bevel=3)
    gem(cv, gx, gy, 2.6, '#ff4a3a')
    # núm chuôi
    metal(cv, circle(x0 - ux * 4, y0 - uy * 4, 5), guard_tint, bevel=4, dome=True)
    if tassel:
        tx, ty = x0 - ux * 8, y0 - uy * 8
        pts = bez([(tx, ty), (tx - ux * 6 + nx * 10, ty - uy * 6 + ny * 10), (tx - ux * 10 + nx * 4, ty - uy * 14 + ny * 18)])
        solid(cv, stroke(pts, 2.6, 0.8, 2.2), '#c02a26', bevel=2)
    return blade


def talisman(cv, x, y, w, h, rot=0.0, glyph='#c81e1a', glow=None):
    c, s = math.cos(rot), math.sin(rot)

    def T(px, py):
        return (x + px * c - py * s, y + px * s + py * c)
    paper = poly([*T(-w / 2, -h / 2), *T(w / 2, -h / 2), *T(w / 2 + 1, h / 2), *T(-w / 2 - 1, h / 2)])
    if glow:
        bloom(cv, cov(paper), glow, 12, 0.7)
    shadow(cv, paper)
    tex = fbm(10, 4, 31)
    solid(cv, paper, '#ecd49a', '#fff4d0', '#a8864a', bevel=3, tex=tex, tex_k=0.12, spec=0.05)
    inner = poly([*T(-w / 2 + 3, -h / 2 + 3), *T(w / 2 - 3, -h / 2 + 3), *T(w / 2 - 3, h / 2 - 3), *T(-w / 2 + 3, h / 2 - 3)])
    cv.over(C(glyph), cov(np.abs(inner) - 0.6) * 0.9)
    # chữ bùa nét bút lông
    g = U_(
        stroke(bez([T(-w * 0.28, -h * 0.3), T(0, -h * 0.34), T(w * 0.28, -h * 0.28)]), 1.8, 0.8, 2.4),
        stroke(bez([T(0, -h * 0.38), T(1, -h * 0.05), T(-1, h * 0.36)]), 2.4, 0.9, 2.0),
        stroke(bez([T(-w * 0.26, -h * 0.1), T(0, -h * 0.02), T(w * 0.26, -h * 0.12)]), 1.6, 0.8, 2.0),
        stroke(bez([T(-w * 0.3, h * 0.12), T(-w * 0.1, h * 0.26), T(w * 0.28, h * 0.1)]), 1.4, 0.8, 2.2),
        circle(*T(0, h * 0.34), 2.2),
    )
    cv.over(C(glyph), cov(g))


# ============================================================== icon
ICONS = {}


def icon(id_, group, color):
    def deco(f):
        ICONS[id_] = (group, color, f)
        return f
    return deco


def render(id_):
    group, color, f = ICONS[id_]
    cv = Canvas()
    background(cv, color, seed=hash(id_) % 97)
    inner_rgb = cv.rgb.copy()
    f(cv)
    # giữ trong lòng khung (quầng sáng không tràn ra viền)
    m = cov(INNER)[..., None]
    cv.rgb = cv.rgb * m + inner_rgb * (1 - m)
    # tông màu: nén sáng mềm (tránh cháy trắng thành mảng)
    cv.rgb = 1 - np.exp(-cv.rgb * 1.15)
    cv.rgb = cv.rgb / (1 - math.exp(-1.15))
    frame(cv, group, color)
    out = np.clip(cv.rgb, 0, 1)
    alpha = cov(OUTER + 1.5)
    img = np.dstack([out, alpha])
    im = Image.fromarray((img * 255).astype(np.uint8), 'RGBA').resize((256, 256), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, id_ + '.png'))
    return im


# -------------------------------------------------------------- KỸ NĂNG VŨ KHÍ
@icon('wp_sword', 'weapon', '#8fd0ff')
def _(cv):
    qi = arc(126, 136, 92, 192, 300, 22)
    energy(cv, qi, '#6ac8ff', width=8, glow=12)
    energy(cv, arc(126, 136, 80, 205, 290, 7), '#c8f0ff', width=3, glow=5)
    sword(cv, 56, 204, 206, 48, w=20, grip=36, glow='#9fe0ff')
    particles(cv, 26, '#9fe0ff', (40, 40, 210, 200), seed=2)
    sparkle(cv, 194, 60, 16, '#cfefff')


@icon('wp_blade', 'weapon', '#ff9a50')
def _(cv):
    energy(cv, arc(124, 132, 96, 150, 262, 24), '#ff8a3a', width=8, glow=12)
    energy(cv, arc(124, 132, 84, 160, 250, 8), '#ffd8a0', width=3, glow=4)
    x0, y0 = 70, 190
    # đao: sống thẳng, lưỡi cong phình, mũi vát
    back = [(92, 168), (190, 64)]
    blade = poly([92, 168, 186, 62, 204, 50, 214, 54, 206, 84, 182, 124, 140, 166, 112, 186, 100, 182])
    bloom(cv, cov(blade), '#ffb070', 10, 0.6)
    shadow(cv, blade)
    metal(cv, blade, '#dfe6f2', bevel=3)
    edge = stroke(bez([(108, 184), (178, 136), (210, 60)]), 1.2, 0.6, 1.6)
    cv.over(C('#ffffff'), cov(edge))
    cv.over(C('#2a3040'), cov(stroke([(98, 170), (192, 66)], 2.2, 1.6)) * 0.7)       # rãnh máu
    # khâu chắn tròn + chuôi + vòng đuôi
    metal(cv, ellipse(92, 172, 16, 6, -0.82), GOLD, bevel=4)
    stripes = np.sin((X + Y) * 1.2) * 0.5 + 0.5
    solid(cv, seg(58, 202, 86, 176, 4.6), '#3a2414', bevel=3, tex=stripes, tex_k=0.3)
    metal(cv, ring(52, 208, 8, 3.4), GOLD, bevel=2)
    solid(cv, stroke(bez([(46, 214), (34, 222), (40, 238)]), 3, 1, 2.4), '#c02a26', bevel=2)
    particles(cv, 22, '#ffb070', (40, 40, 210, 200), seed=3)
    sparkle(cv, 210, 54, 16, '#ffe0b0')


@icon('wp_spear', 'weapon', '#ffd870')
def _(cv):
    for (a_, b_, c_, d_) in [(150, 150, 226, 74), (166, 170, 234, 102), (134, 136, 196, 74)]:
        energy(cv, seg(a_, b_, c_, d_, 2.6, 0.4), '#ffd870', width=2, glow=6)
    shaft = seg(34, 226, 150, 110, 5.2)
    shadow(cv, shaft)
    L_, ux, uy, nx, ny = unit(34, 226, 150, 110)
    grain = np.sin(((X - 34) * nx + (Y - 226) * ny) * 2.2 + fbm(10, 3, 4) * 6) * 0.5 + 0.5
    solid(cv, shaft, '#7a4422', '#c88a50', '#2a140a', bevel=5, tex=grain, tex_k=0.22)
    for t in (24, 120):
        x, y = 34 + ux * t, 226 + uy * t
        metal(cv, seg(x - ux * 4, y - uy * 4, x + ux * 4, y + uy * 4, 6.6), GOLD, bevel=3)
    metal(cv, seg(26, 234, 36, 224, 6), GOLD, bevel=3)                      # đuôi cán
    head = poly([v for p in bez([(144, 112), (158, 62), (228, 24), (194, 98), (156, 124)]) for v in p])
    bloom(cv, cov(head), '#fff0c0', 12, 0.7)
    shadow(cv, head)
    metal(cv, head, SILVER, bevel=4)
    cv.over(C('#ffffff'), cov(stroke(bez([(152, 116), (176, 84), (220, 32)]), 1.0, 0.4)) * 0.9)
    metal(cv, circle(150, 116, 11), GOLD, bevel=7, dome=True)
    gem(cv, 150, 116, 4, '#ff3a2a')
    for k, (dx, dy) in enumerate([(-34, 22), (-28, 36), (-14, 42), (-42, 6), (-22, 28)]):
        pts = bez([(146, 122), (146 + dx * 0.35, 122 + dy * 0.15 + 10), (146 + dx, 122 + dy)])
        solid(cv, stroke(pts, 4.6, 1.0, 5.0), ['#c82a26', '#a01c1c', '#e04030', '#b02020', '#d83428'][k], bevel=3, outline='#2a0606')
    particles(cv, 24, '#ffe9a0', (40, 40, 220, 200), seed=4)
    sparkle(cv, 220, 32, 18, '#fff2c0')

@icon('wp_fist', 'weapon', '#ff6a6a')
def _(cv):
    for r, w in [(100, 12), (82, 7), (64, 4)]:
        energy(cv, arc(118, 128, r, 300, 420, w), '#ff5a5a', width=w * 0.4, glow=10)
    particles(cv, 30, '#ffb0a0', (120, 50, 230, 210), seed=5)
    # cẳng tay + băng vải đỏ quấn chéo
    arm = poly([20, 100, 84, 92, 92, 168, 20, 172])
    shadow(cv, arm)
    solid(cv, arm, '#94502c', '#cc8458', '#3a1404', bevel=12, dome=True, spec=0.2)
    wrap = np.sin((X * 0.7 + Y * 0.35)) * 0.5 + 0.5
    band = inter(arm, X - 86)
    solid(cv, inter(arm, sub(X - 88, X - 40)), '#a01c22', '#e04a40', '#3a0608', bevel=8, dome=True, tex=wrap, tex_k=0.45, spec=0.3)
    _ = band
    # nắm tay: mu bàn tay + 4 đốt ngón + ngón cái
    palm = box(118, 130, 38, 40, 18)
    shadow(cv, palm)
    skin = fbm(12, 3, 6)
    solid(cv, palm, '#a05a34', '#dc9264', '#3a1404', bevel=16, tex=skin, tex_k=0.08, spec=0.3, dome=True)
    for k, yy in enumerate((98, 120, 142, 162)):
        kn = ellipse(156, yy, 16, 12 - (k == 3) * 1.5)
        solid(cv, kn, '#aa6038', '#e8a070', '#3a1404', bevel=10, dome=True, spec=0.45, shin=20)
    for yy in (109, 131, 152):
        cv.over(C('#3a1408'), cov(seg(140, yy, 168, yy, 1.4, 0.6)) * 0.8)
    thumb = ellipse(118, 160, 32, 12, -0.12)
    solid(cv, thumb, '#a65c36', '#e49c6c', '#3a1404', bevel=10, dome=True, spec=0.35)
    cv.over(C('#3a1408'), cov(seg(126, 154, 146, 156, 1.0)) * 0.6)
    bloom(cv, cov(ellipse(172, 130, 10, 46)), '#ff5a4a', 12, 0.9)
    sparkle(cv, 176, 88, 16, '#ffc0b0')

@icon('wp_bow', 'weapon', '#7affb0')
def _(cv):
    for yy, l in [(106, 60), (128, 76), (150, 60)]:
        energy(cv, seg(26, yy, 26 + l, 128 + (yy - 128) * 0.3, 2.6, 0.5), '#7affb0', width=2, glow=6)
    limb = stroke(bez([(98, 30), (150, 50), (176, 128), (150, 206), (98, 226)], 64), 4.2, 4.2, 6.5)
    shadow(cv, limb)
    grain = fbm(6, 3, 8)
    solid(cv, limb, '#7a4420', '#c88a50', '#2a140a', bevel=4, tex=grain, tex_k=0.2)
    for ty in (30, 226):
        metal(cv, circle(98, ty, 6), GOLD, bevel=5, dome=True)
    solid(cv, box(171, 128, 7, 14, 3), '#7a1a24', bevel=3)
    cv.over(C('#f0f0e0'), cov(seg(98, 34, 98, 222, 0.9)))                 # dây
    shaft = seg(52, 128, 214, 128, 2.4)
    solid(cv, shaft, '#a87040', '#e0b080', '#4a2a10', bevel=2)
    head = poly([206, 118, 236, 128, 206, 138, 212, 128])
    bloom(cv, cov(head), '#c8ffd8', 8, 0.8)
    metal(cv, head, SILVER, bevel=3)
    for s in (1, -1):
        f_ = poly([46, 128, 66, 128 - s * 2, 80, 128 - s * 14, 58, 128 - s * 12])
        solid(cv, f_, '#e8fff0', '#ffffff', '#5a8a70', bevel=2)
    particles(cv, 26, '#b0ffd0', (30, 40, 230, 220), seed=9)
    sparkle(cv, 234, 128, 14, '#d8ffe8')


@icon('wp_fan', 'weapon', '#c8a0ff')
def _(cv):
    cx, cy = 128, 196
    leaf = inter(sub(arc(cx, cy, 116, 198, 342, 82, False), circle(cx, cy, 44)), Y - 192)
    bloom(cv, cov(leaf), '#b080ff', 14, 0.6)
    shadow(cv, leaf)
    ang = np.degrees(np.arctan2(Y - cy, X - cx)) % 360
    fold = (np.floor((ang - 198) / 12) % 2)
    rr = np.hypot(X - cx, Y - cy)
    paper = lerp(C('#efe4ff'), C('#b89ae8'), fold * 0.6 + smooth(60, 160, rr) * 0.3)
    cv.over(C('#120a24'), cov(leaf - 1.4))
    cv.over(paper, cov(leaf))
    # tranh thuỷ mặc: núi + mây + trăng
    mount = poly([40, 140, 70, 104, 92, 124, 118, 84, 150, 128, 176, 100, 214, 140, 214, 156, 40, 156])
    mtex = fbm(12, 4, 12)
    cv.over(lerp(C('#3a2a5a'), C('#8a78b8'), mtex * 0.8 + smooth(84, 156, Y) * 0.0), cov(inter(mount, leaf)) * 0.85)
    cv.over(C('#ff6a5a'), cov(inter(circle(176, 74, 9), leaf)) * 0.9)
    for k in range(13):
        a = math.radians(198 + k * 12)
        cv.over(C('#4a2a1a'), cov(seg(cx + math.cos(a) * 44, cy + math.sin(a) * 44, cx + math.cos(a) * 116, cy + math.sin(a) * 116, 0.9)) * 0.7)
    metal(cv, inter(arc(cx, cy, 116, 196, 344, 6, False), Y - 196), GOLD, bevel=2)
    for k in range(13):
        a = math.radians(198 + k * 12)
        solid(cv, seg(cx, cy, cx + math.cos(a) * 46, cy + math.sin(a) * 46, 2.4), '#3a2010', '#8a5a30', bevel=2)
    metal(cv, circle(cx, cy, 8), GOLD, bevel=6, dome=True)
    solid(cv, stroke(bez([(cx, cy + 6), (cx - 6, cy + 22), (cx + 4, cy + 40)]), 3, 1, 2.6), '#c02a26', bevel=2)
    particles(cv, 22, '#e0c8ff', (30, 30, 226, 190), seed=10)
    sparkle(cv, 200, 64, 14, '#f0e0ff')


# -------------------------------------------------------------- KỸ NĂNG CHỦ ĐỘNG
@icon('ac_fire', 'active', '#ff6a2a')
def _(cv):
    tongues = [poly([v for p in bez([(x - w, 250), (x - w * 0.95, 160), (x + lean, top), (x + w * 0.95, 160), (x + w, 250)]) for v in p])
               for x, w, top, lean in [(136, 70, 26, 10), (78, 40, 84, -18), (196, 42, 76, 16), (110, 32, 110, -6), (166, 30, 108, 8)]]
    fire(cv, U_(*tongues), seed=3, scale=34, glow=20)
    talisman(cv, 128, 150, 48, 104, rot=-0.18, glow='#ffb060')
    # mép bùa đang cháy: viền than + tàn lửa
    embers = fbm(6, 3, 61)
    edge = np.clip(1 - np.abs(box(128, 150, 26, 54, 0, -0.18)) / 3, 0, 1) * (embers > 0.55) * (Y > 170)
    cv.rgb += C('#ff8a20') * edge[..., None] * 1.2
    particles(cv, 60, '#ffc060', (30, 20, 230, 220), rmax=2.4, seed=11)
    sparkle(cv, 200, 50, 14, '#ffe0a0')

@icon('ac_ring', 'active', '#7ac8ff')
def _(cv):
    energy(cv, arc(128, 128, 84, 10, 330, 7), '#6ab8ff', width=3, glow=10)
    energy(cv, arc(128, 128, 70, 190, 470, 4), '#c8ecff', width=2, glow=4)
    for i in range(3):
        a = i * 2 * math.pi / 3 - math.pi / 2 + 0.35
        x, y = 128 + math.cos(a) * 62, 128 + math.sin(a) * 62
        t = a + math.pi / 2
        l = 42
        sword(cv, x - math.cos(t) * l, y - math.sin(t) * l, x + math.cos(t) * l, y + math.sin(t) * l, w=9, grip=18, tassel=False, glow='#9fd8ff')
    core = circle(128, 128, 14)
    energy(cv, core, '#7ac8ff', width=12, glow=16)
    particles(cv, 30, '#c8ecff', seed=12)


@icon('ac_frost', 'active', '#6ad8ff')
def _(cv):
    flake = np.full(X.shape, 1e9, np.float32)
    for i in range(6):
        a = i * math.pi / 3 - math.pi / 2
        ex, ey = 128 + math.cos(a) * 92, 128 + math.sin(a) * 92
        flake = np.minimum(flake, seg(128, 128, ex, ey, 6, 2))
        for r_, l in [(36, 22), (60, 18), (80, 10)]:
            bx, by = 128 + math.cos(a) * r_, 128 + math.sin(a) * r_
            for s in (-1, 1):
                flake = np.minimum(flake, seg(bx, by, bx + math.cos(a + s * 0.85) * l, by + math.sin(a + s * 0.85) * l, 3.4, 1.2))
    bloom(cv, cov(flake), '#5ac8ff', 14, 1.0)
    n = normals(flake, 4)
    ice = ramp([(0, '#0a3a7a'), (0.45, '#3a9ae8'), (0.75, '#b8ecff'), (1, '#ffffff')], np.clip(n @ L, 0, 1))
    cv.over(C('#06183a'), cov(flake - 1.4))
    cv.over(ice + np.clip(n @ H, 0, 1)[..., None] ** 30, cov(flake))
    hexd = poly([v for i in range(6) for v in (128 + math.cos(i * math.pi / 3) * 22, 128 + math.sin(i * math.pi / 3) * 22)])
    energy(cv, hexd, '#9fe8ff', width=16, glow=12)
    particles(cv, 50, '#d8f6ff', rmax=1.6, seed=13)
    for x, y in [(56, 200), (204, 60), (200, 196)]:
        sparkle(cv, x, y, 12, '#d8f6ff')


@icon('ac_thunder', 'active', '#ffe24a')
def _(cv):
    clouds = fbm(40, 5, 21, warp=20)
    cl = smooth(0.45, 0.75, clouds) * smooth(90, 20, Y)
    cv.over(lerp(C('#1a1838'), C('#4a4878'), clouds), cl * 0.9)
    talisman(cv, 70, 136, 42, 92, rot=0.15, glyph='#2a4ad8', glow='#80b0ff')
    main = lightning(170, 24, 140, 228, 0.18, 6, seed=4)
    bolt(cv, main, '#ffe24a', r=3.4, glow=12)
    for (sx, sy, ex, ey, sd) in [(158, 100, 212, 150, 5), (150, 160, 96, 196, 6), (146, 188, 204, 222, 7)]:
        bolt(cv, lightning(sx, sy, ex, ey, 0.25, 4, seed=sd), '#fff080', r=1.6, glow=6)
    energy(cv, ellipse(140, 230, 36, 8), '#fff080', width=6, glow=12)
    particles(cv, 30, '#fff4a0', seed=14)


@icon('ac_gale', 'active', '#5affc0')
def _(cv):
    nz = fbm(18, 4, 15, warp=14)
    body = np.full(X.shape, 1e9, np.float32)
    for i, (y, w) in enumerate([(40, 96), (66, 82), (92, 66), (118, 52), (144, 40), (170, 30), (196, 22), (220, 14)]):
        cx = 128 + math.sin(i * 0.9) * 10
        body = np.minimum(body, ellipse(cx, y, w / 2 + 6, 11))
    bloom(cv, cov(body), '#5affc0', 16, 0.8)
    swirl = np.sin((X - 128) * 0.12 + Y * 0.22 + nz * 6) * 0.5 + 0.5
    col = ramp([(0, '#0a4a3a'), (0.4, '#2ab890'), (0.7, '#9affd8'), (1, '#ffffff')], swirl * 0.8 + smooth(220, 40, Y) * 0.25)
    cv.over(col, cov(body) * (0.55 + 0.45 * swirl))
    for i, (y, w) in enumerate([(40, 96), (66, 82), (92, 66), (118, 52), (144, 40), (170, 30), (196, 22)]):
        cx = 128 + math.sin(i * 0.9) * 10
        energy(cv, arc(cx, y + 2, w / 2 + 4, 20, 160, 3.2), '#e8fff8', width=1.4, glow=3)
    for (x, y, a) in [(56, 92, 0.5), (204, 140, -0.4), (70, 190, 1.1), (190, 60, 2.2)]:
        solid(cv, ellipse(x, y, 10, 4.5, a), '#4ab848', '#a8f080', '#14401a', bevel=3)
    particles(cv, 30, '#c8fff0', seed=16)


@icon('ac_spring', 'active', '#5aff90')
def _(cv):
    drop = U_(circle(128, 150, 70), poly([128, 20, 66, 116, 190, 116]))
    bloom(cv, cov(drop), '#5aff9a', 18, 0.6)
    n = normals(drop, 30, dome=True)
    inside = ramp([(0, '#0a3a2a'), (0.5, '#1a8a5a'), (0.8, '#7ae8b0'), (1, '#e8fff4')], np.clip(n @ L, 0, 1))
    cv.over(C('#04140c'), cov(drop - 1.5))
    cv.over(inside, cov(drop) * 0.85)
    stem = stroke(bez([(128, 206), (124, 170), (130, 132)]), 4.6, 2.8)
    solid(cv, stem, '#2a8a3a', '#7ad070', '#0a3010', bevel=3)
    lf1 = poly([v for p in bez([(128, 150), (80, 150), (64, 104), (92, 98), (128, 140)]) for v in p])
    lf2 = poly([v for p in bez([(130, 136), (176, 132), (196, 84), (166, 80), (130, 128)]) for v in p])
    for lf in (lf1, lf2):
        solid(cv, lf, '#3aaa48', '#a8f080', '#0e3a14', bevel=8, spec=0.4, dome=True)
    cv.over(C('#1e6a2a'), cov(stroke(bez([(124, 146), (96, 128), (74, 106)]), 1.1, 0.4)) * 0.8)
    cv.over(C('#1e6a2a'), cov(stroke(bez([(134, 132), (160, 110), (186, 88)]), 1.1, 0.4)) * 0.8)
    cv.screen(C('#ffffff'), cov(ellipse(96, 112, 10, 24, 0.5)) * 0.55)          # ánh trên giọt
    particles(cv, 40, '#c8ffd8', seed=17)
    sparkle(cv, 178, 196, 14, '#e8fff0')


@icon('ac_diamond', 'active', '#ffcf50')
def _(cv):
    ang = np.arctan2(Y - 128, X - 128)
    r = np.hypot(X - 128, Y - 128)
    rays = (np.cos(ang * 12) * 0.5 + 0.5) ** 4 * smooth(110, 40, r)
    cv.rgb += C('#ffcf50') * rays[..., None] * 0.6
    energy(cv, ring(128, 128, 62, 5), '#ffd860', width=2, glow=10)
    # chày kim cang
    shaft = box(128, 128, 9, 46, 5)
    shadow(cv, shaft)
    metal(cv, shaft, GOLD, bevel=6)
    for s in (-1, 1):
        y = 128 + s * 50
        prong = U_(stroke(bez([(128, y), (98, y + s * 6), (104, y + s * 34), (128, y + s * 46)]), 3.6, 1.4),
                   stroke(bez([(128, y), (158, y + s * 6), (152, y + s * 34), (128, y + s * 46)]), 3.6, 1.4),
                   seg(128, y, 128, y + s * 48, 4, 1.6))
        metal(cv, prong, GOLD, bevel=3)
        metal(cv, ellipse(128, y, 20, 7), GOLD, bevel=4)
        gem(cv, 128, y + s * 46, 4, '#ff4a3a')
    for yy in (100, 156):
        metal(cv, ellipse(128, yy, 14, 4), '#fff0c0', bevel=3)
    core = circle(128, 128, 15)
    bloom(cv, cov(core), '#fff4c0', 14, 1.0)
    gem(cv, 128, 128, 13, '#ff3a2a')
    particles(cv, 30, '#fff0a0', seed=18)
    sparkle(cv, 122, 120, 18, '#ffffff')


@icon('ac_needle', 'active', '#c890ff')
def _(cv):
    needles = [(48, 178, 194, 52), (36, 128, 214, 84), (78, 214, 210, 116)]
    for (x0, y0, x1, y1) in needles:
        L_, ux, uy, nx, ny = unit(x0, y0, x1, y1)
        trail = seg(x0 - ux * 20, y0 - uy * 20, x1 - ux * 30, y1 - uy * 30, 7, 0.5)
        energy(cv, trail, '#a060ff', width=4, glow=10, alpha=0.75)
    for (x0, y0, x1, y1) in needles:
        L_, ux, uy, nx, ny = unit(x0, y0, x1, y1)
        nd = seg(x0, y0, x1, y1, 3.2, 0.6)
        metal(cv, sub(nd, ellipse(x0 + ux * 6, y0 + uy * 6, 3.6, 1.4, math.atan2(uy, ux))), SILVER, bevel=2)
        sparkle(cv, x1, y1, 14, '#e8d8ff')
    particles(cv, 40, '#e0c8ff', seed=19)


@icon('ac_beam', 'active', '#5af0ff')
def _(cv):
    beam = poly([92, 112, 246, 104, 246, 152, 92, 144])
    nz = fbm(14, 4, 20)
    bloom(cv, cov(beam), '#5af0ff', 18, 1.0)
    t = 1 - np.abs(Y - 128) / 24
    col = ramp([(0, '#0a6a9a'), (0.4, '#3ad8ff'), (0.75, '#c8f8ff'), (1, '#ffffff')], np.clip(t + (nz - 0.5) * 0.4, 0, 1))
    cv.over(col, cov(beam))
    for sd, (a, b) in enumerate([(110, 130), (150, 120), (190, 136)]):
        bolt(cv, lightning(a, b - 26, a + 40, b + 22, 0.3, 4, seed=30 + sd), '#fff6a0', r=1.4, glow=5)
    # cánh lông vũ
    for k, (ang, ln) in enumerate([(-0.95, 86), (-0.55, 96), (-0.12, 92), (0.32, 80), (0.72, 64)]):
        a = math.pi + ang
        ex, ey = 96 + math.cos(a) * ln, 128 + math.sin(a) * ln * 0.9
        f_ = stroke(bez([(96, 128), ((96 + ex) / 2 + 6 * math.sin(a), (128 + ey) / 2 - 6), (ex, ey)]), 10, 2, 13)
        solid(cv, f_, ['#d8e8ff', '#c8dcf8', '#e8f2ff', '#b8cff0', '#a8c0e8'][k], '#ffffff', '#4a5a7a', bevel=6, spec=0.5)
    metal(cv, circle(96, 128, 12), GOLD, bevel=8, dome=True)
    gem(cv, 96, 128, 5, '#5af0ff')
    particles(cv, 30, '#c8f8ff', seed=21)


@icon('ac_skyfire', 'active', '#ff4a20')
def _(cv):
    trail = poly([20, 26, 60, 18, 168, 118, 118, 170, 18, 64])
    fire(cv, U_(trail, circle(150, 152, 50)), seed=12, scale=30)
    ball = circle(156, 158, 52)
    bloom(cv, cov(ball), '#ff6a20', 20, 1.2)
    nz = fbm(16, 5, 23, warp=16)
    r = np.clip(1 - np.hypot(X - 162, Y - 164) / 52, 0, 1)
    col = ramp([(0, '#5a0a02'), (0.3, '#d8320a'), (0.55, '#ff8a20'), (0.78, '#ffd060'), (1, '#ffffff')], np.clip(r * 1.1 + (nz - 0.5) * 0.5, 0, 1))
    cv.over(C('#2a0400'), cov(ball - 1.5))
    cv.over(col, cov(ball))
    particles(cv, 50, '#ffb040', rmax=2.4, seed=22)
    sparkle(cv, 206, 116, 14, '#ffe0a0')


@icon('ac_swords', 'active', '#a080ff')
def _(cv):
    for x, y0, y1 in [(78, 26, 150), (128, 40, 196), (180, 20, 140)]:
        energy(cv, seg(x, y0 - 30, x, y0 + 40, 9, 1), '#9a70ff', width=4, glow=10, alpha=0.7)
    for x, y0, y1 in [(78, 26, 150), (128, 40, 196), (180, 20, 140)]:
        sword(cv, x, y0, x, y1, w=13, grip=26, tint='#e4e0ff', glow='#c8b0ff')
    for x, y, w in [(128, 214, 64), (78, 164, 28), (180, 154, 28)]:
        energy(cv, ellipse(x, y, w, 6), '#b090ff', width=5, glow=12)
    particles(cv, 40, '#d8c8ff', seed=24)


@icon('ac_opensky', 'active', '#ffe080')
def _(cv):
    ang = np.arctan2(Y - 128, X - 128)
    r = np.hypot(X - 128, Y - 128)
    rays = (np.cos(ang * 16) * 0.5 + 0.5) ** 8 * smooth(120, 20, r)
    cv.rgb += C('#ffe080') * rays[..., None] * 0.9
    crack = poly([128, 14, 140, 62, 120, 96, 146, 136, 126, 242, 116, 140, 134, 104, 108, 62])
    fire(cv, crack + 2, seed=25, glow=10, palette=[(0, '#3a2a10'), (0.4, '#c89030'), (0.7, '#ffe080'), (1, '#ffffff')], k=0.5)
    energy(cv, crack, '#fff0a0', width=6, glow=18)
    for (a, b, c_, d_) in [(140, 62, 176, 46), (120, 96, 84, 112), (146, 136, 186, 150), (116, 140, 80, 168)]:
        energy(cv, seg(a, b, c_, d_, 2.4, 0.6), '#fff0a0', width=1.5, glow=5)
    particles(cv, 40, '#fff0c0', seed=26)


@icon('ac_genesis', 'active', '#ffe6a0')
def _(cv):
    energy(cv, ring(128, 128, 96, 4), '#ffe6a0', width=2, glow=12)
    for i in range(8):
        a = i * math.pi / 4
        x, y = 128 + math.cos(a) * 96, 128 + math.sin(a) * 96
        metal(cv, poly([x, y - 9, x + 7, y, x, y + 9, x - 7, y]), GOLD, bevel=3)
    for i in range(24):
        a = i * math.pi / 12
        cv.over(C('#ffe6a0'), cov(seg(128 + math.cos(a) * 76, 128 + math.sin(a) * 76, 128 + math.cos(a) * 84, 128 + math.sin(a) * 84, 0.8)) * 0.7)
    R_ = 64
    disk = circle(128, 128, R_)
    bloom(cv, cov(disk), '#fff4d0', 22, 1.0)
    yin = ((X - 128 > 0) & (np.hypot(X - 128, Y - 128 + R_ / 2) > R_ / 2)) | (np.hypot(X - 128, Y - 128 - R_ / 2) <= R_ / 2)
    yin = yin & ~(np.hypot(X - 128, Y - 128 + R_ / 2) <= R_ / 2)
    n = normals(disk, 40, dome=True)
    lit = np.clip(n @ L, 0, 1)
    white = ramp([(0, '#9a8a6a'), (0.6, '#f4ecd8'), (1, '#ffffff')], lit)
    black = ramp([(0, '#05040a'), (0.6, '#1c1830'), (1, '#4a4470')], lit)
    col = np.where(yin[..., None], black, white) + np.clip(n @ H, 0, 1)[..., None] ** 40 * 0.8
    cv.over(C('#05030a'), cov(disk - 2))
    cv.over(col, cov(disk))
    cv.over(black, cov(circle(128, 128 - R_ / 2, 9)))
    cv.over(white, cov(circle(128, 128 + R_ / 2, 9)))
    particles(cv, 40, '#fff4d0', seed=27)
    for x, y in [(40, 40), (216, 216), (214, 44)]:
        sparkle(cv, x, y, 12, '#fff4d0')


# -------------------------------------------------------------- KỸ NĂNG BỊ ĐỘNG
@icon('p_hp', 'passive', '#ff4a5a')
def _(cv):
    heart = U_(circle(98, 104, 44), circle(158, 104, 44), poly([58, 122, 198, 122, 128, 210]))
    bloom(cv, cov(heart), '#ff3a4a', 18, 0.9)
    shadow(cv, heart)
    solid(cv, heart, '#d81e34', '#ff8a90', '#4a0410', bevel=26, spec=0.9, shin=30, dome=True)
    beat = stroke([(62, 128), (96, 128), (108, 104), (124, 160), (140, 112), (150, 128), (194, 128)], 3.2, 3.2)
    energy(cv, beat, '#ffe0e0', width=2.5, glow=6)
    particles(cv, 30, '#ffb0b8', seed=40)
    sparkle(cv, 88, 82, 14, '#ffffff')


@icon('p_move', 'passive', '#5ad8ff')
def _(cv):
    for yy, l in [(92, 54), (128, 70), (164, 54)]:
        energy(cv, seg(22, yy, 22 + l, yy, 3.2, 0.6), '#5ad8ff', width=2, glow=6)
    for k, (ang, ln) in enumerate([(-1.2, 76), (-0.85, 84), (-0.5, 80), (-0.18, 64)]):
        ex, ey = 150 + math.cos(ang) * ln, 98 + math.sin(ang) * ln
        f_ = stroke(bez([(150, 98), ((150 + ex) / 2, (98 + ey) / 2 - 10), (ex, ey)]), 9, 2, 11)
        solid(cv, f_, ['#e8f2ff', '#d0e4fa', '#c0d6f2', '#b0c8ec'][k], '#ffffff', '#4a6a8a', bevel=5, spec=0.5)
    boot = poly([84, 52, 142, 52, 140, 140, 196, 160, 200, 196, 80, 196, 76, 120])
    shadow(cv, boot)
    solid(cv, boot, '#7a4a28', '#c8905a', '#2a1408', bevel=10, tex=fbm(6, 3, 41), tex_k=0.15, spec=0.3)
    solid(cv, box(140, 200, 64, 8, 4), '#2a1e1a', '#5a4a40', '#0a0606', bevel=4)
    metal(cv, box(110, 64, 32, 8, 3), GOLD, bevel=4)
    for yy in (88, 108, 128):
        cv.over(C('#2a1408'), cov(seg(96, yy, 128, yy + 8, 1.2)) * 0.8)
    particles(cv, 30, '#c8f0ff', seed=42)


@icon('p_damage', 'passive', '#ff9a30')
def _(cv):
    pts = []
    for i in range(16):
        a = i * math.pi / 8 - math.pi / 2
        rr = 98 if i % 2 == 0 else 40
        pts += [128 + math.cos(a) * rr, 128 + math.sin(a) * rr]
    star = poly(pts)
    fire(cv, star - 4, seed=43, scale=22, glow=18)
    core = circle(128, 128, 26)
    energy(cv, core, '#ffd060', width=24, glow=20)
    particles(cv, 50, '#ffc060', rmax=2.2, seed=44)
    sparkle(cv, 128, 128, 30, '#ffffff')


@icon('p_atk', 'passive', '#ffd860')
def _(cv):
    for yy in (88, 128, 168):
        energy(cv, seg(178, yy, 236, yy, 3, 0.5), '#ffd860', width=2, glow=6)
    glass = U_(poly([86, 52, 158, 52, 122, 124]), poly([122, 132, 86, 204, 158, 204]), box(122, 128, 4, 8))
    bloom(cv, cov(glass), '#c8e8ff', 10, 0.5)
    cv.over(C('#0a1830'), cov(glass - 1.2))
    cv.over(C('#9ac8f0'), cov(glass) * 0.35)
    sand = U_(poly([98, 62, 146, 62, 122, 104]), poly([122, 150, 94, 200, 150, 200]))
    solid(cv, sand, '#f0b840', '#ffe8a0', '#8a5a14', bevel=6, tex=fbm(3, 2, 45), tex_k=0.3)
    energy(cv, seg(122, 112, 122, 196, 1.4), '#ffe8a0', width=1, glow=4)
    cv.screen(C('#ffffff'), cov(seg(94, 60, 112, 104, 2.4)) * 0.6)
    for yy in (44, 212):
        solid(cv, box(122, yy, 52, 9, 4), '#6a3a1c', '#b07040', '#2a140a', bevel=5, tex=fbm(6, 3, 46), tex_k=0.2)
    for xx in (74, 170):
        metal(cv, box(xx, 128, 5, 80, 3), GOLD, bevel=4)
    particles(cv, 30, '#fff0a0', seed=47)


@icon('p_armor', 'passive', '#a8b8e8')
def _(cv):
    shield = poly([128, 28, 206, 52, 200, 140, 128, 222, 56, 140, 50, 52])
    bloom(cv, cov(shield), '#a8c8ff', 16, 0.6)
    shadow(cv, shield)
    metal(cv, shield, '#d8e0f4', bevel=10)
    inner = poly([128, 44, 190, 64, 186, 136, 128, 204, 70, 136, 66, 64])
    metal(cv, inner, '#8a96c0', bevel=6, ow=1.6, k=0.85)
    emb = U_(ring(128, 118, 30, 6), seg(128, 80, 128, 156, 3.6), seg(90, 118, 166, 118, 3.6))
    metal(cv, emb, GOLD, bevel=3)
    gem(cv, 128, 118, 9, '#3a8aff')
    for x, y in [(66, 60), (190, 60), (128, 196)]:
        metal(cv, circle(x, y, 5), GOLD, bevel=4, dome=True)
    sparkle(cv, 84, 66, 16, '#ffffff')
    particles(cv, 20, '#d8e4ff', seed=48)


@icon('p_pickup', 'passive', '#5affa0')
def _(cv):
    for i in range(10):
        a = i * math.pi / 5 + 0.3
        x, y = 128 + math.cos(a) * 100, 128 + math.sin(a) * 100
        energy(cv, seg(x, y, 128 + math.cos(a) * 74, 128 + math.sin(a) * 74, 2.6, 0.6), '#5affa0', width=2, glow=6)
        energy(cv, circle(x, y, 4), '#c8ffe0', width=4, glow=8)
    eye = poly([v for p in bez([(36, 128), (128, 40), (220, 128)]) for v in p] + [v for p in bez([(220, 128), (128, 216), (36, 128)]) for v in p])
    bloom(cv, cov(eye), '#5affa0', 14, 0.6)
    solid(cv, eye, '#e8f0ec', '#ffffff', '#5a7a6a', bevel=14, spec=0.2, dome=True)
    iris = circle(128, 128, 38)
    nz = fbm(6, 4, 49)
    rr = np.hypot(X - 128, Y - 128) / 38
    col = ramp([(0, '#04140a'), (0.35, '#0a6a3a'), (0.7, '#3ae890'), (1, '#0a3a20')], np.clip(rr + (nz - 0.5) * 0.3, 0, 1))
    cv.over(col, cov(iris))
    cv.over(C('#020604'), cov(ellipse(128, 128, 9, 20)))
    cv.screen(C('#ffffff'), cov(circle(114, 114, 7)))
    cv.over(C('#2a3a32'), cov(np.abs(eye) - 1.2))
    particles(cv, 20, '#c8ffe0', seed=50)


@icon('p_area', 'passive', '#b080ff')
def _(cv):
    for r, w in [(98, 3), (82, 2), (66, 1.5)]:
        energy(cv, ring(128, 128, r, w), '#b080ff', width=1, glow=6)
    ang = np.degrees(np.arctan2(Y - 128, X - 128)) % 360
    runes = (np.floor(ang / 15) % 2 == 0) & (np.abs(np.hypot(X - 128, Y - 128) - 90) < 4)
    cv.rgb += C('#e0c8ff') * runes[..., None] * 0.5
    seal = box(128, 128, 46, 46, 8)
    bloom(cv, cov(seal), '#ff4a3a', 14, 0.7)
    shadow(cv, seal)
    solid(cv, seal, '#c8281e', '#ff7a5a', '#3a0604', bevel=10, tex=fbm(5, 3, 51), tex_k=0.15, spec=0.4)
    glyph = U_(ring_box(128, 128, 34, 34, 5, 3), seg(104, 104, 152, 104, 3), seg(128, 104, 128, 152, 3), seg(104, 128, 152, 128, 2.6), seg(104, 152, 152, 152, 3))
    solid(cv, glyph, '#f4e0b0', '#ffffff', '#8a6a3a', bevel=2, outline=None)
    particles(cv, 30, '#e0c8ff', seed=52)


@icon('p_regen', 'passive', '#3aff80')
def _(cv):
    drop = U_(circle(128, 150, 66), poly([128, 22, 70, 120, 186, 120]))
    bloom(cv, cov(drop), '#3aff80', 18, 0.8)
    n = normals(drop, 34, dome=True)
    col = ramp([(0, '#04301a'), (0.45, '#12a050'), (0.8, '#7affb0'), (1, '#ffffff')], np.clip(n @ L, 0, 1)) + np.clip(n @ H, 0, 1)[..., None] ** 30 * 0.9
    cv.over(C('#021408'), cov(drop - 1.5))
    cv.over(col, cov(drop))
    cross = U_(box(128, 154, 34, 11, 4), box(128, 154, 11, 34, 4))
    bloom(cv, cov(cross), '#ffffff', 8, 0.6)
    solid(cv, cross, '#f0fff4', '#ffffff', '#5a9a7a', bevel=5, spec=0.5)
    particles(cv, 40, '#c8ffd8', seed=53)


@icon('p_xp', 'passive', '#80b8ff')
def _(cv):
    ang = np.arctan2(Y - 112, X - 128)
    r = np.hypot(X - 128, Y - 112)
    rays = (np.cos(ang * 10) * 0.5 + 0.5) ** 6 * smooth(110, 10, r) * (Y < 140)
    cv.rgb += C('#bfe0ff') * rays[..., None] * 1.0
    lp = poly([20, 128, 124, 146, 124, 220, 20, 200])
    rp = poly([236, 128, 132, 146, 132, 220, 236, 200])
    shadow(cv, U_(lp, rp))
    tex = fbm(8, 4, 54)
    solid(cv, lp, '#e8d4a0', '#fff4d8', '#8a6a3a', bevel=8, tex=tex, tex_k=0.1, spec=0.1)
    solid(cv, rp, '#dcc890', '#fff0d0', '#7a5a2a', bevel=8, tex=tex, tex_k=0.1, spec=0.1)
    for yy in (158, 172, 186):
        cv.over(C('#6a4a20'), cov(seg(36, yy - 6, 112, yy + 6, 1.1)) * 0.6)
        cv.over(C('#6a4a20'), cov(seg(144, yy + 6, 220, yy - 6, 1.1)) * 0.6)
    solid(cv, box(128, 182, 5, 40, 2), '#7a1a24', bevel=3)
    orb = circle(128, 100, 18)
    energy(cv, orb, '#bfe0ff', width=16, glow=22)
    particles(cv, 40, '#dff0ff', (30, 30, 226, 150), seed=55)


@icon('p_crit', 'passive', '#ff7a40')
def _(cv):
    for r, c_ in [(84, '#f4ecdc'), (66, '#c8281e'), (48, '#f4ecdc'), (30, '#c8281e'), (14, '#ffd040')]:
        solid(cv, circle(128, 132, r), c_, bevel=4, spec=0.15, outline='#1a0808', ow=1)
    cracks = U_(*[seg(128, 132, 128 + math.cos(a) * l, 132 + math.sin(a) * l, 1.6, 0.3) for a, l in [(-2.4, 70), (-0.3, 60), (1.9, 76), (0.9, 50), (3.0, 56)]])
    energy(cv, cracks, '#ffd060', width=1.2, glow=6)
    shaft = seg(132, 128, 212, 48, 3)
    shadow(cv, shaft)
    solid(cv, shaft, '#8a5a30', '#d0a070', '#2a140a', bevel=2)
    for s in (1, -1):
        fl = poly([198, 62, 214, 46, 232, 50 + s * 0, 214, 70]) if s > 0 else poly([198, 62, 214, 46, 210, 28, 194, 44])
        solid(cv, fl, '#f0f0f0', '#ffffff', '#6a6a7a', bevel=3)
    bloom(cv, cov(circle(128, 132, 10)), '#ffd060', 14, 1.2)
    sparkle(cv, 132, 128, 24, '#fff0c0')
    particles(cv, 20, '#ffc080', seed=56)


@icon('p_luck', 'passive', '#ffd040')
def _(cv):
    for (x, y, r) in [(66, 186, 28), (196, 190, 24)]:
        c_ = circle(x, y, r)
        metal(cv, c_, GOLD, bevel=6, dome=True, k=0.8)
        cv.over(C('#2a1a06'), cov(box(x, y, r * 0.28, r * 0.28)))
    coin = circle(128, 124, 74)
    bloom(cv, cov(coin), '#ffd040', 20, 0.9)
    shadow(cv, coin)
    metal(cv, coin, GOLD, bevel=12)
    metal(cv, ring(128, 124, 58, 5), '#fff0c0', bevel=2, ow=1)
    hole = box(128, 124, 18, 18, 2)
    cv.over(C('#140a02'), cov(hole + 3))
    metal(cv, sub(box(128, 124, 22, 22, 3), hole), GOLD, bevel=3, ow=1)
    for (x, y) in [(128, 84), (128, 164), (88, 124), (168, 124)]:
        metal(cv, box(x, y, 7, 7, 1, rot=0.785), '#fff6d0', bevel=3, ow=1)
    particles(cv, 40, '#fff0a0', seed=57)
    sparkle(cv, 86, 76, 20, '#ffffff')
    sparkle(cv, 190, 60, 12, '#fff6d0')


# ============================================================== chạy
ORDER = ['wp_sword', 'wp_blade', 'wp_spear', 'wp_fist', 'wp_bow', 'wp_fan',
         'ac_fire', 'ac_ring', 'ac_frost', 'ac_thunder', 'ac_gale', 'ac_spring', 'ac_diamond',
         'ac_needle', 'ac_beam', 'ac_skyfire', 'ac_swords', 'ac_opensky', 'ac_genesis',
         'p_hp', 'p_move', 'p_damage', 'p_atk', 'p_armor', 'p_pickup', 'p_area', 'p_regen', 'p_xp', 'p_crit', 'p_luck']

if __name__ == '__main__':
    ids = sys.argv[1:] or ORDER
    for i in ids:
        render(i)
        print('✓', i)
    # ảnh tổng hợp
    rows = [ORDER[:6], ORDER[6:13], ORDER[13:19], ORDER[19:25], ORDER[25:]]
    T = 200
    sheet = Image.new('RGB', (7 * (T + 16) + 16, len(rows) * (T + 16) + 16), (14, 14, 22))
    for j, r in enumerate(rows):
        for k, n in enumerate(r):
            p = os.path.join(OUT, n + '.png')
            if os.path.exists(p):
                im = Image.open(p).resize((T, T), Image.LANCZOS)
                sheet.paste(im, (16 + k * (T + 16), 16 + j * (T + 16)), im)
    sheet.save(os.path.join(OUT, '_sheet.png'))
