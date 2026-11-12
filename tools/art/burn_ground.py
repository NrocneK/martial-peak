"""
LIỆT HỎA PHÙ — mặt đất cháy, lấy từ video mẫu burning-ground.mp4 (một chu kỳ ở giây 16,7 → 23,8).
Video đã nhìn chéo từ trên xuống (đúng góc game) nên không cần ép dẹt.

  bùng cháy  16,70 → 18,10   (lửa đỏ lóe, tàn lửa bắn lên)       → public/vfx/burn_in.png
  duy trì    19,00 → 21,00   (vòng lửa cuộn — LẶP theo thời gian biển lửa) → public/vfx/burn_loop.png
  tàn dần    22,30 → 23,80                                          → public/vfx/burn_out.png
Mỗi đoạn 15 khung/giây, khung 256×201, xếp lưới 8 cột.
Bỏ nền: trừ đi khung nền trống ở giây 16,0 (nền đá tối) → độ đục = kênh sáng nhất; trong game dùng hoà trộn cộng sáng.
Khung mẫu trích ra thư mục tạm ref/burn_cut/ (không lưu vào repo).

  python3 -I tools/art/burn_ground.py <đường_dẫn_video>
"""
import os
import subprocess
import sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
CUT = os.path.join(HERE, 'ref', 'burn_cut')
CROP = (168, 40, 568, 354)          # vùng vòng lửa trong khung 736×414 (đủ vòng + tàn lửa bay lên)
FW, FH, FPS, COLS = 256, 201, 15, 8
PARTS = {'in': (16.70, 18.10), 'loop': (19.00, 21.00), 'out': (22.30, 23.80)}


def grab(video, t0, t1, tag):
    d = os.path.join(CUT, tag)
    os.makedirs(d, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-t', str(t1 - t0), '-i', video, '-vf', f'fps={FPS}',
                    os.path.join(d, 'f%03d.png')], check=True)
    return sorted(os.path.join(d, f) for f in os.listdir(d))


def main():
    video = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    bg_path = grab(video, 16.0, 16.1, 'bg')[0]
    bg = np.array(Image.open(bg_path).convert('RGB').crop(CROP)).astype(float)
    for name, (t0, t1) in PARTS.items():
        fs = grab(video, t0, t1, name)
        rows = (len(fs) + COLS - 1) // COLS
        sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
        for i, f in enumerate(fs):
            c = np.array(Image.open(f).convert('RGB').crop(CROP)).astype(float)
            c = np.clip(c - bg * 1.25 - 6, 0, 255)
            a = c.max(2)
            col = c * 255 / np.maximum(a, 1)[..., None]
            img = Image.fromarray(np.dstack([col, a]).astype(np.uint8), 'RGBA').resize((FW, FH), Image.LANCZOS)
            sheet.alpha_composite(img, (FW * (i % COLS), FH * (i // COLS)))
        sheet.save(os.path.join(ROOT, 'public', 'vfx', f'burn_{name}.png'))
        pv = Image.new('RGBA', sheet.size, (24, 20, 22, 255))
        pv.alpha_composite(sheet)
        pv.save(os.path.join(OUT, f'burn_{name}_preview.png'))
        print(name, len(fs), sheet.size)


if __name__ == '__main__':
    main()
