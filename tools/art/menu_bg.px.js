// Phông menu "Vạn Giới Tầm Quang" 384x216, phong cách tiên hiệp sáng, rực: trời xanh, mây, vòng sáng,
// đảo nổi + đền, hoa anh đào, thác nước, vách đá và Cố Trường Ca (chibi) nhìn ra xa.
// Chạy: node <pxl>/bin/pxl.js build tools/art/menu_bg.px.js --out tools/art/out_bg
pal({
  k: '#1a1530',                                                                   // viền
  a: '#2a6fd8', b: '#3f8ee8', c: '#62aef2', d: '#8fcdf8', e: '#c4e6fc', f: '#eaf8ff', // trời
  w: '#ffffff', x: '#d6ecfa', y: '#a8cbe6', z: '#7fa6cc',                          // mây
  g: '#fff6c8', G: '#ffd96a', H: '#f2b23e', I: '#c9801f',                          // vòng sáng / vàng
  m: '#6f9fd0', n: '#5886bc', o: '#496fa6',                                         // núi xa
  p: '#46a57a', q: '#33895f', r: '#276e4f', s: '#1d553f',                           // núi/cây xanh
  t: '#a69ab4', u: '#857a9a', v: '#675d80', V: '#4a4262', W: '#352f4c',              // đá
  R: '#d9473d', S: '#a52e3a', T: '#f08a5a',                                         // gỗ đỏ đền
  B: '#2d5aa8', C: '#1f3f7c', D: '#4c7fd4',                                         // mái ngói
  P: '#ffc4d8', Q: '#ff96b8', U: '#e0668f', K: '#6a3f4c',                           // hoa anh đào
  L: '#8fe4f8', M: '#c8f4ff', N: '#5ac0ea', O: '#3a9ed0',                           // nước
  h: '#3a2c5a', i: '#5a4888', j: '#f7d2ae', l: '#e2a77e', F: '#f6f8ff', E: '#c3cef0', // người
  X: '#3f6fe0', Y: '#2548a8', Z: '#6f9cff', J: '#2a2036', A: '#ffffff',
})
ramps('kWVvutm', 'abcdef', 'IHGg')

// ---- bộ phận dùng lại
sprite('_cloud', { w: 40, h: 12 }, (c) => {
  c.ellipse(20, 8, 19, 4, 'x'); c.circ(12, 6, 5, 'w'); c.circ(21, 4, 6, 'w'); c.circ(29, 6, 5, 'w')
  c.rect(4, 8, 32, 3, 'w'); c.hline(3, 11, 34, 'y'); c.hline(8, 10, 24, 'x')
})
sprite('_cloud2', { w: 24, h: 8 }, (c) => { c.circ(8, 5, 3, 'w'); c.circ(14, 4, 4, 'w'); c.rect(3, 5, 18, 3, 'w'); c.hline(3, 7, 18, 'x') })

// đền nhỏ hai tầng: mái cong xanh, cột đỏ, viền vàng
sprite('_temple', { w: 34, h: 30, outline: 'k' }, (c) => {
  c.rect(8, 20, 18, 9, 'R'); c.rect(8, 20, 18, 1, 'T'); c.vline(11, 21, 8, 'S'); c.vline(22, 21, 8, 'S'); c.rect(14, 22, 6, 7, 'W'); c.px(16, 25, 'G'); c.px(17, 25, 'G')
  c.poly([2, 20, 17, 13, 32, 20, 29, 21, 5, 21], 'B'); c.hline(2, 20, 30, 'D'); c.hline(5, 21, 24, 'C')
  c.rect(11, 8, 12, 6, 'R'); c.rect(11, 8, 12, 1, 'T'); c.vline(14, 9, 5, 'S'); c.vline(19, 9, 5, 'S'); c.rect(15, 10, 3, 4, 'W')
  c.poly([6, 8, 17, 1, 28, 8, 26, 9, 8, 9], 'B'); c.hline(6, 8, 22, 'D'); c.hline(8, 9, 18, 'C')
  c.vline(17, 0, 2, 'H'); c.px(17, 0, 'G'); c.px(2, 20, 'G'); c.px(31, 20, 'G'); c.px(6, 8, 'G'); c.px(27, 8, 'G')
})
// đảo nổi: cỏ xanh, đáy đá, rễ cây thòng
sprite('_island', { w: 44, h: 26, outline: 'k' }, (c) => {
  c.poly([0, 5, 5, 2, 38, 2, 43, 5, 38, 9, 33, 13, 29, 11, 26, 20, 21, 14, 17, 22, 13, 12, 8, 14, 5, 9], 'v')
  c.poly([0, 5, 5, 2, 38, 2, 43, 5, 38, 9, 5, 9], 'u'); c.poly([5, 9, 13, 12, 17, 22, 21, 14, 26, 20, 29, 11, 33, 13, 38, 9], 'V')
  c.rect(5, 2, 33, 3, 'p'); c.hline(6, 2, 31, 'c'.replace('c', 'p')); c.hline(5, 4, 33, 'q'); c.poly([0, 5, 5, 2, 5, 5], 'q')
  c.vline(14, 14, 5, 'W'); c.vline(24, 18, 4, 'W'); c.vline(31, 13, 3, 'W')
})
sprite('_sakura', { w: 26, h: 28, outline: 'k' }, (c) => {
  c.rect(12, 14, 3, 14, 'K'); c.vline(13, 14, 14, 'W'); c.line(13, 20, 6, 15, 'K'); c.line(14, 18, 21, 13, 'K')
  c.circ(13, 9, 8, 'Q'); c.circ(6, 12, 6, 'Q'); c.circ(20, 12, 6, 'Q'); c.circ(13, 5, 5, 'P')
  c.circ(9, 8, 3, 'P'); c.circ(18, 9, 3, 'P'); c.circ(5, 13, 2, 'U'); c.circ(21, 14, 2, 'U'); c.circ(14, 14, 3, 'U'); c.px(10, 4, 'w'); c.px(17, 7, 'w')
})
sprite('_pine', { w: 20, h: 36, outline: 'k' }, (c) => {
  c.rect(9, 28, 3, 8, 'K')
  for (let i = 0; i < 5; i++) { const w = 4 + i * 2; c.poly([10 - w, 8 + i * 5 + 5, 10, 1 + i * 5, 10 + w, 8 + i * 5 + 5], i % 2 ? 'q' : 'p'); c.hline(10 - w + 1, 8 + i * 5 + 4, w * 2 - 1, 'r') }
})

// ---- nhân vật chibi: tóc đen tím buộc đuôi ngựa, áo choàng trắng xanh, đai xanh, ủng đen
sprite('_hero', { w: 26, h: 40, outline: 'k' }, (c) => {
  // đuôi ngựa + dải
  c.poly([2, 10, 6, 8, 8, 18, 5, 32, 3, 24], 'h'); c.poly([3, 14, 5, 12, 6, 24, 4, 28], 'i')
  // thân: áo trắng dài, tay áo xanh
  c.poly([8, 22, 18, 22, 20, 36, 6, 36], 'F'); c.poly([8, 22, 12, 22, 12, 36, 6, 36], 'E')
  c.poly([6, 22, 9, 22, 9, 30, 4, 31], 'X'); c.poly([17, 22, 20, 22, 22, 31, 17, 30], 'X'); c.poly([4, 31, 9, 30, 9, 33, 3, 33], 'Z')
  c.rect(8, 28, 11, 3, 'Y'); c.rect(8, 28, 11, 1, 'Z'); c.rect(12, 28, 3, 6, 'Y')
  c.rect(8, 22, 11, 2, 'X')
  // ủng
  c.rect(8, 36, 4, 4, 'J'); c.rect(14, 36, 4, 4, 'J'); c.hline(8, 36, 4, 'W'); c.hline(14, 36, 4, 'W')
  // đầu to (chibi)
  c.circ(13, 12, 9, 'j'); c.rect(4, 12, 19, 5, 'j')
  c.poly([3, 11, 5, 3, 13, 0, 21, 3, 23, 11, 20, 8, 17, 7, 13, 9, 8, 7, 5, 9], 'h')
  c.poly([6, 5, 13, 1, 12, 8, 8, 7], 'i'); c.px(5, 10, 'h'); c.px(21, 10, 'h')
  c.vline(4, 9, 8, 'h'); c.vline(22, 9, 8, 'h')
  // mắt lớn
  c.rect(8, 12, 3, 4, 'k'); c.rect(16, 12, 3, 4, 'k'); c.px(8, 12, 'A'); c.px(16, 12, 'A'); c.rect(9, 14, 2, 1, 'Z'); c.rect(17, 14, 2, 1, 'Z')
  c.px(13, 17, 'l'); c.hline(12, 18, 3, 'l')
  // dây buộc tóc
  c.rect(5, 9, 2, 2, 'Z'); c.px(5, 9, 'A')
})

scene('menu_bg', { w: 384, h: 216 },
  // ---- trời
  rect(0, 0, 384, 150, 'a'),
  grad(0, 0, 384, 150, 'abcdef', 'v', 0.9),
  dither(0, 40, 384, 24, 'b', 'c', 0.3),
  // vầng sáng + vòng thần quang
  layer('halo', { light: 1, density: 0.25 }, circ(268, 54, 70, 'g')),
  layer('halo2', { light: 1, density: 0.4 }, circ(268, 54, 48, 'g')),
  (c) => {
    const cx = 268, cy = 54
    for (const [r, col] of [[40, 'H'], [39, 'G'], [38, 'g'], [37, 'G'], [36, 'H'], [30, 'G'], [29, 'g'], [28, 'G']]) c.ring(cx, cy, r, col)
    for (let d = 0; d < 360; d += 18) { const a = (d * Math.PI) / 180; c.line(Math.round(cx + Math.cos(a) * 31), Math.round(cy + Math.sin(a) * 31), Math.round(cx + Math.cos(a) * 35), Math.round(cy + Math.sin(a) * 35), 'H') }
    c.circ(cx, cy, 14, 'g'); c.circ(cx, cy, 10, 'w'); c.circ(cx, cy, 5, 'w')
    for (const [dx, dy] of [[-48, -20], [46, -26], [50, 22], [-44, 30], [4, -52], [-12, 50]]) { c.px(cx + dx, cy + dy, 'w'); c.px(cx + dx - 1, cy + dy, 'g'); c.px(cx + dx + 1, cy + dy, 'g'); c.px(cx + dx, cy + dy - 1, 'g'); c.px(cx + dx, cy + dy + 1, 'g') }
  },
  glow('gwG', { r: 10, strength: 0.5, color: 'g', bands: 4 }),
  // mây xa
  stamp('_cloud', 20, 22), stamp('_cloud2', 86, 14), stamp('_cloud', 140, 40, { flip: 'x' }), stamp('_cloud2', 330, 18), stamp('_cloud', 346, 70, { flip: 'x' }), stamp('_cloud2', 200, 8),
  // ---- núi xa
  poly([0, 128, 0, 100, 18, 84, 34, 104, 56, 70, 86, 108, 110, 92, 140, 116, 176, 86, 214, 116, 250, 98, 290, 120, 330, 90, 384, 114, 384, 128], 'n'),
  poly([56, 70, 86, 108, 72, 108, 60, 84], 'm'), poly([176, 86, 214, 116, 196, 116, 182, 98], 'm'), poly([330, 90, 384, 114, 350, 114, 336, 100], 'm'),
  layer('mist0', { light: 1, density: 0.5 }, rect(0, 108, 384, 22, 'f')),
  // ---- đảo nổi + đền
  stamp('_island', 14, 92, { flip: 'x' }), stamp('_island', 330, 104),
  stamp('_sakura', 340, 78), stamp('_pine', 366, 70),
  stamp('_island', 204, 100),
  stamp('_temple', 214, 72),
  // ---- núi giữa xanh + đền trên vách
  poly([0, 150, 0, 122, 30, 108, 62, 130, 100, 100, 142, 134, 188, 112, 232, 138, 280, 118, 330, 140, 384, 124, 384, 150], 'q'),
  poly([100, 100, 142, 134, 120, 134, 106, 112], 'p'), poly([188, 112, 232, 138, 210, 138, 194, 122], 'p'), poly([280, 118, 330, 140, 306, 140, 288, 126], 'p'),
  layer('mist1', { light: 1, density: 0.5 }, rect(0, 128, 384, 24, 'f')),
  // thác nước từ đảo giữa
  (c) => {
    c.vline(217, 116, 20, 'L'); c.vline(218, 116, 18, 'M'); c.vline(219, 116, 18, 'L'); c.vline(220, 116, 18, 'N')
    for (let y = 118; y < 132; y += 4) { c.px(218, y, 'w'); c.px(217, y + 2, 'w') }
    c.ellipse(219, 134, 8, 3, 'M'); c.ellipse(219, 135, 5, 2, 'w')
  },
  // ---- biển mây / hồ phía dưới
  rect(0, 148, 384, 68, 'N'),
  grad(0, 148, 384, 68, 'NLOb', 'v', 0.7),
  (c) => {
    const r = c.rng(9)
    for (let i = 0; i < 60; i++) { const x = Math.floor(r() * 384), y = 152 + Math.floor(r() * 60), w = 3 + Math.floor(r() * 9); c.hline(x, y, w, i % 3 === 0 ? 'w' : 'M') }
    for (let i = 0; i < 18; i++) { const x = 238 + Math.floor((r() - 0.5) * 50), y = 156 + Math.floor(r() * 40), w = 2 + Math.floor(r() * 6); c.hline(x, y, w, 'G') }
  },
  // ---- vách đá trái + cầu thang đá
  poly([0, 216, 0, 138, 24, 134, 52, 142, 100, 144, 136, 152, 158, 172, 176, 216], 'v'),
  poly([0, 138, 24, 134, 52, 142, 100, 144, 136, 152, 140, 154, 100, 150, 52, 148, 24, 142, 0, 144], 'p'),
  poly([0, 144, 52, 148, 100, 150, 140, 154, 150, 170, 120, 160, 60, 158, 0, 156], 'q'),
  poly([100, 150, 136, 156, 158, 174, 176, 216, 120, 216, 108, 190, 92, 168], 'u'),
  poly([0, 190, 40, 186, 90, 190, 120, 216, 0, 216], 'V'),
  // cột đá + đèn lồng
  rect(118, 132, 3, 22, 'V'), rect(116, 130, 7, 3, 'W'), rect(116, 138, 7, 7, 'R'), rect(117, 139, 5, 5, 'T'), px(119, 141, 'G'), hline(116, 137, 7, 'H'), hline(116, 145, 7, 'H'),
  // anh đào + thông bên vách
  stamp('_sakura', 6, 114), stamp('_sakura', 28, 124, { flip: 'x' }), stamp('_pine', 52, 112),
  // ---- Cố Trường Ca
  stamp('_hero', 74, 106),
  // hoa rơi + nhành anh đào phía trước
  (c) => {
    const r = c.rng(3)
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 384), y = Math.floor(r() * 190); c.px(x, y, i % 3 === 0 ? 'w' : 'P'); if (i % 5 === 0) c.px(x + 1, y + 1, 'Q') }
  },
  // tiền cảnh phải: cành hoa vươn vào khung
  poly([384, 0, 330, 0, 352, 8, 384, 14], 'K'), circ(362, 12, 12, 'Q'), circ(346, 8, 8, 'P'), circ(378, 22, 10, 'Q'), circ(370, 4, 9, 'P'), circ(352, 20, 5, 'U'), circ(380, 10, 5, 'U'),
  glow('GH', { r: 5, strength: 0.25, color: 'G', bands: 3 }),
)
