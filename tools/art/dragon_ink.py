"""
KHÍ LONG — rồng thủy mặc theo ảnh mẫu tools/art/ref/dragon_ink1.gif (khung 0).

  dragon_ink_head{,_aw}.png : ĐẦU tách từ khung 0 (độ đục = độ đậm mực so với nền trắng, giới hạn trong đường bao đầu),
                              xoay cho mõm hướng +x. Phần CỔ mờ dần (gradient dài) để các nét cọ thân phủ lên —
                              không có vết nối.
  dragon_ink_body{,_aw}.png : nét cọ thân = một ĐOẠN THÂN THẬT lấy từ cùng khung (chỗ thân dày giữa ảnh), xoay nằm
                              ngang, hai đầu mờ dần → đóng dấu chồng lên nhau dọc đường bay (cùng chất liệu với đầu).
Màu: nền game tối nên mực đen được nâng thành tím than + viền sáng; thức tỉnh = tím sét như mẫu, thường = lam mực.

  python3 -I tools/art/dragon_ink.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
HEAD_POLY = [(222, 196), (300, 150), (362, 140), (418, 168), (420, 262), (398, 305), (378, 350), (336, 336), (268, 296), (212, 254)]
NECK, SNOUT = (240, 210), (362, 336)
BODY_CS = [(150, 85), (195, 125), (245, 170)]                    # 3 đoạn thân lấy làm nét cọ
BODY_ANG, BODY_L, BODY_W = 45.0, 110, 76
UP = 4                                                            # phóng to trước khi xử lý cho mịn


def frame0():
    im = Image.open(os.path.join(HERE, 'ref', 'dragon_ink1.gif'))
    im.seek(0)
    im = im.convert('RGB')
    return im.resize((im.width * UP, im.height * UP), Image.LANCZOS)


def ink(src, tint, glow_col):
    """mực đậm → tím than (deep), vệt sét (điểm bão hoà màu cao) → sáng rực; giữ vân nét cọ theo độ đậm gốc"""
    a = np.array(src).astype(float)
    lum = a.mean(2)
    sat = a.max(2) - a.min(2)
    alpha = np.clip((222 - lum) / 120, 0, 1)
    alpha = np.maximum(alpha, np.clip((sat - 40) / 80, 0, 1) * (lum < 235))
    s = np.clip((sat - 35) / 110, 0, 1) ** 0.8                          # 0 = mực, 1 = sét
    dark = np.clip(lum / 140, 0, 1)[..., None]                          # vân mực: chỗ nhạt hơn sáng hơn chút
    deep = np.array(tint) * (0.55 + 0.6 * dark)
    ln = (lum / 255)[..., None]
    bright = np.clip(np.array(glow_col) * (0.55 + 0.7 * ln) + 120 * np.clip(ln - 0.6, 0, 1), 0, 255)   # sét: màu sét, lõi trắng
    col = np.clip(deep * (1 - s[..., None]) + bright * s[..., None], 0, 255)
    return col, alpha


def finish(col, alpha, glow_col, size=None):
    im = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
    if size:
        im = im.resize(size, Image.LANCZOS)
    g = np.array(im.filter(ImageFilter.GaussianBlur(3))).astype(float)
    g[..., :3] = glow_col
    g[..., 3] *= 0.4
    out = Image.fromarray(g.astype(np.uint8), 'RGBA')
    out.alpha_composite(im)
    return out


def rotate_about(im, center, ang_deg):
    W, H = im.size
    big = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0))
    big.paste(im, (W - int(center[0]), H - int(center[1])))
    return big.rotate(ang_deg, resample=Image.BICUBIC, center=(W, H)), (W, H)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = frame0()
    variants = {'': ((38, 52, 110), (90, 150, 255)), '_aw': ((72, 26, 112), (180, 90, 255))}
    for suf, (tint, gcol) in variants.items():
        col, alpha = ink(src, tint, gcol)
        # ---- đầu
        m = Image.new('L', src.size, 0)
        ImageDraw.Draw(m).polygon([(x * UP, y * UP) for x, y in HEAD_POLY], fill=255)
        a_head = alpha * np.array(m.filter(ImageFilter.GaussianBlur(6 * UP))) / 255
        # cổ mờ dần theo hướng cổ → mõm: 0 ở điểm cổ, 1 sau 45% chiều dài đầu
        yy, xx = np.mgrid[0:src.height, 0:src.width].astype(float)
        dx, dy = (SNOUT[0] - NECK[0]) * UP, (SNOUT[1] - NECK[1]) * UP
        L2 = dx * dx + dy * dy
        t = ((xx - NECK[0] * UP) * dx + (yy - NECK[1] * UP) * dy) / L2
        a_head *= np.clip(t / 0.45, 0, 1) ** 1.3
        head = Image.fromarray(np.dstack([col, a_head * 255]).astype(np.uint8), 'RGBA')
        ang = math.degrees(math.atan2(dy, dx))
        rot, (cx, cy) = rotate_about(head, (NECK[0] * UP, NECK[1] * UP), ang)
        bb = rot.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        bb = (min(bb[0], cx - 4), bb[1], bb[2], bb[3])                   # giữ điểm cổ trong khung
        crop = rot.crop(bb)
        k = 150 / crop.width
        sz = (150, round(crop.height * k))
        arr = np.array(crop.resize(sz, Image.LANCZOS)).astype(float)
        hd = finish(arr[..., :3], arr[..., 3] / 255, gcol)
        hd.save(os.path.join(VFX, f'dragon_ink_head{suf}.png'))
        if not suf:
            print('head', hd.size, 'neck origin', round((cx - bb[0]) / (bb[2] - bb[0]), 3), round((cy - bb[1]) / (bb[3] - bb[1]), 3))
        # ---- nét cọ thân: 3 đoạn thân thật ở 3 chỗ khác nhau dọc thân mẫu (tránh lặp hoa văn), xoay nằm ngang,
        #      2 đầu + 2 mép mờ dần
        body = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
        for vi, ctr in enumerate(BODY_CS):
            rotb, (bx, by) = rotate_about(body, (ctr[0] * UP, ctr[1] * UP), BODY_ANG)
            L, Wd = BODY_L * UP, BODY_W * UP
            strip = rotb.crop((bx - L // 2, by - Wd // 2, bx + L // 2, by + Wd // 2))
            sa = np.array(strip).astype(float)
            u = np.linspace(-1, 1, sa.shape[1])[None, :]
            v = np.linspace(-1, 1, sa.shape[0])[:, None]
            sa[..., 3] *= np.clip((1 - np.abs(u)) / 0.45, 0, 1) * np.clip((1 - np.abs(v)) / 0.35, 0, 1)
            bd = finish(sa[..., :3], sa[..., 3] / 255, gcol, size=(96, 56))
            bd.save(os.path.join(VFX, f'dragon_ink_body{vi}{suf}.png'))
    # xem thử trên nền tối của game
    pv = Image.new('RGBA', (560, 260), (26, 24, 40, 255))
    for i, suf in enumerate(('', '_aw')):
        h = Image.open(os.path.join(VFX, f'dragon_ink_head{suf}.png'))
        b = Image.open(os.path.join(VFX, f'dragon_ink_body1{suf}.png'))
        pv.alpha_composite(h, (10 + i * 280, 10))
        pv.alpha_composite(b, (10 + i * 280, 170))
    pv = pv.resize((1120, 520), Image.LANCZOS)
    pv.save(os.path.join(OUT, 'dragon_ink_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
