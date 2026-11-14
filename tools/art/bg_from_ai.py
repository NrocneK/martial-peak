"""
ẢNH NỀN màn nạp / menu / Sảnh — lấy NGUYÊN các ảnh mẫu bạn tạo (tools/art/ref/bg_*.webp), không vẽ lại:
  · xoá chữ "Dola AI" (chữ trắng mờ góc dưới phải): dò điểm sáng trội hơn nền quanh nó trong khung chữ → lấp bằng nền lân cận
  · màn nạp:  bg_load_wide (16:9) + bg_load_tall (9:16) — có sẵn 2 bản
  · menu:     bg_menu_wide (16:9); bản dọc = cắt 9:16 quanh chính điện của bản ngang
  · Sảnh:     bg_lobby_wide (16:9); bản dọc = cắt 9:16 quanh cổng xoáy của bản ngang (2 bản cùng một cảnh)
  → public/ui/bg_{load,menu,lobby}_{wide,tall}.jpg
  · nhân vật đi bộ màn nạp: public/ui/hero_boot_walk.png (cắt từ hero_b_walk.png)
  In tâm + bán kính cổng xoáy (Truyền Tống Trận) để khớp SECT trong src/ui/screens/Hub.ts.
  python3 -I tools/art/bg_from_ai.py   (cần opencv-contrib: pip install opencv-contrib-python-headless)
"""
import os
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'public', 'ui')
REF = os.path.join(HERE, 'ref')
PORTAL = (1005, 878, 95)                                                 # cổng xoáy trên bg_lobby_wide (2000×1124)


def load(name):
    return cv2.imread(os.path.join(REF, name), cv2.IMREAD_COLOR)


def unmark(img, box):
    """xoá chữ watermark trong khung box=(x0,y0,x1,y1)"""
    x0, y0, x1, y1 = box
    roi = img[y0:y1, x0:x1]
    lab = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    v = lab[..., 2].astype(np.int16)
    s = lab[..., 1].astype(np.int16)
    bg = cv2.medianBlur(roi, 21)
    vb = cv2.cvtColor(bg, cv2.COLOR_BGR2HSV)[..., 2].astype(np.int16)
    m = ((v - vb > 12) & (s < 90)) | ((v > 225) & (s < 40))
    m = cv2.dilate(m.astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=2)
    # lấp bằng các mảng nền thật xung quanh (patch), làm trong 1 vùng rộng hơn khung chữ
    P = 160
    X0, Y0, X1, Y1 = max(0, x0 - P), max(0, y0 - P), min(img.shape[1], x1 + P), min(img.shape[0], y1 + P)
    sub = img[Y0:Y1, X0:X1].copy()
    known = np.full(sub.shape[:2], 255, np.uint8)
    known[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0][m > 0] = 0
    out = np.zeros_like(sub)
    cv2.xphoto.inpaint(sub, known, out, cv2.xphoto.INPAINT_SHIFTMAP)
    img = img.copy()
    img[Y0:Y1, X0:X1] = out
    return img


def crop916(img, cx):
    h, w = img.shape[:2]
    cw = round(h * 9 / 16)
    x0 = int(min(max(0, cx - cw / 2), w - cw))
    return img[:, x0:x0 + cw], x0


def save(img, name):
    cv2.imwrite(os.path.join(UI, name), img, [cv2.IMWRITE_JPEG_QUALITY, 88])


def main():
    WIDE_WM = (1700, 990, 1960, 1090)
    load_w = unmark(load('bg_load_wide.webp'), WIDE_WM)
    load_t = unmark(load('bg_load_tall.webp'), (900, 1880, 1090, 1980))
    menu_w = unmark(load('bg_menu_wide.webp'), WIDE_WM)
    lobby_w = unmark(load('bg_lobby_wide.webp'), WIDE_WM)
    save(load_w, 'bg_load_wide.jpg')
    save(load_t, 'bg_load_tall.jpg')
    save(menu_w, 'bg_menu_wide.jpg')
    save(crop916(menu_w, 640)[0], 'bg_menu_tall.jpg')
    save(lobby_w, 'bg_lobby_wide.jpg')
    lt, ox = crop916(lobby_w, PORTAL[0])
    save(lt, 'bg_lobby_tall.jpg')
    print('lobby wide', lobby_w.shape[1::-1], 'portal', PORTAL)
    print('lobby tall', lt.shape[1::-1], 'portal', (PORTAL[0] - ox, PORTAL[1], PORTAL[2]))
    # nhân vật đi bộ ở màn nạp: hàng hướng xuống (6 khung 52×68) của sprite trong trận
    sheet = cv2.imread(os.path.join(UI, 'hero_b_walk.png'), cv2.IMREAD_UNCHANGED)
    cv2.imwrite(os.path.join(UI, 'hero_boot_walk.png'), sheet[:68, :52 * 6])


if __name__ == '__main__':
    main()
