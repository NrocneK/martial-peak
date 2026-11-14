"""
BÁ ĐAO — ĐAO KHÍ: giữ NGUYÊN DÁNG thanh đao tách từ mẫu (public/vfx/ba_dao_blade.png ← tools/art/ba_dao_blade.py),
vẽ lại thành đao bằng KHÍ theo phong cách kiếm khí Ngự Kiếm Thuật (qi_sword_light.png):
  · thân đao = LÕI SÁNG trắng chói (sáng nhẹ hơn ở giữa thân, gợi lại rãnh + ngọc của mẫu bằng vệt sáng mạnh hơn)
  · viền = QUẦNG khí mềm bao quanh dáng đao (sát viền đậm, toả dần ra ngoài)
  · vài SỢI KHÍ mảnh cong lượn dọc thân + BỤI SÁNG li ti
  Tách 2 lớp CÙNG KHUNG (như qi_blade.py) để game đổi màu:
  · ba_dao_qi_core.png : lõi trắng (cộng sáng, giữ trắng)
  · ba_dao_qi_rim.png  : quầng + sợi khí + bụi, ảnh TRẮNG giữ độ đậm → game tô màu (tím Bá Đao)
  Nằm ngang, mũi sang PHẢI.   python3 -I tools/art/ba_dao_qi.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
WOUT = 520                                                               # bề ngang thân đao trong ảnh ra
PAD = 22


def main():
    os.makedirs(OUT, exist_ok=True)
    SS = 3                                                               # tính ở độ phân giải gấp 3 → mép mịn
    src = Image.open(os.path.join(VFX, 'ba_dao_blade.png')).convert('RGBA')
    h1 = round(src.height * WOUT / src.width)
    WO, PD = WOUT * SS, PAD * SS
    h = h1 * SS
    src = src.resize((WO, h), Image.LANCZOS)
    a0 = np.array(src).astype(float)
    W, H = WO + 2 * PD, h + 2 * PD
    M = np.zeros((H, W)); M[PD:PD + h, PD:PD + WO] = a0[..., 3] / 255
    L = np.zeros((H, W)); L[PD:PD + h, PD:PD + WO] = a0[..., :3].mean(2) / 255
    P = np.zeros((H, W))                                                 # chỗ tím rực của mẫu (rãnh, ngọc)
    rgb = a0[..., :3] / 255
    P[PD:PD + h, PD:PD + WO] = np.clip((rgb[..., 2] - rgb[..., 1] - 0.25) / 0.3, 0, 1) * (a0[..., 3] / 255)
    inside = M > 0.5
    din = ndimage.distance_transform_edt(inside) / SS
    dout = ndimage.distance_transform_edt(~inside) / SS
    # LÕI: đầy thân đao, sáng nhất ở phần dày, viền trong hơi dịu; rãnh + ngọc của mẫu sáng gắt hơn
    # lõi thu vào trong (mép thân để quầng màu hiện ra → rõ dáng gai, chắn tay); nét bên trong của mẫu (ranh giới chuôi,
    # chắn tay, gai, rãnh) thành vân mờ hơn trên lõi → giữ đúng chi tiết hình dáng
    gm = ndimage.gaussian_gradient_magnitude(ndimage.gaussian_filter(L, 2.0), 2.5)
    lines = ndimage.gaussian_filter(np.clip((gm - 0.018) / 0.04, 0, 1), 1.5)   # chỉ nét chính, mềm
    # CHUYỂN MÀU TỪ TÂM RA RÌA: u = 0 ở mép … 1 ở trục giữa thân (chuẩn theo độ dày thân tại chỗ đó)
    half = ndimage.maximum_filter(din, size=int(14 * SS))                 # nửa bề dày thân quanh điểm đang xét
    u = np.clip(din / np.maximum(half, 1e-3), 0, 1) * inside
    # lõi trắng DỊU HƠN và chỉ ở giữa thân, tắt dần ra rìa (dải tím ở rìa dày hơn)
    core = 0.62 * np.clip((u - 0.3) / 0.55, 0, 1) ** 1.3 * (1 - 0.4 * lines)
    core = np.clip(core + ndimage.gaussian_filter(P, 2) * 0.5 * inside, 0, 1)
    # QUẦNG: sát viền đậm, toả mềm ra ngoài
    rim = np.exp(-dout / 2.0) * 0.9 + np.exp(-dout / 7) * 0.38 + np.exp(-dout / 16) * 0.15
    rim = np.where(inside, (0.35 + 0.65 * np.clip(1 - u / 0.75, 0, 1) ** 0.8) * (0.8 + 0.2 * lines), rim)   # tím đậm ở rìa → nhạt dần vào tâm
    # SỢI KHÍ cong lượn dọc thân + BỤI SÁNG
    # thu về kích thước thật rồi mới thêm sợi khí + bụi
    def down(a):
        return np.array(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((W // SS, H // SS), Image.LANCZOS)).astype(float) / 255
    core, rim, inside_f, dout = down(core), down(rim), down(inside.astype(float)), down(np.clip(dout / 40, 0, 1)) * 40
    inside = inside_f > 0.5
    W, H = W // SS, H // SS
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    rng = np.random.default_rng(11)
    ys_in = np.nonzero(inside.any(1))[0]
    cy = (ys_in.min() + ys_in.max()) / 2
    wisp = np.zeros((H, W))
    for amp, ph, off, x0, x1 in ((7, 0.3, -9, 0.15, 0.85), (6, 2.1, 10, 0.3, 0.98), (5, 4.0, -15, 0.05, 0.6)):
        t = (xx - PAD) / WOUT
        yc = cy + off + amp * np.sin(t * np.pi * 2.2 + ph)
        span = np.clip(np.minimum(t - x0, x1 - t) / 0.08, 0, 1)
        wisp += np.exp(-((yy - yc) / 0.7) ** 2) * span * 0.55
    dust = np.zeros((H, W))
    for _ in range(36):
        px, py = rng.uniform(PAD * 0.5, W - PAD * 0.5), rng.uniform(4, H - 4)
        if dout[int(py), int(px)] > 18:
            continue
        dust += np.exp(-((xx - px) ** 2 + (yy - py) ** 2) / (2 * rng.uniform(0.5, 1.0) ** 2)) * rng.uniform(0.5, 1)
    win = np.clip(np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]) / 6, 0, 1)
    wisp = wisp * np.where(inside, 0.25, 1.0)                              # sợi khí đè lên thân thì mờ đi
    rim = np.clip((rim + wisp + dust) * win, 0, 1)

    def save(alpha, name):
        w8 = np.full((H, W), 255.)
        Image.fromarray(np.dstack([w8, w8, w8, np.clip(alpha, 0, 1) * 255]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, name))
    save(core, 'ba_dao_qi_core.png')
    save(rim, 'ba_dao_qi_rim.png')
    # xem thử: quầng tím + lõi trắng cộng sáng, cạnh kiếm khí Ngự Kiếm Thuật
    bg = np.zeros((H, W, 3)) + np.array([26, 24, 40.])
    tint = np.array([200, 140, 255.])
    img = np.clip(bg + rim[..., None] * tint * 0.9 + core[..., None] * 235, 0, 255)
    qs = Image.open(os.path.join(VFX, 'qi_sword_light.png')).convert('RGBA')
    pv = Image.new('RGB', (W, H + qs.height + 10), (26, 24, 40))
    pv.paste(Image.fromarray(img.astype(np.uint8)), (0, 0))
    q = Image.new('RGBA', qs.size, (26, 24, 40, 255)); q.alpha_composite(qs)
    pv.paste(q.convert('RGB'), (PAD, H + 10))
    pv.resize((pv.width * 2, pv.height * 2), Image.LANCZOS).save(os.path.join(OUT, 'ba_dao_qi_preview.png'))
    print('kích thước', W, H)


if __name__ == '__main__':
    main()
