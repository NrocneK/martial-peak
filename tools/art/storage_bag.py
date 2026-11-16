"""
TÚI TRỮ VẬT (tab Tu Luyện → Cảnh Giới, đặt trên bàn bên phải tĩnh thất) — vẽ pixel bằng tay theo bản đồ ký tự
  → public/ui/cult_bag.png (24×24, hiển thị phóng to, image-rendering: pixelated)
  python3 -I tools/art/storage_bag.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui', 'cult_bag.png')

# túi gấm thắt miệng: viền tối (k), gấm tím 3 sắc (d/m/l), dây vàng (y/Y), nút ngọc (g/G), tua (t)
PAL = {
    '.': None,
    'k': (24, 14, 34), 'd': (70, 36, 92), 'm': (112, 62, 140), 'l': (160, 104, 184), 'h': (206, 162, 222),
    'y': (196, 146, 52), 'Y': (250, 214, 110), 'g': (46, 170, 140), 'G': (150, 240, 210), 't': (220, 70, 70),
}
ART = [
    '........................',
    '.........kkkkkk.........',
    '........kmllhlmk........',
    '.......kdmmllmmdk.......',
    '........kdmmmmdk........',
    '.........kkkkkk.........',
    '........kyYYYYyk........',
    '.......kyyyyyyyyk.......',
    '........kdmmlmdk........',
    '.......kdmmmllmmdk......',
    '.....kkdmmmmlllmmdkk....',
    '....kddmmmmmmllhlmmdk...',
    '...kddmmmmmkkkmllhlmdk..',
    '...kdmmmmmkgGGkmllllmk..',
    '..kddmmmmmkgGgkmmlllmdk.',
    '..kddmmmmmmkkkmmmmllmdk.',
    '..kdddmmmmmmmmmmmmmlmdk.',
    '..kddddmmmmmmmmmmmmmmdk.',
    '...kdddddmmmmmmmmmmddk..',
    '...kkddddddmmmmmmmddkk..',
    '....kkkdddddddddddkkk...',
    '......kkkkkkkkkkkkk.....',
    '........................',
    '........................',
]


def main():
    assert all(len(r) == 24 for r in ART), [len(r) for r in ART]
    im = Image.new('RGBA', (24, 24))
    for y, row in enumerate(ART):
        for x, ch in enumerate(row):
            c = PAL[ch]
            if c:
                im.putpixel((x, y), (*c, 255))
    im.save(OUT)
    im.resize((240, 240), Image.NEAREST).save(os.path.join(HERE, 'out', 'cult_bag_preview.png'))
    print('ok', OUT)


if __name__ == '__main__':
    main()
