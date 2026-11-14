"""
BÁ ĐAO TRẢM (xoay đao) — VẾT ĐAO QUÉT: vòng tròn khép kín, nhìn TỪ TRÊN XUỐNG (game ép dẹt theo mặt đất):
  · là vùng hình vành khăn mà thân đao quét qua (từ chuôi r≈0,2 tới mũi r≈0,92 nửa ảnh)
  · ĐẬM NHẤT ngay sau lưỡi đao (góc 0 = hướng +x), nhạt dần đều vòng ngược lại tới khi gần như mất ngay trước lưỡi đao
  · mép ngoài (đường mũi đao đi qua) là vệt sáng rõ nhất; thân vùng quét là màn khí mờ có sọc gió
  · thanh đao quay THEO chiều kim đồng hồ trên màn hình (góc tăng dần vì trục y hướng xuống) → phần sau lưng lưỡi = góc âm
  Ảnh TRẮNG giữ độ đậm (game tô màu), cộng sáng.
  → public/vfx/ba_dao_trail.png 512×512, tâm ảnh = tâm xoay (chỗ nhân vật)
  python3 -I tools/art/ba_dao_trail.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
N = 512
R_IN, R_OUT = 0.2, 0.92


def main():
    os.makedirs(OUT, exist_ok=True)
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    x, y = xx - N / 2, yy - N / 2
    r = np.hypot(x, y) / (N / 2)
    th = np.arctan2(y, x)
    behind = (-th) % (2 * np.pi)                                         # 0 = ngay sau lưỡi đao … 2π = ngay trước lưỡi
    u = 1 - behind / (2 * np.pi)                                         # 1 sát lưỡi → 0 trước lưỡi
    u = u * np.clip(behind / 0.05, 0, 1)                                 # mép sát lưỡi hơi mềm (không vạch thẳng)
    band = np.clip((r - R_IN) / 0.08, 0, 1) * np.clip((R_OUT - r) / 0.025, 0, 1)
    tipline = np.exp(-((r - (R_OUT - 0.02)) / 0.022) ** 2)
    rr = np.clip((r - R_IN) / (R_OUT - R_IN), 0, 1)
    streak = 0.75 + 0.25 * np.cos(rr * np.pi * 7) ** 2                   # sọc gió đồng tâm
    fill = band * (0.25 + 0.75 * rr ** 1.5) * streak                    # màn khí đậm dần ra phía mũi đao
    inten = fill * u ** 2.2 * 0.75 + tipline * u ** 1.3 * 1.0
    inten = np.clip(inten, 0, 1)
    w8 = np.full((N, N), 255.)
    img = Image.fromarray(np.dstack([w8, w8, w8, inten * 255]).astype(np.uint8), 'RGBA')
    img.save(os.path.join(VFX, 'ba_dao_trail.png'))
    pv = np.zeros((N, N, 3)) + np.array([26, 24, 40.])
    pv = np.clip(pv + inten[..., None] * np.array([190, 130, 255.]), 0, 255)
    Image.fromarray(pv.astype(np.uint8)).resize((N // 2, N // 2)).save(os.path.join(OUT, 'ba_dao_trail_preview.png'))


if __name__ == '__main__':
    main()
