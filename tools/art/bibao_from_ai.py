"""
ICON BÍ BẢO từ 2 ảnh AI (lưới 3×2, nền trắng): tools/art/ref/bibao_{1,2}_ai.png
  · tách nền: mặt nạ rembg isnet (lưu tools/art/ref/bibao_{n}_mask.png, chạy lại thì dùng luôn)
  · mỗi ô giữ MỌI mảng thuộc món đồ (bong bóng, tia sét, mảnh pha lê đi kèm), bỏ đốm nhiễu rất nhỏ
  · gỡ viền trắng ở mép (tách màu nền trắng khỏi điểm ảnh bán trong suốt)
  · món có điểm sáng trắng giữa thân (FILL_HOLES): lấp lỗ kín bên trong
  · cắt sát, thu về cạnh dài 64 trên khung 66×66 như icon trang bị → public/gear/{id}.png
  U2NET_HOME=/root/.rembg/models/isnet-general-use python3 -I tools/art/bibao_from_ai.py
"""
import os
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
GEAR = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'gear')
# thứ tự ô: trái → phải, trên → dưới
SHEETS = {
    1: ['bb_w1_5', 'bb_w1_10', 'bb_w2_5', 'bb_w2_10', 'bb_w3_5', 'bb_w3_10'],
    2: ['bb_w4_5', 'bb_w4_10', 'bb_w5_5', 'bb_w5_10', 'bb_w6_5', 'bb_w6_10'],
}

# món có điểm sáng trắng nằm TRONG thân (rembg tưởng là nền, khoét thủng) → lấp mọi lỗ kín bên trong
FILL_HOLES = {'bb_w2_5', 'bb_w2_10', 'bb_w3_10'}


def mask_of(n, rgb):
    path = os.path.join(REF, f'bibao_{n}_mask.png')
    if not os.path.exists(path):
        from rembg import new_session, remove
        remove(Image.fromarray(rgb), session=new_session('isnet-general-use'), only_mask=True).save(path)
    return np.array(Image.open(path).convert('L')).astype(np.float32) / 255


def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    pv = Image.new('RGBA', (66 * 6, 66 * 2), (26, 24, 40, 255))
    for n, ids in SHEETS.items():
        rgb = np.array(Image.open(os.path.join(REF, f'bibao_{n}_ai.png')).convert('RGB'))
        m = mask_of(n, rgb)
        H, W = m.shape
        cw, ch = W // 3, H // 2
        for i, bid in enumerate(ids):
            x0, y0 = (i % 3) * cw, (i // 3) * ch
            a = m[y0:y0 + ch, x0:x0 + cw].copy()
            c = rgb[y0:y0 + ch, x0:x0 + cw].astype(np.float32)
            k, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8))
            keep = np.zeros_like(a, bool)
            for j in range(1, k):
                if st[j, cv2.CC_STAT_AREA] >= 60:
                    keep |= lab == j
            keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            a = np.where(keep, a, 0)
            if bid in FILL_HOLES:
                from scipy.ndimage import binary_fill_holes
                solid = binary_fill_holes(a > 0.5)
                a = np.where(solid, np.maximum(a, 1.0), a)
            # gỡ nền trắng khỏi điểm ảnh mép: c = a·màu + (1−a)·trắng
            aa = np.clip(a, 1e-3, 1)[..., None]
            c = np.clip((c - (1 - aa) * 255) / aa, 0, 255)
            rgba = np.dstack([c.astype(np.uint8), (a * 255).astype(np.uint8)])
            im = Image.fromarray(rgba, 'RGBA')
            im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
            s = 64 / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            out = Image.new('RGBA', (66, 66))
            out.alpha_composite(im, ((66 - im.width) // 2, (66 - im.height) // 2))
            out.save(os.path.join(GEAR, f'{bid}.png'))
            pv.alpha_composite(out, ((i % 3 + (n - 1) * 3) * 66, (i // 3) * 66))
    pv.resize((pv.width * 3, pv.height * 3), Image.LANCZOS).convert('RGB').save(os.path.join(HERE, 'out', 'bibao_preview.png'))


if __name__ == '__main__':
    main()
