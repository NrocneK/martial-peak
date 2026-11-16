"""
NỀN SÂN LÒ tab Chế Tạo (ảnh AI 16:9): tools/art/ref/craft_bg_{forge,alchemy}_ai.png
  · xoá dấu ngôi sao (watermark) ở góc phải dưới bằng cv2.inpaint → public/ui/craft/bg_{forge,alchemy}.jpg
  python3 -I tools/art/craft_bg.py
"""
import os
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui', 'craft')

# hộp chứa ngôi sao (x0, y0, x1, y1) theo ảnh gốc 1376×768
STAR = {'forge': (1222, 618, 1282, 680), 'alchemy': (1222, 618, 1288, 680)}

# đan phòng: ảnh AI tự làm tối 2 dải bên (mép cắt thẳng ở x0 / x1) → làm sáng dần từ mép ảnh tới đường cắt cho liền mạch
SEAM = {'alchemy': (301, 1075)}


def unseam(img, x0, x1):
    """hệ số sáng theo từng hàng (làm mượt dọc) để 2 bên đường cắt bằng sáng nhau, giảm dần về 1 ở mép ảnh"""
    f = img.astype(np.float32)
    k = 4

    def gain(inside, outside):
        g = cv2.GaussianBlur(inside, (0, 0), 12) / np.maximum(cv2.GaussianBlur(outside, (0, 0), 12), 4)
        return g[:, None, :]                                           # (H, 1, 3)

    gl = gain(f[:, x0:x0 + k].mean(1, keepdims=True), f[:, x0 - k:x0].mean(1, keepdims=True))[:, 0]
    gr = gain(f[:, x1 - k:x1].mean(1, keepdims=True), f[:, x1:x1 + k].mean(1, keepdims=True))[:, 0]
    W = f.shape[1]
    tl = (np.arange(x0) / (x0 - 1))[None, :, None]
    f[:, :x0] *= 1 + (gl - 1) * tl
    tr = ((W - 1 - np.arange(x1, W)) / (W - 1 - x1))[None, :, None]
    f[:, x1:] *= 1 + (gr - 1) * tr
    return np.clip(f, 0, 255).astype(np.uint8)


def main():
    for name, (x0, y0, x1, y1) in STAR.items():
        bgr = cv2.imread(os.path.join(REF, f'craft_bg_{name}_ai.png'))
        crop = bgr[y0:y1, x0:x1].astype(int)
        # ngôi sao: xám nhạt, ít màu, sáng hơn hẳn nền xung quanh
        lum = crop.mean(-1)
        sat = crop.max(-1) - crop.min(-1)
        m = ((lum > np.percentile(lum, 35) + 25) & (sat < 40)).astype(np.uint8) * 255
        m = cv2.dilate(m, np.ones((5, 5), np.uint8))
        hole = np.zeros(bgr.shape[:2], np.uint8)
        hole[y0:y1, x0:x1] = m
        out = cv2.inpaint(bgr, hole, 6, cv2.INPAINT_TELEA)
        if name in SEAM:
            out = unseam(out, *SEAM[name])
        cv2.imwrite(os.path.join(OUT, f'bg_{name}.jpg'), out, [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(name, bgr.shape, int((m > 0).sum()))


if __name__ == '__main__':
    main()
