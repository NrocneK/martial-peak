"""
ẢNH NỀN TÔNG MÔN (màn nạp / menu / Sảnh) — dùng NGUYÊN ảnh mẫu tools/art/ref/sect_ref.webp (941×1672), không vẽ lại:
  · cắt bỏ phần giao diện có sẵn trong ảnh mẫu (thanh nhân vật + tiền tệ ở trên, cột nút bên trái, thanh điều hướng dưới)
    → public/ui/sect_tall.jpg  791×1345 (màn dọc)
  · bản ngang 16:9: đặt ảnh dọc ở giữa, hai bên là chính ảnh đó phóng to làm mờ + tối (mép ảnh giữa hoà mềm)
    → public/ui/sect_wide.jpg  2391×1345
  Tâm Truyền Tống Trận (cổng xoáy) trong ảnh: in ra để khớp SECT trong src/ui/screens/Hub.ts.
  · nhân vật đi bộ ở màn nạp: hàng hướng xuống (6 khung) cắt từ public/ui/hero_b_walk.png → public/ui/hero_boot_walk.png
  python3 -I tools/art/sect_from_ref.py
"""
import os
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
CROP = (150, 130, 941, 1475)
PORTAL = (475, 1195, 72)                                                  # tâm + bán kính cổng xoáy trên ảnh mẫu


def main():
    ref = Image.open(os.path.join(HERE, 'ref', 'sect_ref.webp')).convert('RGB')
    tall = ref.crop(CROP)
    tall.save(os.path.join(UI, 'sect_tall.jpg'), quality=90)
    W, H = tall.size
    WW = round(H * 16 / 9)
    # nền hai bên: chính ảnh đó phóng to phủ kín khung ngang, làm mờ + tối → ảnh gốc ở giữa nổi bật, mép hoà mềm
    k = WW / W
    bg = tall.resize((WW, round(H * k)), Image.LANCZOS)
    top = (bg.height - H) // 2
    bg = bg.crop((0, top, WW, top + H)).filter(ImageFilter.GaussianBlur(18))
    wide = ImageEnhance.Brightness(bg).enhance(0.7)
    x0 = (WW - W) // 2
    mask = Image.new('L', (W, H), 255)
    FE = 60
    for x in range(FE):
        a = round(255 * (x + 1) / FE)
        for xx in (x, W - 1 - x):
            mask.paste(a, (xx, 0, xx + 1, H))
    wide.paste(tall, (x0, 0), mask)
    wide.save(os.path.join(UI, 'sect_wide.jpg'), quality=88)
    px, py, r = PORTAL[0] - CROP[0], PORTAL[1] - CROP[1], PORTAL[2]
    print('tall', tall.size, 'portal', px, py, r)
    print('wide', wide.size, 'portal', px + x0, py, r)
    sheet = Image.open(os.path.join(UI, 'hero_b_walk.png')).convert('RGBA')
    sheet.crop((0, 0, 52 * 6, 68)).save(os.path.join(UI, 'hero_boot_walk.png'))


if __name__ == '__main__':
    main()
