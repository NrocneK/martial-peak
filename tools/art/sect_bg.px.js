// =====================================================================
// Ảnh nền Vân Hạc Tông 480x400 — dùng chung cho Menu chính và Lobby (Sảnh).
// Bố cục "an toàn khi cắt": phần quan trọng nằm ở cột giữa (x 150..330) và dải giữa (y 70..370),
//   - điện thoại dọc (background-size: cover) cắt hai bên → vẫn thấy chính điện, cầu thang, cổng truyền tống;
//   - màn hình ngang cắt trên / dưới → vẫn thấy trăng, chính điện, cổng.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/sect_bg.px.js   →  chép out/scenes/sect_bg.png vào public/ui/
// =====================================================================
pal({
  k: '#1a1530',
  a: '#2763d0', b: '#3a86e6', c: '#5ea8f2', d: '#8ccaf8', e: '#c2e4fc', f: '#eaf8ff',   // trời
  w: '#ffffff', x: '#d6ecfa', y: '#a8cbe6',                                              // mây
  g: '#fff6c8', G: '#ffd96a', H: '#f2b23e', I: '#c9801f',                                // vàng
  m: '#7aa6d6', n: '#5e8cc2', o: '#4a72aa',                                              // núi xa
  p: '#56b07e', q: '#3c9265', r: '#2b7552', s: '#1e5a40',                                // cỏ / cây
  t: '#b8adc4', u: '#958aa8', v: '#72688c', V: '#544b6e', W: '#3a3352',                  // đá
  R: '#d9473d', S: '#a52e3a', T: '#f08a5a',                                              // gỗ đỏ
  B: '#2d5aa8', C: '#1f3f7c', D: '#4c7fd4', E: '#7fa8ec',                                // mái ngói lam
  P: '#ffc4d8', Q: '#ff96b8', U: '#e0668f', K: '#6a3f4c',                                // anh đào
  L: '#8fe4f8', M: '#c8f4ff', N: '#5ac0ea', O: '#3a9ed0',                                // nước / linh quang
  F: '#f4f2ea', J: '#d8d2c4',                                                            // đá trắng (bậc thang)
})
ramps('kWVvut', 'abcdef', 'IHGg', 'srqp', 'CBDE', 'ONLM', 'JF')

// ---------------------------------------------------------------- bộ phận
sprite('_cloud', { w: 40, h: 12 }, (c) => {
  c.ellipse(20, 8, 19, 4, 'x'); c.circ(12, 6, 5, 'w'); c.circ(21, 4, 6, 'w'); c.circ(29, 6, 5, 'w')
  c.rect(4, 8, 32, 3, 'w'); c.hline(3, 11, 34, 'y'); c.hline(8, 10, 24, 'x')
})
sprite('_cloud2', { w: 24, h: 8 }, (c) => { c.circ(8, 5, 3, 'w'); c.circ(14, 4, 4, 'w'); c.rect(3, 5, 18, 3, 'w'); c.hline(3, 7, 18, 'x') })

// mái cong: rộng w, cao 6, đầu mái vểnh vàng
function roof(c, x, y, w, col = 'B') {
  c.poly([x, y + 5, x + 3, y + 2, x + w / 2, y - 3, x + w - 3, y + 2, x + w, y + 5, x + w - 4, y + 6, x + 4, y + 6], col)
  c.hline(x + 1, y + 5, w - 2, 'D'); c.hline(x + 4, y + 6, w - 8, 'C'); c.line(x + 4, y + 2, x + w / 2, y - 2, 'E')
  c.px(x, y + 4, 'G'); c.px(x + w, y + 4, 'G'); c.vline(x + w / 2, y - 6, 3, 'H'); c.px(x + w / 2, y - 6, 'G')
}
// lầu nhỏ hai tầng (34x30)
sprite('_pavilion', { w: 34, h: 30, outline: 'k' }, (c) => {
  c.rect(8, 20, 18, 9, 'R'); c.hline(8, 20, 18, 'T'); c.vline(11, 21, 8, 'S'); c.vline(22, 21, 8, 'S'); c.rect(14, 22, 6, 7, 'W'); c.px(16, 25, 'G')
  roof(c, 2, 14, 30)
  c.rect(11, 8, 12, 6, 'R'); c.hline(11, 8, 12, 'T'); c.vline(14, 9, 5, 'S'); c.vline(19, 9, 5, 'S'); c.rect(15, 10, 3, 4, 'W')
  roof(c, 6, 3, 22)
})
// chính điện ba tầng mái (92x64)
sprite('_hall', { w: 92, h: 64, outline: 'k' }, (c) => {
  // nền đá trắng + bậc
  c.rect(4, 56, 84, 8, 'J'); c.hline(4, 56, 84, 'F'); c.hline(8, 60, 76, 'F')
  // tầng 1
  c.rect(12, 38, 68, 18, 'R'); c.hline(12, 38, 68, 'T')
  for (const x of [16, 28, 62, 74]) c.vline(x, 39, 17, 'S')
  c.rect(36, 42, 20, 14, 'W'); c.rect(38, 44, 16, 12, 'V'); c.vline(46, 44, 12, 'W'); c.rect(42, 40, 8, 3, 'G'); c.hline(42, 41, 8, 'H')
  for (const x of [19, 66]) { c.rect(x, 44, 6, 6, 'G'); c.rect(x + 1, 45, 4, 4, 'I') }
  // cờ lam
  for (const x of [31, 57]) { c.rect(x, 40, 4, 12, 'B'); c.px(x + 1, 44, 'F'); c.px(x + 2, 45, 'F'); c.poly([x, 52, x + 2, 54, x + 4, 52], 'B') }
  roof(c, 2, 30, 88)
  // tầng 2
  c.rect(24, 20, 44, 11, 'R'); c.hline(24, 20, 44, 'T'); for (const x of [28, 38, 54, 64]) c.vline(x, 21, 10, 'S'); c.rect(42, 22, 8, 9, 'W'); c.px(45, 25, 'G'); c.px(46, 25, 'G')
  roof(c, 14, 13, 64)
  // tầng 3 (đỉnh)
  c.rect(34, 6, 24, 8, 'R'); c.hline(34, 6, 24, 'T'); c.rect(43, 8, 6, 6, 'W')
  roof(c, 28, 1, 36)
})
sprite('_island', { w: 44, h: 26, outline: 'k' }, (c) => {
  c.poly([0, 5, 5, 2, 38, 2, 43, 5, 38, 9, 33, 13, 29, 11, 26, 20, 21, 14, 17, 22, 13, 12, 8, 14, 5, 9], 'v')
  c.poly([0, 5, 5, 2, 38, 2, 43, 5, 38, 9, 5, 9], 'u'); c.poly([5, 9, 13, 12, 17, 22, 21, 14, 26, 20, 29, 11, 33, 13, 38, 9], 'V')
  c.rect(5, 2, 33, 3, 'p'); c.hline(5, 4, 33, 'q'); c.poly([0, 5, 5, 2, 5, 5], 'q')
})
sprite('_sakura', { w: 34, h: 36, outline: 'k' }, (c) => {
  c.rect(15, 18, 4, 18, 'K'); c.vline(16, 18, 18, 'W'); c.line(17, 26, 7, 19, 'K'); c.line(18, 24, 28, 17, 'K')
  c.circ(17, 12, 10, 'Q'); c.circ(8, 16, 8, 'Q'); c.circ(26, 16, 8, 'Q'); c.circ(17, 6, 7, 'P')
  c.circ(12, 10, 4, 'P'); c.circ(23, 11, 4, 'P'); c.circ(6, 18, 3, 'U'); c.circ(28, 19, 3, 'U'); c.circ(17, 19, 4, 'U'); c.px(12, 5, 'w'); c.px(22, 8, 'w')
})
sprite('_pine', { w: 22, h: 40, outline: 'k' }, (c) => {
  c.rect(10, 32, 3, 8, 'K')
  for (let i = 0; i < 5; i++) { const w = 4 + i * 2; c.poly([11 - w, 9 + i * 6 + 5, 11, 1 + i * 6, 11 + w, 9 + i * 6 + 5], i % 2 ? 'q' : 'p'); c.hline(11 - w + 1, 9 + i * 6 + 4, w * 2 - 1, 'r') }
})
// đèn đá
sprite('_lantern', { w: 10, h: 22, outline: 'k' }, (c) => {
  c.rect(1, 18, 8, 4, 'u'); c.rect(3, 12, 4, 6, 'v'); c.rect(0, 9, 10, 2, 'u'); c.rect(1, 3, 8, 6, 'G'); c.rect(2, 4, 6, 4, 'g')
  c.poly([0, 3, 5, 0, 10, 3], 'v'); c.vline(5, 3, 6, 'H')
})

// ---------------------------------------------------------------- cảnh
const W = 480, H = 400, CX = 240
scene('sect_bg', { w: W, h: H },
  // ---- trời
  rect(0, 0, W, 280, 'a'), grad(0, 0, W, 280, 'abcdef', 'v', 0.9), rect(0, 250, W, 150, 'q'), dither(0, 60, W, 30, 'b', 'c', 0.3),
  // ---- vầng trăng + vòng linh quang
  layer('halo', { light: 1, density: 0.25 }, circ(322, 92, 62, 'g')),
  (c) => {
    const cx = 322, cy = 92
    for (const [r, col] of [[36, 'M'], [35, 'w'], [34, 'L'], [33, 'M'], [28, 'L'], [27, 'M']]) c.ring(cx, cy, r, col)
    for (let d = 0; d < 360; d += 15) { const a = (d * Math.PI) / 180; c.line(Math.round(cx + Math.cos(a) * 29), Math.round(cy + Math.sin(a) * 29), Math.round(cx + Math.cos(a) * 32), Math.round(cy + Math.sin(a) * 32), 'N') }
    c.circ(cx, cy, 20, 'e'); c.circ(cx, cy, 17, 'f'); c.circ(cx, cy, 13, 'w')
    for (const [dx, dy] of [[-60, -30], [52, -40], [60, 30], [-48, 40], [8, -66], [-110, 10], [120, -10]]) { c.px(cx + dx, cy + dy, 'w'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.px(cx + dx + ox, cy + dy + oy, 'M') }
  },
  glow('Mw', { r: 6, strength: 0.25, color: 'M', bands: 3, where: [270, 40, 104, 104] }),
  // mây
  stamp('_cloud', 20, 40), stamp('_cloud2', 120, 24), stamp('_cloud', 196, 58, { flip: 'x' }), stamp('_cloud2', 402, 30), stamp('_cloud', 420, 120, { flip: 'x' }), stamp('_cloud2', 250, 150), stamp('_cloud', 60, 150),
  // ---- núi xa
  poly([0, 236, 0, 170, 30, 140, 58, 176, 96, 120, 136, 180, 168, 150, 200, 190, 240, 160, 282, 196, 320, 158, 360, 186, 410, 132, 450, 170, 480, 150, 480, 236], 'n'),
  poly([96, 120, 136, 180, 116, 180, 100, 140], 'm'), poly([410, 132, 450, 170, 428, 170, 414, 150], 'm'), poly([30, 140, 58, 176, 42, 176, 32, 156], 'm'), poly([320, 158, 360, 186, 340, 186, 324, 170], 'm'),
  layer('mist0', { light: 1, density: 0.5 }, rect(0, 196, W, 40, 'f')),
  // ---- đảo nổi
  stamp('_island', 26, 116), stamp('_pavilion', 31, 90),
  stamp('_island', 408, 150, { flip: 'x' }), stamp('_pine', 420, 114), stamp('_sakura', 440, 118),
  stamp('_island', 176, 84, { flip: 'x' }), stamp('_pavilion', 181, 58),
  // ---- núi giữa xanh
  poly([0, 268, 0, 214, 40, 196, 80, 222, 120, 200, 160, 230, 320, 230, 360, 204, 400, 226, 440, 198, 480, 214, 480, 268], 'q'),
  poly([40, 196, 80, 222, 60, 222, 46, 206], 'p'), poly([440, 198, 480, 214, 458, 214], 'p'),
  layer('mist1', { light: 1, density: 0.5 }, rect(0, 236, W, 30, 'f')),
  // ---- vách chính + chính điện
  poly([CX - 108, 214, CX - 92, 206, CX + 92, 206, CX + 108, 214, CX + 104, 300, CX - 104, 300], 'v'),
  poly([CX - 108, 214, CX - 92, 206, CX + 92, 206, CX + 108, 214], 'p'), hline(CX - 92, 206, 184, 'p'), hline(CX - 106, 213, 212, 'q'),
  poly([CX - 104, 214, CX - 60, 214, CX - 70, 300, CX - 104, 300], 'u'), poly([CX + 60, 214, CX + 104, 214, CX + 104, 300, CX + 70, 300], 'V'),
  (c) => {
    // vân đá: các gờ ngang lệch nhau theo lớp đá (mặt trái sáng, mặt phải tối)
    const r = c.rng(11)
    for (let y = 224; y < 296; y += 9) {
      for (let x = CX - 100; x < CX + 100; x += 22 + Math.floor(r() * 10)) {
        const w = 8 + Math.floor(r() * 12), xx = x + (y % 18 ? 6 : 0)
        if (Math.abs(xx + w / 2 - CX) < 32) continue
        c.hline(xx, y, w, xx < CX - 60 ? 'v' : xx > CX + 60 ? 'W' : 'V'); c.hline(xx + 1, y - 1, w - 2, xx < CX - 60 ? 't' : 'u')
      }
    }
    // khe nứt dọc từ mép trên
    for (const [x, h] of [[CX - 54, 30], [CX + 48, 26], [CX - 88, 40], [CX + 86, 44]]) { c.vline(x, 216, h, 'W'); c.px(x + 1, 216 + h, 'W') }
    // rêu + cỏ thòng xuống từ mép vách
    for (let x = CX - 104; x < CX + 104; x += 3) { const d = Math.floor(r() * 4); if (d) c.vline(x, 214, d, r() < 0.5 ? 'q' : 'r') }
  },
  stamp('_hall', CX - 46, 148),
  stamp('_pine', CX - 92, 168), stamp('_pine', CX + 70, 168, { flip: 'x' }),
  // lầu hai bên trên vách thấp
  poly([CX - 170, 252, CX - 150, 240, CX - 104, 240, CX - 100, 300, CX - 176, 300], 'v'), poly([CX - 170, 252, CX - 150, 240, CX - 104, 240, CX - 104, 246, CX - 168, 254], 'p'),
  stamp('_pavilion', CX - 160, 212),
  poly([CX + 170, 252, CX + 150, 240, CX + 104, 240, CX + 100, 300, CX + 176, 300], 'V'), poly([CX + 170, 252, CX + 150, 240, CX + 104, 240, CX + 104, 246, CX + 168, 254], 'p'),
  stamp('_pavilion', CX + 126, 212, { flip: 'x' }),
  // ---- thác nước hai bên vách chính
  (c) => {
    for (const x0 of [CX - 82, CX + 76]) {
      c.rect(x0, 216, 7, 70, 'L'); c.vline(x0 + 1, 216, 70, 'M'); c.vline(x0 + 4, 216, 70, 'M'); c.vline(x0 + 6, 216, 70, 'N')
      for (let y = 220; y < 284; y += 6) { c.px(x0 + 2, y, 'w'); c.px(x0 + 5, y + 3, 'w') }
      c.ellipse(x0 + 3, 288, 12, 4, 'M'); c.ellipse(x0 + 3, 289, 7, 2, 'w')
    }
  },
  // ---- cầu thang đá trắng từ cổng lên chính điện
  poly([CX - 14, 212, CX + 14, 212, CX + 26, 300, CX - 26, 300], 'J'),
  (c) => { for (let y = 214; y < 300; y += 4) { const hw = 14 + Math.round(((y - 212) / 88) * 12); c.hline(CX - hw, y, hw * 2, 'F') } },
  vline(CX - 15, 212, 88, 'u'), vline(CX + 15, 212, 88, 'u'), line(CX - 15, 212, CX - 27, 300, 'u'), line(CX + 15, 212, CX + 27, 300, 'u'),
  // ---- sân đá + vách thấp phía dưới
  poly([0, 330, 0, 292, 60, 286, 130, 296, 350, 296, 420, 286, 480, 292, 480, 330], 'q'),
  poly([0, 292, 60, 286, 130, 296, 350, 296, 420, 286, 480, 292, 480, 298, 0, 298], 'p'),
  rect(CX - 120, 298, 240, 34, 'u'), hline(CX - 120, 298, 240, 't'),
  (c) => { for (let x = CX - 120; x < CX + 120; x += 16) c.vline(x, 299, 33, 'v'); for (let y = 306; y < 332; y += 8) c.hline(CX - 120, y, 240, 'v') },
  // ---- cổng truyền tống (Truyền Tống Trận)
  (c) => {
    const gx = CX, gy = 350
    // vòng xoáy
    c.circ(gx, gy, 30, 'O'); c.circ(gx, gy, 27, 'N'); c.circ(gx, gy, 22, 'L'); c.circ(gx, gy, 15, 'M'); c.circ(gx, gy, 8, 'w')
    for (let i = 0; i < 3; i++) for (let t = 0; t < 1; t += 0.01) {
      const a = t * Math.PI * 3 + (i * Math.PI * 2) / 3, r = 6 + t * 22
      c.px(Math.round(gx + Math.cos(a) * r), Math.round(gy + Math.sin(a) * r * 0.95), t > 0.6 ? 'L' : 'w')
    }
    // khung cổng đá + mái
    c.rect(gx - 50, 318, 10, 60, 't'); c.rect(gx + 40, 318, 10, 60, 't'); c.vline(gx - 41, 318, 60, 'u'); c.vline(gx + 49, 318, 60, 'v')
    c.rect(gx - 48, 330, 6, 34, 'B'); c.rect(gx + 42, 330, 6, 34, 'B'); for (const x of [gx - 46, gx + 44]) { c.px(x, 338, 'F'); c.px(x + 1, 339, 'F'); c.px(x, 340, 'F') }
    c.rect(gx - 54, 312, 108, 7, 'R'); c.hline(gx - 54, 312, 108, 'T'); c.rect(gx - 8, 313, 16, 5, 'G'); c.hline(gx - 6, 315, 12, 'H')
    roof(c, gx - 62, 302, 124)
  },
  glow('LMw', { r: 12, strength: 0.45, color: 'L', bands: 4, where: [CX - 60, 300, 120, 100] }),
  // nền đá trước cổng
  poly([CX - 110, 372, CX + 110, 372, CX + 150, 400, CX - 150, 400], 'u'), hline(CX - 110, 372, 220, 't'),
  (c) => { for (let y = 378; y < 400; y += 7) { const hw = 110 + Math.round(((y - 372) / 28) * 40); c.hline(CX - hw, y, hw * 2, 'v'); for (let x = CX - hw + (y % 14 ? 0 : 9); x < CX + hw; x += 18) c.vline(x, y + 1, 6, 'v') } },
  poly([CX - 70, 378, CX + 70, 378, CX + 90, 400, CX - 90, 400], 'J'), hline(CX - 70, 378, 140, 'F'), hline(CX - 80, 388, 160, 'F'),
  // đèn đá hai bên
  stamp('_lantern', CX - 80, 356), stamp('_lantern', CX + 70, 356),
  glow('gG', { r: 6, strength: 0.4, color: 'G', bands: 3, where: [CX - 96, 340, 192, 40] }),
  // ---- tiền cảnh: anh đào + thông hai bên
  poly([0, 400, 0, 330, 40, 322, 110, 340, 150, 400], 'r'), poly([480, 400, 480, 330, 440, 322, 370, 340, 330, 400], 'r'),
  poly([0, 330, 40, 322, 110, 340, 116, 346, 40, 330, 0, 336], 'q'), poly([480, 330, 440, 322, 370, 340, 364, 346, 440, 330, 480, 336], 'q'),
  stamp('_sakura', 10, 292), stamp('_sakura', 60, 306, { flip: 'x' }), stamp('_pine', 108, 300),
  stamp('_sakura', 436, 292, { flip: 'x' }), stamp('_sakura', 386, 306), stamp('_pine', 350, 300, { flip: 'x' }),
  // cành hoa vươn vào khung (góc trên)
  poly([0, 0, 70, 0, 40, 10, 0, 18], 'K'), circ(14, 12, 14, 'Q'), circ(34, 6, 10, 'P'), circ(4, 26, 10, 'Q'), circ(52, 4, 8, 'Q'), circ(24, 20, 5, 'U'), circ(44, 12, 4, 'U'),
  poly([480, 0, 410, 0, 440, 10, 480, 18], 'K'), circ(466, 12, 14, 'Q'), circ(446, 6, 10, 'P'), circ(476, 26, 10, 'Q'), circ(428, 4, 8, 'Q'), circ(456, 20, 5, 'U'),
  // cánh hoa rơi
  (c) => { const r = c.rng(5); for (let i = 0; i < 70; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 380); c.px(x, y, i % 3 === 0 ? 'w' : 'P'); if (i % 4 === 0) c.px(x + 1, y + 1, 'Q') } },
)
