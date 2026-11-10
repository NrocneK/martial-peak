// =====================================================================
// Nhân vật chính Cố Trường Ca (pixel art bằng pxl).
// Khung gốc lấy TRỰC TIẾP từ ảnh concept (tools/art/ref/hero_concept.png) qua
// tools/art/trace_hero.py → hero_trace.px.js (lưới màu). File này chỉ thêm hoạt ảnh + tư thế ngồi thiền.
//   hero_full     : dáng đứng (Lobby / Hành Trang / avatar), 4 khung: thở, tóc + dải đai lay
//   hero_walk     : sprite trong trận, 4 khung: nhún + hai chân nhấc luân phiên
//   hero_meditate : ngồi thiền (Tu Luyện), 8 khung: hào quang + linh khí xoay, thở
// Chạy:  python3 -I tools/art/trace_hero.py   (chỉ khi đổi ảnh concept)
//        node <pxl>/bin/pxl.js build tools/art/hero.px.js  → chép out/anims/hero_*.png vào public/ui/
// =====================================================================
include('hero_trace.px.js')
const G = globalThis
// '1'..'6' không trùng khóa của bảng màu lấy từ concept (a..z, A..P)
pal({ k: '#120e1c', ...G.HERO_PAL, 1: '#4f7ee8', 2: '#9fc2ff', 3: '#ffd765', 4: '#2a3a78', 5: '#1b2552', 6: '#d9e4ff' })

// ---------------------------------------------------------------- tiện ích: dời một vùng pixel
/** Dời vùng [x0,x1)×[y0,y1) đi (dx,dy); chỗ trống để trong suốt. */
function shift(c, x0, y0, x1, y1, dx, dy) {
  if (!dx && !dy) return
  const buf = []
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { buf.push([x, y, c.key(x, y)]); c.px(x, y, '_') }
  for (const [x, y, k] of buf) if (k && k !== '.' && k !== '_') c.px(x + dx, y + dy, k)
}

// Mốc trên lưới 56x104 (xem số hàng trong hero_trace.px.js)
// Chạy lại trace_hero.py thì kiểm tra lại các mốc này (in lưới ra xem hàng / cột).
const BELT = 41                   // hàng trên cùng của đai lưng
const BODY_X = 36                 // cột giữa thân (khóa đai)
const RIBBON = [0, 48, 19, 66]    // dải đai bay (x0, y0, x1, y1)
const TAIL = [10, 13, 25, 28]     // đuôi tóc rủ bên trái
/** Khóa màu của concept gần nhất với một màu cho trước (lấy đúng chất liệu: quần, áo, da...) */
const nearest = (hex) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const t = rgb(hex)
  let best = '', bd = 1e9
  for (const [k, v] of Object.entries(G.HERO_PAL)) { const c = rgb(v); const d = (c[0] - t[0]) ** 2 + (c[1] - t[1]) ** 2 + (c[2] - t[2]) ** 2; if (d < bd) { bd = d; best = k } }
  return best
}
const C = { pant: nearest('#2c3358'), pantHi: nearest('#46507e'), robe: nearest('#eceef6'), robeSh: nearest('#b8bdd2'), blue: nearest('#4f6fb2'), blueDk: nearest('#34477a'), skin: nearest('#f2cab0'), skinSh: nearest('#c99a80'), cuff: nearest('#262838'), boot: nearest('#1c1c26') }

sprite('_hero_base', G.HERO_GRID)

// ---------------------------------------------------------------- Dáng đứng (58x106 sau viền)
anim('hero_full', { w: 56, h: 104, frames: 4, fps: 4, outline: 'k' }, (c) => {
  c.stamp('_hero_base', 0, 0)
  const f = c.frame
  // thở: thân trên hạ 1px ở khung 1-2 (chân + vạt áo đứng yên)
  if (f === 1 || f === 2) shift(c, 0, 0, 56, BELT, 0, 1)
  // dải đai + đuôi tóc lay theo gió
  const sway = [0, -1, 0, 1][f]
  shift(c, RIBBON[0], RIBBON[1], RIBBON[2], RIBBON[3], sway, f === 2 ? -1 : 0)
  if (f === 1 || f === 2) shift(c, TAIL[0], TAIL[1] + 1, TAIL[2], TAIL[3] + 1, -1, 0)
})

// ---------------------------------------------------------------- Đi bộ trong trận (21x38 sau viền)
// Lưới nhỏ 19x36: ủng trái ~ cột 7-9, ủng phải ~ cột 13-18, hàng 30-35.
sprite('_hero_s', G.HERO_S_GRID)
anim('hero_walk', { w: 19, h: 36, frames: 4, fps: 8, outline: 'k' }, (c) => {
  c.stamp('_hero_s', 0, 0)
  const f = c.frame
  if (f === 1 || f === 3) shift(c, 0, 0, 19, 30, 0, -1) // nhún lên khi hai chân chụm
  if (f === 0) shift(c, 5, 30, 12, 36, 0, -1) // nhấc chân trái
  if (f === 2) shift(c, 12, 30, 19, 36, 0, -1) // nhấc chân phải
})

// ---------------------------------------------------------------- Ngồi thiền (72x72)
// Giữ NGUYÊN thân trên + hai cánh tay + nắm tay từ concept: nắm tay đặt lên đầu gối (tư thế thiền).
// Xóa phần dưới đai (tạp dề, quần, dải đai), vẽ chân xếp bằng phía sau + vạt áo trắng rủ giữa lòng + bồ đoàn.
const FIST_Y = 59                 // hàng dưới cùng của nắm tay
const MX = 0, MY = 2
sprite('_med_upper', { w: 56, h: FIST_Y + 1 }, (c) => {
  c.stamp('_hero_base', 0, 0)
  c.rect(0, BELT + 5, 20, FIST_Y, '_')            // dải đai bay
  c.rect(28, BELT + 7, 21, FIST_Y, '_')           // tạp dề + quần giữa hai tay
})
anim('_med_body', { w: 72, h: 72, frames: 8, fps: 6, outline: 'k' }, (c) => {
  const ph = c.phase * Math.PI * 2
  const B = Math.sin(ph) > 0.3 ? -1 : 0
  const cx = MX + BODY_X, knee = MY + FIST_Y + 1
  // bồ đoàn
  c.ellipse(cx, knee + 7, 30, 4, '5'); c.ellipse(cx, knee + 6, 29, 3, '4'); c.hline(cx - 26, knee + 5, 52, '1')
  // chân xếp bằng: quần lam sẫm phồng, hai đầu gối nhô ra dưới nắm tay, đế ủng bắt chéo ở giữa
  c.ellipse(cx, knee, 31, 6, C.pant)
  c.ellipse(cx - 20, knee - 2, 11, 5, C.pant); c.ellipse(cx + 18, knee - 2, 11, 5, C.pant)
  c.ellipse(cx - 21, knee - 4, 7, 2, C.pantHi); c.ellipse(cx + 17, knee - 4, 7, 2, C.pantHi)
  c.rect(cx - 7, knee + 1, 14, 3, C.boot); c.hline(cx - 6, knee + 1, 12, C.cuff)
  // thân trên + tay từ concept (thở)
  c.stamp('_med_upper', MX, MY + B)
  // vạt áo trắng rủ giữa lòng (như tạp dề concept), viền lam
  const top = MY + BELT + 7 + B
  c.poly([cx - 7, top, cx + 7, top, cx + 11, knee + 2, cx - 11, knee + 2], C.robe)
  // bóng: mặt phải khuất sáng + vùng sát đai tối hơn; nếp gấp dọc theo vạt
  c.poly([cx + 3, top, cx + 7, top, cx + 11, knee + 2, cx + 5, knee + 2], C.robeSh)
  c.hline(cx - 6, top, 13, C.robeSh)
  c.line(cx - 2, top + 2, cx - 4, knee, C.robeSh); c.line(cx + 2, top + 3, cx + 2, knee - 1, C.robeSh)
  // viền lam hai mép + gấu áo có hoa văn bậc thang (giống tạp dề concept)
  c.line(cx - 7, top, cx - 11, knee + 2, C.blue); c.line(cx + 7, top, cx + 11, knee + 2, C.blue)
  c.hline(cx - 11, knee + 2, 23, C.blueDk); c.hline(cx - 10, knee, 21, C.blue)
  for (let x = cx - 9; x <= cx + 8; x += 4) { c.px(x, knee - 1, C.blue); c.px(x + 1, knee - 1, C.blue); c.px(x + 1, knee - 2, C.blue) }
})
anim('hero_meditate', { w: 72, h: 72, frames: 8, fps: 6 },
  (c) => {
    const ph = c.phase * Math.PI * 2
    const cx = MX + BODY_X, cy = MY + 28
    for (let i = 0; i < 3; i++) c.ring(cx, cy, 24 + i * 6 + Math.round(Math.sin(ph + i * 1.3) * 1.5), i === 1 ? '2' : '1')
    for (let i = 0; i < 8; i++) { const a = ph + (i * Math.PI) / 4; c.px(Math.round(cx + Math.cos(a) * 32), Math.round(cy + Math.sin(a) * 24), i % 2 ? '3' : '6') }
  },
  stamp('_med_body', 0, 0),
)
