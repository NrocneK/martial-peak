"""
Tư thế NGỰ KIẾM hướng E — ghép đúng cánh tay trái từ ảnh mẫu (tools/art/ref/ngu_kiem_pose_ref.png).

Cách làm: ảnh mẫu là bản vẽ lớn (~7.7 lần sprite). Đặt nhân vật gốc (phóng to cùng tỉ lệ) khớp mặt với mẫu,
cắt nguyên lớp tay trái của mẫu theo đường bao, rồi thu nhỏ lớp tay đó về lưới 52x68 (trung bình điểm,
khử nền, quy về bảng màu của sprite) và ghép lên khung đứng gốc. Tay phải giữ nguyên.

  python3 -I tools/art/ngu_kiem_pose_ref.py → tools/art/out/ngu_kiem_pose_e.png (2 khung) + _e_preview.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
S = 65 / 499                      # tỉ lệ mẫu → sprite (chiều cao nhân vật 499 → 65 điểm)
BG = np.array([28, 52, 112])      # màu nền ảnh mẫu

# đường bao cánh tay trái trong ảnh mẫu (toạ độ ảnh mẫu) + điểm neo mặt (mẫu → sprite)
POSES = {
    1: dict(k=1.3, anchor=((548, 440), (34, 21)), poly=[
        (514, 438), (538, 438), (540, 476), (556, 470), (576, 476), (602, 488), (602, 542), (576, 548),
        (544, 548), (528, 534), (514, 522), (504, 510), (504, 478), (512, 476)]),
    2: dict(k=1.1, anchor=((1310, 445), (33, 23)), poly=[
        (1288, 452), (1342, 452), (1346, 464), (1380, 462), (1380, 428), (1386, 426), (1412, 426), (1414, 470),
        (1422, 474), (1422, 508), (1392, 512), (1352, 508), (1346, 542), (1322, 542), (1300, 536), (1286, 526)]),
}


def frame_e():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 6 * H, 7 * W, 7 * H))


def palette(im):
    a = np.array(im)
    cols = {tuple(c[:3]) for c in a.reshape(-1, 4) if c[3] > 0}
    cols |= {(232, 184, 72), (150, 100, 36), (245, 205, 180), (221, 178, 153), (193, 151, 129), (165, 127, 107)}
    return np.array(sorted(cols))


def arm_layer(ref, n):
    cfg = POSES[n]
    (rx, ry), (sx, sy) = cfg['anchor']
    sc = S * cfg['k']              # phóng tay to hơn chút cho rõ ở cỡ sprite
    m = Image.new('L', ref.size, 0)
    ImageDraw.Draw(m).polygon(cfg['poly'], fill=255)
    rgb = np.array(ref).astype(float)
    mask = (np.array(m) > 0) & (np.abs(rgb - BG).sum(2) > 45)
    lay = np.zeros((H, W, 4))
    for Y in range(H):
        y0, y1 = ry + (Y - sy) / sc, ry + (Y + 1 - sy) / sc
        for X in range(W):
            x0, x1 = rx + (X - sx) / sc, rx + (X + 1 - sx) / sc
            a, b, c, d = int(round(y0)), int(round(y1)), int(round(x0)), int(round(x1))
            if b <= 0 or d <= 0 or a >= ref.height or c >= ref.width:
                continue
            mk = mask[a:b, c:d]
            if mk.size == 0:
                continue
            cov = mk.mean()
            if cov < 0.4:
                continue
            px = rgb[a:b, c:d][mk]
            dark = px.sum(1) < 150                  # nét viền của mẫu
            if dark.mean() >= 0.5:
                lay[Y, X, :3] = (18, 14, 28)        # giữ nét viền (trung bình sẽ làm mất)
            else:
                lay[Y, X, :3] = np.median(px[~dark], 0)
            lay[Y, X, 3] = 1
    return lay


def compose(n):
    ref = Image.open(os.path.join(HERE, 'ref', 'ngu_kiem_pose_ref.png')).convert('RGB')
    base = frame_e()
    pal = palette(base)
    lay = arm_layer(ref, n)
    px = base.load()
    for Y in range(H):
        for X in range(W):
            if lay[Y, X, 3]:
                c = lay[Y, X, :3]
                k = pal[((pal - c) ** 2).sum(1).argmin()]
                px[X, Y] = (int(k[0]), int(k[1]), int(k[2]), 255)
    a = np.array(base)
    for Y in range(H):
        for X in range(W):
            if lay[Y, X, 3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    x2, y2 = X + dx, Y + dy
                    if 0 <= x2 < W and 0 <= y2 < H and a[y2, x2, 3] == 0:
                        px[x2, y2] = (18, 14, 28, 255)
    return base


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    for n in (1, 2):
        sheet.alpha_composite(compose(n), (W * (n - 1), 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_pose_e.png'))
    Z = 7
    ref = Image.open(os.path.join(HERE, 'ref', 'ngu_kiem_pose_ref.png')).convert('RGBA')
    pv = Image.new('RGBA', (W * 3 * Z + 40, H * Z + 20 + 330), (28, 52, 112, 255))
    pv.alpha_composite(frame_e().resize((W * Z, H * Z), Image.NEAREST), (10, 10))
    for n in (1, 2):
        pv.alpha_composite(sheet.crop((W * (n - 1), 0, W * n, H)).resize((W * Z, H * Z), Image.NEAREST), (10 + n * (W * Z + 10), 10))
    r = ref.crop((250, 230, 1460, 780))
    r = r.resize((pv.width - 20, int(r.height * (pv.width - 20) / r.width)))
    pv = pv.crop((0, 0, pv.width, H * Z + 20 + r.height + 10))
    pv.alpha_composite(r, (10, H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_pose_e_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
