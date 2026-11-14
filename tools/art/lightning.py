"""
CỬU TIÊU THẦN LÔI — sét lấy từ ảnh mẫu (tools/art/ref/lightning_ref_*):
  · lightning_ref_55.png : 5 khung tia sét giáng (xuất hiện → đánh → tắt), nền đen → bảng khung cộng sáng
        → public/vfx/thunder_strike.png (+ _aw tím cho thức tỉnh)
  · lightning_ref_59.png : hàng dưới là MẶT NẠ ĐEN của 5 tia sét hàng trên → lấy hình tia, tô lõi trắng + viền lam,
        dựng ngang (đầu trái → cuối phải) để game kéo dài nối giữa 2 quái (sét lan)
        → public/vfx/thunder_arc.png (5 khung) (+ _aw)
  (nổ tàn dư của kiếp lôi: xem tools/art/lightning_residue.py)
  python3 -I tools/art/lightning.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
REF = os.path.join(HERE, 'ref')


def to_add(rgb, floor=6):
    """ảnh nền đen → RGBA cộng sáng (độ đục = kênh sáng nhất, màu giữ nguyên)"""
    rgb = np.clip(rgb - floor, 0, 255)
    A = rgb.max(2) / 255
    col = rgb / np.maximum(A[..., None], 1e-3)
    return np.dstack([np.clip(col, 0, 255), A * 255])


def purple(rgba):
    """bản tím cho thức tỉnh: xoay màu lam → tím, giữ độ sáng"""
    o = rgba.copy()
    r, g, b = o[..., 0], o[..., 1], o[..., 2]
    lum = (r + g + b) / 3
    o[..., 0] = np.clip(0.55 * b + 0.6 * lum, 0, 255)
    o[..., 1] = np.clip(0.35 * g + 0.35 * lum, 0, 255)
    o[..., 2] = np.clip(b * 1.0 + 0.1 * lum, 0, 255)
    return o


def save(arr, name):
    Image.fromarray(arr.astype(np.uint8), 'RGBA').save(os.path.join(VFX, name))


def strike():
    a = np.array(Image.open(os.path.join(REF, 'lightning_ref_55.png')).convert('RGB')).astype(float)
    H, W = a.shape[:2]
    FW = W // 5
    frames = [to_add(a[:, i * FW:(i + 1) * FW]) for i in range(5)]
    sheet = np.concatenate(frames, 1)
    save(sheet, 'thunder_strike.png'); save(purple(sheet), 'thunder_strike_aw.png')
    # điểm chạm đất: đáy vùng sáng ở khung 1 (đánh mạnh nhất)
    al = frames[1][..., 3]
    ys, xs = np.nonzero(al > 120)
    gy = ys.max(); gx = xs[ys > gy - 15].mean()
    print('strike', FW, H, 'ground', round(gx / FW, 3), round(gy / H, 3))


def arc():
    a = np.array(Image.open(os.path.join(REF, 'lightning_ref_59.png')).convert('RGB')).astype(float)
    mask = np.clip((90 - a[425:, :].mean(2)) / 70, 0, 1)                  # hàng dưới: nét đen = hình tia
    lab, n = ndimage.label(ndimage.binary_dilation(mask > 0.3, iterations=3))
    objs = sorted(ndimage.find_objects(lab), key=lambda sl: sl[1].start)
    big = [sl for sl in objs if (sl[0].stop - sl[0].start) > 200][:5]
    print('arc objs', [(sl[1].start, sl[0].stop - sl[0].start) for sl in objs if (sl[0].stop - sl[0].start) > 60])
    LW, LH = 320, 64                                                      # khung ngang: dài × cao
    tiles = []
    for sl in big:
        m = mask[sl]
        h, w = m.shape
        img = Image.fromarray((m * 255).astype(np.uint8)).rotate(90, expand=True)   # dọc → ngang (đầu trên → trái)
        img = img.resize((LW - 16, LH - 16), Image.LANCZOS)
        mm = np.zeros((LH, LW)); mm[8:-8, 8:-8] = np.array(img) / 255
        core = np.clip(mm * 1.3, 0, 1)
        glow = ndimage.gaussian_filter(mm, 3) * 1.6
        col = np.array([70, 160, 255.]) * (1 - core[..., None]) + np.array([225, 245, 255.]) * core[..., None]
        A = np.clip(np.maximum(core, glow * 0.8), 0, 1)
        tiles.append(np.dstack([col, A * 255]))
    sheet = np.concatenate(tiles, 1)
    save(sheet, 'thunder_arc.png'); save(purple(sheet), 'thunder_arc_aw.png')
    print('arc', len(tiles), LW, LH)


def preview():
    pv = Image.new('RGB', (1500, 900), (26, 24, 40))
    y = 0
    for name in ('thunder_strike', 'thunder_strike_aw', 'thunder_arc', 'thunder_arc_aw'):
        im = Image.open(os.path.join(VFX, name + '.png'))
        a = np.array(im).astype(float)
        base = np.clip(np.full(a.shape[:2] + (3,), (26, 24, 40.)) + a[..., :3] * a[..., 3:] / 255, 0, 255)
        b = Image.fromarray(base.astype(np.uint8))
        b.thumbnail((1500, 300))
        pv.paste(b, (0, y)); y += b.height + 4
    pv.save(os.path.join(OUT, 'thunder_preview.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    strike(); arc(); preview()
