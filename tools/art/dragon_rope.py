"""
KHÍ LONG — rồng thuỷ mặc NGUYÊN KHỐI cho Phaser Rope, từ ảnh mẫu tools/art/ref/dragon_ink_side.png
(rồng nhìn ngang, thân gần thẳng, đầu bên phải, nền trắng).

  1) tách nền trắng: độ đục = độ đậm mực, cộng thêm vệt sét tím (bão hoà màu cao) để không mất sét ở chỗ sáng
  2) căn thẳng thân: tâm thân mỗi cột (trọng tâm độ đục) làm mượt RẤT mạnh rồi dời cột về giữa — chỉ bỏ độ gợn lớn của
     thân, giữ nguyên chi tiết; vùng đầu (20% bên phải) giữ nguyên không dời để đầu không méo
  3) tô màu cho nền tối của game: mực đen → tím than / lam than, sét giữ sáng rực, thêm viền sáng mảnh
       thường = lam mực (sét lam) · thức tỉnh = tím sét như mẫu
  → public/vfx/dragon_rope{,_aw}.png   (ngang 1024: đuôi trái → đầu phải)

  python3 -I tools/art/dragon_rope.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
OUT_W = 1024
THICK = 1.0                    # giữ đúng tỉ lệ thon của mẫu
VARIANTS = {
    '': {'deep': (34, 48, 104), 'spark': (120, 190, 255), 'rim': (80, 140, 255)},
    '_aw': {'deep': (62, 22, 104), 'spark': (210, 140, 255), 'rim': (170, 90, 255)},
}


def main():
    os.makedirs(OUT, exist_ok=True)
    src = np.array(Image.open(os.path.join(HERE, 'ref', 'dragon_ink_side.png')).convert('RGB')).astype(float)
    lum = src.mean(2)
    sat = src.max(2) - src.min(2)
    alpha = np.clip((238 - lum) / 125, 0, 1)
    alpha = np.maximum(alpha, np.clip((sat - 30) / 70, 0, 1) * (lum < 248))
    h, w = alpha.shape
    # ---- duỗi thẳng HOÀN TOÀN: tâm thân mỗi cột = trọng tâm phần mực ĐẶC (bỏ râu/tua mảnh để tâm không bị kéo lệch),
    #      làm mượt nhẹ (chỉ bỏ nhiễu, KHÔNG giữ độ uốn) → dời từng cột về giữa. Uốn lượn để code trong game lo.
    yy = np.arange(h)[:, None]
    core = np.clip((alpha - 0.45) / 0.4, 0, 1) ** 2
    wsum = core.sum(0)
    cen = (core * yy).sum(0) / np.maximum(wsum, 1e-3)
    idx = np.arange(w)
    good = wsum > 20
    cen = np.interp(idx, idx[good], cen[good])
    k = 81
    cen = np.convolve(np.pad(cen, k // 2, mode='edge'), np.ones(k) / k, mode='valid')
    # đầu rồng (từ cổ trở đi) dời nguyên khối theo tâm ở cổ để đầu không bị méo; chuyển tiếp mượt qua 80px
    head0 = int(w * 0.84)
    t = np.clip((idx - (head0 - 80)) / 80, 0, 1)
    cen = cen * (1 - t) + cen[head0] * t
    shift = cen - h / 2
    out = np.zeros((h, w, 4))
    for x in range(w):
        ys = np.arange(h) + shift[x]
        yi = np.clip(np.round(ys).astype(int), 0, h - 1)
        ok = (ys >= 0) & (ys < h)
        out[ok, x, :3] = src[yi[ok], x]
        out[ok, x, 3] = alpha[yi[ok], x]
    ys, xs = np.nonzero(out[..., 3] > 0.05)
    out = out[max(0, ys.min() - 6):ys.max() + 6, max(0, xs.min() - 6):xs.max() + 6]
    for suf, v in VARIANTS.items():
        a = out[..., 3]
        l2 = out[..., :3].mean(2)
        s2 = out[..., :3].max(2) - out[..., :3].min(2)
        spark = np.clip((s2 - 40) / 90, 0, 1) * np.clip((l2 - 60) / 120, 0, 1)   # vệt sét: sáng + bão hoà
        tone = np.clip(l2 / 200, 0, 1)[..., None]                               # vân mực
        deep = np.array(v['deep']) * (0.6 + 0.9 * tone)
        hi = np.array(v['spark']) * (0.7 + 0.5 * tone) + 60 * np.clip(tone - 0.7, 0, 1)
        col = np.clip(deep * (1 - spark[..., None]) + hi * spark[..., None], 0, 255)
        img = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), 'RGBA')
        kk = OUT_W / img.width
        img = img.resize((OUT_W, round(img.height * kk * THICK)), Image.LANCZOS)
        ia = np.array(img).astype(float)
        ia[..., 3] = np.clip(ia[..., 3] * 1.15, 0, 255)                        # đậm hơn chút trên nền tối
        img = Image.fromarray(ia.astype(np.uint8), 'RGBA')
        g = np.array(img.filter(ImageFilter.GaussianBlur(3))).astype(float)
        g[..., :3] = v['rim']
        g[..., 3] *= 0.45
        fin = Image.fromarray(g.astype(np.uint8), 'RGBA')
        fin.alpha_composite(img)
        fin.save(os.path.join(VFX, f'dragon_rope{suf}.png'))
        print(suf or 'normal', fin.size)
    # cầu nổ tím cho cú đâm xuống của thức tỉnh: tô lại fire_blast.png theo độ sáng → dải tím sét
    fb = np.array(Image.open(os.path.join(VFX, 'fire_blast.png')).convert('RGBA')).astype(float)
    lum = (fb[..., 0] * 0.3 + fb[..., 1] * 0.55 + fb[..., 2] * 0.15) / 255
    stops = [(0.0, (20, 6, 40)), (0.35, (90, 30, 170)), (0.6, (160, 80, 255)), (0.82, (220, 170, 255)), (1.0, (255, 245, 255))]
    col = np.zeros(lum.shape + (3,))
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        m = (lum >= x0) & (lum <= x1)
        kq = ((lum - x0) / (x1 - x0))[m][:, None]
        col[m] = np.array(c0) * (1 - kq) + np.array(c1) * kq
    Image.fromarray(np.dstack([col, fb[..., 3]]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, 'fire_blast_purple.png'))
    pv = Image.new('RGBA', (OUT_W + 20, 2 * 520), (26, 24, 40, 255))
    for i, suf in enumerate(('', '_aw')):
        pv.alpha_composite(Image.open(os.path.join(VFX, f'dragon_rope{suf}.png')), (10, 10 + i * 515))
    pv.save(os.path.join(OUT, 'dragon_rope_preview.png'))


if __name__ == '__main__':
    main()
