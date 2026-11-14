"""
HUYỀN HOÀNG CHUNG — VẼ MỚI (không cắt ghép) theo ảnh mẫu tools/art/ref/hoang_chung_ref.webp:
  · hoang_chung_bell.png  256×320  chuông vàng: núm giọt nước + vòng treo + chóp nhọn, vòm, thân loe,
        dải men ngọc hoa văn sóng/tim, dải chân có hạt men ngọc tròn, vành đáy cong (nhìn hơi từ trên xuống).
        Gốc trong game = (0.5, 1) mép đáy giữa.
  · hoang_chung_wing.png  200×300  cánh lửa vàng bên TRÁI (game lật ngang cho bên phải): các dải lửa thuôn
        cong vút lên, đầu cuộn xoắn, dưới chân có cuộn hoa văn — cộng sáng (ADD).
  python3 -I tools/art/hoang_chung.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')

# bảng màu vàng theo độ sáng 0..1
GOLD = np.array([[0.00, 70, 34, 6], [0.30, 150, 88, 18], [0.55, 214, 152, 40], [0.78, 246, 204, 92],
                 [0.92, 255, 236, 160], [1.00, 255, 252, 226]], float)
JADE = np.array([[0.0, 20, 80, 70], [0.5, 70, 160, 140], [1.0, 170, 230, 210]], float)


def ramp(v, pal):
    v = np.clip(v, 0, 1)
    out = np.zeros(v.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(v, pal[:, 0], pal[:, c + 1])
    return out


def bell():
    S = 3
    W, H = 256, 320
    w, h = W * S, H * S
    yy, xx = np.mgrid[0:h, 0:w].astype(float) / S
    x = xx - W / 2
    CURV = 0.09                                                          # độ cong elip của các đường ngang (nhìn từ trên)

    # --- hồ sơ thân chuông: nửa bề rộng theo y (mép trên các dải đều cong theo elip)
    prof_y = np.array([118, 126, 136, 148, 156, 170, 200, 230, 250, 262, 274, 288])
    prof_w = np.array([22, 44, 58, 68, 72, 74, 79, 88, 98, 106, 112, 114])
    hw = np.interp(yy, prof_y, prof_w)
    u = np.clip(x / np.maximum(hw, 1), -1, 1)
    n = np.sqrt(np.clip(1 - u ** 2, 0, 1))
    yc = yy - CURV * hw * n                                              # toạ độ dọc đã "duỗi" đường cong elip
    bottom = 288 + CURV * 114 * n * 1.4
    body = (np.abs(x) < hw) & (yy >= 116) & (yy <= bottom)
    # vòm trên: elip
    dome = ((x / 72) ** 2 + ((yy - 152) / 36) ** 2 <= 1) & (yy < 156)
    body = body | dome

    # chiếu sáng trụ: sáng bên trái-giữa, tối hai mép, vệt bóng loáng dọc
    lit = 0.18 + 0.62 * n * (0.75 - 0.35 * u) + 0.55 * np.exp(-((u + 0.38) / 0.11) ** 2) + 0.18 * np.exp(-((u - 0.55) / 0.08) ** 2)
    domeu = np.clip(x / 72, -1, 1)
    # dải ngang: (y0, y1, nổi(+)/lõm(-))
    bands = [(150, 160, 0.18), (160, 164, -0.25), (236, 246, 0.2), (246, 250, -0.2), (250, 274, 0.1), (274, 278, -0.25),
             (278, 300, 0.12)]
    for y0, y1, k in bands:
        m = (yc >= y0) & (yc < y1)
        prof = np.sin(np.clip((yc - y0) / (y1 - y0), 0, 1) * np.pi)
        lit = np.where(m, lit + k * (0.6 + 0.4 * prof) - (0.12 if k > 0 else 0) * (1 - prof), lit)
    # rãnh mảnh
    for yg in (150, 164, 236, 250, 274, 278):
        lit -= 0.35 * np.exp(-((yc - yg) / 0.9) ** 2)
        lit += 0.25 * np.exp(-((yc - yg - 1.6) / 0.8) ** 2)
    # nhiễu kim loại nhẹ (vân đúc)
    rng = np.random.default_rng(3)
    noise = np.array(Image.fromarray((rng.random((H // 2, W // 2)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(float) / 255
    lit += (noise - 0.5) * 0.08
    col = ramp(lit, GOLD)

    # --- men ngọc: hoa văn sóng/tim trên thân (dải 172-226)
    jade = np.zeros((h, w))
    jlit = np.zeros((h, w))
    ang = np.arcsin(u)                                                   # góc quanh trục chuông → hoa văn bám mặt cong
    per = 2 * np.pi / 5
    ph = (ang + per / 2) % per / per - 0.5                               # -0.5..0.5 trong mỗi ô hoa văn
    yv = (yc - 172) / 54                                                 # 0..1 trong dải
    # hình "tim lật" / cánh dơi: mép trên lượn sóng 2 bướu, đáy nhọn
    top = 0.16 + 0.16 * np.cos(ph * 2 * np.pi * 2) ** 2 * (np.abs(ph) > 0.06)
    bot = 0.82 - 1.1 * np.abs(ph) ** 1.2
    heart = (yv > top) & (yv < bot) & (np.abs(ph) < 0.44) & body
    edge = heart & ~((yv > top + 0.07) & (yv < bot - 0.07) & (np.abs(ph) < 0.40))
    inner = heart & ~edge
    jade = np.where(inner, 1, 0).astype(float)
    jlit = 0.35 + 0.5 * n * (1 - 0.3 * u) + 0.25 * (1 - yv)
    # chồi lá vàng giữa ô
    leaf = (np.abs(ph) * 3.2 + np.abs(yv - 0.5) / 0.22 < 1) & inner
    # --- hạt men ngọc tròn trên dải chân (250-274) xen hoa thị vàng
    yb = (yc - 262) / 9
    per2 = 2 * np.pi / 14
    ph2 = (ang + per2 / 2) % per2 / per2 - 0.5
    dot = ((ph2 / 0.24) ** 2 + yb ** 2 < 1) & body & (np.abs(u) < 0.97)
    dot_rim = ((ph2 / 0.3) ** 2 + (yb / 1.2) ** 2 < 1) & body & ~dot & (np.abs(u) < 0.97)
    # chấm men nhỏ ở dải vai
    ys = (yc - 155) / 3.5
    per3 = 2 * np.pi / 18
    ph3 = (ang + per3 / 2) % per3 / per3 - 0.5
    sdot = ((ph3 / 0.18) ** 2 + ys ** 2 < 1) & body

    jcol = ramp(jlit, JADE)
    col = np.where((jade > 0)[..., None] | dot[..., None] | sdot[..., None], jcol, col)
    col = np.where(edge[..., None] | dot_rim[..., None], ramp(lit + 0.15, GOLD), col)
    col = np.where(leaf[..., None], ramp(lit + 0.25, GOLD), col)
    # bóng trong lòng chuông ở vành đáy (thấy mép trong tối)
    inner_rim = body & (yy > 288 + CURV * 114 * n * 1.4 - 5) & (yy > 286)
    col = np.where(inner_rim[..., None], col * 0.55, col)

    A = body.astype(float)

    # --- vòm đè lên trên (đã nằm trong body; tô lại sáng kiểu cầu)
    dz = np.sqrt(np.clip(1 - (x / 72) ** 2 - ((yy - 156) / 40) ** 2, 0, 1))
    dlit = 0.2 + 0.7 * dz * (0.8 - 0.35 * domeu) + 0.5 * np.exp(-(((x + 24) / 12) ** 2 + ((yy - 132) / 9) ** 2))
    dm = dome & (yc < 150)
    col = np.where(dm[..., None], ramp(dlit, GOLD), col)

    # --- cổ + chóp nhỏ + vòng treo + núm giọt nước
    def solid_round(mask, cx, cy, rx, ry, base=0.2):
        d = np.sqrt(np.clip(1 - ((x - cx) / rx) ** 2 - ((yy - cy) / ry) ** 2, 0, 1))
        return 0.15 + 0.75 * d * (0.85 - 0.4 * (x - cx) / rx) + 0.6 * np.exp(-(((x - cx + rx * 0.35) / (rx * 0.18)) ** 2 + ((yy - cy + ry * 0.3) / (ry * 0.2)) ** 2)) + base * 0

    parts = []
    # cổ (trụ ngắn)
    neck = (np.abs(x) < 14 - (yy - 104) * 0.1) & (yy > 100) & (yy < 120)
    parts.append((neck, 0.2 + 0.6 * np.sqrt(np.clip(1 - (x / 14) ** 2, 0, 1)) * (0.85 - 0.35 * x / 14) + 0.5 * np.exp(-((x + 5) / 2.5) ** 2)))
    # đế chóp
    cap = ((x / 18) ** 2 + ((yy - 104) / 6) ** 2 <= 1)
    parts.append((cap, solid_round(cap, 0, 104, 18, 6)))
    # chóp nhọn giữa vòng (búp)
    tt = np.clip((100 - yy) / 26, 0, 1)
    bud = (np.abs(x) < 7 * np.sin(np.clip(tt, 0, 1) * np.pi) ** 0.8 * (1 - tt * 0.3)) & (yy < 100) & (yy > 74)
    parts.append((bud, 0.25 + 0.7 * np.sqrt(np.clip(1 - (x / 7) ** 2, 0, 1)) * (0.9 - 0.4 * x / 7) + 0.4 * np.exp(-((x + 2.5) / 1.5) ** 2)))
    # vòng treo (xuyến): elip rỗng
    rx, ry, cy = 30, 26, 72
    rr = np.sqrt((x / rx) ** 2 + ((yy - cy) / ry) ** 2)
    ring = (rr > 0.72) & (rr < 1.0)
    tr = (rr - 0.86) / 0.14                                              # -1..1 qua tiết diện vòng
    rlit = 0.2 + 0.7 * np.sqrt(np.clip(1 - tr ** 2, 0, 1)) * (0.85 - 0.3 * x / rx) + 0.5 * np.exp(-((tr + 0.35) / 0.25) ** 2) * (x < 0)
    parts.append((ring, rlit))
    # núm giọt nước trên đỉnh + gờ đỡ
    collar = ((x / 16) ** 2 + ((yy - 46) / 6) ** 2 <= 1)
    parts.append((collar, solid_round(collar, 0, 46, 16, 6)))
    t2 = np.clip((44 - yy) / 34, 0, 1)
    dropw = 17 * np.sin(np.clip(t2, 0, 1) ** 0.75 * np.pi) ** 0.9
    drop = (np.abs(x) < dropw) & (yy < 44) & (yy > 10)
    parts.append((drop, 0.2 + 0.7 * np.sqrt(np.clip(1 - (x / np.maximum(dropw, 1)) ** 2, 0, 1)) * (0.9 - 0.4 * x / 17) + 0.6 * np.exp(-(((x + 6) / 3) ** 2 + ((yy - 26) / 7) ** 2))))
    for m, lv in parts:
        col = np.where(m[..., None], ramp(lv, GOLD), col)
        A = np.maximum(A, m.astype(float))

    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS)
    img.save(os.path.join(VFX, 'hoang_chung_bell.png'))
    return img


def bez(p0, p1, p2, p3, n=80):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def wing():
    """cánh lửa vàng TRÁI: gốc ở góc dưới-phải (sát vai chuông)"""
    S = 3
    W, H = 200, 320
    OFF = np.array([0, 16.])                                             # chừa lề trên cho ngọn lửa
    core = Image.new('L', (W * S, H * S), 0)
    body = Image.new('L', (W * S, H * S), 0)
    dc, db = ImageDraw.Draw(core), ImageDraw.Draw(body)

    def stroke(pts, w0, w1=0.6, curl=None):
        pts = np.array(pts, float) + OFF
        n = len(pts)
        for i in range(n - 1):
            t = i / (n - 1)
            w = w0 * (1 - t) ** 0.8 + w1 * t
            a, b = pts[i] * S, pts[i + 1] * S
            db.line([tuple(a), tuple(b)], fill=255, width=max(1, int(w * S)))
            db.ellipse([a[0] - w * S / 2, a[1] - w * S / 2, a[0] + w * S / 2, a[1] + w * S / 2], fill=255)
            cw = max(1, int(w * 0.45 * S))
            dc.line([tuple(a), tuple(b)], fill=255, width=cw)

    def flame(pts, w0):
        """dải lửa dạng lá: đặc, phình giữa, nhọn ngọn; lõi sáng chạy dọc lệch về một bên"""
        pts = np.array(pts, float) + OFF
        d = np.gradient(pts, axis=0)
        d /= np.maximum(np.hypot(d[:, 0], d[:, 1])[:, None], 1e-6)
        nrm = np.stack([-d[:, 1], d[:, 0]], 1)
        t = np.linspace(0, 1, len(pts))[:, None]
        w = w0 * (0.35 + 0.65 * np.sin(np.pi * t * 0.9 + 0.15)) * (1 - t) ** 0.55
        L, R = pts + nrm * w / 2, pts - nrm * w / 2
        db.polygon([tuple(q * S) for q in np.vstack([L, R[::-1]])], fill=255)
        cl = pts + nrm * w * 0.12
        dc.line([tuple(q * S) for q in cl[:-3]], fill=255, width=max(1, int(w0 * 0.22 * S)))

    def curve(*segs):
        return np.vstack([bez(*[np.array(q, float) for q in sg], n=60) for sg in segs])

    # gốc cánh sát hông chuông (≈170, 260); các chùm lửa vút LÊN, uốn chữ S như mẫu
    flame(curve(((172, 266), (104, 222), (168, 112), (138, 22)), ((138, 22), (134, 10), (146, 2), (162, 6))), 46)   # chùm cao, ngọn cuộn vào trong
    flame(curve(((152, 254), (80, 232), (66, 150), (26, 112)), ((26, 112), (16, 100), (12, 90), (18, 80))), 36)      # chùm ngoài, ngọn hất lên
    flame(curve(((182, 236), (150, 186), (190, 130), (174, 68))), 18)                                               # chùm mảnh trong
    flame(curve(((140, 274), (92, 274), (56, 244), (24, 252))), 20)                                                 # chùm dưới
    flame(curve(((160, 244), (112, 206), (110, 150), (92, 118))), 14)
    # lưỡi lửa phụ tách ra từ mép ngoài các chùm (như lông vũ)
    for sg, w in ((((128, 168), (104, 150), (96, 120), (70, 92)), 16), (((140, 96), (120, 80), (118, 58), (102, 40)), 13),
                  (((60, 160), (44, 150), (34, 136), (36, 120)), 12), (((96, 238), (70, 226), (50, 206), (40, 186)), 12)):
        flame(curve(sg), w)
    # cuộn xoắn hoa văn
    for cx, cy, r0, a0, turns, w in ((160, 262, 19, 0.5, 1.3, 9), (78, 200, 12, -0.3, 1.2, 6), (122, 160, 9, 2.6, 1.1, 5)):
        th = np.linspace(0, turns * 2 * np.pi, 90)
        r = r0 * (1 - th / (turns * 2 * np.pi) * 0.85)
        pts = np.stack([cx + r * np.cos(th + a0), cy + r * np.sin(th + a0)], 1)
        stroke(pts, w, 1.5)

    b = np.array(body.resize((W, H), Image.LANCZOS)).astype(float) / 255
    c = np.array(core.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
    g1 = np.array(body.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))).astype(float) / 255
    g2 = np.array(body.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(12))).astype(float) / 255
    # tia lửa li ti
    rng = np.random.default_rng(9)
    sp = np.zeros((H, W))
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    for _ in range(40):
        px, py = rng.uniform(10, 190), rng.uniform(10, 310)
        if g2[int(py), int(px)] < 0.05:
            continue
        sp += np.exp(-((xx - px) ** 2 + (yy - py) ** 2) / (2 * rng.uniform(0.6, 1.3) ** 2)) * rng.uniform(0.5, 1)
    acc = (b[..., None] * np.array([240, 172, 44.]) * 0.85 + c[..., None] * np.array([255, 236, 150.]) * 0.8
           + g1[..., None] * np.array([255, 190, 60.]) * 0.55 + g2[..., None] * np.array([255, 170, 40.]) * 0.35
           + sp[..., None] * np.array([255, 240, 180.]))
    acc = np.clip(acc, 0, 255)
    A = acc.max(2) / 255
    colr = acc / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(colr, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    img.save(os.path.join(VFX, 'hoang_chung_wing.png'))
    return img


def preview(bl, wg):
    W, H = 620, 420
    bg = np.zeros((H, W, 3)) + np.array([26, 24, 40.])
    def add(img, ox, oy, flip=False):
        a = np.array(img.transpose(Image.FLIP_LEFT_RIGHT) if flip else img).astype(float)
        h, w = a.shape[:2]
        reg = bg[oy:oy + h, ox:ox + w]
        reg += a[..., :3] * a[..., 3:] / 255
        np.clip(reg, 0, 255, out=reg)
    def over(img, ox, oy):
        a = np.array(img).astype(float)
        h, w = a.shape[:2]
        al = a[..., 3:] / 255
        bg[oy:oy + h, ox:ox + w] = bg[oy:oy + h, ox:ox + w] * (1 - al) + a[..., :3] * al
    add(wg, 180 - 200 + 60, 40)
    add(wg, 180 + 256 - 60 - 0, 40, flip=True)
    over(bl, 180, 60)
    pv = Image.fromarray(bg.astype(np.uint8))
    pv.save(os.path.join(OUT, 'hoang_chung_preview.png'))


FIRE = np.array([[0.00, 0, 0, 0], [0.15, 110, 40, 0], [0.35, 225, 125, 20], [0.55, 255, 182, 52],
                 [0.75, 255, 222, 112], [0.90, 255, 236, 160], [1.00, 255, 252, 230]], float)


def energy():
    """KIM CHUNG năng lượng (theo mẫu ref2/ref3): chuông vàng TRONG SUỐT phát sáng, viền rực + lửa liếm quanh viền,
    hoa văn khắc (dải ngang, ô lưới, hàng hạt) phát sáng mờ, vành đáy lượn sóng. Cộng sáng (ADD) → thấy nhân vật bên trong.
    → hoang_chung_energy.png 256×300, gốc game (0.5, 0.94) ≈ giữa vành đáy"""
    from scipy import ndimage
    S = 2
    W, H = 256, 300
    w, h = W * S, H * S
    yy, xx = np.mgrid[0:h, 0:w].astype(float) / S
    x = xx - W / 2
    CURV = 0.08
    prof_y = np.array([62, 70, 82, 96, 110, 160, 210, 232, 250, 262])
    prof_w = np.array([34, 52, 64, 70, 72, 75, 80, 90, 104, 110])
    hw = np.interp(yy, prof_y, prof_w)
    u = np.clip(x / np.maximum(hw, 1), -1, 1)
    n = np.sqrt(np.clip(1 - u ** 2, 0, 1))
    yc = yy - CURV * hw * n
    ang = np.arcsin(u)
    # vành đáy lượn sóng: 5 múi nhìn thấy, múi cong xuống
    lobes = np.abs(np.cos(ang * 2.5))
    bottom = 262 + CURV * 110 * n * 1.3 + 9 * lobes ** 0.6
    top_dome = ((x / 52) ** 2 + ((yy - 72) / 14) ** 2 <= 1)
    M = ((np.abs(x) < hw) & (yy >= 70) & (yy <= bottom)) | top_dome
    # núm: thân trụ + 2 sừng cuộn (rồng cách điệu) + chóp
    knob = (np.abs(x) < 9) & (yy > 40) & (yy < 64)
    knob |= ((x / 7) ** 2 + ((yy - 34) / 10) ** 2 <= 1)
    for sgn in (-1, 1):
        th = np.linspace(0, 1.3 * np.pi, 40)
        cx, cy = sgn * 16, 50
        for t_ in th:
            r = 10 - t_ * 2
            px, py = cx + sgn * r * np.cos(t_ + np.pi / 2), cy - r * np.sin(t_ + np.pi / 2) * 0.9
            knob |= ((x - px) ** 2 + (yy - py) ** 2 <= 3.2 ** 2)
    M |= knob
    Mf = M.astype(float)
    din = ndimage.distance_transform_edt(M) / S                          # khoảng cách vào trong từ mép
    dout = ndimage.distance_transform_edt(~M) / S                        # khoảng cách ra ngoài
    # khối trong: mờ, sáng dần về 2 mép (hiệu ứng thuỷ tinh/năng lượng)
    fill = Mf * (0.08 + 0.4 * np.abs(u) ** 3 + 0.06 * (1 - n))
    rim = Mf * (np.exp(-din / 2.0) * 0.95 + np.exp(-din / 9) * 0.35)
    # hoa văn khắc phát sáng
    eng = np.zeros_like(fill)
    for yg in (96, 104, 170, 178, 214, 222, 246):                         # dải ngang
        eng += np.exp(-((yc - yg) / 1.1) ** 2) * 0.75
    per = 2 * np.pi / 6
    ph = (ang + per / 2) % per / per - 0.5
    panel = (yc > 108) & (yc < 168)
    eng += panel * np.exp(-((np.abs(ph) - 0.5) * 2 * np.pi / per * hw / 1.6) ** 2 * 0) * 0
    eng += panel * np.exp(-(((np.abs(ph) - 0.46) * hw * per) / 1.2) ** 2) * 0.7          # khung ô dọc
    # ô lưới chữ (như văn khắc) trong các ô
    gx = (ph * hw * per) % 7 / 7
    gy = (yc - 112) % 9 / 9
    grid = panel & (np.abs(ph) < 0.38) & (((gx < 0.22) & (gy < 0.65)) | ((gy < 0.18) & (gx < 0.75)))
    eng += grid * 0.38
    # dải giữa: hoa văn sóng
    band2 = (yc > 180) & (yc < 212)
    wave = np.exp(-((yc - 196 - 6 * np.sin(ang * 9)) / 1.3) ** 2) + np.exp(-((yc - 196 + 6 * np.sin(ang * 9)) / 1.3) ** 2)
    eng += band2 * wave * 0.5
    # hàng hạt tròn ở chân
    per2 = 2 * np.pi / 16
    ph2 = (ang + per2 / 2) % per2 / per2 - 0.5
    bead = np.sqrt((ph2 * hw * per2 / 4.2) ** 2 + ((yc - 234) / 4.2) ** 2)
    eng += np.exp(-((bead - 1) / 0.25) ** 2) * 0.7 + (bead < 0.6) * 0.35
    eng *= Mf * (0.45 + 0.55 * n)
    # lửa liếm quanh viền: vệt sáng ngoài mép bị nhiễu, kéo dài lên trên
    rng = np.random.default_rng(4)
    nz = rng.random((14, 10))
    nz = np.array(Image.fromarray((nz * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(float) / 255
    nz2 = rng.random((60, 30))
    nz2 = np.array(Image.fromarray((nz2 * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(float) / 255
    flick = 3 + 9 * nz * nz2
    # dịch nhiễu lên trên (lửa bốc lên): dùng khoảng cách tới mép từ điểm thấp hơn một chút
    up = np.roll(dout, -int(6 * S), axis=0)
    flame = np.exp(-np.minimum(dout, up * 1.3) / flick) * (1 - Mf) * 0.75
    halo = np.exp(-dout / 22) * (1 - Mf) * 0.28
    win = np.clip(np.minimum.reduce([xx, W - xx, yy, H - yy]) / 24, 0, 1)   # tắt dần trước mép ảnh → không lộ khung
    inten = np.clip(fill + rim + eng + (flame + halo) * win, 0, 1.25)
    inten = ndimage.zoom(inten, 1 / S, order=1)
    col = ramp(inten, FIRE)
    A = np.clip(col.max(2) / 255, 0, 1)
    colr = col / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(colr, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    img.save(os.path.join(VFX, 'hoang_chung_energy.png'))
    return img


def ground():
    """vòng sáng dưới đất (elip) + gợn sóng — đặt dưới chân chuông"""
    W, H = 320, 120
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    x, y = (xx - W / 2) / 140, (yy - H / 2) / 46
    r = np.sqrt(x ** 2 + y ** 2)
    ring = np.exp(-((r - 0.82) / 0.05) ** 2) + 0.5 * np.exp(-((r - 0.62) / 0.035) ** 2) + 0.3 * np.exp(-((r - 0.97) / 0.03) ** 2)
    glow = np.exp(-(r / 0.55) ** 2) * 0.45
    inten = np.clip((ring * 0.8 + glow) * (r < 1.05), 0, 1)
    col = ramp(inten * 0.9, FIRE)
    A = np.clip(col.max(2) / 255, 0, 1)
    colr = col / np.maximum(A[..., None], 1e-3)
    img = Image.fromarray(np.dstack([np.clip(colr, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    img.save(os.path.join(VFX, 'hoang_chung_ground.png'))
    return img


def preview_energy(eb, gr):
    W, H = 420, 420
    bg = np.zeros((H, W, 3)) + np.array([26, 24, 40.])
    hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    fw, fh = 52, 68
    cols = hero.width // fw
    fr = hero.crop(((6 % cols) * fw, (6 // cols) * fh, (6 % cols + 1) * fw, (6 // cols + 1) * fh)).resize((104, 136), Image.NEAREST)

    def add(img, ox, oy):
        a = np.array(img).astype(float)
        h, w = a.shape[:2]
        reg = bg[oy:oy + h, ox:ox + w]
        reg += a[..., :3] * a[..., 3:] / 255
        np.clip(reg, 0, 255, out=reg)

    def over(img, ox, oy):
        a = np.array(img).astype(float)
        h, w = a.shape[:2]
        al = a[..., 3:] / 255
        bg[oy:oy + h, ox:ox + w] = bg[oy:oy + h, ox:ox + w] * (1 - al) + a[..., :3] * al
    add(gr, 50, 274)
    over(fr, 158, 196)
    add(eb, 82, 60)
    Image.fromarray(bg.astype(np.uint8)).save(os.path.join(OUT, 'hoang_chung_energy_preview.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    b = bell()
    w = wing()
    preview(b, w)
    preview_energy(energy(), ground())
