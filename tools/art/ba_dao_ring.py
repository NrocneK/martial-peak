"""
BÁ ĐAO — vòng đao khí (chuyển ảnh mẫu tools/art/ref/ba_dao_ring_ref.png về pixel art).

Phân tích ảnh mẫu:
  - Dáng: một VÒNG ELIP nghiêng (nhìn chéo từ trên xuống, cao/rộng ≈ 0,62), trục hơi xoay ~ -8°.
  - Độ dày KHÔNG đều: dày nhất ở mép trước-phải (gần người xem), mỏng dần ra sau-trái → cảm giác phối cảnh + vòng đang quay.
  - Độ sáng chạy theo vòng: "đầu" vệt chém ở bên phải-dưới sáng rực (lõi hồng trắng → hồng tím), đuôi kéo ngược
    chiều quay tối dần thành tím đậm rồi gần đen (khói đao khí) ở phía trái-sau.
  - Vân: nhiều sọc mảnh chạy DỌC theo vòng (vệt gió chém), mép trong xơ, vài đốm sáng xanh lơ lấp lánh ở phần tối.
  - Không viền đen: tự phát sáng, quầng tím mờ lan ra ngoài.
Chuyển sang pixel: vẽ ở lưới nhỏ, chỉ dùng 1 bảng ~10 màu, chuyển sắc bằng hòa sắc (dither) Bayer 4×4,
quầng sáng = 1–2 vòng điểm tím thưa; nhiều khung để vệt sáng chạy vòng (quay).

  python3 -I tools/art/ba_dao_ring.py → tools/art/out/ba_dao_ring_preview.png (mẫu | pixel hóa thẳng | bản vẽ lại)
                                        tools/art/out/ba_dao_ring.gif (quay), tools/art/out/ba_dao_ring_sheet.png
"""
import math
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
FW, FH = 112, 72                 # khung pixel art
NF = 12                          # số khung quay

# bảng màu: tối → sáng (tím đen → tím → hồng tím → hồng → trắng hồng), + xanh lơ lấp lánh
PAL = np.array([
    (22, 10, 34), (42, 16, 70), (70, 24, 118), (106, 32, 170), (146, 40, 210),
    (196, 58, 236), (236, 92, 244), (255, 150, 250), (255, 214, 255), (255, 248, 255),
], float)
CYAN = [(60, 170, 220), (140, 240, 255)]
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def _gauss(x, s):
    return np.exp(-0.5 * (x / s) ** 2)


def _wrap(x):
    return (x + math.pi) % (2 * math.pi) - math.pi


def frame(phase):
    """phase: góc quay (rad). Ở phase = 0 khớp bố cục ảnh mẫu: đầu vệt sáng ở phải-dưới."""
    cx, cy, a, b = FW / 2, FH / 2, FW * 0.44, FH * 0.38
    yy, xx = np.mgrid[0:FH, 0:FW].astype(float) + 0.5
    tilt = math.radians(-9)                                 # vòng hơi nghiêng như mẫu
    X, Y = xx - cx, yy - cy
    u = (X * math.cos(tilt) + Y * math.sin(tilt)) / a
    v = (-X * math.sin(tilt) + Y * math.cos(tilt)) / b
    th = np.arctan2(v, u)                                   # 0 = phải, +π/2 = dưới (mép trước)
    # vòng KHÔNG tròn đều: bán kính méo theo vài nhịp thấp (như dải khí bị xoắn) + phình ra ở mép trước-phải
    warp = (0.05 * np.sin(2 * th + 0.8 + phase) + 0.035 * np.sin(3 * th - 1.3 - 2 * phase)
            + 0.025 * np.sin(5 * th + 2.1 + 3 * phase) + 0.06 * _gauss(_wrap(th - math.radians(30) - phase), 0.6))
    r = np.hypot(u, v) / (1 + warp)
    rel = _wrap(th - math.radians(45) - phase)              # so với chỗ sáng nhất (phải-dưới)
    # sáng rực từ phải (-30°) chạy dọc mép trước tới dưới-trái (~120°); tối dần thành khói ở trái-sau
    bright = 0.06 + 0.94 * _gauss(rel, 1.05)
    smoke_w = _gauss(_wrap(rel - math.radians(160)), 0.7)   # khúc khói đen dày ở trái
    front = np.clip(np.sin(th), 0, 1)                        # mép trước dày hơn (phối cảnh)
    thick = (0.06 + 0.13 * _gauss(rel, 0.9) + 0.05 * front + 0.07 * smoke_w) * (
        1 + 0.25 * np.sin(4 * th + 1.7 - phase * 2) * np.sin(7 * th - 0.4 + phase))
    d = (r - 1.0) / thick                                   # -1 (mép trong) .. 1 (mép ngoài)
    tongue = np.clip(np.sin(th * 13 - phase * 5) * np.sin(th * 7 + 1.1), 0, 1) ** 2   # lưỡi khí bung ra mép ngoài
    edge = np.where(d > 0, 1.0 + 0.45 * tongue * bright, 1.0 + 0.3 * np.sin(th * 23 + phase * 6) * (bright < 0.4))
    on = np.abs(d) < edge
    core = np.clip(1 - np.abs(d + 0.15) ** 2, 0, 1)
    # vệt sáng mảnh chạy dọc vòng trong phần dày (như các sọc chém trong mẫu)
    lines = sum(_gauss(d - c, 0.13) for c in (-0.45, 0.25)) * (thick > 0.12) * 0.35
    val = bright * (0.35 + 0.65 * core) + lines * bright
    dz = (BAYER[yy.astype(int) % 4, xx.astype(int) % 4] - 0.5) * 0.10
    idx = np.clip(((val + dz) * (len(PAL) - 1)).round().astype(int), 0, len(PAL) - 1)
    # phần khói tối: tối hơn hẳn, sát đen tím
    smoke = bright < 0.28
    # khói đao khí: gần đen, có vệt tím sáng mảnh chạy dọc (như mặt khói bóng trong mẫu)
    sm_lines = _gauss(np.sin(th * 9 + d * 2.2 - phase * 3), 0.25) * 2.2
    idx = np.where(smoke, np.clip((core * 1.2 + sm_lines * core + dz * 6).round().astype(int), 0, 3), idx)
    img = np.zeros((FH, FW, 4), np.uint8)
    img[on, :3] = PAL[idx[on]]
    img[on, 3] = 255
    # quầng hồng tím thưa quanh phần sáng
    halo = (~on) & (np.abs(d) < edge + 0.6) & (bright > 0.5)
    hd = BAYER[yy.astype(int) % 4, xx.astype(int) % 4] < (bright - 0.45) * 0.35
    img[halo & hd, :3] = PAL[4]
    img[halo & hd, 3] = 140
    # đốm xanh lơ lấp lánh trong phần khói
    rng = np.random.default_rng(int(phase * 1000) % 997 + 3)
    cand = np.argwhere(on & smoke & (np.abs(d) < 0.7))
    if len(cand):
        for (y, x) in cand[rng.choice(len(cand), size=min(len(cand), 9), replace=False)]:
            img[y, x, :3] = CYAN[1]
            for dx2 in (1, 2):                                  # vệt lóe ngắn theo chiều vòng
                if x + dx2 < FW and on[y, x + dx2] and rng.random() < 0.7:
                    img[y, x + dx2, :3] = CYAN[0] if dx2 == 1 else PAL[6]
    return Image.fromarray(img, 'RGBA')


def pixelize_ref():
    """pixel hóa thẳng ảnh mẫu (để đối chiếu): thu nhỏ về cùng cỡ, quy về bảng màu, bỏ nền"""
    ref = Image.open(os.path.join(HERE, 'ref', 'ba_dao_ring_ref.png')).convert('RGB').crop((30, 90, 400, 350))
    sm = np.array(ref.resize((FW, int(FW * ref.height / ref.width)), Image.BOX)).astype(float)
    allc = np.vstack([PAL, np.array(CYAN, float)])
    out = np.zeros(sm.shape[:2] + (4,), np.uint8)
    for y in range(sm.shape[0]):
        for x in range(sm.shape[1]):
            c = sm[y, x]
            if c.max() < 70 or (abs(c[0] - c[1]) < 18 and abs(c[2] - c[1]) < 18):
                continue
            k = ((allc - c) ** 2).sum(1).argmin()
            out[y, x, :3] = allc[k]
            out[y, x, 3] = 255
    return Image.fromarray(out, 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    frames = [frame(2 * math.pi * i / NF) for i in range(NF)]
    sheet = Image.new('RGBA', (FW * NF, FH), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (FW * i, 0))
    sheet.save(os.path.join(OUT, 'ba_dao_ring_sheet.png'))
    Z = 4
    bg = (24, 22, 36, 255)
    gif = []
    for f in frames:
        g = Image.new('RGBA', (FW * Z, FH * Z), bg)
        g.alpha_composite(f.resize((FW * Z, FH * Z), Image.NEAREST))
        gif.append(g.convert('P', palette=Image.ADAPTIVE))
    gif[0].save(os.path.join(OUT, 'ba_dao_ring.gif'), save_all=True, append_images=gif[1:], duration=60, loop=0)
    ref = Image.open(os.path.join(HERE, 'ref', 'ba_dao_ring_ref.png')).convert('RGBA').resize((FW * Z, FW * Z), Image.LANCZOS)
    px = pixelize_ref()
    pv = Image.new('RGBA', (FW * Z * 3 + 40, FW * Z + 20), bg)
    pv.alpha_composite(ref, (10, 10))
    pv.alpha_composite(px.resize((px.width * Z, px.height * Z), Image.NEAREST), (20 + FW * Z, 10 + (FW * Z - px.height * Z) // 2))
    pv.alpha_composite(frames[0].resize((FW * Z, FH * Z), Image.NEAREST), (30 + 2 * FW * Z, 10 + (FW * Z - FH * Z) // 2))
    pv.save(os.path.join(OUT, 'ba_dao_ring_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
