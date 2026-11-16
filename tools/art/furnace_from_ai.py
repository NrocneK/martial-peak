"""
2 LÒ của tab Chế Tạo (ảnh AI nền trắng): tools/art/ref/furnace_{forge,alchemy}_ai.png
  · tách nền: mặt nạ rembg isnet (lưu ref/furnace_*_mask.png), giữ mảng lớn nhất (bỏ chữ "Dola AI" ở góc)
  · gỡ viền trắng ở mép, cắt sát → public/ui/craft/furnace_{forge,alchemy}.png (cạnh dài 512)
  U2NET_HOME=/root/.rembg/models/isnet-general-use python3 -I tools/art/furnace_from_ai.py
"""
import os
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui', 'craft')

# đan lô: bỏ đốm lửa xanh dưới đáy, GIỮ chân giữa (chân thứ 3 phía sau, lửa che mất đoạn giữa → nối lại)
FLAME = {}  # đan lô mới (nền giấy, 3 chân đủ) không cần vá
SHADOW = {'alchemy': (489, 32, 423, 501)}                             # y, x0, x1, y_end (toạ độ sau khi thu về 512)
LEG = (166, 202, 380, 486)                                              # x0, x1, y0, y1 chân giữa


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in ('forge', 'alchemy'):
        rgb = np.array(Image.open(os.path.join(REF, f'furnace_{name}_ai.png')).convert('RGB'))
        mp = os.path.join(REF, f'furnace_{name}_mask.png')
        if not os.path.exists(mp):
            from rembg import new_session, remove
            remove(Image.fromarray(rgb), session=new_session('isnet-general-use'), only_mask=True).save(mp)
        a = np.array(Image.open(mp).convert('L')).astype(np.float32) / 255
        k, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8))
        big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        # giữ mảng lớn nhất + mảng nhỏ dính sát nó (lửa xanh tách rời dưới đan lô), bỏ chữ ở góc
        near = cv2.dilate((lab == big).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
        keep = np.zeros_like(near)
        for j in range(1, k):
            if j == big or (near & (lab == j)).any():
                keep |= lab == j
        keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        a = np.where(keep, a, 0)
        aa = np.clip(a, 1e-3, 1)[..., None]
        c = np.clip((rgb.astype(np.float32) - (1 - aa) * 255) / aa, 0, 255)
        im = Image.fromarray(np.dstack([c.astype(np.uint8), (a * 255).astype(np.uint8)]), 'RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
        s = 512 / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        if name in FLAME:
            # xoá đốm lửa (vùng FLAME), rồi vẽ lại chân giữa bằng đồng (chân sau, tối hơn 2 chân trước), đầu chân bo tròn
            px = np.array(im)
            x0, y0, x1, y1 = FLAME[name]
            px[y0:y1, x0:x1, 3] = 0
            lx0, lx1, ly0, ly1 = LEG
            w = lx1 - lx0
            ramp = [(38, 24, 14), (78, 50, 26), (104, 68, 36), (128, 86, 46), (150, 104, 58), (128, 86, 46), (104, 68, 36), (86, 56, 30), (66, 42, 22), (38, 24, 14)]
            for x in range(lx0, lx1):
                t = (x - lx0) / (w - 1)
                edge = x - lx0 < 2 or lx1 - 1 - x < 2
                col = (38, 24, 14) if edge else ramp[min(len(ramp) - 2, max(1, int(t * (len(ramp) - 1) + 0.5)))]
                cx = abs(x - (lx0 + lx1 - 1) / 2) / (w / 2)                 # 0 giữa → 1 mép
                bottom = ly1 - int(round(6 * (1 - (1 - cx * cx) ** 0.5)))   # đầu chân bo tròn
                for y in range(ly0, bottom):
                    shade = 0.82 + 0.18 * (y - ly0) / (ly1 - ly0)            # sát thân tối hơn (bóng của thân lò)
                    c = (38, 24, 14) if y >= bottom - 2 else tuple(int(v * shade) for v in col)
                    px[y, x] = (*c, 255)
            im = Image.fromarray(px, 'RGBA')
        if name in SHADOW:
            # bỏ vệt bóng mờ dưới đế: từ hàng y trở xuống chỉ giữ điểm ảnh đặc (chân đế), trong bề ngang đế, tới hàng y_end
            px = np.array(im)
            y, x0, x1, y_end = SHADOW[name]
            sub = px[y:, :, 3]
            sub[sub < 215] = 0
            sub[:, :x0] = 0
            sub[:, x1:] = 0
            sub[y_end - y:] = 0
            im = Image.fromarray(px, 'RGBA')
            im = im.crop(im.getchannel('A').getbbox())
        im.save(os.path.join(OUT, f'furnace_{name}.png'), optimize=True)
        print(name, im.size)


if __name__ == '__main__':
    main()
