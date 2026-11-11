"""
Xoay một mảnh pixel art mà không làm vỡ / biến dạng điểm ảnh (kiểu RotSprite rút gọn):
  phóng NEAREST ×8 → xoay ở độ phân giải cao (NEAREST, quanh điểm trục) → thu về ×1,
  mỗi ô 8×8 lấy màu xuất hiện nhiều nhất (chỉ giữ ô có ≥ 45% điểm đục).
Dùng chung cho các tư thế: xoay khúc tay quanh vai / khuỷu, giữ nguyên chiều dài + độ dày + màu của tay gốc.
"""
from collections import Counter
from PIL import Image

S = 8


def rotate(layer, pivot, angle, dest=None, scale_along=None):
    """layer RGBA (cỡ khung) → layer mới đã xoay `angle` độ (ngược chiều kim đồng hồ trên màn hình)
    quanh `pivot`, rồi dời trục tới `dest`. scale_along=(hệ số, góc trục) để co ngắn theo trục tay (phối cảnh)."""
    w, h = layer.size
    big = layer.resize((w * S, h * S), Image.NEAREST)
    px, py = pivot
    cx, cy = (px + 0.5) * S, (py + 0.5) * S
    if scale_along:
        k, _ = scale_along
        # co dọc (tay đang buông theo trục dọc): giữ trục ở pivot
        bh = int(h * S * k)
        tmp = Image.new('RGBA', big.size, (0, 0, 0, 0))
        sq = big.resize((w * S, bh), Image.NEAREST)
        tmp.alpha_composite(sq, (0, int(cy - cy * k)))
        big = tmp
    dx, dy = (dest or pivot)
    tx, ty = (dx - px) * S, (dy - py) * S
    rot = big.rotate(angle, resample=Image.NEAREST, center=(cx, cy), translate=(tx, ty))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    rp = rot.load()
    for y in range(h):
        for x in range(w):
            cnt = Counter()
            for j in range(S):
                for i in range(S):
                    c = rp[x * S + i, y * S + j]
                    if c[3]:
                        cnt[c] += 1
            if sum(cnt.values()) >= 0.45 * S * S:
                op[x, y] = cnt.most_common(1)[0][0]
    return out
