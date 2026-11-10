// =====================================================================
// ICON KỸ NĂNG 32x32 — pixel art bằng pxl.
//   Khung VUÔNG viền THÉP  = kỹ năng vũ khí (wp_*)
//   Khung VUÔNG viền VÀNG  = kỹ năng chủ động (ac_*)
//   Khung TRÒN  viền NGỌC  = kỹ năng bị động (p_*)
// Nền: màu của kỹ năng (cùng màu `color` trong config), tối dần ra mép. Hình biểu tượng có viền tối 1px.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/skills.px.js --no-preview
//        → chép out/sprites/sk_*.png vào public/skills/<id>.png (bỏ tiền tố sk_)
// =====================================================================
pal({ k: '#120e1c' })

const K = '#120e1c'
const hx = (n) => '#' + n.toString(16).padStart(6, '0')
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
/** trộn màu a → b theo t (0..1) */
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') }

// ---------------------------------------------------------------- bút vẽ biểu tượng (gom điểm → viền tự động)
function Pen() {
  const P = new Map()
  const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 1 && y >= 1 && x < 31 && y < 31) P.set(x + ',' + y, col) }
  const pen = {
    P,
    px: set,
    rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, col) },
    disk(cx, cy, r, col) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) set(x, y, col) },
    ring(cx, cy, r, col, w = 1) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= r && d > r - w) set(x, y, col) } },
    /** cung tròn từ góc a0 → a1 (độ, 0 = phải, 90 = xuống) */
    arc(cx, cy, r, a0, a1, col, w = 1) {
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > r || d <= r - w) continue
        let a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) * 180 / Math.PI; while (a < a0) a += 360; if (a <= a1) set(x, y, col)
      }
    },
    line(x0, y0, x1, y1, col, w = 1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1
      for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; if (w <= 1) set(x, y, col); else pen.disk(x + 0.5, y + 0.5, w / 2, col) }
    },
    poly(pts, col) {
      let x0 = 99, y0 = 99, x1 = 0, y1 = 0
      for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]) }
      for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) {
        const px = x + 0.5, py = y + 0.5; let ins = false
        for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
          const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins
        }
        if (ins) set(x, y, col)
      }
    },
    /** kiếm thẳng: chuôi tại (x0,y0), mũi tại (x1,y1) */
    sword(x0, y0, x1, y1, blade, edge, guard, grip, len = 1) {
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux
      const g = 4 * len, gx = x0 + ux * g, gy = y0 + uy * g
      pen.line(x0, y0, gx, gy, grip)
      pen.line(gx - nx * 2.5, gy - ny * 2.5, gx + nx * 2.5, gy + ny * 2.5, guard)
      pen.line(gx + ux, gy + uy, x1 - ux, y1 - uy, blade, 2)
      pen.line(gx + ux + nx * 0.4, gy + uy + ny * 0.4, x1 - ux * 2, y1 - uy * 2, edge)
      pen.px(x1, y1, edge)
    },
  }
  return pen
}

// ---------------------------------------------------------------- khung + nền
const FRAME = {
  weapon: { d: '#4a5468', m: '#9aa8c0', l: '#e4ecf8' },
  active: { d: '#7a4a14', m: '#e0a83a', l: '#ffe9a0' },
  passive: { d: '#1e5a48', m: '#5ac8a0', l: '#c8ffe8' },
}
function insideShape(shape, x, y, inset) {
  const X = x + 0.5, Y = y + 0.5
  if (shape === 'round') return Math.hypot(X - 16, Y - 16) <= 15.5 - inset
  // vuông vát góc
  const a = inset, b = 32 - inset, cut = 3
  if (X < a || X > b || Y < a || Y > b) return false
  const dx = Math.min(X - a, b - X), dy = Math.min(Y - a, b - Y)
  return dx + dy >= cut
}
function frame(c, group, color) {
  const F = FRAME[group], shape = group === 'passive' ? 'round' : 'square'
  const bg = [mix(color, '#000000', 0.82), mix(color, '#000000', 0.7), mix(color, '#000000', 0.56), mix(color, '#000000', 0.42)]
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (!insideShape(shape, x, y, 0)) continue
    if (!insideShape(shape, x, y, 1)) { c.px(x, y, K); continue }
    if (!insideShape(shape, x, y, 2)) { c.px(x, y, (x + y < 32) ? F.l : F.m); continue }
    if (!insideShape(shape, x, y, 3)) { c.px(x, y, F.d); continue }
    const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 14) / 15
    c.px(x, y, bg[d > 0.85 ? 0 : d > 0.62 ? 1 : d > 0.36 ? 2 : 3])
  }
  // điểm sáng góc khung
  if (shape === 'square') { c.px(3, 4, F.l); c.px(4, 3, F.l) } else { c.px(8, 5, F.l); c.px(9, 4, F.l) }
}
function drawPen(c, pen) {
  // viền tối quanh biểu tượng (4 hướng), chỉ trong lòng khung
  for (const key of pen.P.keys()) {
    const [x, y] = key.split(',').map(Number)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k2 = (x + dx) + ',' + (y + dy)
      if (!pen.P.has(k2) && x + dx > 2 && y + dy > 2 && x + dx < 29 && y + dy < 29) c.px(x + dx, y + dy, K)
    }
  }
  for (const [key, col] of pen.P) { const [x, y] = key.split(',').map(Number); c.px(x, y, col) }
}
/** khai báo một icon: id = id kỹ năng; f(pen, C) với C = { d, m, l, w } màu biểu tượng theo màu kỹ năng */
function icon(id, group, colorNum, f) {
  const color = hx(colorNum)
  const C = { d: mix(color, '#000000', 0.35), m: color, l: mix(color, '#ffffff', 0.55), w: '#ffffff' }
  sprite('sk_' + id, { w: 32, h: 32 }, (c) => { frame(c, group, color); const pen = Pen(); f(pen, C); drawPen(c, pen) })
}
const STEEL = { b: '#c8d4e4', e: '#ffffff', g: '#d8a840', h: '#5a3a24' }
const GOLD = '#ffd860', GOLDD = '#b07820', PAPER = '#f4e4b0', PAPERD = '#c8a868', RED = '#d83a2a'

// ================================================================ KỸ NĂNG VŨ KHÍ
icon('wp_sword', 'weapon', 0xcfe8ff, (p, C) => {
  p.arc(16, 16, 11, 200, 290, C.m, 2)                         // vệt kiếm khí lưỡi liềm
  p.arc(16, 16, 9, 210, 280, C.w, 1)
  p.sword(8, 24, 24, 8, STEEL.b, STEEL.e, STEEL.g, STEEL.h)
})
icon('wp_blade', 'weapon', 0xffb070, (p, C) => {
  p.arc(16, 16, 13, 140, 230, C.l, 2)                         // nhát chém quạt
  // đao bản to: sống thẳng, lưỡi cong phình, mũi vát
  p.poly([12, 19, 24, 5, 27, 6, 27, 10, 24, 16, 18, 22, 15, 22], STEEL.b)
  p.line(13, 19, 24, 6, '#8a96aa')                            // sống đao sẫm
  p.line(16, 22, 23, 16, STEEL.e); p.line(23, 16, 26, 10, STEEL.e)   // lưỡi sáng
  p.line(10, 18, 15, 23, STEEL.g, 2)                          // khâu chắn
  p.line(7, 25, 11, 21, STEEL.h, 2)                           // chuôi
  p.ring(6, 26.5, 2.2, STEEL.g)                               // vòng đuôi chuôi
  p.line(5, 28, 4, 30, RED)
})
icon('wp_spear', 'weapon', 0xffe9a0, (p, C) => {
  p.line(5, 27, 21, 11, '#8a5a30', 2)                        // cán
  p.poly([20, 10, 27, 4, 24, 12, 22, 12], STEEL.b)            // mũi
  p.line(21, 11, 26, 5, STEEL.e)
  p.disk(19.5, 13.5, 2.2, RED); p.line(17, 14, 15, 18, RED); p.line(19, 16, 18, 20, RED)   // tua đỏ
  p.line(22, 18, 27, 13, C.l); p.line(24, 20, 28, 16, C.m)   // vệt đâm
})
icon('wp_fist', 'weapon', 0xff9090, (p, C) => {
  // nắm đấm nhìn ngang đấm sang phải + sóng chấn
  p.arc(16, 16, 12.5, 300, 420, C.m, 1); p.arc(16, 16, 10.5, 310, 410, C.l, 1)
  p.rect(4, 13, 6, 8, '#c84a3a'); p.rect(4, 13, 6, 1, '#ff7a5a'); p.rect(4, 20, 6, 1, '#8a2a24')   // băng cổ tay
  p.poly([10, 11, 20, 9, 24, 11, 24, 21, 20, 23, 10, 22], '#e8b088')          // bàn tay
  for (const y of [10, 13, 16, 19]) p.rect(21, y, 4, 3, '#f4c8a0')            // 4 đốt ngón
  for (const y of [13, 16, 19]) p.line(16, y, 21, y, '#b8805a')                // kẽ ngón
  p.line(11, 19, 18, 20, '#b8805a'); p.rect(11, 17, 7, 2, '#f4c8a0')          // ngón cái
  p.px(23, 10, C.w)
})
icon('wp_bow', 'weapon', 0xb8ffb0, (p, C) => {
  p.arc(22, 16, 13, 115, 245, '#a0682e', 2)                  // cánh cung
  p.px(13, 5, GOLD); p.px(13, 27, GOLD)
  p.line(16, 5, 16, 27, '#f0f0e0')                            // dây
  p.line(6, 16, 27, 16, '#c89058')                            // tên
  p.poly([26, 13, 30, 16, 26, 19], STEEL.b)
  p.line(5, 13, 8, 16, C.l); p.line(5, 19, 8, 16, C.l); p.line(4, 14, 7, 16, C.m); p.line(4, 18, 7, 16, C.m)
})
icon('wp_fan', 'weapon', 0xd0b0ff, (p, C) => {
  // quạt xòe nửa vòng, nan từ trục dưới
  const cx = 16, cy = 24
  for (let a = 200; a <= 340; a += 1) {
    const r = a * Math.PI / 180
    for (let d = 5; d <= 15; d += 0.5) p.px(cx + Math.cos(r) * d, cy + Math.sin(r) * d, Math.floor((a - 200) / 20) % 2 ? C.m : C.l)
  }
  for (let a = 200; a <= 340; a += 20) { const r = a * Math.PI / 180; p.line(cx, cy, cx + Math.cos(r) * 15, cy + Math.sin(r) * 15, '#4a2e8a') }
  p.arc(cx, cy, 15.5, 200, 340, GOLD, 1)
  p.disk(cx, cy, 1.8, GOLD)
  p.line(16, 26, 16, 29, RED)
})

// ================================================================ KỸ NĂNG CHỦ ĐỘNG
function talisman(p, x, y, glyph) {
  p.rect(x, y, 9, 14, PAPER); p.rect(x, y + 13, 9, 1, PAPERD); p.rect(x + 8, y, 1, 14, PAPERD)
  p.line(x + 4, y + 2, x + 4, y + 11, glyph); p.line(x + 2, y + 4, x + 6, y + 4, glyph); p.line(x + 2, y + 8, x + 6, y + 9, glyph)
}
icon('ac_fire', 'active', 0xff7040, (p, C) => {
  // lửa ba lưỡi
  p.poly([16, 20, 10, 28, 22, 28], '#ff7a2a')
  p.poly([8, 28, 6, 18, 11, 22, 13, 12, 17, 20, 20, 9, 23, 19, 26, 15, 25, 28], '#ff7a2a')
  p.poly([11, 28, 11, 22, 14, 24, 17, 15, 19, 23, 22, 20, 22, 28], '#ffc040')
  p.poly([14, 28, 15, 24, 17, 21, 19, 25, 18, 28], '#fff0a0')
  talisman(p, 5, 4, RED)
})
icon('ac_ring', 'active', 0x9fd8ff, (p, C) => {
  p.arc(16, 16, 12, 0, 300, C.d, 1)
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 - Math.PI / 2, x = 16 + Math.cos(a) * 8, y = 16 + Math.sin(a) * 8
    const t = a + Math.PI / 2, L = 7
    p.sword(x - Math.cos(t) * L, y - Math.sin(t) * L, x + Math.cos(t) * L, y + Math.sin(t) * L, C.l, C.w, STEEL.g, STEEL.h, 0.8)
  }
  p.disk(16, 16, 2.5, C.m); p.px(15, 15, C.w)
})
icon('ac_frost', 'active', 0x80e0ff, (p, C) => {
  for (let i = 0; i < 6; i++) {                               // bông tuyết 6 nhánh
    const a = i * Math.PI / 3 - Math.PI / 2, ex = 16 + Math.cos(a) * 11, ey = 16 + Math.sin(a) * 11
    p.line(16, 16, ex, ey, C.l, 2)
    const bx = 16 + Math.cos(a) * 7, by = 16 + Math.sin(a) * 7
    for (const s of [-1, 1]) p.line(bx, by, bx + Math.cos(a + s * 0.9) * 3.5, by + Math.sin(a + s * 0.9) * 3.5, C.m)
  }
  p.disk(16, 16, 3, C.w); p.px(16, 16, C.m)
})
icon('ac_thunder', 'active', 0xfff080, (p, C) => {
  talisman(p, 4, 4, '#3a5ad8')
  p.poly([20, 3, 13, 17, 18, 17, 12, 29, 25, 13, 19, 13, 25, 3], C.m)     // tia sét
  p.poly([20, 5, 16, 15, 20, 15, 16, 24, 22, 14, 18, 14, 22, 5], C.w)
  p.px(27, 22, C.l); p.px(8, 24, C.l); p.px(26, 26, C.m)      // tia nảy
  p.line(22, 22, 27, 26, C.l)
})
icon('ac_gale', 'active', 0xa0ffd0, (p, C) => {
  const rows = [[6, 11, 21], [9, 9, 17], [12, 10, 13], [15, 12, 10], [18, 14, 7], [21, 15, 5], [24, 15, 3]]
  for (const [y, x, w] of rows) { p.rect(x, y, w, 2, C.l); p.rect(x + 1, y, Math.max(1, w - 4), 1, C.w); p.px(x + w - 1, y + 1, C.m) }
  p.line(15, 26, 17, 28, C.m)
  p.line(4, 14, 8, 14, C.m); p.line(24, 20, 28, 20, C.m)      // gió quét
})
icon('ac_spring', 'active', 0x70ff90, (p, C) => {
  p.poly([16, 26, 7, 17, 8, 9, 15, 12], C.m)                  // hai lá non
  p.poly([16, 26, 25, 15, 24, 7, 17, 11], C.l)
  p.line(16, 26, 16, 14, '#3a8a40'); p.line(9, 11, 15, 22, C.d); p.line(23, 9, 17, 22, C.d)
  p.disk(16, 7, 2.6, '#c8fff0'); p.px(15, 6, C.w)            // giọt sương
  p.rect(23, 23, 5, 1, C.w); p.rect(25, 21, 1, 5, C.w)         // dấu cộng hồi máu
})
icon('ac_diamond', 'active', 0xffd860, (p, C) => {
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.line(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, C.l) }
  p.ring(16, 16, 8, C.m, 2)
  // chày kim cang dọc
  p.line(16, 7, 16, 25, GOLDD, 2)
  p.disk(16, 16, 2.5, C.w)
  p.poly([13, 7, 16, 4, 19, 7, 16, 10], C.m); p.poly([13, 25, 16, 28, 19, 25, 16, 22], C.m)
})
icon('ac_needle', 'active', 0xe0c0ff, (p, C) => {
  for (const [x0, y0, x1, y1] of [[6, 25, 24, 7], [5, 17, 25, 11], [12, 27, 26, 13]]) {
    p.line(x0, y0, x1, y1, '#d8dce8'); p.px(x1, y1, C.w)
    p.ring(x0 + 0.5, y0 + 0.5, 1.5, C.m)                       // lỗ kim
  }
  p.disk(25, 10, 2, C.l)
  p.px(28, 6, C.w); p.px(27, 5, C.l); p.px(29, 7, C.l)
})
icon('ac_beam', 'active', 0x80f0ff, (p, C) => {
  // cánh gió bên trái, tia sáng bắn ngang sang phải
  p.poly([4, 8, 13, 13, 14, 18, 6, 16], C.l)
  p.poly([4, 20, 12, 17, 14, 19, 7, 25], C.m)
  p.line(6, 10, 12, 14, C.w); p.line(6, 22, 12, 19, C.w)
  p.rect(13, 13, 16, 6, C.m); p.rect(13, 14, 16, 4, C.l); p.rect(13, 15, 16, 2, C.w)
  p.line(20, 11, 23, 13, '#fff080'); p.line(22, 21, 25, 18, '#fff080')
})
icon('ac_skyfire', 'active', 0xff5030, (p, C) => {
  for (let i = 0; i < 3; i++) p.line(4 + i * 3, 4, 14 + i * 2, 14 + i, ['#8a2a1a', '#d84a2a', '#ff8a3a'][i], 2)   // đuôi lửa
  p.disk(19, 19, 8, '#e8402a'); p.disk(19.5, 19.5, 6, '#ff8a3a'); p.disk(20, 20, 3.6, '#ffd060'); p.disk(20.5, 20.5, 1.6, C.w)
  p.px(27, 12, '#ffd060'); p.px(10, 27, '#ff8a3a')
})
icon('ac_swords', 'active', 0xb090ff, (p, C) => {
  for (const [x, y0, y1] of [[9, 4, 20], [16, 7, 26], [23, 3, 18]]) p.sword(x, y0, x, y1, C.l, C.w, STEEL.g, '#3a2a6a', 0.8)
  p.rect(5, 27, 22, 1, C.m); p.px(9, 22, C.w); p.px(23, 20, C.w)   // chạm đất
})
icon('ac_opensky', 'active', 0xffe080, (p, C) => {
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.26; p.line(16 + Math.cos(a) * 6, 16 + Math.sin(a) * 6, 16 + Math.cos(a) * (i % 2 ? 10 : 13), 16 + Math.sin(a) * (i % 2 ? 10 : 13), i % 2 ? C.m : C.l) }
  // vết nứt trời dọc
  p.poly([16, 3, 18, 10, 15, 14, 19, 18, 16, 29, 14, 19, 17, 15, 13, 10], C.w)
  p.line(16, 5, 15, 12, C.l)
})
icon('ac_genesis', 'active', 0xffffff, (p, C) => {
  // thái cực
  p.disk(16, 16, 10, '#f4f4ff')
  for (let y = 6; y < 27; y++) for (let x = 6; x < 27; x++) {
    const X = x + 0.5 - 16, Y = y + 0.5 - 16
    if (X * X + Y * Y > 100) continue
    const dark = (X > 0 && Math.hypot(X, Y + 5) > 5) || Math.hypot(X, Y - 5) <= 5
    if (dark && !(Math.hypot(X, Y + 5) <= 5 && X >= -5)) p.px(x, y, '#2a2448')
  }
  p.disk(16, 11, 1.6, '#2a2448'); p.disk(16, 21, 1.6, '#f4f4ff')
  p.ring(16, 16, 12.5, '#ffe9a0', 1)
  p.px(5, 5, '#ffe9a0'); p.px(26, 26, '#ffe9a0'); p.px(26, 5, C.w)
})

// ================================================================ KỸ NĂNG BỊ ĐỘNG (khung tròn)
icon('p_hp', 'passive', 0xff7070, (p, C) => {
  p.disk(12, 13, 5, '#e83a4a'); p.disk(20, 13, 5, '#e83a4a'); p.poly([7, 14, 25, 14, 16, 25], '#e83a4a')
  p.disk(11.5, 12, 2, '#ff9aa0'); p.px(10, 11, C.w)
})
icon('p_move', 'passive', 0x70e0ff, (p, C) => {
  // giày + cánh gió
  p.poly([12, 9, 18, 9, 18, 18, 25, 21, 25, 24, 11, 24], '#5a3a24')
  p.rect(11, 23, 15, 2, '#2a1a14'); p.line(13, 10, 13, 20, '#8a5a3a')
  p.poly([18, 11, 27, 8, 24, 12, 28, 13, 19, 16], C.l)
  for (const y of [13, 17, 21]) p.line(4, y, 8, y, C.m)
})
icon('p_damage', 'passive', 0xffb050, (p, C) => {
  // nổ cương khí 8 cánh
  const pts = []
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? 5 : 12; pts.push(16 + Math.cos(a) * r, 16 + Math.sin(a) * r) }
  p.poly(pts, C.m)
  const pi2 = []
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? 3 : 7; pi2.push(16 + Math.cos(a) * r, 16 + Math.sin(a) * r) }
  p.poly(pi2, '#ffe080'); p.disk(16, 16, 2, C.w)
})
icon('p_atk', 'passive', 0xffe070, (p, C) => {
  // đồng hồ cát + vệt nhanh
  p.rect(10, 6, 12, 2, GOLDD); p.rect(10, 24, 12, 2, GOLDD)
  p.poly([11, 8, 21, 8, 16, 16], '#e8f0ff'); p.poly([16, 16, 11, 24, 21, 24], '#e8f0ff')
  p.poly([13, 9, 19, 9, 16, 13], C.m); p.poly([16, 18, 13, 24, 19, 24], C.m)
  p.line(24, 11, 28, 11, C.l); p.line(24, 16, 29, 16, C.l); p.line(24, 21, 28, 21, C.l)
})
icon('p_armor', 'passive', 0xa0a0c0, (p, C) => {
  p.poly([16, 5, 25, 8, 24, 18, 16, 27, 8, 18, 7, 8], '#c8cce0')
  p.poly([16, 8, 22, 10, 21, 17, 16, 24], '#8a90b0')
  p.line(16, 7, 16, 25, '#ffffff'); p.line(9, 13, 23, 13, GOLD)
  p.px(11, 9, C.w)
})
icon('p_pickup', 'passive', 0x80ffb0, (p, C) => {
  // con mắt linh thức + điểm sáng bị hút vào
  p.poly([5, 16, 11, 10, 21, 10, 27, 16, 21, 22, 11, 22], '#e8fff0')
  p.disk(16, 16, 4.5, C.m); p.disk(16, 16, 2.4, '#1a4a30'); p.px(15, 14, C.w)
  for (const [x, y] of [[6, 6], [26, 6], [26, 26], [6, 26]]) { p.px(x, y, C.l); p.px(x + (x < 16 ? 2 : -2), y + (y < 16 ? 2 : -2), C.m) }
})
icon('p_area', 'passive', 0xc090ff, (p, C) => {
  p.ring(16, 16, 12, C.m, 1); p.ring(16, 16, 8.5, C.l, 1)
  p.rect(12, 12, 8, 8, RED); p.rect(13, 13, 6, 6, '#ff6a4a')                 // ấn đỏ
  p.line(14, 14, 17, 14, PAPER); p.line(15, 14, 15, 17, PAPER); p.line(14, 17, 17, 17, PAPER)
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; p.px(16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12, C.w) }
})
icon('p_regen', 'passive', 0x70ff90, (p, C) => {
  p.disk(16, 18, 7.5, '#4ad070'); p.poly([16, 4, 9.5, 15, 22.5, 15], '#4ad070')     // giọt
  p.disk(16, 18, 5.5, C.m); p.rect(13, 17, 7, 3, C.w); p.rect(15, 15, 3, 7, C.w)   // dấu cộng
  p.px(12, 13, C.w)
})
icon('p_xp', 'passive', 0x90c0ff, (p, C) => {
  // sách mở + ánh ngộ
  p.poly([4, 12, 15, 14, 15, 26, 4, 24], PAPER); p.poly([28, 12, 17, 14, 17, 26, 28, 24], '#fff4d0')
  p.rect(15, 14, 2, 12, '#8a5a30')
  for (const y of [17, 20, 23]) { p.line(6, y - 1, 13, y, PAPERD); p.line(19, y, 26, y - 1, PAPERD) }
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; p.line(16 + Math.cos(a) * 4, 11 + Math.sin(a) * 4, 16 + Math.cos(a) * 8, 11 + Math.sin(a) * 8, C.l) }
})
icon('p_crit', 'passive', 0xff9060, (p, C) => {
  p.ring(16, 16, 10, C.l, 2); p.ring(16, 16, 5, C.m, 1)       // bia ngắm
  p.line(16, 4, 16, 10, C.l); p.line(16, 22, 16, 28, C.l); p.line(4, 16, 10, 16, C.l); p.line(22, 16, 28, 16, C.l)
  p.disk(16, 16, 2, RED)
  p.poly([20, 6, 27, 4, 25, 11], '#ffe080')                   // tia chí mạng
})
icon('p_luck', 'passive', 0xffd860, (p, C) => {
  // đồng tiền lỗ vuông + bùa nhỏ
  p.disk(16, 17, 10, GOLDD); p.disk(16, 17, 8.8, GOLD); p.ring(16, 17, 7, GOLDD, 1)
  p.rect(14, 15, 4, 4, '#3a2a10')
  p.px(16, 11, '#fff4c0'); p.px(16, 23, '#fff4c0'); p.px(10, 17, '#fff4c0'); p.px(22, 17, '#fff4c0')
  p.px(11, 11, C.w); p.px(12, 10, C.w)
})
