"""
VỆT CHÉM LỬA cho Thần Thức Trảm — lấy NGUYÊN từ ảnh mẫu tools/art/ref/fire_slash_ref.png (cung lửa xoáy trên nền xám).

  Chỉ tách nền xám, GIỮ NGUYÊN MÀU GỐC từng điểm ảnh (không pha lại màu, không cắt bớt phần nào của mẫu):
    · độ đục = độ lệch màu so với nền xám (vệt khói tối, lửa cam đỏ → đặc)
    · điểm sáng hơn nền (lõi lửa vàng trắng) → đặc theo độ sáng (trên nền xám chúng lệch màu ít nên phải tính riêng)
  Đo tâm cung (khớp đường tròn) → game đặt tâm này ở khuỷu tay (tâm xoay cú chém), đầu cung bám mũi kiếm.
  → public/vfx/fire_slash.png      (in ra: tâm cung theo tỉ lệ ảnh)

  python3 -I tools/art/fire_slash.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
BG = np.array([187, 185, 189.])          # màu nền xám của mẫu
CX, CY = 302, 189                         # tâm cung (khớp đường tròn trên phần lửa đặc)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(os.path.join(HERE, 'ref', 'fire_slash_ref.png')).convert('RGB')
    a = np.array(src).astype(float)
    dev = np.abs(a - BG).max(2)
    lum = a.mean(2)
    al = np.clip((dev - 14) / 50, 0, 1)                                       # lệch màu khỏi nền
    al = np.maximum(al, np.clip((lum - 196) / 22, 0, 1))                      # sáng hơn nền (lõi lửa)
    img = Image.fromarray(np.dstack([a, al * 255]).astype(np.uint8), 'RGBA')  # màu gốc giữ nguyên
    bb = img.getbbox()
    pad = 4
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(img.width, bb[2] + pad), min(img.height, bb[3] + pad))
    img = img.crop(bb)
    img.save(os.path.join(VFX, 'fire_slash.png'))
    ox, oy = (CX - bb[0]) / img.width, (CY - bb[1]) / img.height
    print('fire_slash', img.size, 'origin', round(ox, 3), round(oy, 3))
    for name, bgc in (('grey', (187, 185, 189)), ('dark', (26, 24, 40))):  # so với mẫu trên nền xám + nền game
        pv = Image.new('RGBA', img.size, bgc + (255,))
        pv.alpha_composite(img)
        pv.convert('RGB').save(os.path.join(OUT, f'fire_slash_{name}.png'))


if __name__ == '__main__':
    main()
