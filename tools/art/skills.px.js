// =====================================================================
// ICON KỸ NĂNG 64x64 (v2) — pixel art bằng pxl, cùng phong cách khung sảnh (nền xanh đậm, khung có nút góc).
//   Khung viền THÉP = kỹ năng vũ khí (wp_*) · viền VÀNG = chủ động (ac_*) · viền NGỌC = bị động (p_*)
// Mỗi chi tiết là một MẶT NẠ (hình) + DẢI MÀU 5 tông; máy tự tô khối: viền mép hướng sáng (trên-trái) sáng lên,
// mép khuất tối đi, viền ngoài lấy tông tối nhất của chính chi tiết (không dùng viền đen chung). Phần năng lượng có quầng sáng.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/skills.px.js --no-preview
//        → chép out/sprites/sk_*.png vào public/skills/<id>.png (bỏ tiền tố sk_)
// =====================================================================
const N = 64

// ---------------------------------------------------------------- màu
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
function hex(a) { return '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('') }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)) }
const hx = (n) => '#' + n.toString(16).padStart(6, '0')
/** dải 5 tông từ một màu: tối → sáng */
function rampOf(c) { return [mix(c, '#0a0614', 0.72), mix(c, '#0a0614', 0.45), c, mix(c, '#ffffff', 0.42), mix(c, '#ffffff', 0.78)] }
const R = {
  steel: ['#262c3c', '#525e78', '#8896b2', '#c8d4ea', '#ffffff'],
  dsteel: ['#1c2030', '#3a4258', '#5e6a86', '#8c9ab6', '#c0ccE4'],
  gold: ['#4a2a0c', '#8a5a14', '#d09a2c', '#ffd860', '#fff6c8'],
  wood: ['#2e180c', '#5a341a', '#8a5a2e', '#b8864a', '#e0b070'],
  red: ['#3a080c', '#7a1418', '#c02a26', '#f05238', '#ff9a78'],
  fire: ['#6a1206', '#c8381a', '#ff7a24', '#ffc850', '#fff8d8'],
  ice: ['#16305e', '#2e66b4', '#64b4f4', '#b8e8ff', '#ffffff'],
  skin: ['#4e2416', '#9a5236', '#d88e66', '#f4c09a', '#ffe6d0'],
  paper: ['#5a3e1a', '#9a7c44', '#d4b87e', '#f2e0aa', '#fffae4'],
  jade: ['#0c3628', '#1c6a50', '#3aa880', '#7ae0b8', '#d4fff0'],
  leaf: ['#0e3418', '#1e6a2c', '#3eaa48', '#86e070', '#e0ffc8'],
  purple: ['#24104a', '#4a2a8a', '#7e58d0', '#b89cff', '#ece0ff'],
  cloth: ['#2a0c18', '#5a1a2e', '#a02a40', '#e04a5a', '#ff9aa0'],
  ink: ['#08060e', '#1c1830', '#2e2850', '#4a4478', '#7a74a8'],
  white: ['#5a6070', '#9aa4b8', '#d4dcec', '#f4f8ff', '#ffffff'],
  heart: ['#4a0614', '#8e1022', '#d82a3c', '#ff6a70', '#ffc0c0'],
  green: ['#0a3a1c', '#1a7a34', '#34c060', '#80f0a0', '#e0ffe8'],
  sky: ['#0c2a4a', '#1e5a90', '#3a9ad8', '#8ad8ff', '#e8fbff'],
  wind: ['#0c3a30', '#1e7a60', '#4ac8a0', '#a0ffd8', '#f0fff8'],
}

// ---------------------------------------------------------------- mặt nạ hình
function M() {
  const a = new Uint8Array(N * N)
  let val = 1
  const S = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < N && y < N) a[y * N + x] = val }
  const m = {
    a,
    get(x, y) { return x >= 0 && y >= 0 && x < N && y < N ? a[y * N + x] : 0 },
    /** các lệnh sau sẽ XÓA thay vì vẽ */
    cut() { val = 0; return m },
    add() { val = 1; return m },
    fn(f) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (f(x + 0.5, y + 0.5)) S(x, y); return m },
    rect(x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) S(x + i, y + j); return m },
    disk(cx, cy, r) { return m.fn((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r) },
    ellipse(cx, cy, rx, ry, rot = 0) {
      const c = Math.cos(rot), s = Math.sin(rot)
      return m.fn((x, y) => { const X = (x - cx) * c + (y - cy) * s, Y = -(x - cx) * s + (y - cy) * c; return (X / rx) ** 2 + (Y / ry) ** 2 <= 1 })
    },
    ring(cx, cy, r, w) { return m.fn((x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r && d > r - w }) },
    /** cung tròn (độ; 0 = phải, 90 = xuống), độ dày w; taper: hai đầu thuôn nhọn */
    arc(cx, cy, r, a0, a1, w, taper = false) {
      return m.fn((x, y) => {
        const d = Math.hypot(x - cx, y - cy)
        let ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI; while (ang < a0) ang += 360; if (ang > a1) return false
        const t = (ang - a0) / (a1 - a0), ww = taper ? w * Math.sin(Math.PI * t) : w
        return d <= r && d > r - ww
      })
    },
    poly(p) {
      return m.fn((x, y) => {
        let ins = false
        for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
          const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
        }
        return ins
      })
    },
    /** đoạn thẳng dày w (đầu tròn); w1 ≠ w: thuôn từ w → w1 */
    line(x0, y0, x1, y1, w, w1 = w) {
      const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1
      return m.fn((x, y) => { let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = Math.max(0, Math.min(1, t)); const ww = w + (w1 - w) * t; return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) <= ww / 2 })
    },
    /** đường cong bậc 2 dày w (thuôn w → w1) */
    curve(x0, y0, cx, cy, x1, y1, w, w1 = w) {
      for (let i = 0; i <= 80; i++) { const t = i / 80, u = 1 - t; const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1; m.fn0(x, y, (w + (w1 - w) * t) / 2) }
      return m
    },
    fn0(cx, cy, r) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.15) S(x, y); return m },
    /** cộng / trừ mặt nạ khác */
    or(o) { for (let i = 0; i < N * N; i++) if (o.a[i]) a[i] = 1; return m },
    minus(o) { for (let i = 0; i < N * N; i++) if (o.a[i]) a[i] = 0; return m },
    and(o) { for (let i = 0; i < N * N; i++) if (!o.a[i]) a[i] = 0; return m },
  }
  return m
}

// ---------------------------------------------------------------- ảnh 64x64 + tô khối
function Img() {
  const px = new Array(N * N).fill(null)
  const solid = new Uint8Array(N * N)      // đã có chi tiết (để quầng sáng không đè)
  const I = {
    px, solid,
    set(x, y, c) { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c },
    get(x, y) { return px[y * N + x] },
    /** tô một chi tiết: m = mặt nạ, r = dải 5 tông; o.base (tông giữa, mặc định 2), o.ol (màu viền; false = không viền),
     *  o.flat (không tô khối), o.shine (cho phép đẩy lên tông sáng nhất ở mép sáng), o.grad ('v' | 'h' | 'r': chuyển tông trong lòng) */
    paint(m, r, o = {}) {
      const base = o.base ?? 2
      // khoảng cách tới mép (BFS 4 hướng, tối đa 6)
      const D = new Uint8Array(N * N)
      const q = []
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!m.a[y * N + x]) continue
        const edge = !m.get(x + 1, y) || !m.get(x - 1, y) || !m.get(x, y + 1) || !m.get(x, y - 1)
        if (edge) { D[y * N + x] = 1; q.push(y * N + x) }
      }
      for (let h = 0; h < q.length; h++) {
        const i = q[h], x = i % N, y = (i / N) | 0, d = D[i]
        if (d >= 6) continue
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy
          if (X < 0 || Y < 0 || X >= N || Y >= N) continue
          const j = Y * N + X
          if (m.a[j] && !D[j]) { D[j] = d + 1; q.push(j) }
        }
      }
      const Dg = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : m.a[y * N + x] ? D[y * N + x] || 6 : 0)
      // khung bao để chuyển tông trong lòng
      let y0 = N, y1 = 0, x0 = N, x1 = 0
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m.a[y * N + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x) }
      if (o.ol !== false) {
        const olc = o.ol ?? mix(r[0], '#05030a', 0.35)
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (m.a[y * N + x]) continue
          if (m.get(x + 1, y) || m.get(x - 1, y) || m.get(x, y + 1) || m.get(x, y - 1)) { I.set(x, y, olc); solid[y * N + x] = 1 }
        }
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!m.a[y * N + x]) continue
        let t = base
        if (!o.flat) {
          const d = D[y * N + x] || 6
          const gx = Dg(x + 1, y) - Dg(x - 1, y), gy = Dg(x, y + 1) - Dg(x, y - 1)
          const L = Math.hypot(gx, gy) || 1
          const lit = (gx / L) * 0.707 + (gy / L) * 0.707      // hướng vào trong · hướng sáng ngược (trên-trái)
          if (d <= 1) t += lit > 0.4 ? 2 : lit > -0.15 ? 1 : lit < -0.55 ? -2 : -1
          else if (d === 2) t += lit > 0.4 ? 1 : lit < -0.45 ? -1 : 0
          if (o.grad && d > 1) {
            const k = o.grad === 'v' ? (y - y0) / Math.max(1, y1 - y0) : o.grad === 'h' ? (x - x0) / Math.max(1, x1 - x0) : Math.hypot(x - (x0 + x1) / 2, y - (y0 + y1) / 2) / Math.max(1, (x1 - x0) / 2)
            // nửa trên / trái sáng hơn, dưới / phải tối hơn (hòa bằng ô cờ ở chỗ chuyển)
            const v = 0.6 - k * 1.2 + (((x + y) & 1) ? 0.12 : -0.12)
            t += v > 0.35 ? 1 : v < -0.35 ? -1 : 0
          }
        }
        t = Math.max(0, Math.min(o.shine === false ? 3 : 4, t))
        I.set(x, y, r[t]); solid[y * N + x] = 1
      }
      return I
    },
    /** quầng sáng quanh mặt nạ (vẽ lên nền, không đè chi tiết): 3 nấc đậm nhạt */
    glow(m, color, rad = 5, k = 0.6) {
      const D = new Float32Array(N * N).fill(99)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m.a[y * N + x]) D[y * N + x] = 0
      // khoảng cách gần đúng (2 lượt chamfer)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - N] + 1); if (x && y) D[i] = Math.min(D[i], D[i - N - 1] + 1.4); if (y && x < N - 1) D[i] = Math.min(D[i], D[i - N + 1] + 1.4) }
      for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (x < N - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < N - 1) D[i] = Math.min(D[i], D[i + N] + 1); if (x < N - 1 && y < N - 1) D[i] = Math.min(D[i], D[i + N + 1] + 1.4); if (y < N - 1 && x) D[i] = Math.min(D[i], D[i + N - 1] + 1.4) }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = y * N + x, d = D[i]
        if (d <= 0 || d > rad || solid[i] || !px[i] || !inner(x, y)) continue
        let a = k * (1 - d / (rad + 1))
        a = a > 0.42 ? 0.55 : a > 0.22 ? 0.32 : (((x + y) & 1) ? 0.16 : 0.06)
        px[i] = mix(px[i], color, a)
      }
      return I
    },
    /** điểm lấp lánh hình chữ thập */
    twinkle(x, y, c, s = 1) {
      I.set(x, y, '#ffffff')
      for (let k = 1; k <= s; k++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) I.set(x + dx * k, y + dy * k, k === s ? c : '#ffffff')
      return I
    },
  }
  return I
}

// ---------------------------------------------------------------- khung + nền (cùng lối khung bảng ở sảnh)
const FR = { weapon: R.steel, active: R.gold, passive: R.jade }
const B = 4                       // lòng khung bắt đầu từ ô 4
function inner(x, y) { return x >= B && y >= B && x < N - B && y < N - B }
function frame(I, group, color) {
  const F = FR[group]
  // nền: xanh đậm, giữa ánh màu kỹ năng; 4 dải tròn đồng tâm, hòa ô cờ ở chỗ chuyển
  const navy = ['#0a0e24', '#10173a', '#18224c', '#202d5e']
  const tint = [0, 0.1, 0.22, 0.38]
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inner(x, y)) continue
    const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 30) / 30 + ((((x >> 0) + (y >> 0)) & 1) ? 0.03 : -0.03)
    const k = d > 0.95 ? 0 : d > 0.72 ? 1 : d > 0.45 ? 2 : 3
    I.set(x, y, mix(navy[k], color, tint[k]))
  }
  // viền: tối ngoài cùng · 2 nét kim loại (sáng trên-trái, tối dưới-phải) · rãnh tối · nét mảnh trong
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const e = Math.min(x, y, N - 1 - x, N - 1 - y)
    if (e >= B) continue
    const tl = x + y < N - 1
    const c = e === 0 ? '#06040c' : e === 1 ? (tl ? F[4] : F[2]) : e === 2 ? (tl ? F[3] : F[1]) : '#06040c'
    I.set(x, y, c)
  }
  for (let i = B; i < N - B; i++) { I.set(i, B, mix(F[1], '#000000', 0.3)); I.set(B, i, mix(F[1], '#000000', 0.3)) }   // bóng khung đổ vào lòng
  // nút góc: ô vuông 8x8 kim loại có lõi (bị động: hình thoi)
  for (const [cx, cy] of [[0, 0], [N - 8, 0], [0, N - 8], [N - 8, N - 8]]) {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const X = cx + i, Y = cy + j, u = i - 3.5, v = j - 3.5
      if (group === 'passive' && Math.abs(u) + Math.abs(v) > 4.6) continue
      const edge = group === 'passive' ? Math.abs(u) + Math.abs(v) > 3.6 : (i === 0 || j === 0 || i === 7 || j === 7)
      const core = group === 'passive' ? Math.abs(u) + Math.abs(v) < 1.6 : (i >= 3 && i <= 4 && j >= 3 && j <= 4)
      const ring = group === 'passive' ? Math.abs(u) + Math.abs(v) < 2.6 : (i >= 2 && i <= 5 && j >= 2 && j <= 5)
      I.set(X, Y, edge ? '#06040c' : core ? F[4] : ring ? F[1] : (u + v < 0 ? F[3] : F[2]))
    }
  }
}

/** khai báo icon: draw(I, C) với C = dải màu theo màu kỹ năng */
function icon(id, group, colorNum, draw) {
  const color = hx(colorNum)
  sprite('sk_' + id, { w: N, h: N }, (c) => {
    const I = Img()
    frame(I, group, color)
    draw(I, rampOf(color))
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = I.px[y * N + x]; if (v) c.px(x, y, v) }
  })
}

// ---------------------------------------------------------------- chi tiết dùng chung
/** kiếm thẳng: chuôi (x0,y0) → mũi (x1,y1); bản rộng w */
function jian(I, x0, y0, x1, y1, w = 5, o = {}) {
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux
  const g = o.grip ?? 9, gx = x0 + ux * g, gy = y0 + uy * g
  const tipStart = L - w * 1.6
  const blade = M().poly([gx + nx * w / 2, gy + ny * w / 2, x0 + ux * tipStart + nx * w / 2, y0 + uy * tipStart + ny * w / 2, x1, y1,
    x0 + ux * tipStart - nx * w / 2, y0 + uy * tipStart - ny * w / 2, gx - nx * w / 2, gy - ny * w / 2])
  if (o.glow) I.glow(blade, o.glow, 5, 0.7)
  I.paint(M().line(x0, y0, gx, gy, 3.2), o.gripR ?? R.cloth)                         // chuôi quấn vải
  for (let k = 2; k < g - 1; k += 2.5) I.set(Math.round(x0 + ux * k), Math.round(y0 + uy * k), (o.gripR ?? R.cloth)[3])
  I.paint(blade, o.bladeR ?? R.steel, { base: 2 })
  I.paint(M().line(gx + ux * 2, gy + uy * 2, x0 + ux * (L - 3), y0 + uy * (L - 3), 1), o.bladeR ?? R.steel, { flat: true, base: 4, ol: false })   // sống sáng
  I.paint(M().line(gx - nx * (w / 2 + 3.5), gy - ny * (w / 2 + 3.5), gx + nx * (w / 2 + 3.5), gy + ny * (w / 2 + 3.5), 3.4), o.guardR ?? R.gold)   // khâu chắn
  I.paint(M().disk(x0 - ux * 1.5, y0 - uy * 1.5, 2.6), o.guardR ?? R.gold)            // núm chuôi
}
/** lá bùa giấy vàng, chữ đỏ (góc trên-trái x,y; xoay nhẹ bằng độ nghiêng sk) */
function talisman(I, x, y, w, h, glyphR = R.red, sk = 0) {
  const P = [x, y, x + w, y + sk, x + w - sk * 0.3, y + h + sk, x - sk * 0.3, y + h]
  I.paint(M().poly(P), R.paper, { grad: 'v' })
  I.paint(M().poly([x + 1.5, y + 1.5 + sk * 0.1, x + w - 1.5, y + 1.5 + sk * 0.9, x + w - 1.6, y + 4 + sk * 0.9, x + 1.5, y + 4 + sk * 0.1]), R.red, { ol: false, flat: true })
  const cx = x + w / 2 - sk * 0.15
  const g = M().line(cx, y + 7, cx - sk * 0.1, y + h - 3, 1.6).line(cx - w * 0.28, y + 10, cx + w * 0.28, y + 10 + sk * 0.3, 1.4)
    .line(cx - w * 0.22, y + 15, cx + w * 0.22, y + 15.5 + sk * 0.3, 1.4).curve(cx - w * 0.3, y + h - 7, cx, y + h - 3, cx + w * 0.3, y + h - 7, 1.3)
  I.paint(g, glyphR, { ol: false, flat: true, base: 2 })
}

// ================================================================ KỸ NĂNG VŨ KHÍ
icon('wp_sword', 'weapon', 0xcfe8ff, (I) => {
  const qi = M().arc(30, 34, 24, 195, 300, 6, true)
  I.glow(qi, '#8fd8ff', 5, 0.8).paint(qi, R.sky, { base: 3, ol: false })
  jian(I, 15, 49, 51, 13, 6, { glow: '#bfe8ff' })
  I.paint(M().curve(13, 52, 11, 56, 15, 58, 2.4, 1.2), R.red)                       // tua kiếm
  I.twinkle(50, 14, '#bfe8ff', 2)
})
icon('wp_blade', 'weapon', 0xffb070, (I) => {
  const sl = M().arc(32, 33, 25, 150, 255, 6, true)
  I.glow(sl, '#ffb070', 5, 0.8).paint(sl, R.fire, { base: 3, ol: false })
  // đao bản to: sống thẳng, lưỡi cong phình, mũi vát
  const blade = M().poly([22, 40, 44, 14, 50, 9, 55, 9, 53, 17, 47, 28, 38, 39, 30, 46, 26, 46])
  I.paint(blade, R.steel, { grad: 'h' })
  I.paint(M().line(24, 40, 47, 13, 2.2), R.dsteel, { ol: false })                  // sống đao sẫm
  I.paint(M().curve(28, 45, 44, 36, 53, 12, 1), R.steel, { flat: true, base: 4, ol: false })   // lưỡi sáng
  I.paint(M().line(18, 36, 28, 47, 4), R.gold)                                       // khâu chắn
  I.paint(M().line(11, 53, 21, 43, 3.6), R.wood)
  I.paint(M().ring(10, 54, 4.2, 2), R.gold)                                          // vòng đuôi chuôi
  I.paint(M().curve(8, 58, 5, 60, 7, 62, 2.6, 1.4), R.red)
  I.twinkle(51, 13, '#ffe0b0', 2)
})
icon('wp_spear', 'weapon', 0xffe9a0, (I) => {
  for (const [a, b, c, d] of [[40, 40, 56, 24], [44, 46, 58, 32]]) { const t = M().line(a, b, c, d, 1.6, 0.6); I.glow(t, '#ffe9a0', 3, 0.6).paint(t, R.gold, { base: 3, ol: false, flat: true }) }
  I.paint(M().line(9, 55, 40, 24, 3.6), R.wood, { base: 2 })                          // cán
  for (let k = 0; k < 4; k++) I.paint(M().line(12 + k * 7, 52 - k * 7, 14 + k * 7, 50 - k * 7, 3.8), R.dsteel, { ol: false })   // đai cán
  const head = M().poly([38, 22, 50, 8, 56, 6, 54, 12, 42, 26])                        // mũi lá liễu
  I.glow(head, '#fff2c0', 4, 0.6).paint(head, R.steel, { base: 2 })
  I.paint(M().line(41, 23, 54, 8, 1), R.steel, { flat: true, base: 4, ol: false })
  I.paint(M().disk(39.5, 25.5, 3.6), R.gold)                                          // khâu
  const tas = M().poly([36, 27, 40, 29, 36, 40, 30, 44, 26, 42, 30, 36]).disk(35, 30, 4)   // tua đỏ
  I.paint(tas, R.red, { grad: 'v' })
  I.paint(M().line(31, 36, 27, 42, 1).line(34, 36, 31, 43, 1), R.red, { flat: true, base: 1, ol: false })
})
icon('wp_fist', 'weapon', 0xff9090, (I) => {
  for (const [r, w] of [[25, 3], [19, 2]]) { const s = M().arc(30, 32, r, 300, 420, w, true); I.glow(s, '#ff8080', 4, 0.7).paint(s, R.heart, { base: 3, ol: false }) }
  I.paint(M().rect(8, 23, 12, 18), R.cloth, { grad: 'v' })                             // băng cổ tay
  for (const x of [11, 15]) I.paint(M().line(x, 23, x + 3, 40, 1), R.cloth, { flat: true, base: 1, ol: false })
  const hand = M().poly([19, 22, 34, 18, 44, 20, 47, 25, 47, 40, 43, 44, 30, 45, 19, 42])
  I.paint(hand, R.skin, { grad: 'v' })
  for (let i = 0; i < 4; i++) I.paint(M().ellipse(44, 22.5 + i * 5.6, 4.2, 3), R.skin, { base: 3 })    // 4 đốt ngón
  for (let i = 1; i < 4; i++) I.paint(M().line(33, 20 + i * 5.6, 41, 20 + i * 5.6, 1), R.skin, { flat: true, base: 1, ol: false })
  I.paint(M().ellipse(31, 37, 9, 3.4, -0.12), R.skin, { base: 3 })                    // ngón cái
  I.twinkle(46, 20, '#ffc0b0', 1)
})
icon('wp_bow', 'weapon', 0xb8ffb0, (I) => {
  const wind = M().line(6, 26, 18, 30, 1.5, 0.5).line(6, 38, 18, 34, 1.5, 0.5).line(4, 32, 16, 32, 1.6, 0.6)
  I.glow(wind, '#b8ffb0', 3, 0.6).paint(wind, R.leaf, { base: 3, ol: false, flat: true })
  const bow = M().curve(26, 8, 52, 32, 26, 56, 4.4, 4.4)
  I.paint(bow, R.wood, { base: 2 })
  I.paint(M().disk(26, 8, 2.6).disk(26, 56, 2.6), R.gold)                              // đầu cánh
  I.paint(M().rect(36, 28, 4, 8), R.cloth)                                              // chuôi cầm
  I.paint(M().line(26, 9, 26, 55, 1), R.white, { flat: true, base: 3, ol: false })    // dây
  I.paint(M().line(14, 32, 52, 32, 1.8), R.wood, { base: 3 })                           // tên
  const tip = M().poly([50, 28, 59, 32, 50, 36])
  I.glow(tip, '#d8ffd0', 3, 0.6).paint(tip, R.steel)
  I.paint(M().poly([13, 27, 22, 31, 22, 32, 15, 32]).poly([13, 37, 22, 33, 22, 32, 15, 32]), R.white, { base: 3 })   // lông đuôi
})
icon('wp_fan', 'weapon', 0xd0b0ff, (I) => {
  const cx = 32, cy = 50
  const leaf = M().arc(cx, cy, 34, 200, 340, 22)
  I.glow(leaf, '#d0b0ff', 4, 0.5)
  // mặt quạt: nếp xen kẽ sáng / tối + tranh núi mây
  for (let k = 0; k < 7; k++) {
    const a0 = 200 + k * 20, f = M().arc(cx, cy, 34, a0, a0 + 20, 22)
    I.paint(f, k % 2 ? R.purple : rampOf('#e8d8ff'), { ol: false, base: 2, grad: 'r' })
  }
  I.paint(M().poly([14, 34, 22, 24, 28, 30, 34, 20, 44, 32, 50, 30, 52, 36, 14, 36]).and(leaf), R.ink, { ol: false, base: 3 })   // núi
  for (let k = 0; k <= 7; k++) { const a = (200 + k * 20) * Math.PI / 180; I.paint(M().line(cx, cy, cx + Math.cos(a) * 33, cy + Math.sin(a) * 33, 1), R.wood, { flat: true, base: 1, ol: false }) }
  I.paint(M().arc(cx, cy, 35, 199, 341, 2), R.gold, { ol: false })
  I.paint(M().disk(cx, cy, 3.2), R.gold)
  I.paint(M().curve(32, 53, 30, 57, 33, 60, 2.6, 1.2), R.red)
  I.twinkle(46, 20, '#f0e0ff', 1)
})

// ================================================================ KỸ NĂNG CHỦ ĐỘNG
icon('ac_fire', 'active', 0xff7040, (I) => {
  const outer = M().poly([12, 58, 9, 40, 16, 46, 18, 30, 26, 40, 30, 20, 36, 34, 42, 16, 46, 36, 52, 28, 54, 44, 52, 58])
  I.glow(outer, '#ff7a30', 6, 0.9).paint(outer, R.fire, { base: 1, ol: false, grad: 'v' })
  I.paint(M().poly([18, 58, 18, 46, 24, 50, 28, 38, 34, 48, 40, 32, 44, 46, 48, 42, 47, 58]), R.fire, { base: 2, ol: false, grad: 'v' })
  I.paint(M().poly([26, 58, 28, 50, 33, 42, 37, 50, 40, 46, 40, 58]), R.fire, { base: 3, ol: false, flat: true })
  I.paint(M().ellipse(33, 55, 5, 3), R.fire, { base: 4, ol: false, flat: true })
  talisman(I, 10, 8, 14, 30, R.red, 3)
  I.twinkle(48, 14, '#ffd060', 1).twinkle(22, 42, '#ffd060', 1)
})
icon('ac_ring', 'active', 0x9fd8ff, (I) => {
  const orbit = M().arc(32, 32, 23, 0, 330, 2.2, true)
  I.glow(orbit, '#9fd8ff', 4, 0.7).paint(orbit, R.sky, { base: 3, ol: false })
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 - Math.PI / 2 + 0.3, x = 32 + Math.cos(a) * 15, y = 32 + Math.sin(a) * 15, t = a + Math.PI / 2, L = 12
    jian(I, x - Math.cos(t) * L, y - Math.sin(t) * L, x + Math.cos(t) * L, y + Math.sin(t) * L, 4, { grip: 6, glow: '#cfeeff' })
  }
  const core = M().disk(32, 32, 4)
  I.glow(core, '#cfeeff', 4, 0.8).paint(core, R.sky, { base: 3 })
})
icon('ac_frost', 'active', 0x80e0ff, (I) => {
  const flake = M()
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 - Math.PI / 2, ex = 32 + Math.cos(a) * 24, ey = 32 + Math.sin(a) * 24
    flake.line(32, 32, ex, ey, 3.6, 2)
    for (const [r, l] of [[11, 6], [17, 5]]) { const bx = 32 + Math.cos(a) * r, by = 32 + Math.sin(a) * r; for (const s of [-1, 1]) flake.line(bx, by, bx + Math.cos(a + s * 0.85) * l, by + Math.sin(a + s * 0.85) * l, 2.2, 1.2) }
  }
  I.glow(flake, '#9fe8ff', 5, 0.8).paint(flake, R.ice, { base: 2 })
  const hex6 = M().poly([...Array(6)].flatMap((_, i) => [32 + Math.cos(i * Math.PI / 3) * 7, 32 + Math.sin(i * Math.PI / 3) * 7]))
  I.paint(hex6, R.ice, { base: 3, grad: 'v' })
  I.twinkle(32, 32, '#c8f0ff', 2).twinkle(12, 50, '#c8f0ff', 1).twinkle(52, 12, '#c8f0ff', 1)
})
icon('ac_thunder', 'active', 0xfff080, (I) => {
  talisman(I, 8, 10, 15, 32, R.sky, -2)
  const bolt = M().poly([40, 6, 26, 32, 35, 32, 24, 58, 50, 24, 40, 24, 50, 6])
  I.glow(bolt, '#fff080', 6, 0.9).paint(bolt, rampOf('#ffe24a'), { base: 2, grad: 'v' })
  I.paint(M().poly([41, 9, 31, 30, 39, 30, 30, 50, 45, 27, 37, 27, 46, 9]), rampOf('#ffe24a'), { base: 4, ol: false, flat: true })
  const fork = M().line(46, 40, 56, 48, 1.4, 0.6).line(50, 44, 52, 54, 1.2, 0.6)
  I.glow(fork, '#fff080', 3, 0.6).paint(fork, rampOf('#ffe24a'), { base: 3, ol: false, flat: true })
  I.twinkle(24, 57, '#fff6b0', 2)
})
icon('ac_gale', 'active', 0xa0ffd0, (I) => {
  const rows = [[10, 34], [16, 28], [22, 22], [28, 17], [34, 13], [40, 10], [46, 7], [52, 5]]
  const body = M()
  rows.forEach(([y, w], i) => body.ellipse(32 + Math.sin(i * 0.9) * 3, y, w / 1.9 + 1, 3.2))
  I.glow(body, '#a0ffd0', 5, 0.7)
  rows.forEach(([y, w], i) => {
    const cx = 32 + Math.sin(i * 0.9) * 3
    I.paint(M().ellipse(cx, y, w / 1.9 + 1, 3.2).cut().ellipse(cx + 1, y - 1.2, w / 1.9 - 1.5, 2.2), R.wind, { base: i % 2 ? 2 : 3 })
  })
  for (const [x, y, a] of [[12, 24, 0.5], [50, 38, -0.4], [16, 46, 1.1]]) I.paint(M().ellipse(x, y, 3.4, 1.6, a), R.leaf, { base: 3 })   // lá cuốn
  I.twinkle(52, 14, '#d8ffe8', 1)
})
icon('ac_spring', 'active', 0x70ff90, (I) => {
  const drop = M().disk(32, 38, 17).poly([32, 8, 18, 30, 46, 30])
  I.glow(drop, '#70ff90', 5, 0.6).paint(drop, rampOf('#5ad8a0'), { base: 1, grad: 'r' })
  I.paint(M().line(32, 52, 32, 34, 2.4), R.leaf)                                        // thân mầm
  I.paint(M().poly([31, 40, 18, 34, 16, 24, 26, 26, 32, 36]), R.leaf, { base: 2, grad: 'h' })
  I.paint(M().poly([33, 38, 46, 30, 48, 20, 38, 22, 32, 34]), R.leaf, { base: 3, grad: 'h' })
  I.paint(M().line(19, 27, 30, 37, 1).line(45, 23, 34, 35, 1), R.leaf, { flat: true, base: 1, ol: false })
  I.paint(M().ellipse(25, 27, 3, 6, 0.6), rampOf('#c8fff0'), { base: 4, ol: false, flat: true })   // ánh trên giọt
  I.twinkle(46, 48, '#e0ffe8', 2)
})
icon('ac_diamond', 'active', 0xffd860, (I) => {
  const rays = M()
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rays.line(32 + Math.cos(a) * 15, 32 + Math.sin(a) * 15, 32 + Math.cos(a) * (i % 2 ? 22 : 26), 32 + Math.sin(a) * (i % 2 ? 22 : 26), 2.4, 0.6) }
  I.glow(rays, '#ffd860', 4, 0.7).paint(rays, R.gold, { base: 3, ol: false, flat: true })
  I.paint(M().ring(32, 32, 14, 3), R.gold)
  // chày kim cang dọc: cán giữa + hai đầu móng
  I.paint(M().rect(29, 20, 6, 24), R.gold, { grad: 'h' })
  for (const s of [-1, 1]) {
    const y = 32 + s * 13
    I.paint(M().poly([32, y + s * 9, 24, y + s * 1, 27, y - s * 2, 32, y + s * 3, 37, y - s * 2, 40, y + s * 1]), R.gold, { base: 2 })
    I.paint(M().disk(32, y + s * 9, 2.2), R.red)
  }
  const gem = M().disk(32, 32, 4.2)
  I.glow(gem, '#fff6c8', 3, 0.8).paint(gem, R.red, { base: 3 })
  I.twinkle(31, 31, '#ffffff', 1)
})
icon('ac_needle', 'active', 0xe0c0ff, (I) => {
  for (const [x0, y0, x1, y1] of [[10, 46, 46, 14], [8, 32, 52, 22], [18, 56, 54, 30]]) {
    const tr = M().line(x0 - 4, y0 + 3, x1 - 8, y1 + 6, 5, 0.6)
    I.glow(tr, '#c8a0ff', 5, 0.8).paint(tr, R.purple, { base: 2, ol: false, grad: 'h' })
    I.paint(M().line(x0, y0, x1, y1, 3, 1.2), R.white, { base: 3 })
    I.paint(M().ring(x0 + 1, y0 + 0.5, 2.2, 1.2), R.white, { ol: false })                 // lỗ kim
    I.twinkle(Math.round(x1), Math.round(y1), '#e0c0ff', 1)
  }
})
icon('ac_beam', 'active', 0x80f0ff, (I) => {
  const beam = M().poly([24, 28, 60, 26, 60, 38, 24, 36])
  I.glow(beam, '#80f0ff', 6, 0.9)
  I.paint(beam, R.sky, { base: 2, ol: false })
  I.paint(M().poly([24, 30, 60, 29, 60, 35, 24, 34]), R.sky, { base: 3, ol: false, flat: true })
  I.paint(M().rect(24, 31, 36, 2), R.sky, { base: 4, ol: false, flat: true })
  const bolt = M().line(32, 24, 38, 30, 1.4).line(38, 30, 44, 26, 1.4).line(44, 40, 50, 34, 1.4)
  I.paint(bolt, rampOf('#fff080'), { base: 4, ol: false, flat: true })
  // cánh gió 3 lông vũ
  for (const [p, b] of [[[6, 10, 26, 26, 26, 31, 10, 20], 3], [[4, 22, 25, 30, 25, 34, 6, 32], 2], [[8, 44, 25, 34, 25, 37, 12, 50], 1]]) I.paint(M().poly(p), R.white, { base: b, grad: 'h' })
  I.paint(M().disk(25, 32, 4), R.gold)
})
icon('ac_skyfire', 'active', 0xff5030, (I) => {
  const trail = M().poly([6, 6, 16, 8, 40, 30, 30, 40, 8, 16])
  I.glow(trail, '#ff6a30', 5, 0.7).paint(trail, R.fire, { base: 1, ol: false, grad: 'h' })
  I.paint(M().poly([10, 10, 18, 12, 38, 32, 32, 38, 12, 18]), R.fire, { base: 2, ol: false, grad: 'h' })
  const ball = M().disk(38, 38, 15)
  I.glow(ball, '#ff8a30', 6, 0.9).paint(ball, R.fire, { base: 2, grad: 'r' })
  I.paint(M().disk(39, 39, 9.5), R.fire, { base: 3, ol: false, grad: 'r' })
  I.paint(M().disk(40, 40, 4.5), R.fire, { base: 4, ol: false, flat: true })
  I.twinkle(54, 20, '#ffd060', 1).twinkle(22, 52, '#ffd060', 1)
})
icon('ac_swords', 'active', 0xb090ff, (I) => {
  for (const [x, y0, y1] of [[18, 6, 38], [32, 10, 50], [46, 4, 34]]) {
    const tr = M().line(x, y0 - 4, x, y0 + 10, 4, 0.5)
    I.glow(tr, '#b090ff', 3, 0.6).paint(tr, R.purple, { base: 3, ol: false, flat: true })
    jian(I, x, y0, x, y1, 5, { grip: 7, glow: '#d8c8ff', bladeR: rampOf('#d8d0ff') })
  }
  const hit = M().ellipse(32, 54, 14, 3).ellipse(18, 42, 6, 1.6).ellipse(46, 38, 6, 1.6)
  I.glow(hit, '#b090ff', 4, 0.7).paint(hit, R.purple, { base: 3, ol: false })
})
icon('ac_opensky', 'active', 0xffe080, (I) => {
  const rays = M()
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + 0.2; rays.line(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 32 + Math.cos(a) * (i % 2 ? 20 : 27), 32 + Math.sin(a) * (i % 2 ? 20 : 27), 2.2, 0.4) }
  I.glow(rays, '#ffe080', 4, 0.6).paint(rays, R.gold, { base: 3, ol: false, flat: true })
  const crack = M().poly([32, 4, 36, 18, 30, 26, 38, 36, 32, 60, 28, 38, 34, 28, 26, 18])
  I.glow(crack, '#fff6c8', 6, 1).paint(crack, R.white, { base: 3 })
  I.paint(M().line(32, 8, 31, 22, 1).line(33, 30, 32, 52, 1), R.white, { flat: true, base: 4, ol: false })
  I.paint(M().line(36, 18, 44, 14, 1).line(28, 38, 20, 44, 1), R.white, { flat: true, base: 3, ol: false })
})
icon('ac_genesis', 'active', 0xffffff, (I) => {
  const halo = M().ring(32, 32, 26, 2)
  I.glow(halo, '#ffe9a0', 4, 0.8).paint(halo, R.gold, { base: 3 })
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; I.paint(M().disk(32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25, 2), R.gold, { base: 3 }) }
  const yin = M().fn((x, y) => { const X = x - 32, Y = y - 32; if (X * X + Y * Y > 19 * 19) return false; const top = Math.hypot(X, Y + 9.5) <= 9.5, bot = Math.hypot(X, Y - 9.5) <= 9.5; return bot || (X > 0 && !top) })
  const yang = M().disk(32, 32, 19).minus(yin)
  I.glow(M().disk(32, 32, 19), '#ffffff', 5, 0.7)
  I.paint(yang, R.white, { base: 3, grad: 'r' })
  I.paint(yin, R.ink, { base: 2, grad: 'r', ol: false })
  I.paint(M().disk(32, 22.5, 3.2), R.ink, { base: 2, ol: false }).paint(M().disk(32, 41.5, 3.2), R.white, { base: 3, ol: false })
  I.twinkle(10, 10, '#fff6c8', 1).twinkle(54, 54, '#fff6c8', 1)
})

// ================================================================ KỸ NĂNG BỊ ĐỘNG
icon('p_hp', 'passive', 0xff7070, (I) => {
  const h = M().disk(23, 25, 11).disk(41, 25, 11).poly([12, 28, 52, 28, 32, 52])
  I.glow(h, '#ff6070', 5, 0.7).paint(h, R.heart, { grad: 'r' })
  I.paint(M().ellipse(22, 22, 4, 6, -0.6), R.heart, { base: 4, ol: false, flat: true })
  I.paint(M().line(16, 34, 24, 34, 1.6).line(24, 34, 28, 28, 1.6).line(28, 28, 33, 40, 1.6).line(33, 40, 37, 32, 1.6).line(37, 32, 48, 32, 1.6), R.white, { base: 4, ol: false, flat: true })   // nhịp tim
})
icon('p_move', 'passive', 0x70e0ff, (I) => {
  for (const y of [26, 34, 42]) { const s = M().line(6, y, 18, y, 2, 0.6); I.glow(s, '#70e0ff', 3, 0.6).paint(s, R.sky, { base: 3, ol: false, flat: true }) }
  const wing = M().poly([34, 22, 56, 12, 52, 20, 58, 22, 50, 28, 54, 31, 38, 32])
  I.glow(wing, '#bff0ff', 4, 0.6).paint(wing, R.white, { base: 3, grad: 'v' })
  I.paint(M().poly([22, 14, 36, 14, 36, 36, 50, 42, 52, 50, 20, 50, 20, 30]), R.wood, { grad: 'v' })   // giày
  I.paint(M().rect(18, 48, 36, 5), R.ink, { base: 3 })
  I.paint(M().rect(22, 18, 14, 3), R.cloth)
  I.paint(M().line(26, 24, 30, 34, 1).line(32, 24, 26, 34, 1), R.wood, { flat: true, base: 4, ol: false })
})
icon('p_damage', 'passive', 0xffb050, (I) => {
  const star = (r1, r2, n) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; p.push(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) } return M().poly(p) }
  const s1 = star(26, 11, 8)
  I.glow(s1, '#ffb050', 5, 0.8).paint(s1, R.fire, { base: 2 })
  I.paint(star(17, 8, 8), R.fire, { base: 3, ol: false })
  I.paint(M().disk(32, 32, 6), R.fire, { base: 4, ol: false, flat: true })
  I.twinkle(32, 32, '#ffffff', 2)
})
icon('p_atk', 'passive', 0xffe070, (I) => {
  for (const y of [22, 32, 42]) { const s = M().line(46, y, 58, y, 2, 0.6); I.glow(s, '#ffe070', 3, 0.6).paint(s, R.gold, { base: 3, ol: false, flat: true }) }
  I.paint(M().rect(16, 10, 26, 5), R.wood).paint(M().rect(16, 49, 26, 5), R.wood)
  I.paint(M().rect(18, 14, 3, 36).rect(37, 14, 3, 36), R.wood, { base: 1 })
  const glass = M().poly([21, 15, 37, 15, 29, 32]).poly([29, 32, 21, 49, 37, 49])
  I.paint(glass, rampOf('#c8e8ff'), { base: 3, ol: false })
  I.paint(M().poly([24, 17, 34, 17, 29, 26]).poly([29, 38, 23, 48, 35, 48]), R.gold, { base: 3, ol: false })
  I.paint(M().line(29, 30, 29, 40, 1), R.gold, { base: 4, ol: false, flat: true })
})
icon('p_armor', 'passive', 0xa0a0c0, (I) => {
  const sh = M().poly([32, 8, 52, 14, 50, 36, 32, 56, 14, 36, 12, 14])
  I.glow(sh, '#c8d0ff', 4, 0.6).paint(sh, R.steel, { grad: 'h' })
  I.paint(M().poly([32, 13, 47, 18, 45, 35, 32, 50, 19, 35, 17, 18]), R.dsteel, { base: 3, ol: false, grad: 'h' })
  I.paint(M().ring(32, 30, 9, 2.4), R.gold)
  I.paint(M().line(32, 21, 32, 39, 2.4).line(23, 30, 41, 30, 2.4), R.gold)
  I.twinkle(20, 16, '#ffffff', 1)
})
icon('p_pickup', 'passive', 0x80ffb0, (I) => {
  for (const [x, y] of [[10, 10], [54, 10], [54, 54], [10, 54], [32, 6], [32, 58]]) { const d = M().disk(x, y, 1.6); I.glow(d, '#80ffb0', 3, 0.7).paint(d, R.green, { base: 4, ol: false, flat: true }); I.paint(M().line(x + (32 - x) * 0.15, y + (32 - y) * 0.15, x + (32 - x) * 0.35, y + (32 - y) * 0.35, 1), R.green, { base: 3, ol: false, flat: true }) }
  const eye = M().poly([8, 32, 20, 20, 32, 17, 44, 20, 56, 32, 44, 44, 32, 47, 20, 44])
  I.glow(eye, '#80ffb0', 4, 0.6).paint(eye, R.white, { base: 3 })
  I.paint(M().disk(32, 32, 10), R.green, { grad: 'r' })
  I.paint(M().disk(32, 32, 4.5), R.ink, { base: 0, ol: false })
  I.paint(M().disk(29, 29, 2), R.white, { base: 4, ol: false, flat: true })
})
icon('p_area', 'passive', 0xc090ff, (I) => {
  for (const [r, w] of [[27, 2], [21, 1.6]]) { const g = M().ring(32, 32, r, w); I.glow(g, '#c090ff', 3, 0.6).paint(g, R.purple, { base: 3, ol: false }) }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; I.paint(M().disk(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24, 1.8), R.purple, { base: 4, ol: false }) }
  I.paint(M().rect(19, 19, 26, 26), R.red, { grad: 'v' })                                // ấn đỏ
  I.paint(M().rect(22, 22, 20, 20).cut().rect(24, 24, 16, 16), R.paper, { base: 3, ol: false })
  I.paint(M().line(27, 27, 37, 27, 2).line(32, 27, 32, 37, 2).line(27, 37, 37, 37, 2).line(28, 32, 36, 32, 1.6), R.paper, { base: 3, ol: false, flat: true })
})
icon('p_regen', 'passive', 0x70ff90, (I) => {
  const drop = M().disk(32, 38, 16).poly([32, 6, 17, 31, 47, 31])
  I.glow(drop, '#70ff90', 5, 0.7).paint(drop, R.green, { grad: 'r' })
  I.paint(M().rect(23, 35, 18, 6).rect(29, 29, 6, 18), R.white, { base: 3 })
  I.paint(M().ellipse(24, 28, 3, 6, 0.5), R.green, { base: 4, ol: false, flat: true })
})
icon('p_xp', 'passive', 0x90c0ff, (I) => {
  const rays = M()
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; rays.line(32 + Math.cos(a) * 8, 26 + Math.sin(a) * 8, 32 + Math.cos(a) * 20, 26 + Math.sin(a) * 20, 2.2, 0.4) }
  I.glow(rays, '#bfe0ff', 4, 0.8).paint(rays, rampOf('#c8e4ff'), { base: 3, ol: false, flat: true })
  I.paint(M().poly([6, 30, 31, 34, 31, 56, 6, 52]), R.paper, { grad: 'h' })
  I.paint(M().poly([58, 30, 33, 34, 33, 56, 58, 52]), R.paper, { base: 3, grad: 'h' })
  I.paint(M().rect(31, 33, 2, 24), R.wood)
  for (const y of [39, 44, 49]) I.paint(M().line(10, y - 1, 27, y + 1, 1).line(37, y + 1, 54, y - 1, 1), R.paper, { flat: true, base: 1, ol: false })
  const orb = M().disk(32, 26, 4)
  I.glow(orb, '#ffffff', 4, 0.9).paint(orb, rampOf('#c8e4ff'), { base: 4, ol: false })
})
icon('p_crit', 'passive', 0xff9060, (I) => {
  I.paint(M().ring(32, 32, 22, 4), R.white, { base: 3 }).paint(M().ring(32, 32, 14, 4), R.red, { base: 2 }).paint(M().disk(32, 32, 6), R.white, { base: 3 })
  I.paint(M().disk(32, 32, 2.6), R.red, { base: 3, ol: false })
  // mũi tên cắm hồng tâm + vết nứt
  I.paint(M().line(33, 31, 56, 8, 2), R.wood, { base: 3 })
  I.paint(M().poly([50, 6, 58, 6, 58, 14, 54, 10]).poly([46, 10, 54, 2, 54, 6]), R.white, { base: 3 })
  const cr = M().line(32, 32, 20, 22, 1).line(32, 32, 18, 40, 1).line(32, 32, 40, 48, 1)
  I.glow(cr, '#ffd060', 3, 0.8).paint(cr, R.fire, { base: 4, ol: false, flat: true })
})
icon('p_luck', 'passive', 0xffd860, (I) => {
  const coin = M().disk(32, 34, 20)
  I.glow(coin, '#ffd860', 5, 0.7).paint(coin, R.gold, { grad: 'r' })
  I.paint(M().ring(32, 34, 15, 2), R.gold, { base: 1, ol: false })
  I.paint(M().rect(27, 29, 10, 10), R.ink, { base: 1 })
  for (const [x, y] of [[32, 22], [32, 46], [20, 34], [44, 34]]) I.paint(M().rect(x - 2, y - 2, 4, 4), R.gold, { base: 4, ol: false })
  I.twinkle(18, 20, '#ffffff', 2).twinkle(50, 14, '#fff6c8', 1)
})
