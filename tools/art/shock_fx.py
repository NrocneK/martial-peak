"""
HỔ KHIẾU — sóng âm xung kích lấy từ video mẫu (Shockwave Light Bursts): mẫu số 3 = đòn thường, số 6 = thức tỉnh.
Khung gốc ở tools/art/ref/shock_t3, shock_t6 (30 khung/giây, trích bằng ffmpeg).

1) Bỏ chữ mờ "envato" + nhãn "TYPE 0x": lấy mặt nạ chữ từ một khung trống, rồi VÁ vùng chữ bằng chính hiệu ứng
   ở cùng bán kính nhưng xoay 90° quanh tâm (hiệu ứng gần đối xứng tròn) → không còn vết chữ, kể cả ở khung lóe sáng.
2) Hiệu ứng tự phát sáng trên nền đen → độ đục = kênh sáng nhất (dùng hoà trộn cộng sáng trong game).
3) Video nhìn từ đỉnh xuống → ÉP DẸT trục dọc còn K = 0,62 cho nằm trên mặt đất nhìn chéo như các hiệu ứng khác.
4) Ghép thành dải khung → public/vfx/shock_t3.png, shock_t6.png (mỗi khung 256×160).

  python3 -I tools/art/shock_fx.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
K = 0.62
FW = 256
FH = round(FW * K)
CROP = (210, 0, 750, 540)        # vuông 540 quanh tâm hiệu ứng
SETS = {3: (range(7, 24), 30), 6: (range(6, 23), 30)}   # (khung dùng, khung trống để trừ chữ)


def load(n, i):
    return np.array(Image.open(os.path.join(HERE, 'ref', f'shock_t{n}', f'f{i:02d}.png')).convert('RGB').crop(CROP)).astype(float)


def main():
    os.makedirs(OUT, exist_ok=True)
    for n, (frames, blank) in SETS.items():
        wm = load(n, blank)
        mask = nd.binary_dilation(wm.max(2) > 6, iterations=8)          # chữ đè lên hiệu ứng có bóng tối quanh nét → nới rộng
        # tâm hiệu ứng = giữa khung bao vùng sáng của khung vòng sóng to nhất (trọng tâm bị lệch vì vòng không đều sáng)
        ref = load(n, list(frames)[6 if n == 3 else 3]).max(2) * ~mask   # khung vòng gọn, chưa có tia dài lệch
        ys, xs = np.nonzero(ref > 60)
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        my, mx = np.nonzero(mask)
        dx, dy = mx - cx, my - cy
        sheet = Image.new('RGBA', (FW * len(frames), FH), (0, 0, 0, 0))
        for j, i in enumerate(frames):
            raw = load(n, i)
            c = raw.copy()
            acc = np.zeros((len(my), 3))
            cnt = np.zeros(len(my))
            for deg in (60, 90, 120, 180, 240, 270, 300):              # trung bình các góc xoay rơi ngoài chữ
                ang = np.radians(deg)
                sx = np.round(cx + dx * np.cos(ang) - dy * np.sin(ang)).astype(int)
                sy = np.round(cy + dx * np.sin(ang) + dy * np.cos(ang)).astype(int)
                inb = (sx >= 0) & (sy >= 0) & (sx < c.shape[1]) & (sy < c.shape[0])
                sxc, syc = np.clip(sx, 0, c.shape[1] - 1), np.clip(sy, 0, c.shape[0] - 1)
                ok = inb & ~mask[syc, sxc]
                acc[ok] += raw[syc[ok], sxc[ok]]
                cnt[ok] += 1
            c[my, mx] = acc / np.maximum(cnt, 1)[:, None]
            c = np.clip(c - 4, 0, 255)
            a = c.max(2)
            col = c * 255 / np.maximum(a, 1)[..., None]
            img = Image.fromarray(np.dstack([col, a]).astype(np.uint8), 'RGBA').resize((FW, FH), Image.LANCZOS)
            sheet.alpha_composite(img, (FW * j, 0))
        sheet.save(os.path.join(ROOT, 'public', 'vfx', f'shock_t{n}.png'))
        pv = Image.new('RGBA', sheet.size, (20, 18, 30, 255))
        pv.alpha_composite(sheet)
        pv.save(os.path.join(OUT, f'shock_t{n}_preview.png'))
        print(n, len(frames), sheet.size)


if __name__ == '__main__':
    main()
