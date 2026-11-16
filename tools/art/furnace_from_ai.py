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
        im.save(os.path.join(OUT, f'furnace_{name}.png'), optimize=True)
        print(name, im.size)


if __name__ == '__main__':
    main()
