"""
Cắt lớp BÀN TAY PHẢI (tay phía xa, bên trái màn hình) từ sprite nhân vật → public/ui/hero_rhand.png.
Lớp này đặt TRÊN vũ khí để chuôi chui vào trong nắm tay (trông như đang cầm, không phải dán).
Chạy lại sau mỗi lần build tools/art/hero.px.js:   python3 -I tools/art/cut_hand.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'public', 'ui', 'hero_full.png')
OUT = os.path.join(ROOT, 'public', 'ui', 'hero_rhand.png')
FRAME_W = 58
BOX = (3, 53, 9, 61)   # x0, y0, x1, y1 (không gồm x1, y1): nắm tay phải trên khung 58x106 đã lật

a = np.array(Image.open(SRC).convert('RGBA'))[:, :FRAME_W]
out = np.zeros_like(a)
x0, y0, x1, y1 = BOX
out[y0:y1, x0:x1] = a[y0:y1, x0:x1]
Image.fromarray(out, 'RGBA').save(OUT)
print('→', OUT)
