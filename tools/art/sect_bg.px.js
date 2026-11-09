// =====================================================================
// Ảnh nền Vân Hạc Tông — Menu chính, Lobby (Sảnh), màn nạp.
//   sect_tall 288x512 (9:16)  : điện thoại dọc
//   sect_wide 512x288 (16:9)  : máy tính / màn hình ngang
// Cả hai dùng chung bộ chi tiết bên dưới. Truyền Tống Trận (cổng xoáy) là nút vào chọn màn:
// tâm của nó ghi ở PORTAL (cuối file) và ở src/ui/screens/Hub.ts — đổi bố cục thì sửa cả hai.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/sect_bg.px.js  →  chép out/scenes/sect_*.png vào public/ui/
// =====================================================================
pal({
  k: '#1a1736',
  a: '#1f4fae', b: '#2d68cf', c: '#4688e6', d: '#6aa8f2', e: '#98c8f8', f: '#cbe6fd',     // trời
  w: '#ffffff', x: '#e6f2fd', y: '#bcd6f0', z: '#90b0da', Z: '#6f8fc4',                     // mây
  m: '#9cbde6', n: '#7b9fd2', o: '#5f84bd',                                              // núi xa
  t: '#c6c3d8', u: '#a3a0bf', v: '#827ea2', V: '#625e86', W: '#46426a', // đá
  p: '#7cd08e', q: '#56b072', r: '#3d9058', s: '#2a7046', S: '#1c5234',                     // cỏ / tùng
  R: '#d8463c', T: '#f08a5c', E: '#9c2c38',                                                 // gỗ đỏ
  B: '#2f62b4', C: '#1e4080', D: '#4f8ade', F: '#8cbaf4',                                   // mái ngói lam
  G: '#ffd765', H: '#eaa63a', I: '#b5741c', J: '#fff4b8',                                   // vàng
  P: '#ffd6e6', Q: '#ffa9cb', U: '#f27aab', K: '#c94f85',                                   // anh đào
  X: '#6a4048', Y: '#43293a',                                                               // thân cây
  L: '#94e8fb', M: '#d6f8ff', N: '#5cc4ee', A: '#3a96d4',                                   // nước / linh quang
  2: '#f7f4ec', 3: '#e0d9ca', 4: '#bdb3a2',                                                 // đá trắng
  h: '#fff2a8',                                                                             // ánh đèn
})
ramps('kWVvut', 'abcdef', 'IHGJ', 'Ssrqp', 'CBDF', 'ANLM', '432', 'KUQP', 'Zzyxw', 'onm', 'EvR')

// ================================================================ BỘ PHẬN
// mây tích lớn: viền dưới lam nhạt, đỉnh trắng
sprite('_cloudA', { w: 70, h: 26 }, (c) => {
  c.ellipse(35, 19, 34, 6, 'y'); c.circ(16, 15, 9, 'x'); c.circ(30, 10, 11, 'x'); c.circ(46, 12, 10, 'x'); c.circ(58, 16, 7, 'x')
  c.circ(16, 14, 8, 'w'); c.circ(30, 9, 10, 'w'); c.circ(46, 11, 9, 'w'); c.circ(57, 15, 6, 'w')
  c.rect(6, 18, 58, 4, 'x'); c.hline(4, 22, 62, 'y'); c.hline(10, 23, 50, 'z')
  c.ellipse(28, 18, 10, 2, 'y'); c.ellipse(48, 18, 8, 2, 'y')
})
sprite('_cloudB', { w: 40, h: 16 }, (c) => {
  c.ellipse(20, 11, 19, 4, 'y'); c.circ(11, 8, 6, 'w'); c.circ(21, 6, 7, 'w'); c.circ(30, 9, 5, 'w'); c.rect(4, 9, 32, 3, 'w'); c.hline(3, 12, 34, 'x'); c.hline(6, 13, 28, 'y')
})
// biển mây: dải dài để lấp chân núi
function cloudBank(c, x, y, w, seed) {
  const r = c.rng(seed)
  c.rect(x, y + 6, w, 10, 'x'); c.hline(x, y + 16, w, 'y'); c.hline(x, y + 17, w, 'z')
  for (let i = 0; i < w / 9; i++) {
    const cx = x + Math.floor(r() * w), rr = 5 + Math.floor(r() * 7)
    c.circ(cx, y + 8, rr, 'x'); c.circ(cx - 1, y + 7, rr - 2, 'w')
  }
}
// núi đá vôi (karst): cao, đỉnh tròn, sườn trái sáng, có tùng trên gờ
function karst(c, x, base, w, h, tone) {
  const [lt, md, dk] = tone === 'far' ? ['m', 'n', 'o'] : ['t', 'u', 'V']
  const top = base - h
  c.poly([x, base, x + w * 0.15, top + h * 0.35, x + w * 0.35, top + 4, x + w * 0.5, top, x + w * 0.65, top + 5, x + w * 0.85, top + h * 0.4, x + w, base], md)
  c.poly([x, base, x + w * 0.15, top + h * 0.35, x + w * 0.35, top + 4, x + w * 0.5, top, x + w * 0.45, base], lt)
  c.poly([x + w * 0.62, top + 6, x + w * 0.85, top + h * 0.4, x + w, base, x + w * 0.7, base], dk)
  if (tone !== 'far') {
    for (let k = 1; k < 4; k++) c.line(Math.round(x + w * (0.3 + k * 0.12)), top + 8 + k * 6, Math.round(x + w * (0.25 + k * 0.13)), base, dk)
    c.ellipse(Math.round(x + w * 0.5), top + 2, Math.max(2, Math.round(w * 0.12)), 2, 'r'); c.px(Math.round(x + w * 0.48), top, 'q')
  }
}
// vách đá lởm chởm: mép trái/phải nhấp nhô, vân dọc theo thớ đá, mép cỏ + bụi cây trên đỉnh
function cliff(c, x, y, w, h, seed) {
  const r = c.rng(seed)
  const L = [], R = []
  for (let yy = y; yy <= y + h; yy += 7) { L.push([x + Math.floor(r() * 6) - (yy - y) * 0.04, yy]); R.push([x + w - Math.floor(r() * 6) + (yy - y) * 0.04, yy]) }
  const pts = [...L, ...R.reverse()].flatMap(([a, b]) => [Math.round(a), b])
  c.poly(pts, 'u')
  const rock = (xx, yy) => c.is(xx, yy, 'tuvVW')
  for (let yy = y; yy < y + h; yy++) for (let xx = x - 8; xx < x + w + 8; xx++) {
    if (!rock(xx, yy)) continue
    const f = (xx - x) / w
    if (f < 0.28) c.px(xx, yy, 't'); else if (f > 0.74) c.px(xx, yy, 'V')
  }
  for (let i = 0; i < w / 4; i++) {
    const xx = x + 2 + Math.floor(r() * (w - 4)), y0 = y + 3 + Math.floor(r() * 6), len = 5 + Math.floor(r() * (h * 0.7))
    for (let yy = y0; yy < y0 + len; yy++) if (rock(xx, yy)) c.px(xx, yy, xx > x + w * 0.74 ? 'W' : xx < x + w * 0.28 ? 'u' : 'v')
  }
  for (let i = 0; i < h / 10; i++) { const yy = y + 8 + Math.floor(r() * (h - 10)); for (let xx = x; xx < x + w; xx++) if (rock(xx, yy) && r() < 0.6) c.px(xx, yy, 'W') }
  // mép cỏ + bụi
  c.rect(x - 1, y - 3, w + 2, 4, 'q'); c.hline(x - 1, y - 3, w + 2, 'p'); c.hline(x, y + 1, w, 'r')
  for (let xx = x; xx < x + w; xx += 2) { const d = Math.floor(r() * 5); if (d > 1) c.vline(xx, y + 1, d, r() < 0.5 ? 'r' : 's') }
  for (let i = 0; i < w / 14; i++) { const bx = x + 4 + Math.floor(r() * (w - 8)); c.ellipse(bx, y - 4, 4, 2, 'r'); c.ellipse(bx - 1, y - 5, 3, 1, 'q'); c.px(bx - 2, y - 6, 'p') }
}
// tùng bonsai: tán bằng nhiều tầng
sprite('_pine', { w: 30, h: 26, outline: 'k' }, (c) => {
  c.line(15, 25, 13, 14, 'Y'); c.line(14, 25, 12, 14, 'X'); c.line(13, 17, 6, 12, 'X'); c.line(14, 15, 22, 9, 'X')
  for (const [x, y, rw] of [[7, 11, 7], [22, 8, 8], [13, 5, 9], [16, 14, 5]]) {
    c.ellipse(x, y, rw, 3, 's'); c.ellipse(x, y - 1, rw - 1, 2, 'r'); c.ellipse(x - 1, y - 2, rw - 3, 1, 'q'); c.px(x - 2, y - 3, 'p')
  }
})
sprite('_pineS', { w: 18, h: 16, outline: 'k' }, (c) => {
  c.line(9, 15, 8, 8, 'X'); c.ellipse(5, 7, 5, 2, 's'); c.ellipse(12, 5, 5, 2, 's'); c.ellipse(9, 3, 6, 2, 'r'); c.ellipse(8, 2, 4, 1, 'q'); c.ellipse(4, 6, 3, 1, 'r')
})
// anh đào lớn: thân xoắn, tán loang rộng nhiều chùm, viền tán lởm chởm
sprite('_sakura', { w: 92, h: 70, outline: 'k' }, (c) => {
  c.poly([40, 70, 44, 52, 38, 40, 46, 40, 52, 52, 50, 70], 'X'); c.line(44, 70, 43, 44, 'Y')
  for (const [x1, y1, x2, y2] of [[44, 42, 18, 28], [45, 41, 20, 27], [48, 40, 74, 24], [48, 39, 73, 23], [45, 40, 46, 18], [30, 33, 22, 40], [62, 31, 78, 38]]) c.line(x1, y1, x2, y2, 'X')
  const r = c.rng(17)
  const blobs = []
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI, d = 18 + r() * 26; blobs.push([46 + Math.cos(a + Math.PI) * d * 1.1, 26 - Math.sin(a) * d * 0.55 + r() * 10, 5 + r() * 6]) }
  blobs.push([46, 14, 10], [24, 22, 8], [68, 20, 8], [14, 34, 6], [80, 32, 6])
  for (const [x, y, rr] of blobs) c.circ(Math.round(x), Math.round(y), Math.round(rr), 'K')
  for (const [x, y, rr] of blobs) c.circ(Math.round(x), Math.round(y) - 1, Math.round(rr) - 1, 'U')
  for (const [x, y, rr] of blobs) c.circ(Math.round(x) - 1, Math.round(y) - 2, Math.round(rr) - 3, 'Q')
  for (const [x, y, rr] of blobs) if (rr > 6) c.circ(Math.round(x) - 2, Math.round(y) - 4, Math.round(rr) - 6, 'P')
  for (let i = 0; i < 260; i++) { const x = Math.floor(r() * 92), y = Math.floor(r() * 52); if (c.is(x, y, 'Q')) c.px(x, y, r() < 0.5 ? 'P' : 'U'); else if (c.is(x, y, 'U') && r() < 0.4) c.px(x, y, 'K'); else if (c.is(x, y, 'P') && r() < 0.15) c.px(x, y, 'w') }
  // vài cánh lọt qua tán để thấy cành
  for (const [x, y] of [[30, 34], [60, 33], [44, 30]]) { c.px(x, y, 'X'); c.px(x + 1, y, 'X') }
})
sprite('_sakuraS', { w: 34, h: 28, outline: 'k' }, (c) => {
  c.rect(16, 18, 3, 10, 'X'); c.line(17, 20, 8, 13, 'X'); c.line(18, 19, 27, 12, 'X')
  for (const [x, y, rr] of [[9, 12, 7], [17, 8, 8], [26, 12, 7], [17, 16, 5]]) c.circ(x, y, rr, 'U')
  for (const [x, y, rr] of [[9, 12, 7], [17, 8, 8], [26, 12, 7]]) c.circ(x - 1, y - 1, rr - 2, 'Q')
  for (const [x, y, rr] of [[9, 12, 7], [17, 8, 8], [26, 12, 7]]) c.circ(x - 2, y - 3, Math.max(1, rr - 5), 'P')
  const r = c.rng(3); for (let i = 0; i < 30; i++) { const x = Math.floor(r() * 34), y = Math.floor(r() * 20); if (c.is(x, y, 'Q')) c.px(x, y, r() < 0.5 ? 'P' : 'U') }
})
// mái cong nhiều lớp ngói: rộng w, đầu đao vểnh vàng
function roof(c, x, y, w, h = 7) {
  const m = x + w / 2
  c.poly([x - 2, y + h - 1, x + 3, y + 2, m, y - 3, x + w - 3, y + 2, x + w + 2, y + h - 1, x + w - 4, y + h, x + 4, y + h], 'B')
  for (let xx = x + 4; xx < x + w - 3; xx += 3) c.line(xx, y + h - 1, Math.round(m + (xx - m) * 0.6), y + 1, 'C')
  c.line(x + 3, y + 2, m, y - 3, 'F'); c.line(m, y - 3, x + w - 3, y + 2, 'D')
  c.hline(x - 1, y + h - 1, w + 2, 'G'); c.hline(x + 3, y + h, w - 6, 'I')
  c.px(x - 3, y + h - 3, 'G'); c.px(x - 2, y + h - 2, 'G'); c.px(x + w + 3, y + h - 3, 'G'); c.px(x + w + 2, y + h - 2, 'G')
  c.hline(Math.round(m - w * 0.2), y - 3, Math.round(w * 0.4), 'G')
}
// lầu nhỏ 2 tầng
sprite('_pavilion', { w: 40, h: 40, outline: 'k' }, (c) => {
  c.rect(4, 36, 32, 4, '3'); c.hline(4, 36, 32, '2')
  c.rect(9, 26, 22, 10, 'R'); c.hline(9, 26, 22, 'T'); for (const x of [11, 17, 22, 28]) c.vline(x, 27, 9, 'E'); c.rect(18, 29, 4, 7, 'W'); c.px(19, 31, 'G')
  roof(c, 4, 18, 32)
  c.rect(13, 12, 14, 7, 'R'); c.hline(13, 12, 14, 'T'); c.vline(16, 13, 6, 'E'); c.vline(23, 13, 6, 'E'); c.rect(18, 14, 4, 5, 'W')
  roof(c, 8, 5, 24, 6)
  c.vline(20, 0, 3, 'H'); c.px(20, 0, 'J')
})
// đảo nổi + lầu
sprite('_island', { w: 52, h: 58, outline: 'k' }, (c) => {
  c.poly([2, 32, 8, 28, 44, 28, 50, 32, 44, 38, 38, 44, 34, 42, 30, 56, 25, 44, 20, 52, 16, 40, 10, 42, 6, 37], 'v')
  c.poly([2, 32, 8, 28, 44, 28, 50, 32, 45, 36, 7, 36], 'u'); c.poly([30, 36, 45, 36, 38, 44, 34, 42, 30, 56], 'V')
  c.vline(20, 40, 8, 'W'); c.vline(36, 40, 4, 'W')
  c.rect(6, 27, 40, 4, 'q'); c.hline(6, 27, 40, 'p'); c.hline(7, 31, 38, 'r')
  c.stamp('_pineS', 30, 13)
  c.rect(10, 22, 14, 6, 'R'); c.hline(10, 22, 14, 'T'); c.rect(15, 24, 4, 4, 'W')
  roof(c, 7, 15, 20, 6); roof(c, 11, 8, 12, 5); c.vline(17, 2, 4, 'H'); c.px(17, 2, 'J')
})
// chính điện lớn 3 tầng
sprite('_hall', { w: 120, h: 92, outline: 'k' }, (c) => {
  c.rect(4, 82, 112, 10, '3'); c.hline(4, 82, 112, '2'); c.hline(4, 86, 112, '4')
  for (let x = 6; x < 114; x += 6) { c.vline(x, 78, 4, '2'); c.px(x, 77, '3') } c.hline(4, 78, 112, '2')
  c.rect(14, 56, 92, 22, 'R'); c.hline(14, 56, 92, 'T')
  for (const x of [18, 30, 42, 78, 90, 102]) { c.vline(x, 57, 21, 'E'); c.px(x, 57, 'G') }
  c.rect(48, 60, 24, 18, 'I'); c.rect(50, 62, 20, 16, 'W'); c.vline(60, 62, 16, 'I'); for (const y of [65, 69, 73]) { c.hline(51, y, 8, 'V'); c.hline(61, y, 8, 'V') }
  c.rect(54, 57, 12, 3, 'G'); c.hline(55, 58, 10, 'H')
  for (const x of [22, 94]) { c.rect(x, 62, 7, 7, 'G'); c.rect(x + 1, 63, 5, 5, 'C') }
  for (const x of [34, 82]) { c.rect(x, 58, 6, 18, 'B'); c.rect(x + 1, 59, 4, 16, 'C'); c.px(x + 2, 64, 'J'); c.px(x + 3, 64, 'J'); c.px(x + 2, 65, 'G'); c.poly([x, 76, x + 3, 79, x + 6, 76], 'B') }
  roof(c, 4, 46, 112, 10)
  c.rect(26, 36, 68, 11, 'R'); c.hline(26, 36, 68, 'T'); for (const x of [30, 42, 54, 66, 78, 90]) c.vline(x, 37, 10, 'E'); c.rect(54, 38, 12, 9, 'W'); c.rect(56, 37, 8, 2, 'G')
  roof(c, 16, 27, 88, 9)
  c.rect(40, 18, 40, 10, 'R'); c.hline(40, 18, 40, 'T'); c.rect(54, 20, 12, 8, 'W'); c.rect(55, 19, 10, 2, 'G')
  roof(c, 32, 9, 56, 9)
  c.vline(60, 0, 6, 'H'); c.rect(59, 2, 3, 2, 'G'); c.px(60, 0, 'J')
})
// đèn đá phát sáng
sprite('_lantern', { w: 14, h: 30, outline: 'k' }, (c) => {
  c.rect(2, 25, 10, 5, 'u'); c.hline(2, 25, 10, 't'); c.rect(4, 17, 6, 8, 'v'); c.vline(4, 17, 8, 'u')
  c.rect(1, 14, 12, 3, 'u'); c.rect(2, 6, 10, 8, 'H'); c.rect(3, 7, 8, 6, 'h'); c.rect(5, 8, 4, 4, 'w'); c.vline(7, 6, 8, 'I')
  c.poly([0, 6, 7, 1, 14, 6], 'V'); c.hline(0, 6, 14, 'u'); c.vline(7, 0, 2, 'v')
})
// cờ lam có huy hiệu vàng
sprite('_banner', { w: 12, h: 26 }, (c) => {
  c.rect(0, 0, 12, 2, 'G'); c.rect(1, 2, 10, 20, 'B'); c.rect(2, 2, 8, 19, 'C'); c.poly([1, 22, 6, 26, 11, 22], 'C')
  c.vline(6, 6, 9, 'G'); c.line(3, 9, 6, 6, 'G'); c.line(9, 9, 6, 6, 'G'); c.line(3, 12, 6, 15, 'G'); c.line(9, 12, 6, 15, 'G'); c.px(6, 10, 'J')
})
// thác nước
function waterfall(c, x, y, w, h) {
  c.rect(x, y, w, h, 'N'); for (let i = 0; i < w; i += 2) c.vline(x + i, y, h, i % 4 ? 'L' : 'M')
  c.vline(x, y, h, 'A'); c.vline(x + w - 1, y, h, 'A')
  const r = c.rng(x + y); for (let i = 0; i < h / 3; i++) c.px(x + 1 + Math.floor(r() * (w - 2)), y + Math.floor(r() * h), 'w')
  c.ellipse(x + w / 2, y + h, w / 2 + 6, 3, 'x'); c.ellipse(x + w / 2, y + h - 1, w / 2 + 3, 2, 'w')
}
// cầu vòm đá
function bridge(c, x, y, w) {
  c.rect(x, y, w, 6, '3'); c.hline(x, y, w, '2'); for (let i = x + 2; i < x + w; i += 5) c.vline(i, y - 4, 4, '2'); c.hline(x, y - 4, w, '2')
  c.ellipse(x + w / 2, y + 16, w / 2 - 6, 12, 'k'); c.rect(x + 4, y + 6, w - 8, 10, '4')
  c.ellipse(x + w / 2, y + 18, w / 2 - 9, 11, 'e')
}
// cầu thang đá trắng (từ y0 hẹp hw0 xuống y1 rộng hw1)
function stairs(c, cx, y0, y1, hw0, hw1) {
  c.poly([cx - hw0, y0, cx + hw0, y0, cx + hw1, y1, cx - hw1, y1], '3')
  for (let y = y0 + 2; y < y1; y += 3) { const hw = Math.round(hw0 + ((y - y0) / (y1 - y0)) * (hw1 - hw0)); c.hline(cx - hw, y, hw * 2, '2'); c.hline(cx - hw, y + 1, hw * 2, '4') }
  c.line(cx - hw0 - 1, y0, cx - hw1 - 1, y1, '2'); c.line(cx + hw0, y0, cx + hw1, y1, '4')
}
// Truyền Tống Trận: cổng lớn mái lam, khung vòm vàng, xoáy linh quang, sàn trận pháp tròn
function portal(c, cx, cy, s = 1) {
  const R = Math.round(26 * s)
  // sàn trận pháp
  c.ellipse(cx, cy + R + 8, R + 30, 11, '4'); c.ellipse(cx, cy + R + 7, R + 28, 9, '3'); c.ellipse(cx, cy + R + 7, R + 20, 6, 'L'); c.ellipse(cx, cy + R + 7, R + 18, 5, '3')
  c.ellipse(cx, cy + R + 7, R + 10, 3, 'L'); c.ellipse(cx, cy + R + 7, R + 8, 2, '2')
  // trụ + cờ
  for (const sx of [-1, 1]) {
    const px = cx + sx * (R + 14)
    c.rect(px - 5, cy - R - 6, 10, 2 * R + 14, '2'); c.vline(px + (sx < 0 ? -5 : 4), cy - R - 6, 2 * R + 14, '4'); c.rect(px - 6, cy + R + 4, 12, 4, '3')
    c.rect(px - 6, cy - R - 8, 12, 3, 'G')
    c.stamp('_banner', px - 6 + sx * 14, cy - R + 2)
  }
  // khung vòm vàng + xoáy
  c.circ(cx, cy, R + 6, 'I'); c.circ(cx, cy, R + 5, 'G'); c.circ(cx, cy, R + 3, 'H'); c.rect(cx - R - 6, cy, 2 * R + 13, R + 6, 'k')
  c.rect(cx - R - 5, cy, 4, R + 6, 'G'); c.rect(cx + R + 2, cy, 4, R + 6, 'G')
  c.circ(cx, cy, R + 2, 'A'); c.rect(cx - R - 1, cy, 2 * R + 3, R + 6, 'A')
  c.circ(cx, cy, R, 'N'); c.rect(cx - R + 1, cy, 2 * R - 1, R + 5, 'N')
  c.circ(cx, cy, R - 5, 'L'); c.circ(cx, cy, Math.round(R * 0.42), 'M'); c.circ(cx, cy, Math.max(3, Math.round(R * 0.16)), 'w')
  for (let i = 0; i < 3; i++) for (let t = 0; t < 1; t += 0.006) {
    const a = t * Math.PI * 3.2 + (i * Math.PI * 2) / 3, rr = 3 + t * (R - 2)
    const col = t < 0.3 ? 'L' : t > 0.55 ? 'M' : 'w', qx = Math.round(cx + Math.cos(a) * rr), qy = Math.round(cy + Math.sin(a) * rr)
    c.px(qx, qy, col); if (t > 0.4) c.px(qx + 1, qy, col)
  }
  // xà ngang + mái cổng
  c.rect(cx - R - 22, cy - R - 12, 2 * R + 45, 6, 'R'); c.hline(cx - R - 22, cy - R - 12, 2 * R + 45, 'T')
  c.rect(cx - 8, cy - R - 16, 17, 10, 'G'); c.rect(cx - 6, cy - R - 14, 13, 6, 'C'); c.px(cx, cy - R - 12, 'J'); c.px(cx - 2, cy - R - 11, 'G'); c.px(cx + 2, cy - R - 11, 'G')
  roof(c, cx - R - 30, cy - R - 24, 2 * R + 61, 11)
  roof(c, cx - R - 6, cy - R - 38, 2 * R + 13, 10)
  c.vline(cx, cy - R - 48, 8, 'H'); c.rect(cx - 1, cy - R - 46, 3, 3, 'G'); c.px(cx, cy - R - 49, 'J')
}

// ================================================================ CẢNH
// Bố cục chung, tham số hóa theo khung: L = { W, H, ... vị trí }
function compose(L) {
  const { W, H } = L
  return [
    rect(0, 0, W, H, 'e'), grad(0, 0, W, L.skyH, 'abcdef', 'v', 0.85), grad(0, L.skyH, W, H - L.skyH, 'efx', 'v', 0.7),
    // vầng trăng + vòng linh quang
    layer('halo', { light: 1, density: 0.25 }, circ(L.moon[0], L.moon[1], L.moon[2] + 26, 'f')),
    (c) => {
      const [mx, my, mr] = L.moon
      for (const [d, col] of [[0, 'M'], [1, 'w'], [2, 'L'], [3, 'M'], [8, 'L']]) c.ring(mx, my, mr - d, col)
      for (let k = 0; k < 360; k += 12) { const a = (k * Math.PI) / 180; c.px(Math.round(mx + Math.cos(a) * (mr - 5)), Math.round(my + Math.sin(a) * (mr - 5)), 'w') }
      const r = c.rng(2); for (let i = 0; i < 40; i++) c.px(Math.floor(r() * W), Math.floor(r() * L.skyH * 0.6), r() < 0.3 ? 'w' : 'f')
    },
    glow('Mw', { r: 5, strength: 0.3, color: 'M', bands: 3, where: [L.moon[0] - L.moon[2] - 8, L.moon[1] - L.moon[2] - 8, 2 * L.moon[2] + 16, 2 * L.moon[2] + 16] }),
    ...L.clouds.map(([n, x, y, f]) => stamp(n, x, y, f ? { flip: 'x' } : {})),
    // núi xa + núi gần
    (c) => { for (const [x, b, w, h] of L.farPeaks) karst(c, x, b, w, h, 'far') },
    layer('mistFar', { light: 1, density: 0.5 }, rect(0, L.mistY, W, 26, 'f')),
    (c) => { for (const [x, b, w, h] of L.peaks) karst(c, x, b, w, h, 'near') },
    ...L.islands.map(([x, y, f]) => stamp('_island', x, y, f ? { flip: 'x' } : {})),
    (c) => { for (const [x, y, w, s] of L.banks) cloudBank(c, x, y, w, s) },
    // vách chính + chính điện + lầu hai bên
    (c) => { for (const [x, y, w, h, s] of L.cliffs) cliff(c, x, y, w, h, s) },
    ...L.pines.map(([n, x, y, f]) => stamp(n, x, y, f ? { flip: 'x' } : {})),
    ...L.pavilions.map(([x, y, f]) => stamp('_pavilion', x, y, f ? { flip: 'x' } : {})),
    stamp('_hall', L.hall[0], L.hall[1]),
    (c) => { stairs(c, ...L.stairs); if (L.stairs2) stairs(c, ...L.stairs2) },
    (c) => { for (const [x, y, w, h] of L.falls) waterfall(c, x, y, w, h) },
    (c) => { if (L.bridge) bridge(c, ...L.bridge) },
    (c) => { for (const [x, y, w, s] of L.banks2) cloudBank(c, x, y, w, s) },
    ...(L.clouds2 || []).map(([n, x, y, f]) => stamp(n, x, y, f ? { flip: 'x' } : {})),
    // tầng dưới: vách + Truyền Tống Trận
    (c) => { for (const [x, y, w, h, s] of L.cliffs2) cliff(c, x, y, w, h, s) },
    ...L.pines2.map(([n, x, y, f]) => stamp(n, x, y, f ? { flip: 'x' } : {})),
    (c) => {
      const [px, py, pw, ph] = L.plaza
      c.rect(px, py, pw, ph, '4'); c.rect(px, py, pw, ph - 2, '3'); c.hline(px, py, pw, '2')
      for (let y = py + 6; y < py + ph; y += 7) c.hline(px, y, pw, '4')
      for (let y = py; y < py + ph; y += 7) for (let x = px + ((y - py) % 14 ? 0 : 6); x < px + pw; x += 12) c.vline(x, y + 1, 5, '4')
      // lan can đá hai bên sân + hoa văn tròn giữa sân
      for (const sx of [px, px + pw - 3]) { c.rect(sx, py - 8, 3, ph + 8, '2'); c.vline(sx + 2, py - 8, ph + 8, '4') }
      for (let x = px; x < px + pw * 0.3; x += 6) { c.vline(x, py - 6, 6, '2'); c.px(x, py - 7, '3') } c.hline(px, py - 7, Math.round(pw * 0.3), '2')
      for (let x = Math.round(px + pw * 0.7); x < px + pw; x += 6) { c.vline(x, py - 6, 6, '2'); c.px(x, py - 7, '3') } c.hline(Math.round(px + pw * 0.7), py - 7, Math.round(pw * 0.3), '2')
      portal(c, L.portal[0], L.portal[1], L.portal[2])
      stairs(c, L.portal[0], L.portal[1] + 26 * L.portal[2] + 18, H, 18, 30)
    },
    glow('LMw', { r: 10, strength: 0.4, color: 'L', bands: 4, where: [L.portal[0] - 60, L.portal[1] - 50, 120, 110] }),
    ...L.lanterns.map(([x, y]) => stamp('_lantern', x, y)),
    glow('h', { r: 7, strength: 0.5, color: 'h', bands: 3 }),
    // tiền cảnh: anh đào
    ...L.sakura.map(([n, x, y, f]) => stamp(n, x, y, f ? { flip: 'x' } : {})),
    (c) => {
      // cành hoa chĩa vào từ góc trên trái
      const [bx, by] = L.branch
      c.line(bx, by, bx + 40, by + 14, 'X'); c.line(bx, by + 1, bx + 40, by + 15, 'Y'); c.line(bx + 20, by + 7, bx + 30, by + 22, 'X')
      for (const [x, y, rr] of [[bx + 10, by + 6, 7], [bx + 24, by + 10, 8], [bx + 38, by + 16, 6], [bx + 30, by + 24, 5], [bx + 4, by + 14, 6]]) { c.circ(x, y, rr, 'U'); c.circ(x - 1, y - 1, rr - 2, 'Q'); c.circ(x - 2, y - 2, Math.max(1, rr - 5), 'P') }
      const r = c.rng(9); for (let i = 0; i < 70; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H); if (!c.is(x, y, 'kXY')) { c.px(x, y, r() < 0.4 ? 'P' : 'Q'); if (i % 5 === 0) c.px(x + 1, y, 'U') } }
    },
  ]
}

// ---------------------------------------------------------------- điện thoại dọc 288x512
const TALL = {
  W: 288, H: 512, skyH: 330, moon: [178, 104, 40], mistY: 196,
  clouds: [['_cloudA', 170, 60], ['_cloudA', 220, 150, 1], ['_cloudB', 40, 70], ['_cloudB', 228, 196], ['_cloudA', -20, 176], ['_cloudB', 110, 44, 1]],
  farPeaks: [[-10, 236, 60, 110], [40, 230, 50, 80], [90, 226, 46, 120], [180, 228, 54, 96], [234, 236, 64, 130]],
  peaks: [[-14, 268, 56, 120], [222, 272, 70, 110], [96, 210, 36, 90]],
  islands: [[196, 24], [212, 118, 1]],
  banks: [[-10, 226, 120, 4], [170, 232, 130, 6]],
  cliffs: [[44, 254, 200, 54, 11], [-8, 304, 92, 70, 12], [204, 300, 96, 70, 13]],
  pines: [['_pine', 46, 224], ['_pine', 214, 226, 1], ['_pineS', 18, 286], ['_pineS', 250, 282, 1], ['_pine', 6, 284]],
  pavilions: [[52, 214], [196, 214, 1], [26, 266], [232, 266, 1]],
  hall: [84, 164],
  stairs: [144, 256, 304, 14, 20],
  stairs2: [144, 304, 344, 20, 26],
  falls: [[66, 300, 14, 50], [210, 304, 16, 56], [116, 300, 10, 40]],
  bridge: [196, 300, 60],
  banks2: [[-14, 338, 140, 21], [150, 344, 150, 22], [-10, 392, 110, 23], [190, 396, 110, 24]],
  clouds2: [['_cloudA', 60, 360], ['_cloudA', 170, 364, 1], ['_cloudB', 96, 392], ['_cloudB', 168, 396, 1]],
  cliffs2: [[-6, 380, 64, 140, 31], [232, 378, 64, 140, 32]],
  pines2: [['_pine', -4, 346], ['_pine', 258, 344, 1]],
  plaza: [40, 470, 208, 42],
  portal: [144, 414, 1.25],
  lanterns: [[60, 446], [214, 446]],
  sakura: [['_sakura', -40, 116], ['_sakura', -46, 416], ['_sakura', 232, 430, 1], ['_sakuraS', 240, 352], ['_sakuraS', 4, 352, 1], ['_sakura', 222, 232, 1]],
  branch: [-4, 0],
}
scene('sect_tall', { w: TALL.W, h: TALL.H }, ...compose(TALL))

// ---------------------------------------------------------------- màn hình ngang 512x288
const WIDE = {
  W: 512, H: 288, skyH: 190, moon: [362, 62, 34], mistY: 116,
  clouds: [['_cloudA', 20, 30], ['_cloudA', 400, 92, 1], ['_cloudB', 160, 22], ['_cloudB', 300, 10, 1], ['_cloudA', 440, 18], ['_cloudB', 60, 100]],
  farPeaks: [[0, 150, 50, 90], [44, 146, 60, 70], [120, 140, 50, 100], [186, 142, 60, 70], [300, 140, 50, 96], [360, 146, 64, 80], [430, 150, 70, 104]],
  peaks: [[-10, 176, 54, 110], [460, 178, 64, 120], [380, 150, 40, 80]],
  islands: [[64, 30], [440, 52, 1]],
  banks: [[-10, 138, 200, 4], [320, 140, 200, 6]],
  cliffs: [[150, 150, 212, 40, 11], [40, 176, 116, 50, 12], [356, 174, 120, 50, 13]],
  pines: [['_pine', 154, 122], ['_pine', 330, 122, 1], ['_pineS', 120, 160], ['_pineS', 380, 158, 1], ['_pine', 44, 150]],
  pavilions: [[166, 112], [306, 112, 1], [80, 138], [394, 138, 1]],
  hall: [196, 62],
  stairs: [256, 152, 186, 14, 20],
  falls: [[172, 188, 14, 36], [324, 188, 16, 38], [96, 224, 12, 30]],
  bridge: [398, 172, 64],
  banks2: [[-10, 214, 160, 21], [360, 214, 170, 22]],
  cliffs2: [[-6, 238, 90, 60, 31], [430, 238, 90, 60, 32]],
  pines2: [['_pine', 14, 210], ['_pine', 468, 210, 1]],
  plaza: [150, 262, 212, 26],
  portal: [256, 214, 0.85],
  lanterns: [[190, 230], [308, 230]],
  sakura: [['_sakura', -30, 200], ['_sakura', 50, 226], ['_sakura', 440, 208, 1], ['_sakuraS', 386, 240], ['_sakuraS', 104, 150, 1], ['_sakura', 396, 112, 1]],
  clouds2: [['_cloudA', 150, 198], ['_cloudA', 300, 200, 1]],
  branch: [-4, 0],
}
scene('sect_wide', { w: WIDE.W, h: WIDE.H }, ...compose(WIDE))
