"""
KHÍ LONG — rồng bụi vàng theo ảnh mẫu tools/art/ref/dragon_ref.png (rồng vẽ bằng bụi cát vàng trên nền đen).

  dragon_head.png  : đầu rồng TÁCH từ ảnh mẫu (độ đục = độ sáng vượt nền đen, giới hạn trong đường bao đầu + bờm),
                     xoay cho mõm hướng +x; in ra toạ độ cổ (điểm nối thân) để đặt gốc trong game
  dragon_body.png  : nét cọ bụi vàng (thân) — hạt cát li ti, sọc dọc theo chiều thân, mép xơ
  dragon_mane.png  : chùm lông/vây dài mảnh bay ngược về sau (gốc ở mép trái)
  *_aw.png         : bản thức tỉnh (huyết long): cùng hình, tô lại theo dải đỏ thẫm → vàng ở chỗ sáng nhất

  python3 -I tools/art/dragon_gold.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
HEAD_POLY = [(45, 205), (95, 172), (150, 168), (200, 205), (240, 238), (262, 300), (262, 380), (255, 470), (205, 470),
             (160, 430), (110, 380), (70, 320), (42, 260)]
NECK = (195, 222)                  # chỗ cổ nối thân trong ảnh mẫu
SNOUT = (232, 440)                 # chóp mõm
GOLD = [(0.0, (40, 26, 6)), (0.35, (140, 100, 40)), (0.6, (214, 176, 96)), (0.8, (240, 214, 150)), (1.0, (255, 244, 210))]
BLOOD = [(0.0, (30, 2, 6)), (0.35, (120, 8, 20)), (0.6, (200, 24, 30)), (0.8, (250, 120, 60)), (1.0, (255, 230, 160))]


def ramp(t, stops):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def save_pair(lum, alpha, name):
    for stops, suf in ((GOLD, ''), (BLOOD, '_aw')):
        col = ramp(lum, stops)
        Image.fromarray(np.dstack([col, np.clip(alpha, 0, 1) * 255]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, f'{name}{suf}.png'))


def head():
    src = np.array(Image.open(os.path.join(HERE, 'ref', 'dragon_ref.png')).convert('RGB')).astype(float)
    lum = src.mean(2)
    alpha = np.clip((lum - 22) / 110, 0, 1)
    m = Image.new('L', (src.shape[1], src.shape[0]), 0)
    ImageDraw.Draw(m).polygon(HEAD_POLY, fill=255)
    alpha *= np.array(m.filter(ImageFilter.GaussianBlur(6))) / 255
    t = np.clip((lum - 20) / 200, 0, 1)
    ang = math.degrees(math.atan2(SNOUT[1] - NECK[1], SNOUT[0] - NECK[0]))
    out = {}
    for stops, suf in ((GOLD, ''), (BLOOD, '_aw')):
        col = ramp(t, stops) if suf else src
        im = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
        # xoay quanh cổ cho mõm hướng +x, rồi cắt
        W, H = im.size
        big = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0))
        big.paste(im, (W - NECK[0], H - NECK[1]))
        rot = big.rotate(ang, resample=Image.BICUBIC, center=(W, H))
        bb = rot.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        crop = rot.crop(bb)
        crop = crop.resize((crop.width // 2, crop.height // 2), Image.LANCZOS)
        crop.save(os.path.join(VFX, f'dragon_head{suf}.png'))
        out[suf] = crop
        if not suf:
            print('head', crop.size, 'neck origin', round((W - bb[0]) / (bb[2] - bb[0]), 3), round((H - bb[1]) / (bb[3] - bb[1]), 3))
    return out['']


def body(w=72, h=40):
    rng = np.random.default_rng(2)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    x, y = xx / w, yy / h - 0.5
    shape = np.clip(1 - (np.abs(y) / 0.42) ** 1.6, 0, 1) * np.clip(np.minimum(x, 1 - x) / 0.25, 0, 1)
    streak = 0.65 + 0.35 * np.sin(y * 60 + rng.random() * 6) * np.sin(y * 23 + 1)
    grain = rng.random((h, w))
    lum = np.clip(shape * streak * (0.55 + 0.6 * grain) + 0.25 * (np.abs(y) < 0.12) * shape, 0, 1)
    alpha = np.clip(shape * (0.55 + 0.6 * grain) * streak * 1.2, 0, 1)
    save_pair(lum, alpha, 'dragon_body')


def mane(w=80, h=36):
    rng = np.random.default_rng(9)
    im = Image.new('L', (w * 3, h * 3), 0)
    d = ImageDraw.Draw(im)
    for i in range(14):
        y0 = h * 3 * (0.35 + 0.3 * rng.random())
        bend = (rng.random() - 0.3) * h * 2.2
        L = w * 3 * (0.55 + 0.45 * rng.random())
        pts = [(L * f, y0 + bend * f * f) for f in np.linspace(0, 1, 12)]
        for j in range(len(pts) - 1):
            wd = max(1, int(5 * (1 - j / 11)))
            d.line([pts[j], pts[j + 1]], fill=int(255 * (1 - j / 14)), width=wd)
    im = im.filter(ImageFilter.GaussianBlur(1.2)).resize((w, h), Image.LANCZOS)
    a = np.array(im) / 255.0
    grain = np.random.default_rng(4).random(a.shape)
    save_pair(np.clip(a * (0.6 + 0.5 * grain), 0, 1), np.clip(a * 1.3 * (0.6 + 0.5 * grain), 0, 1), 'dragon_mane')


def main():
    os.makedirs(OUT, exist_ok=True)
    hd = head()
    body()
    mane()
    pv = Image.new('RGBA', (hd.width + 280, max(hd.height, 120) + 20), (10, 10, 12, 255))
    pv.alpha_composite(hd, (10, 10))
    for i, n in enumerate(('dragon_body', 'dragon_mane', 'dragon_head_aw')):
        im = Image.open(os.path.join(VFX, n + '.png'))
        if n == 'dragon_head_aw':
            im = im.resize((im.width // 2, im.height // 2))
        pv.alpha_composite(im, (hd.width + 20, 10 + i * 60))
    pv.save(os.path.join(OUT, 'dragon_gold_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
