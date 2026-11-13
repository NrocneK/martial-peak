"""
VẠN KIẾM QUY TÔNG — dùng NGUYÊN ảnh kiếm khí Ngự Kiếm Thuật (public/vfx/qi_sword_light.png), chỉ ĐỔI MÀU:
tách ảnh gốc thành 2 lớp cùng khung để game tô màu viền / quầng (9 màu: 7 màu cầu vồng, đen, trắng):
  · qi_blade_core.png : phần lõi trắng chói của ảnh gốc (giữ trắng, cộng sáng)
  · qi_blade_rim.png  : phần quầng / viền lavender của ảnh gốc, chuyển về trắng giữ nguyên độ đậm → game tô màu
Không vẽ lại gì — mọi nét (lưỡi, khâu, chuôi, sợi khí, bụi sáng) đều là của ảnh gốc.
  python3 -I tools/art/qi_blade.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')


def main():
    os.makedirs(OUT, exist_ok=True)
    src = np.array(Image.open(os.path.join(VFX, 'qi_sword_light.png')).convert('RGBA')).astype(float)
    rgb, a = src[..., :3] / 255, src[..., 3] / 255
    lum = rgb.mean(2)
    sat = rgb.max(2) - rgb.min(2)
    # lõi = chỗ gần trắng tinh (sáng, ít màu) và đậm
    core = np.clip((lum - 0.9) / 0.08, 0, 1) * np.clip((0.12 - sat) / 0.08, 0, 1) * a
    rim = np.clip((a - core * 0.85 - 0.04) / 0.96, 0, 1)                     # phần còn lại: quầng màu lavender (bỏ nền mờ)
    h, w = a.shape

    def save(alpha, name):
        Image.fromarray(np.dstack([np.full((h, w, 3), 255), np.clip(alpha, 0, 1) * 255]).astype(np.uint8), 'RGBA').save(os.path.join(VFX, name))
    save(core, 'qi_blade_core.png')
    save(rim, 'qi_blade_rim.png')
    tip = np.nonzero((a > 0.5).any(0))[0].max() / w
    print('size', w, h, 'tip', round(tip, 3))
    cols = [None, (255, 50, 50), (255, 150, 30), (255, 235, 40), (60, 230, 80), (60, 140, 255), (70, 60, 230), (170, 70, 255), (0, 0, 0), (255, 255, 255)]
    pv = Image.new('RGB', (w * 2, h * 2 * len(cols)), (26, 24, 40))
    for i, col in enumerate(cols):
        bg = np.full((h, w, 3), (26, 24, 40.))
        if col is None:                                                    # hàng đầu: ảnh gốc để so
            out = np.clip(bg * (1 - a[..., None]) + src[..., :3] * a[..., None], 0, 255)
        else:
            c = np.array(col, float)
            out = bg * (1 - rim[..., None]) + c * rim[..., None]            # quầng tô màu (vẽ thường: đen vẫn thấy)
            out = np.clip(out + 255 * core[..., None], 0, 255)               # lõi trắng cộng sáng
        pv.paste(Image.fromarray(out.astype(np.uint8)).resize((w * 2, h * 2), Image.LANCZOS), (0, i * h * 2))
    pv.save(os.path.join(OUT, 'qi_blade_preview.png'))


if __name__ == '__main__':
    main()
