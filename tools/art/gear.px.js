// =====================================================================
// BỘ SƯU TẬP TRANG BỊ (bản 2) — pixel art bằng pxl.
//   Hình trong Hành Trang (ô đồ):  wp_<loại>_<cấp> 66x66 · clothes_/shoes_/accessory_<cấp> 50x50 · bb_* 50x50
//   Hình CẦM TAY (hiện cùng nhân vật, đơn giản hơn, có hoạt ảnh 8 khung): wp_<loại>_held_<cấp>
// Kỹ thuật: vẽ theo "shader" trên trục chéo — mỗi điểm ảnh đổi sang tọa độ (u dọc thân vũ khí, v ngang),
// hàm hình dạng trả về màu → đổ bóng đều (phía trên-trái sáng, dưới-phải tối, sống lưỡi bắt sáng).
// Một hàm vẽ dùng cho cả hình ô đồ lẫn hình cầm tay (tham số o: trục, tỉ lệ k, có hiệu ứng hay không, pha hoạt ảnh).
// Chạy:  node <pxl>/bin/pxl.js build tools/art/gear.px.js  → chép out/sprites/*.png + out/anims/*.png vào public/gear/
// Cấp = CHẤT LIỆU (Phàm sắt-gỗ · Linh ngọc bích · Tiên bạc-mây · Thần vàng-lửa · Thánh bạch kim · Đạo hư không tinh tú).
// Màu PHẨM không nằm trong hình (chỉ ở viền + tên, do giao diện vẽ).
// =====================================================================
pal({ k: '#0e0a18', w: '#ffffff', y: '#fff3b0', v: '#d8c4ff' })

const SQ = Math.SQRT1_2
const TAU = Math.PI * 2
/**
 * Trục chéo. (ox, oy) = gốc (đầu chuôi), k = số điểm ảnh / 1 đơn vị thiết kế,
 * s = 1: u hướng lên-phải · s = -1: xoay 180° (u hướng xuống-trái). v vuông góc u.
 * mv = -1: lật ngang theo trục u (đổi bên v) — vd. đao cầm ngược mà lưỡi vẫn quay về phía trước.
 */
function axis(ox, oy, k = 1, s = 1, mv = 1) {
  const uv = (x, y) => { const dx = (x + 0.5 - ox) * s, dy = (y + 0.5 - oy) * s; return [(dx - dy) * SQ / k, mv * (dx + dy) * SQ / k] }
  const xy = (u, v) => [ox + s * (u + mv * v) * SQ * k, oy + s * (-u + mv * v) * SQ * k]
  return { uv, xy, k, s }
}
/** Trục theo góc bất kỳ (độ, trên màn hình: 0 = phải, 90 = xuống). Dùng cho vũ khí trong trận (cầm buông / dựng đứng). */
function axisA(ox, oy, k, deg, mv = 1) {
  const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy * mv, vy = ux * mv
  const uv = (x, y) => { const dx = x + 0.5 - ox, dy = y + 0.5 - oy; return [(dx * ux + dy * uy) / k, (dx * vx + dy * vy) / k] }
  const xy = (u, v) => [ox + (u * ux + v * vx) * k, oy + (u * uy + v * vy) * k]
  return { uv, xy, k, s: 1 }
}
/** Tô mọi điểm ảnh theo hàm f(u, v, x, y) → màu | null */
function paint(c, ax, f) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const [u, v] = ax.uv(x, y); const col = f(u, v, x, y); if (col) c.px(x, y, col)
  }
}
/** Tô theo tọa độ màn hình */
function paintXY(c, f) { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const col = f(x + 0.5, y + 0.5, x, y); if (col) c.px(x, y, col) } }
const RAINBOW = ['#ff5a7a', '#ffb84a', '#ffe865', '#5ff0a0', '#5ab8ff', '#a87aff', '#ff7ae0']
const hash = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h) }
const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a))

function star(c, x, y, col, big) {
  c.px(x, y, 'w'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + dx, y + dy, col)
  if (big) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.px(x + dx, y + dy, col)
}
/** Viền tay: chỉ quanh thân vật (hiệu ứng vẽ sau không bị viền) */
function outlineNow(c, col = 'k') {
  const add = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.is(x, y, '*')) continue
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < c.w && y + dy < c.h && c.is(x + dx, y + dy, '*'))) add.push([x, y])
  }
  for (const [x, y] of add) c.px(x, y, col)
}
/** Linh khí: dải liền mạch uốn quanh thân vũ khí, chỉ hiện ngoài thân (như quấn ra sau). ph = pha hoạt ảnh. */
function wisp(c, ax, cols, amp, ph, from, to, clear) {
  let prev = null
  for (let u = from; u < to; u += 0.3 / ax.k) {
    const v = Math.sin(u * 0.2 - ph) * amp
    if (Math.abs(v) < clear) { prev = null; continue }
    const [x, y] = ax.xy(u, v), X = Math.round(x), Y = Math.round(y)
    if (prev && (prev[0] !== X || prev[1] !== Y)) c.px(X, Y, cols[Math.floor((u - ph * 3) / 4 + 70) % cols.length])
    prev = [X, Y]
  }
}
/** Tua (kiếm / đao / quạt): dây + nút thắt + chùm sợi buông thẳng xuống, lay theo pha */
function tassel(c, x0, y0, T, L, ph, rainbow) {
  c.vline(x0, y0, 2, T[0]); c.rect(x0 - 1, y0 + 2, 3, 2, T[1]); c.px(x0, y0 + 2, '#ffffff')
  for (let i = 0; i < L; i++) {
    const sw = Math.round(Math.sin(i * 0.5 - ph) * 1.3 * (i / L + 0.3))
    for (let j = -1; j <= 1; j++) c.px(x0 + j + sw, y0 + 4 + i, j === -1 ? T[1] : T[0])
  }
  if (rainbow) { const sw = Math.round(Math.sin(L * 0.5 - ph) * 1.3 * 1.3); for (let j = -1; j <= 1; j++) c.px(x0 + j + sw, y0 + 4 + L, RAINBOW[j + 4]) }
}

// ================================================================ BẢNG MÀU THEO CẤP
// B: kim loại lưỡi (tối→sáng 5) · guard: hộ thủ · grip: chuôi · pom: đốc · tassel: tua · gem: ngọc
const TIER = [
  { // 0 Phàm — sắt thô, gỗ, da
    B: ['#2b2d36', '#4c505c', '#757b88', '#a4aab6', '#d6dae2'],
    guard: ['#3a2a20', '#6b4a32', '#9a6e48'], grip: ['#2a1810', '#5a3620', '#7c5030'], pom: ['#3a2a20', '#6b4a32', '#9a6e48'], tassel: null, gem: null,
    wood: ['#3a2416', '#6a4428', '#946238'], fx: null,
  },
  { // 1 Linh — đồng xanh, ngọc bích
    B: ['#1c3a30', '#3e6e5a', '#74a892', '#b4dcc8', '#e8fff2'], fuller: '#38d39a',
    guard: ['#0f3d2e', '#1f8a62', '#5fe0a8'], grip: ['#10261e', '#1e4a38', '#2f6e52'], pom: ['#0f3d2e', '#1f8a62', '#7ff0c0'], tassel: ['#167a52', '#3fd08e'], gem: '#7ff0c0',
    wood: ['#1c4a2a', '#3a7a40', '#6aa858'], fx: 'motes',
  },
  { // 2 Tiên — bạc, mây trời
    B: ['#2a3a64', '#5a74ae', '#98b2e2', '#d2e2fa', '#ffffff'], runes: '#7fd8ff',
    guard: ['#2a3a7a', '#5a7ad8', '#b8d0ff'], grip: ['#1a2040', '#2e3a6a', '#46588e'], pom: ['#2a3a7a', '#7fb8ff', '#e0f4ff'], tassel: ['#a8b8e0', '#ffffff'], gem: '#8fe4f8',
    wood: ['#1a2448', '#2e3e74', '#4a62a8'], fx: 'clouds',
  },
  { // 3 Thần — vàng ròng, lửa
    B: ['#5a1a10', '#a8401c', '#e8862a', '#ffc85a', '#fff2b0'], flame: '#ff4a2a',
    guard: ['#6a1a14', '#c8402a', '#ffb04a'], grip: ['#2a0a0a', '#5a1414', '#8a2020'], pom: ['#6a1a14', '#c8402a', '#ffd06a'], tassel: ['#b81e24', '#ff6a3a'], gem: '#ff3a2a',
    wood: ['#4a0e10', '#8a1a1c', '#c8302a'], fx: 'fire', wispCols: ['#ff8a2a', '#ffd06a', '#ff4a2a'],
  },
  { // 4 Thánh — bạch kim, kim quang
    B: ['#6a6f88', '#a8aec4', '#dfe3f0', '#f6f8ff', '#ffffff'], inlay: '#f2c85a',
    guard: ['#8a5e14', '#e8b440', '#fff2b0'], grip: ['#5a4214', '#a8822c', '#e0c060'], pom: ['#8a5e14', '#e8b440', '#ffffff'], tassel: ['#e8b440', '#fff2b0'], gem: '#fffbe0',
    wood: ['#a8aec4', '#e6e9f4', '#ffffff'], fx: 'holy', wispCols: ['#fff3b0', '#ffffff', '#f2c85a'],
  },
  { // 5 Đạo — hư không, tinh tú, thất thải
    B: ['#0a0818', '#1c1638', '#3a2e6e', '#6a58c0', '#c8b8ff'], cosmos: true,
    guard: ['#2a1e5a', '#6a50d0', '#d8c8ff'], grip: ['#08060f', '#1a1430', '#2e2456'], pom: ['#140e2a', '#6a50d0', '#e0d0ff'], tassel: ['#7a5ad8', '#ff7ae0'], gem: '#e0d0ff',
    wood: ['#0c0a1a', '#221a40', '#3a2e6e'], fx: 'rainbow', wispCols: RAINBOW,
  },
]

/** Màu thân kim loại chung (lưỡi kiếm / mũi thương): e = khoảng cách tới mép, v = ngang (âm = phía sáng) */
function metal(P, e, v, x, y, q) {
  const B = P.B
  if (P.cosmos) {
    if (e < 0.8 * q) return RAINBOW[Math.floor((x + y) / 3) % 7]
    const h = hash(x, y)
    if (h > 0.95) return '#ffffff'
    if (h > 0.89) return B[4]
    if (Math.abs(v) < 0.5 * q) return B[3]
    return v < 0 ? B[2] : B[1]
  }
  if (e < 0.7 * q) return v < 0 ? B[4] : B[1]
  if (P.inlay && e < 1.5 * q) return P.inlay
  if (Math.abs(v) < 0.5 * q) return B[4]
  return v < 0 ? B[3] : B[2]
}

/** Hộ thủ (dùng chung kiếm / đao). gc = tâm hộ thủ trên trục u, w = nửa bề ngang */
function guard(c, ax, P, gc, shape, w, q) {
  const C = P.guard
  paint(c, ax, (u, v) => {
    const du = u - gc, av = Math.abs(v), r = Math.hypot(du, v)
    let ins = false
    switch (shape) {
      case 'bar': ins = Math.abs(du) < 1.3 && av < w || (av > w - 2 && av < w + 0.6 && Math.abs(du) < 2.1); break                 // thanh thẳng, hai đầu bịt
      case 'oval': ins = (du / 1.7) ** 2 + (v / w) ** 2 < 1; break                                                                  // đĩa bầu dục (đao)
      case 'cloud': ins = (Math.abs(du - av * av * 0.05) < 1.4 && av < w) || Math.hypot(du - 3.2, av - w) < 2.0 || r < 2.6; break   // cong về mũi + cuộn mây hai đầu
      case 'wing': ins = (Math.abs(du - av * 0.55) < 1.3 + (w - av) * 0.08 && av < w) || r < 2.4; break                            // cánh vút
      case 'sun': ins = r < 3.6 || (Math.abs(du) < 1.2 && av < w - 1) || (Math.abs(du + av * 0.6) < 1 && av < w) || (Math.abs(du - av * 0.9) < 0.9 && av < w - 2); break
      case 'halo': ins = r < 3.8 || (Math.abs(du - av * av * 0.045) < 1.3 && av < w) || Math.hypot(du - w * w * 0.045, av - w) < 1.6; break   // đĩa + cánh vầng nguyệt
      case 'taiji': ins = r < 4.6; break                                                                                              // đĩa thái cực
    }
    if (!ins) return null
    if (shape === 'taiji' && r < 3.6) {
      const R = 3.6, top = Math.hypot(du, v + R / 2) < R / 2, bot = Math.hypot(du, v - R / 2) < R / 2
      if (Math.hypot(du, v + R / 2) < 0.8) return '#140e2a'
      if (Math.hypot(du, v - R / 2) < 0.8) return '#f4f0ff'
      return top ? '#f4f0ff' : bot ? '#140e2a' : du < 0 ? '#f4f0ff' : '#140e2a'
    }
    if (P.gem && r < 1.6) return r < 0.8 * q ? '#ffffff' : P.gem
    const ref = shape === 'cloud' || shape === 'taiji' ? du - av * av * 0.05 : shape === 'halo' ? du - av * av * 0.045 : shape === 'wing' ? du - av * 0.55 : du
    if (ref < -0.5) return C[2]
    if (ref > 0.7) return v > 0 ? C[0] : C[1]
    return v > 2 ? C[0] : C[1]
  })
}
/** Chuôi quấn chéo + đốc tròn */
function hilt(c, ax, P, from, to, q, ringPommel) {
  paint(c, ax, (u, v) => {
    if (u < from || u > to || Math.abs(v) > 1.7) return null
    if (v > 0.9) return P.grip[0]
    return (Math.floor(u * 0.8 + v * 0.8) % 2) ? P.grip[2] : P.grip[1]
  })
  paint(c, ax, (u, v) => {
    if (ringPommel) {                                  // đốc vòng (hoàn thủ đao)
      const r = Math.hypot(u + 0.6, v)
      if (r > 3.2 || r < 1.5) return null
      return u < -0.6 && v < 0.5 ? P.pom[2] : r > 2.5 ? P.pom[0] : P.pom[1]
    }
    const r = Math.hypot(u - 1, v)
    if (r > 2.7) return null
    if (P.gem && r < 1.2) return P.gem
    return u < 0.8 && v < 0.4 ? P.pom[2] : r > 1.9 ? P.pom[0] : P.pom[1]
  })
}
/** Hiệu ứng đặc trưng theo cấp quanh thân vũ khí (mode 'icon' có thêm sao lấp lánh) */
function tierFx(c, ax, P, t, from, to, clear, o) {
  if (o.noFx) return
  const pt = (u, v) => ax.xy(u, v).map(Math.round)
  if (P.fx === 'motes' && !o.held) for (const [u, v] of [[from + 22, -7], [to - 8, 6]]) { const [x, y] = pt(u, v); c.px(x, y, '#7ff0c0') }
  if (P.fx === 'clouds' && !o.held) for (const [u, v] of [[to - 18, -9], [from + 14, 9]]) { const [x, y] = pt(u, v); c.hline(x - 3, y, 6, '#d8e8ff'); c.hline(x - 1, y - 1, 4, '#ffffff') }
  if (P.wispCols) wisp(c, ax, P.wispCols, o.held ? 6.5 : 8.5, o.ph, from, to, clear)
  if (P.fx === 'fire' && !o.held) for (const [u, v] of [[from + 18, -9], [to - 6, 8], [to - 16, -10]]) { const [x, y] = pt(u, v); c.px(x, y, '#ffd06a'); c.px(x, y - 1, '#ff6a2a') }
  if (!o.held && t === 4) { star(c, 54, 8, '#fff3b0', true); star(c, 34, 16, '#fff3b0'); star(c, 58, 32, '#fff3b0') }
  if (!o.held && t === 5) { star(c, 55, 7, '#ff7ae0', true); star(c, 33, 15, '#5ab8ff'); star(c, 59, 31, '#ffe865') }
}

// ================================================================ KIẾM
const SWORD = [
  { len: 60, hw: 3.4, gw: 7, gd: 2.2, guard: 'bar' },
  { len: 62, hw: 3.0, gw: 8, gd: 2.6, guard: 'cloud' },
  { len: 64, hw: 2.9, gw: 10, gd: 2.4, guard: 'wing' },
  { len: 62, hw: 4.0, gw: 10, gd: 3.0, guard: 'sun' },
  { len: 64, hw: 3.4, gw: 11, gd: 3.2, guard: 'halo' },
  { len: 64, hw: 3.6, gw: 11, gd: 3.2, guard: 'taiji' },
]
function drawSword(c, t, o) {
  const P = TIER[t], S = SWORD[t], ax = o.ax, q = 1 / ax.k
  const pom = 2.6, g0 = 17, gc = g0 + S.gd, g1 = g0 + S.gd * 2, tip = S.len + 10, taper = 10
  paint(c, ax, (u, v, x, y) => {
    if (u < g1 - 1 || u > tip) return null
    let hw = S.hw
    if (u > tip - taper) hw = S.hw * Math.pow((tip - u) / taper, 0.8)
    if (P.flame && v > 0 && u < tip - taper) hw += Math.max(0, Math.sin(u * 0.75)) * 1.6
    if (Math.abs(v) > hw + 0.1) return null
    const e = hw - Math.abs(v)
    if (P.flame && v > 0 && e < 1.4 && u < tip - taper) return Math.sin(u * 0.75) > 0.6 ? '#ffe08a' : P.flame
    if (!P.cosmos && e >= 0.7 * q) {
      if (P.fuller && Math.abs(v) < 1.2 && u < tip - taper - 3 && u > g1 + 2) return Math.abs(v) < 0.5 * q ? '#c8ffe8' : P.fuller
      if (P.runes && Math.abs(v) < 0.9 && u > g1 + 3 && u < tip - taper - 2 && (Math.floor(u) % 6 < 3)) return P.runes
    }
    return metal(P, e, v, x, y, q)
  })
  hilt(c, ax, P, pom, g0 + 0.5, q, false)
  guard(c, ax, P, gc, S.guard, S.gw, q)
  outlineNow(c)
  if (P.tassel && !o.held) { const [px, py] = ax.xy(-2.2 * ax.s, 0); tassel(c, Math.round(px), Math.round(py), P.tassel, Math.round((t >= 2 ? 10 : 7) * ax.k), o.ph, t === 5) }
  tierFx(c, ax, P, t, g1 + 2, tip - 2, S.hw + 1.6, o)
}

// ================================================================ ĐAO (một lưỡi, sống dày, cong nhẹ, mũi vát; đốc vòng)
const BLADE = [
  { len: 56, w0: 3.4, w1: 4.2, guard: 'oval', gw: 5 },
  { len: 58, w0: 3.4, w1: 4.6, guard: 'cloud', gw: 7 },
  { len: 60, w0: 3.2, w1: 4.4, guard: 'wing', gw: 9 },
  { len: 58, w0: 3.6, w1: 5.2, guard: 'sun', gw: 9 },
  { len: 60, w0: 3.4, w1: 4.8, guard: 'halo', gw: 10 },
  { len: 60, w0: 3.6, w1: 5.0, guard: 'taiji', gw: 10 },
]
function drawBlade(c, t, o) {
  const P = TIER[t], D = BLADE[t], ax = o.ax, q = 1 / ax.k, B = P.B
  const g0 = 15.5, gc = 17.5, g1 = 19.5, tip = D.len + 10
  paint(c, ax, (u, v, x, y) => {
    if (u < g1 - 0.5 || u > tip) return null
    const s = (u - g1) / (tip - g1)
    const cv = -3.2 * s * s                           // thân cong ngược về phía sống
    const vs = cv - 1.7                               // sống
    let ve = cv + D.w0 + D.w1 * s                     // lưỡi (phình dần về mũi)
    if (s > 0.8) ve = vs + (ve - vs) * Math.sqrt(Math.max(0, 1 - ((s - 0.8) / 0.2) ** 2))   // mũi vát cong về sống
    if (v < vs || v > ve) return null
    const es = v - vs, ee = ve - v
    if (P.cosmos) {
      if (ee < 0.8 * q || es < 0.6 * q) return RAINBOW[Math.floor((x + y) / 3) % 7]
      const h = hash(x, y); if (h > 0.94) return '#ffffff'; if (h > 0.88) return B[4]
      return es < 1.6 ? B[2] : B[1]
    }
    if (P.flame && u > g1 + 2 && Math.floor(u) % 5 < 1.5 && es < 0.9) return null   // răng cưa trên sống
    if (es < 0.7 * q) return B[4]                                                     // mặt sống bắt sáng
    if (P.inlay && es < 1.7) return P.inlay
    if (P.fuller && es < 1.7 && u < tip - 10) return P.fuller
    if (es < 1.6) return B[1]                                                          // sống dày (tối)
    if (P.flame && ee < 1.8) return ee < 0.8 * q ? '#ffe08a' : P.flame
    if (ee < 0.7 * q) return B[4]                                                      // lưỡi sắc
    if (P.runes && Math.abs(ee - 1.9 - 0.6 * Math.sin(u * 0.8)) < 0.45 * q) return '#ffffff'   // vân mây (hamon)
    if (ee < 1.8) return B[3]                                                          // mặt vát
    return B[2]
  })
  hilt(c, ax, P, 2.6, g0 + 0.5, q, true)
  guard(c, ax, P, gc, D.guard, D.gw, q)
  outlineNow(c)
  if (P.tassel && !o.held) { const [px, py] = ax.xy(-3.6 * ax.s, 0); tassel(c, Math.round(px), Math.round(py), P.tassel, Math.round((t >= 2 ? 10 : 7) * ax.k), o.ph, t === 5) }
  tierFx(c, ax, P, t, g1 + 2, tip - 2, 7.5, o)
}

// ================================================================ THƯƠNG (cán dài, hồng anh dưới mũi)
const SPEAR = [
  { head: 'leaf', hl: 23, hw: 4.0, tas: ['#8a1a1c', '#d83a30'] },
  { head: 'leaf', hl: 24, hw: 3.8, tas: ['#167a52', '#3fd08e'], nodes: true },
  { head: 'barb', hl: 26, hw: 2.8, tas: ['#a8b8e0', '#ffffff'] },
  { head: 'serpent', hl: 25, hw: 3.2, tas: ['#b81e24', '#ffb04a'] },
  { head: 'moon', hl: 24, hw: 3.6, tas: ['#e8b440', '#fff2b0'] },
  { head: 'leaf', hl: 26, hw: 4.2, tas: ['#7a5ad8', '#ff7ae0'] },
]
function drawSpear(c, t, o) {
  const P = TIER[t], S = SPEAR[t], ax = o.ax, q = 1 / ax.k, W = P.wood, B = P.B
  const L = o.shaft ?? 57                // chiều dài cán (hình cầm tay dài hơn)
  const sock = L, h0 = L + 3.5, tip = h0 + S.hl
  // cán + đai
  paint(c, ax, (u, v, x, y) => {
    if (u < 0 || u > sock + 0.5) return null
    if (u < 3) { if (Math.abs(v) > 1.9) return null; return v < -0.5 ? B[3] : v > 0.8 ? B[1] : B[2] }   // đốc bịt kim loại
    if (Math.abs(v) > 1.25) return null
    const band = [L * 0.25, L * 0.52, L * 0.8].some((b) => Math.abs(u - b) < 0.9)
    if (band) return v < -0.3 ? P.guard[2] : P.guard[1]
    if (S.nodes && Math.abs(((u % 9) + 9) % 9 - 4.5) < 0.5) return W[0]          // đốt trúc
    if (P.cosmos && hash(x, y) > 0.9) return '#c8b8ff'
    if (t === 4 && Math.abs(((u + v * 2) % 6 + 6) % 6 - 3) < 0.6) return P.inlay   // dây vàng quấn xoắn
    return v < -0.45 ? W[2] : v > 0.5 ? W[0] : W[1]
  })
  // khâu nối mũi
  paint(c, ax, (u, v) => {
    if (u < sock - 1 || u > h0 + 0.3 || Math.abs(v) > 1.9) return null
    if (Math.abs(u - (sock + 1)) < 0.6) return P.guard[2]
    return v < -0.4 ? B[3] : v > 0.7 ? B[1] : B[2]
  })
  // mũi thương
  paint(c, ax, (u, v, x, y) => {
    if (u < h0 || u > tip) return null
    const p = (u - h0) / S.hl
    let cv = 0, hw = S.hw * (p < 0.32 ? Math.sin(p / 0.32 * Math.PI / 2) : Math.cos((p - 0.32) / 0.68 * Math.PI / 2))
    if (S.head === 'serpent') { cv = 1.4 * Math.sin((u - h0) * 0.55) * (1 - p); hw = S.hw * (1 - p ** 1.6) + 0.3 }
    if (S.head === 'barb' || S.head === 'moon') hw = Math.max(hw, 0)
    const dv = v - cv
    if (Math.abs(dv) > hw + 0.1) return null
    const e = hw - Math.abs(dv)
    if (P.flame && e < 1.1 && p < 0.85) return e < 0.6 * q ? '#ffe08a' : P.flame
    if (P.fuller && Math.abs(dv) < 0.9 && p > 0.12 && p < 0.7 && e >= 0.7 * q) return P.fuller
    return metal(P, e, dv, x, y, q)
  })
  // cánh mũi: 'barb' = hai móc tam giác vút về mũi · 'moon' = hai lưỡi trăng khuyết
  const tri = (pu, pv, a, b2, cc) => { const d = (p1, p2, p3) => (pu - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (pv - p3[1]); const d1 = d(0, a, b2), d2 = d(0, b2, cc), d3 = d(0, cc, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) }
  if (S.head === 'barb') paint(c, ax, (u, v, x, y) => {
    const av = Math.abs(v)
    if (!tri(u, av, [h0 - 0.5, 1.2], [h0 + 2.5, 1.2], [h0 + 6, 6])) return null
    return v < 0 ? B[3] : B[2]
  })
  if (S.head === 'moon') paint(c, ax, (u, v, x, y) => {
    const av = Math.abs(v)
    if (av < 1.2) return null
    const inA = Math.hypot(u - (h0 + 2.5), av - 3) < 4.4, inB = Math.hypot(u - (h0 + 4.6), av - 2.2) < 3.9
    if (!inA || inB) return null
    const eB = Math.hypot(u - (h0 + 4.6), av - 2.2) - 3.9
    return eB < 0.8 * q ? B[4] : v < 0 ? B[3] : B[2]
  })
  // hồng anh: chùm tua từ khâu nối RỦ THẲNG XUỐNG (theo trọng lực, kể cả khi cầm ngược), lay theo pha
  {
    const [cx, cy] = ax.xy(sock - 0.8, 0), k = ax.k
    const n = 4, Ls = [9, 12, 13, 11, 13, 12, 10, 8, 11]
    for (let i = -n; i <= n; i++) {
      const L = Math.round(Ls[i + n] * k), x0 = cx + i * 0.55 * k
      for (let d = 0; d <= L; d++) {
        const sw = Math.sin(d * 0.35 - o.ph + i * 0.3) * 0.9 * (d / L)
        const x = Math.round(x0 + i * 0.16 * d + sw), y = Math.round(cy - 1 + d)
        c.px(x, y, (i + n) % 3 === 0 ? S.tas[0] : S.tas[1])
        if (d < 3) c.px(x + 1, y, S.tas[1])
      }
    }
    c.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 3, S.tas[0])   // nút buộc
  }
  outlineNow(c)
  tierFx(c, ax, P, t, sock - 18, tip, 5.5, o)
}

// ================================================================ QUYỀN SÁO (găng giáp, nhìn nghiêng 3/4: ống tay dưới-trái, nắm đấm trên-phải)
const FIST = [
  { spike: 'stud', sl: 0 },
  { spike: 'stud', sl: 2.5 },
  { spike: 'claw', sl: 8 },
  { spike: 'flame', sl: 6 },
  { spike: 'claw', sl: 7, wing: true },
  { spike: 'claw', sl: 8 },
]
function drawFist(c, t, o) {
  const P = TIER[t], F = FIST[t], ax = o.ax, q = 1 / ax.k, B = P.B, A = P.guard, L = P.grip
  const leather = t === 0 ? ['#2a1810', '#5a3620', '#8a5a34'] : L
  const fc = [27, 0.5], fr = [10, 8.6]
  // cánh (Thánh): lông vũ vàng xòe từ ống tay
  if (F.wing) paint(c, ax, (u, v) => {
    if (v > -5 || u < 2 || u > 17) return null
    const lim = -6 - (u - 2) * 0.55 - 2.4 * Math.abs(Math.sin((u - 2) * 0.55))
    if (v < lim) return null
    return v < lim + 1 ? '#ffffff' : (Math.floor(u / 3) % 2 ? '#f2c85a' : '#fff2b0')
  })
  paint(c, ax, (u, v, x, y) => {
    // ống tay (cuff): vành loe ở đáy, thu nhỏ dần về cổ tay
    let hw = u < 2.2 ? 7.2 : 6.4 - u * 0.06
    if (u >= 0 && u <= 15 && Math.abs(v) <= hw) {
      const nv = v / hw
      if (u < 2.2) return nv < -0.3 ? A[2] : nv > 0.5 ? A[0] : A[1]                     // vành đáy
      if (Math.abs(u - 14) < 1) return nv < -0.3 ? A[2] : A[1]                          // vành cổ tay
      if (P.cosmos && hash(x, y) > 0.9) return '#c8b8ff'
      const plate = t >= 1 && Math.abs(nv) < 0.62                                       // phiến giáp giữa ống tay
      if (plate) { if (P.runes && Math.abs(nv) < 0.15 && Math.floor(u) % 3 === 0) return P.runes; return nv < -0.25 ? B[3] : nv > 0.3 ? B[1] : B[2] }
      if (t === 0 && Math.floor(u * 0.7 + v * 0.3) % 2 === 0) return leather[0]        // dây quấn da
      return nv < -0.3 ? leather[2] : nv > 0.4 ? leather[0] : leather[1]
    }
    // cổ tay
    if (u > 15 && u < 18.5 && Math.abs(v) < 5.2) return v < -1.5 ? leather[2] : v > 2 ? leather[0] : leather[1]
    // mu bàn tay: phiến giáp hình thang từ cổ tay tới đốt ngón
    const back = u >= 18 && u <= 31.5 && v >= -5.6 - (u - 18) * 0.08 && v <= 3.2
    // khối ngón tay cuộn (4 ngón xếp chồng theo v), bo tròn đầu
    const fu = (u - 34.5) / 4.2, fv = (v + 1) / 6.3
    const fing = fu ** 4 + fv ** 4 < 1 && u > 30
    // ngón cái ôm dưới
    const thumb = ((u - 27.5) / 5) ** 2 + ((v - 4.6) / 2.4) ** 2 < 1
    if (!back && !fing && !thumb) return null
    if (fing) {
      if (u < 33.6 && u > 31) return v < -4 ? B[4] : v > 3 ? B[1] : B[3]        // phiến giáp đốt ngón
      if (u <= 31) return A[0]
      const seams = [-3.9, -0.9, 2.2]
      if (seams.some((sv) => Math.abs(v - sv) < 0.42 * q)) return leather[0]   // khe giữa các ngón
      const loc = seams.reduce((m, sv) => (v > sv ? sv : m), -7.3)
      return v - loc < 1.1 ? leather[2] : u > 37 ? leather[0] : leather[1]       // mỗi ngón: mép trên sáng
    }
    if (thumb && !(back && v < 3)) { const n = (v - 4.6) / 2.4; return n < -0.3 ? leather[2] : n > 0.4 ? leather[0] : leather[1] }
    const nv = (v + 1.2) / 4.4
    if (P.gem && Math.hypot(u - 25, v + 1.3) < 2) return Math.hypot(u - 25, v + 1.3) < 0.9 ? '#ffffff' : P.gem
    if (Math.abs(u - 18.6) < 0.7 || v > 2.4 || v < -5.4 - (u - 18) * 0.08) return A[1]   // viền phiến
    if (P.cosmos) { if (hash(x, y) > 0.9) return '#ffffff'; return nv < -0.3 ? B[3] : B[2] }
    if (P.runes && Math.abs(v + 1.2) < 0.4 && Math.floor(u) % 3 === 0) return P.runes
    return nv < -0.55 ? B[4] : nv < -0.1 ? B[3] : nv < 0.5 ? B[2] : B[1]
  })
  // gai / vuốt nhô ra trước đốt ngón
  for (const sv of [-5.4, -2.4, 0.6, 3.4]) {
    if (F.spike === 'stud') {
      paint(c, ax, (u, v) => { const r = Math.hypot(u - 38.6, v - sv); if (r > 1.25 + F.sl * 0.2) return null; return r < 0.6 ? B[4] : (v - sv) < 0 ? B[3] : B[1] })
      if (F.sl) paint(c, ax, (u, v) => { const d = u - 38.6, w = 1.1 * (1 - d / F.sl); if (d < 0 || d > F.sl || Math.abs(v - sv) > w) return null; return v < sv ? B[4] : B[2] })
    } else {
      const curve = F.spike === 'claw' ? 0.06 : 0
      paint(c, ax, (u, v, x, y) => {
        const d = u - 37.8, cv = sv + curve * d * d, w = (F.spike === 'flame' ? 1.4 : 0.9) * (1 - d / F.sl) + 0.15
        if (d < 0 || d > F.sl || Math.abs(v - cv) > w) return null
        if (P.cosmos) return RAINBOW[(Math.floor(d) + Math.round(sv)) % 7 + (sv < 0 ? 7 : 0) - (sv < 0 ? 7 : 0)] ?? B[4]
        if (F.spike === 'flame') return d > F.sl * 0.5 ? '#ffd06a' : P.flame
        return v < cv ? B[4] : B[2]
      })
    }
  }
  outlineNow(c)
  tierFx(c, ax, P, t, 4, 40, 9.5, o)
}

// ================================================================ CUNG (cánh cong qua chuôi, dây thẳng; đầu cánh trang trí theo cấp)
const BOW = [
  { tip: 'cap', hw: 3.0 }, { tip: 'cap', hw: 3.0 }, { tip: 'feather', hw: 2.8 },
  { tip: 'flame', hw: 3.2 }, { tip: 'wing', hw: 3.0 }, { tip: 'moon', hw: 3.2 },
]
const STRING = ['#d8cfb8', '#d8f0e0', '#f0f6ff', '#ffb04a', '#fff3b0', null]
/** T1, G, T2: đầu cánh trên, chuôi (bụng cung đi qua), đầu cánh dưới; k = tỉ lệ nét */
function drawBow(c, t, o) {
  const P = TIER[t], Bw = BOW[t], k = o.k ?? 1, B = P.B, A = P.guard, W = P.wood
  const [T1, G, T2] = o.pts
  const C = [2 * G[0] - (T1[0] + T2[0]) / 2, 2 * G[1] - (T1[1] + T2[1]) / 2]
  const at = (s) => [(1 - s) ** 2 * T1[0] + 2 * (1 - s) * s * C[0] + s * s * T2[0], (1 - s) ** 2 * T1[1] + 2 * (1 - s) * s * C[1] + s * s * T2[1]]
  const tan = (s) => { const a = at(s - 0.002), b = at(s + 0.002), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }
  // phía ngoài (bụng cung) = hướng ra xa dây
  const mid = [(T1[0] + T2[0]) / 2, (T1[1] + T2[1]) / 2]
  const outSign = (() => { const p = at(0.5), tg = tan(0.5), n = [-tg[1], tg[0]]; return (p[0] - mid[0]) * n[0] + (p[1] - mid[1]) * n[1] > 0 ? 1 : -1 })()
  // dây cung (vẽ trước để cánh đè lên)
  const N = Math.ceil(Math.hypot(T2[0] - T1[0], T2[1] - T1[1]) * 2)
  for (let i = 0; i <= N; i++) {
    const s = i / N, x = Math.round(T1[0] + (T2[0] - T1[0]) * s), y = Math.round(T1[1] + (T2[1] - T1[1]) * s)
    c.px(x, y, STRING[t] ?? RAINBOW[Math.floor(s * 7) % 7])
  }
  // thân cánh
  for (let i = 0; i <= 900; i++) {
    const s = i / 900, p = at(s), tg = tan(s), n = [-tg[1] * outSign, tg[0] * outSign]
    const hw = (Bw.hw * (0.38 + 0.62 * (1 - Math.abs(2 * s - 1)) ** 0.8)) * k
    const grip = Math.abs(s - 0.5) < 0.07
    for (let w = -hw; w <= hw; w += 0.3) {
      const x = Math.round(p[0] + n[0] * w), y = Math.round(p[1] + n[1] * w)
      let col
      const e = hw - Math.abs(w)
      if (grip) col = Math.abs(s - 0.5) > 0.055 ? A[2] : (Math.floor(s * 300) % 2 ? A[1] : A[0])
      else if (P.cosmos) col = e < 0.7 ? RAINBOW[Math.floor(s * 14) % 7] : (hash(x, y) > 0.9 ? '#ffffff' : W[2])
      else if (t >= 3 && e < 0.8) col = w > 0 ? P.guard[2] : P.guard[1]                     // viền kim loại cánh
      else col = w > hw * 0.3 ? W[2] : w < -hw * 0.4 ? W[0] : W[1]
      if (P.fuller && !grip && Math.abs(w) < 0.4 && s > 0.12 && s < 0.88) col = P.fuller
      if (P.runes && !grip && Math.abs(w) < 0.4 && Math.floor(s * 40) % 3 === 0 && s > 0.1 && s < 0.9) col = P.runes
      c.px(x, y, col)
    }
  }
  // đầu cánh cong ngược (recurve): đoạn ngắn uốn ra phía trước, thuôn nhỏ
  const hookEnd = []
  for (const [s0, dir] of [[0, -1], [1, 1]]) {
    const p = at(s0), tg = tan(s0), n = [-tg[1] * outSign, tg[0] * outSign], f = [tg[0] * dir, tg[1] * dir]
    const HL = 6 * k
    for (let a = 0; a <= HL; a += 0.25) {
      const bend = (a / HL) ** 2 * 3.2 * k
      const cx = p[0] + f[0] * a + n[0] * bend, cy = p[1] + f[1] * a + n[1] * bend
      const hw = Bw.hw * 0.38 * k * (1 - a / HL * 0.55)
      for (let w = -hw; w <= hw; w += 0.3) { const x = Math.round(cx + n[0] * w), y = Math.round(cy + n[1] * w); c.px(x, y, P.cosmos ? RAINBOW[Math.floor(a) % 7] : t >= 3 ? P.guard[1] : w > 0 ? W[2] : W[1]) }
      if (a + 0.25 > HL) hookEnd.push([cx, cy, n, f])
    }
  }
  if (P.gem) { const p = at(0.5).map(Math.round); c.circ(p[0], p[1], Math.max(1, Math.round(1.6 * k)), P.gem); c.px(p[0], p[1], '#ffffff') }
  // đầu cánh
  for (const [cx, cy, n, f] of hookEnd) {
    const p = [cx, cy]
    const P2 = (a, b) => [Math.round(p[0] + f[0] * a * k + n[0] * b * k), Math.round(p[1] + f[1] * a * k + n[1] * b * k)]
    if (Bw.tip === 'cap') { const [x, y] = P2(0, 0); c.circ(x, y, Math.max(1, Math.round(1.6 * k)), t ? P.gem : B[2]); c.px(x, y, B[4]) }
    if (Bw.tip === 'feather' || Bw.tip === 'wing') {
      const len = Bw.tip === 'wing' ? 8 : 6, col = Bw.tip === 'wing' ? ['#f2c85a', '#fff2b0'] : ['#b8d0ff', '#ffffff']
      for (let j = 0; j < 4; j++) for (let a = 0; a <= len - j * 1.2; a += 0.4) { const [x, y] = P2(a * 0.6 - j * 1.4, a * 0.8 + 0.5); c.px(x, y, col[j % 2]) }
    }
    if (Bw.tip === 'flame') for (let a = 0; a < 6; a += 0.3) { const w = 1.3 * (1 - a / 6); for (let b = -w; b <= w; b += 0.4) { const [x, y] = P2(a, b + Math.sin(a) * 0.8); c.px(x, y, a > 3 ? '#ffd06a' : P.flame) } }
    if (Bw.tip === 'moon') for (let a = 0; a < Math.PI; a += 0.06) { const [x, y] = P2(Math.cos(a) * 3 + 2, Math.sin(a) * 3 + 1); c.px(x, y, RAINBOW[Math.floor(a * 2.2) % 7]) }
  }
  outlineNow(c)
  // linh khí quanh cánh
  if (P.wispCols && !o.noFx) {
    let prev = null
    for (let i = 0; i <= 1200; i++) {
      const s = i / 1200, p = at(s), tg = tan(s), n = [-tg[1] * outSign, tg[0] * outSign]
      const off = Math.sin(s * 9 - o.ph) * (o.held ? 6 : 8)
      if (Math.abs(off) < Bw.hw * k + 1.8) { prev = null; continue }
      const X = Math.round(p[0] + n[0] * off), Y = Math.round(p[1] + n[1] * off)
      if (prev && (prev[0] !== X || prev[1] !== Y)) c.px(X, Y, P.wispCols[Math.floor(s * 20 + 70 - o.ph) % P.wispCols.length])
      prev = [X, Y]
    }
  }
  if (!o.held && t === 4) { star(c, 52, 10, '#fff3b0', true); star(c, 14, 30, '#fff3b0') }
  if (!o.held && t === 5) { star(c, 52, 10, '#ff7ae0', true); star(c, 14, 30, '#5ab8ff'); star(c, 44, 56, '#ffe865') }
}

// ================================================================ QUẠT (xòe nửa vòng, tranh vẽ trên mặt quạt theo cấp)
const FAN_LEAF = [
  ['#c8b48a', '#e6d6b0', '#2a2418'],   // giấy dó + mực
  ['#2f8a62', '#5fc89a', '#e8fff2'],
  ['#c8d8f4', '#ffffff', '#5a7ad8'],
  ['#a8202a', '#d8402a', '#ffd06a'],
  ['#e8ecf6', '#ffffff', '#e8b440'],
  ['#1a1438', '#2e2456', '#c8b8ff'],
]
function fanArt(t, an, rn, x, y) {
  // an: 0..1 từ trái sang phải, rn: 0 (trong) .. 1 (mép trên)
  const L = FAN_LEAF[t]
  switch (t) {
    case 0: { const d = Math.abs(rn - 0.35 - an * 0.4); if (an > 0.15 && an < 0.6 && d < 0.04) return L[2]; if (an > 0.3 && an < 0.5 && Math.abs(rn - 0.7 + (an - 0.3) * 1.5) < 0.05) return L[2]; return null }   // nét trúc mực
    case 1: { const m = 0.18 + 0.22 * Math.abs(Math.sin(an * 7.5)) * (1 - Math.abs(an - 0.5)); if (rn < m) return '#1a5a3c'; if (rn < m + 0.08) return '#2f8a62'; if (Math.hypot(an - 0.72, rn - 0.68) < 0.06) return L[2]; return null }   // núi xanh + trăng
    case 2: { const cl = Math.sin(an * 18) * 0.06; if (Math.abs(rn - 0.45 - cl) < 0.05 || Math.abs(rn - 0.7 + cl) < 0.04 && an > 0.3 && an < 0.85) return L[2]; return null }   // mây xanh lam
    case 3: { const fl = 0.25 + 0.3 * Math.sin(an * 22) ** 2 * (1 - Math.abs(an - 0.5) * 1.2); if (rn < fl - 0.1) return '#ffd06a'; if (rn < fl) return '#ff8a2a'; return null }   // ngọn lửa
    case 4: { const d = Math.hypot((an - 0.5) * 2.2, rn - 0.35); if (d < 0.22) return d < 0.14 ? '#fff6c8' : L[2]; if (rn > 0.35 && Math.floor(an * 24) % 2 === 0 && rn < 0.85) return '#fff2b0'; return null }   // mặt trời + tia
    case 5: { const h = hash(x, y); if (h > 0.93) return '#ffffff'; if (h > 0.86) return '#c8b8ff'; const g = Math.abs(rn - 0.5 - 0.2 * Math.sin(an * 6)); if (g < 0.08) return '#6a58c0'; return null }   // dải ngân hà
  }
  return null
}
function drawFan(c, t, o) {
  const P = TIER[t], L = FAN_LEAF[t], k = o.k ?? 1
  const [px, py] = o.pivot, R0 = o.r0, R1 = o.r1, A0 = -172, A1 = -8, folds = o.folds ?? 12
  paintXY(c, (x, y) => {
    const dx = x - px, dy = y - py, r = Math.hypot(dx, dy)
    let a = Math.atan2(dy, dx) * 180 / Math.PI
    if (a < A0 || a > A1) return null
    const an = (a - A0) / (A1 - A0), fi = an * folds, fpos = fi - Math.floor(fi)
    const top = R1 - 0.9 * k * Math.sin(fpos * Math.PI)                       // mép trên gợn theo nếp gấp
    if (r > top) return null
    const edgeStick = an < 0.035 || an > 0.965
    if (r < R0) {                                                            // nan quạt lộ ra phía dưới
      if (edgeStick) return P.guard[1]
      return Math.abs(fpos - 0.5) < 0.22 && r > 2.2 * k ? (fpos < 0.5 ? P.wood[2] : P.wood[1]) : null
    }
    if (edgeStick) return an < 0.035 ? P.guard[2] : P.guard[1]                // nan cái (2 thanh ngoài cùng)
    if (r > top - 1.1 * k) return t >= 3 ? P.guard[2] : t === 5 ? RAINBOW[Math.floor(an * 14) % 7] : L[0]   // viền mép
    const art = fanArt(t, an, (r - R0) / (R1 - R0), x, y)
    const shade = fpos < 0.5                                                  // nếp sáng / tối xen kẽ
    if (art) return art
    if (t === 5 && r > top - 1.1 * k) return RAINBOW[Math.floor(an * 14) % 7]
    return shade ? L[1] : L[0]
  })
  // đinh trục
  c.circ(Math.round(px), Math.round(py), Math.max(1, Math.round(2.2 * k)), P.guard[1]); c.px(Math.round(px), Math.round(py), P.gem ?? P.guard[2])
  if (o.hand) o.hand(c)
  outlineNow(c)
  if (P.tassel && o.tassel !== false) tassel(c, Math.round(px), Math.round(py + 2.5 * k), P.tassel, Math.round(8 * k), o.ph, t === 5)
  if (P.wispCols) {   // linh khí bay vòng trên mép quạt
    let prev = null
    for (let a = A0 - 6; a < A1 + 6; a += 0.5) {
      const rr = R1 + 3.5 * k + Math.sin(a * 0.09 - o.ph) * 2.5 * k, r2 = a * Math.PI / 180
      const X = Math.round(px + Math.cos(r2) * rr), Y = Math.round(py + Math.sin(r2) * rr)
      if (Math.sin(a * 0.05 - o.ph * 0.5) < -0.2) { prev = null; continue }
      if (prev && (prev[0] !== X || prev[1] !== Y)) c.px(X, Y, P.wispCols[Math.floor((a + 200) / 12) % P.wispCols.length])
      prev = [X, Y]
    }
  }
  if (!o.held && t === 4) { star(c, 56, 12, '#fff3b0', true); star(c, 8, 18, '#fff3b0') }
  if (!o.held && t === 5) { star(c, 56, 12, '#ff7ae0', true); star(c, 8, 18, '#5ab8ff') }
}

// ================================================================ Y PHỤC (đạo bào nhìn thẳng, 50x50)
// R: vải ngoài (tối→sáng 4) · I: áo trong · T: viền (tối, sáng) · belt: đai · pat: hoa văn
const ROBE = [
  { R: ['#3e2e1e', '#5e4630', '#806246', '#9c7e5c'], I: ['#bba987', '#d8c8a4'], T: ['#4a3624', '#6e5238'], belt: ['#5a4632', '#8a7050'], pat: 'patch' },
  { R: ['#123e2c', '#1f6046', '#2f8a62', '#4fb084'], I: ['#e0f2e8', '#ffffff'], T: ['#0e2e22', '#7ff0c0'], belt: ['#0f3d2e', '#5fe0a8'], pat: 'cloudhem', gem: '#7ff0c0' },
  { R: ['#7c8cb4', '#aebee0', '#d8e4f8', '#ffffff'], I: ['#5a74ae', '#8ea4cc'], T: ['#2a3a7a', '#7fb8ff'], belt: ['#2a3a7a', '#b8d0ff'], pat: 'clouds', gem: '#8fe4f8', sash: ['#cfe0ff', '#ffffff'] },
  { R: ['#4a0e14', '#7a1a20', '#a8282a', '#d0403a'], I: ['#ffd06a', '#fff2b0'], T: ['#8a5e14', '#ffd06a'], belt: ['#6a1a14', '#ffb04a'], pat: 'flames', gem: '#ff3a2a', pauldron: true },
  { R: ['#a8aec4', '#dfe3f0', '#f6f8ff', '#ffffff'], I: ['#f2c85a', '#fff2b0'], T: ['#a8761c', '#f2c85a'], belt: ['#a8761c', '#fff2b0'], pat: 'sun', gem: '#fffbe0', sash: ['#f2c85a', '#fff3b0'], halo: true },
  { R: ['#0c0a1a', '#18122e', '#2e2456', '#4a3d7a'], I: ['#c8b8ff', '#ffffff'], T: ['#3a2a6a', '#c8b0ff'], belt: ['#2a1e5a', '#d8c8ff'], pat: 'stars', taiji: true, sash: RAINBOW },
]
function drawRobe(c, t) {
  const D = ROBE[t], R = D.R, cx = 25
  if (D.halo) for (let a = 0; a < TAU; a += 0.02) { const x = Math.round(cx + Math.cos(a) * 15), y = Math.round(15 + Math.sin(a) * 11); if (y < 14) c.px(x, y, a % 0.5 < 0.25 ? '#f2c85a' : '#fff3b0') }
  // dải lụa (phi bạch) vắt sau vai, buông hai bên tay áo
  if (D.sash) {
    for (let x = 4; x <= 46; x += 0.25) {
      const dx = x - cx, y = 9 - 5 * Math.cos(dx / 21 * Math.PI / 2)
      const col = D.sash.length > 2 ? D.sash[Math.floor((x - 4) / 6) % D.sash.length] : D.sash[Math.floor(x) % 2]
      c.px(Math.round(x), Math.round(y), col); c.px(Math.round(x), Math.round(y) + 1, D.sash[0])
    }
    for (const sx of [4, 46]) for (let y = 9; y < 46; y++) { const g = sx < cx ? 1 : -1, x = Math.round(sx + Math.sin(y * 0.3) * 1.6 * g); c.px(x, y, D.sash.length > 2 ? D.sash[y % 7] : D.sash[1]); c.px(x + g, y, D.sash[0]) }
  }
  paintXY(c, (x, y) => {
    const dx = x - cx, ax = Math.abs(dx)
    const bw = 8.5 + Math.max(0, y - 27) * 0.22
    const yt = 9 + Math.max(0, ax - 7.5) * 0.12, yb = 27.5 + Math.max(0, ax - 7.5) * 0.32
    const inSleeve = ax >= 7.5 && ax <= 23 && y >= yt && y <= yb - (ax > 21.5 && y > yb - 1.5 ? 1 : 0)
    const inBody = ax <= bw && y >= 8 && y <= 46
    const inNeck = y >= 6 && y < 8 && ax <= 6.5
    if (!inSleeve && !inBody && !inNeck) return null
    const lit = dx < 0
    if (inSleeve && ax > bw) {
      if (ax > 20.8) return lit ? D.T[1] : D.T[0]                          // cổ tay áo
      if (y < yt + 1.2) return lit ? R[3] : R[2]                            // mép vai bắt sáng
      if (D.pat === 'clouds' && Math.abs(y - (yb - 4.5) - Math.sin(ax * 0.9) * 1.1) < 0.6) return '#7fa4e0'
      if (D.pat === 'flames' && y > yb - 6 && (y - (yb - 6)) > 4 * Math.abs(Math.sin(ax * 0.8))) return '#ffb04a'
      if (D.pat === 'stars' && hash(x, y) > 0.95) return '#ffffff'
      if (D.pat === 'cloudhem' && Math.abs(y - (yb - 3) - Math.sin(ax * 0.9) * 1.1) < 0.55) return D.T[1]
      if (y > yb - 1.2) return R[0]                                         // mép dưới tay áo (bóng)
      const fold = Math.abs(((ax - 9) % 4.5) - 2.25) < 0.45 && y > yt + 5     // nếp vải rủ
      return fold ? R[lit ? 2 : 0] : R[lit ? 3 : 1]
    }
    if (y > 44) return lit ? D.T[1] : D.T[0]                                // gấu áo
    if (y >= 25 && y <= 28) {                                               // đai lưng
      if (D.taiji && Math.hypot(dx, y - 26.5) < 2.4) { const top = y < 26.5; return (dx < 0) !== top ? '#f4f0ff' : '#140e2a' }
      if (D.gem && Math.hypot(dx, y - 26.5) < 1.7) return D.gem
      return y < 26 ? D.belt[1] : D.belt[0]
    }
    if (y > 28 && y < 38 && (Math.abs(dx - 1.6) < 0.7 || Math.abs(dx + 0.6) < 0.7) && y < 38 - Math.abs(dx) * 0.4) return D.belt[1]   // dải thắt đai buông
    const lapA = dx - (-4.6 + (y - 7) * 0.52), lapB = dx - (4.6 - (y - 7) * 0.5)
    if (y < 25 && Math.abs(lapA) < 1.1) return D.T[1]                        // viền vạt trên
    if (y < 17 && Math.abs(lapB) < 1.0 && lapA < 0) return D.T[0]            // viền vạt dưới
    if (y < 25 && lapA < -1 && lapB > 1) return y < 17 ? D.I[1] : D.I[0]     // áo trong
    if (D.pat === 'sun' && Math.hypot(dx + 4.5, y - 18) < 2.6) return Math.hypot(dx + 4.5, y - 18) < 1.3 ? '#fff6c8' : '#f2c85a'
    if (D.pat === 'cloudhem' && y > 38 && Math.abs(y - 41 - Math.sin(dx * 0.8) * 1.2) < 0.55) return D.T[1]
    if (D.pat === 'clouds' && y > 34 && Math.abs(y - 39 - Math.sin(dx * 0.7) * 1.5) < 0.6) return '#7fa4e0'
    if (D.pat === 'flames' && y > 34 && (y - 34) > 7 * Math.abs(Math.sin(dx * 0.5))) return y > 40 ? '#ffd06a' : '#ff8a2a'
    if (D.pat === 'stars' && hash(x, y) > 0.95) return hash(y, x) > 0.5 ? '#ffffff' : '#c8b8ff'
    if (D.pat === 'patch' && Math.hypot(dx - 4.5, y - 36) < 2.2) return R[3]
    if (y > 28 && Math.abs(dx - 2.5) < 0.45) return R[0]                     // đường vạt dưới đai
    return dx < -5.5 ? R[3] : dx > 5.5 ? R[1] : R[2]
  })
  if (D.pauldron) for (const sg of [-1, 1]) paintXY(c, (x, y) => { const dx = (x - 25) * sg; const e = ((dx - 11.5) / 5.5) ** 2 + ((y - 10) / 3.6) ** 2; if (e > 1) return null; return y < 8.6 ? '#ffd06a' : e > 0.6 ? '#8a5e14' : '#e8a93a' })
  outlineNow(c)
  if (t === 4) { star(c, 43, 4, '#fff3b0', true); star(c, 7, 40, '#fff3b0') }
  if (t === 5) { star(c, 43, 4, '#ff7ae0', true); star(c, 7, 40, '#5ab8ff') }
}

// ================================================================ GIÀY (một đôi nhìn nghiêng, mũi cong; 50x50)
const SHOE = [
  { R: ['#5a4428', '#8a6c40', '#b8975e', '#d8bc82'], T: ['#4a3624', '#6e5238'], sole: ['#3a2a1a', '#5a4428'], h: 12, straw: true },
  { R: ['#123e2c', '#1f6046', '#2f8a62', '#4fb084'], T: ['#0e2e22', '#7ff0c0'], sole: ['#c8d8d0', '#ffffff'], h: 24, gem: '#7ff0c0' },
  { R: ['#7c8cb4', '#aebee0', '#d8e4f8', '#ffffff'], T: ['#2a3a7a', '#7fb8ff'], sole: ['#c8d8f4', '#ffffff'], h: 22, cloud: true, gem: '#8fe4f8' },
  { R: ['#4a0e14', '#7a1a20', '#a8282a', '#d0403a'], T: ['#8a5e14', '#ffd06a'], sole: ['#2a0a0a', '#5a1414'], h: 26, greave: true, gem: '#ff3a2a' },
  { R: ['#a8aec4', '#dfe3f0', '#f6f8ff', '#ffffff'], T: ['#a8761c', '#f2c85a'], sole: ['#e8b440', '#fff2b0'], h: 24, wing: true, gem: '#fffbe0' },
  { R: ['#0c0a1a', '#18122e', '#2e2456', '#4a3d7a'], T: ['#3a2a6a', '#c8b0ff'], sole: null, h: 25, stars: true, gem: '#e0d0ff' },
]
function pip(px, py, pts) { let ins = false; for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins } return ins }
function drawShoes(c, t) {
  const D = SHOE[t], R = D.R
  const H = D.h
  // dáng ủng (gốc = gót dưới): ống cao, mu dốc, mũi hếch cong
  const shape = [0, -H, 10, -H, 10.6, -10, 15, -7.4, 20.5, -5, 23, -5.6, 25.4, -8.6, 26.6, -8, 25.6, -3.6, 23.5, 0, 0, 0]
  const boot = (ox, oy, back) => paintXY(c, (x, y) => {
    const X = x - ox, Y = y - oy, dk = back ? 1 : 0
    if (Y > 0 && Y <= 2.8 && X >= -0.6 && X <= 24) { if (!D.sole) return RAINBOW[Math.floor((X + 1) / 3.6) % 7]; return Y < 1.5 ? D.sole[1] : D.sole[0] }   // đế dày
    if (!pip(X, Y, shape)) return null
    if (Y < -H + 2.6) return D.T[1 - dk]                                   // viền miệng ống
    if (X > 22.5 && Y < -4) return D.T[1 - dk]                             // mũi hếch bọc viền
    if (D.straw) return (Math.floor(X * 0.9) + Math.floor(Y * 0.9)) % 2 ? R[2 - dk] : R[1 - dk]
    if (D.greave && X > 5 && Y < -10 && Y > -H + 3) return (Math.floor(Y) % 4 === 0) ? D.T[0] : X < 7 ? D.T[1] : '#e8a93a'
    if (D.gem && Math.hypot(X - 15.5, Y + 4.4) < 1.4) return D.gem
    if (D.cloud && X > 4 && Math.abs(Y + 2.4 - Math.sin(X * 0.9) * 0.8) < 0.5) return '#7fa4e0'
    if (D.stars && hash(x, y) > 0.95) return '#ffffff'
    if (Math.abs(X - 10.3 + (Y + 10) * 0.05) < 0.5 && Y < -10.5) return R[0]                  // đường may ống
    if (Y > -2.2 && X > 1) return R[1 - dk]                                                 // bóng sát đế
    if (X < 2.4) return R[3 - dk]                                                           // gót bắt sáng
    if (Y < -6 && X < 10 && X > 7.5) return R[1 - dk]                                       // bóng phía trước ống
    return R[2 - dk]
  })
  boot(17, 40, true)
  boot(8, 45, false)
  if (D.wing) for (const [ox, oy] of [[8, 45], [17, 40]]) for (let j = 0; j < 4; j++) for (let a = 0; a < 9 - j * 1.6; a += 0.4) c.px(Math.round(ox - 1 - a * 0.8), Math.round(oy - 11 - j * 2.2 - a * 0.45), j % 2 ? '#fff2b0' : '#f2c85a')
  outlineNow(c)
  if (D.cloud) { c.hline(33, 48, 9, '#e0ecff'); c.hline(35, 47, 5, '#ffffff'); c.hline(3, 48, 7, '#e0ecff'); c.hline(4, 47, 4, '#ffffff') }
  if (t === 3) for (const [x, y] of [[38, 28], [42, 33], [35, 22]]) { c.px(x, y, '#ffd06a'); c.px(x, y - 1, '#ff6a2a') }
  if (t === 4) { star(c, 43, 8, '#fff3b0', true); star(c, 38, 20, '#fff3b0') }
  if (t === 5) { star(c, 43, 8, '#ff7ae0', true); star(c, 38, 20, '#5ab8ff'); for (let i = 0; i < 9; i++) c.px(38 + i, 30 - Math.round(i * 0.6), RAINBOW[i % 7]) }
}

// ================================================================ TRANG SỨC (ngọc bội treo dây, 50x50)
const PEND = [
  { cord: ['#6a4428', '#946238'], tas: ['#6a4428', '#946238'] },
  { cord: ['#8a1a1c', '#d83a30'], tas: ['#167a52', '#3fd08e'] },
  { cord: ['#2a3a7a', '#7fb8ff'], tas: ['#a8b8e0', '#ffffff'] },
  { cord: ['#6a1a14', '#c8402a'], tas: ['#b81e24', '#ff6a3a'] },
  { cord: ['#a8761c', '#f2c85a'], tas: ['#e8b440', '#fff2b0'] },
  { cord: ['#3a2a6a', '#c8b0ff'], tas: ['#7a5ad8', '#ff7ae0'] },
]
function drawPendant(c, t) {
  const D = PEND[t], cx = 25
  // dây treo hình giọt + nút thắt
  for (let a = 0; a < TAU; a += 0.03) { const x = Math.round(cx + Math.sin(a) * 4), y = Math.round(7 - Math.cos(a) * 4.5); if (y < 10) c.px(x, y, D.cord[a < Math.PI ? 1 : 0]) }
  c.rect(cx - 2, 10, 5, 3, D.cord[1]); c.px(cx, 11, '#ffffff'); c.vline(cx, 13, 2, D.cord[0])
  const body = {
    0: (x, y) => { const dx = x - cx, dy = y - 25; if (Math.abs(dx) > 8 || Math.abs(dy) > 10 || (Math.abs(dx) > 6.5 && Math.abs(dy) > 8.5)) return null   // thẻ gỗ khắc chữ
      if (Math.abs(dx) > 6.6 || Math.abs(dy) > 8.6) return '#5a3a20'
      if ((Math.abs(dx) < 3.2 && [-4, 0, 4].some((v) => Math.abs(dy - v) < 0.6)) || (Math.abs(dx) < 0.6 && Math.abs(dy) < 6)) return '#3a2416'
      return dx < -3 ? '#b88a58' : dx > 4 ? '#7a5434' : '#9a7044' },
    1: (x, y) => { const r = Math.hypot(x - cx, y - 26); if (r > 10 || r < 3.4) return null                                                     // ngọc bích (bi)
      if (Math.abs(r - 6.8) < 0.5 && Math.floor(Math.atan2(y - 26, x - cx) * 3) % 2) return '#1f8a62'
      const l = (x - cx) + (y - 26); return r > 9 || r < 4.2 ? (l < 0 ? '#5fe0a8' : '#1f6046') : l < -4 ? '#b4f0d0' : l > 5 ? '#2f8a62' : '#4fb084' },
    2: (x, y) => { const dx = x - cx, dy = y - 26                                                                                           // mây như ý bạc
      const lobes = [[0, -4, 5], [-5.5, 0.5, 4.2], [5.5, 0.5, 4.2], [0, 4, 4.4], [-3, 7, 2.6], [3, 7, 2.6]]
      const d = Math.min(...lobes.map(([lx, ly, r]) => Math.hypot(dx - lx, dy - ly) - r)); if (d > 0) return null
      if (Math.hypot(dx, dy) < 2.2) return Math.hypot(dx, dy) < 1 ? '#ffffff' : '#8fe4f8'
      if (d > -0.9) return dx + dy < 0 ? '#ffffff' : '#7486a8'
      if (lobes.some(([lx, ly, r]) => Math.abs(Math.hypot(dx - lx, dy - ly) - r * 0.55) < 0.45)) return '#98b2e2'
      return dx + dy < 0 ? '#e0ecff' : '#b8c8e6' },
    3: (x, y) => { const dx = x - cx, dy = y - 27; if (Math.abs(dx) > 8 || dy < -9 || dy > 8) return null                                      // ấn vàng có núm sư tử
      if (dy < -4) { const kn = Math.hypot(dx, dy + 6.5) < 3.4; if (!kn) return null; return dx < 0 ? '#ffe08a' : '#a8681c' }
      if (dy > 5) return '#5a1a10'
      if (Math.abs(dx) < 4.6 && dy > -2 && dy < 4 && (Math.abs(dx) > 3.4 || Math.abs(dy - 1) > 2.4 || Math.abs(dx) < 0.6 || Math.abs(dy - 1) < 0.5)) return '#ff3a2a'   // chữ đỏ
      return dx < -4 ? '#ffe08a' : dx > 4 ? '#a8681c' : '#e8a93a' },
    4: (x, y) => { const dx = x - cx, dy = y - 26, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx)                                            // đĩa nhật quang bạch ngọc
      if (r < 6.5) return r < 2.2 ? '#fff6c8' : dx + dy < -3 ? '#ffffff' : dx + dy > 3 ? '#c3c8d8' : '#eef1f8'
      if (r < 7.6) return '#e8b440'
      const ray = Math.abs(((a / TAU * 12) % 1 + 1) % 1 - 0.5) < 0.18 && r < 11.5 - Math.abs(Math.sin(a * 6)) * 0.5
      return ray ? (r > 10 ? '#fff2b0' : '#f2c85a') : null },
    5: (x, y) => { const dx = x - cx, dy = y - 26, r = Math.hypot(dx, dy)                                                                   // châu hỗn độn: thái cực trong cầu sao
      if (r > 7.6) return null
      if (r > 6.6) return RAINBOW[Math.floor((Math.atan2(dy, dx) + Math.PI) / TAU * 14) % 7]
      const R0 = 5.5, top = Math.hypot(dx, dy + R0 / 2) < R0 / 2, bot = Math.hypot(dx, dy - R0 / 2) < R0 / 2
      if (r < R0) { if (Math.hypot(dx, dy + R0 / 2) < 1) return '#140e2a'; if (Math.hypot(dx, dy - R0 / 2) < 1) return '#f4f0ff'; return top ? '#f4f0ff' : bot ? '#140e2a' : dx < 0 ? '#f4f0ff' : '#140e2a' }
      return hash(x, y) > 0.7 ? '#ffffff' : '#3a2e6e' },
  }[t]
  paintXY(c, (x, y) => body(Math.floor(x), Math.floor(y)) )
  outlineNow(c)
  // vòng quỹ đạo (Đạo) + tua buông
  if (t === 5) for (let a = 0; a < TAU; a += 0.02) { const x = Math.round(cx + Math.cos(a) * 12), y = Math.round(26 + Math.sin(a) * 3.5); if (Math.sin(a) > -0.1 || Math.abs(Math.cos(a)) > 0.62) c.px(x, y, RAINBOW[Math.floor(a * 2.2) % 7]) }
  tassel(c, cx, t === 3 ? 35 : t === 0 ? 35 : 36, D.tas, 9, 0, t === 5)
  if (t === 4) { star(c, 40, 8, '#fff3b0', true); star(c, 10, 38, '#fff3b0') }
  if (t === 5) { star(c, 40, 8, '#ff7ae0', true); star(c, 10, 38, '#5ab8ff') }
}

// ================================================================ BÍ BẢO (12 món, 50x50)
/** Cầu tròn có khối: sáng trên-trái, tối dưới-phải, đốm phản quang */
function orb(c, cx, cy, r, cols, extra) {
  paintXY(c, (x, y) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy)
    if (d > r) return null
    const ex = extra && extra(dx, dy, d, x, y); if (ex) return ex
    if (Math.hypot(dx + r * 0.38, dy + r * 0.42) < r * 0.18) return '#ffffff'
    const l = (dx + dy) / r + d / r * 0.6
    return l < -0.6 ? cols[3] : l < 0.1 ? cols[2] : l < 0.8 ? cols[1] : cols[0]
  })
}
const BB = {
  bb_w1_5(c) {   // Tụ Bảo La Bàn: la bàn đồng nhiều vòng, kim đỏ-lam
    paintXY(c, (x, y) => {
      const dx = x - 25, dy = y - 25, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx)
      if (r > 19) return null
      if (r > 17.4) return dx + dy < 0 ? '#ffd06a' : '#8a5a1c'
      if (r > 13.5) { if (Math.abs(((a / TAU * 24) % 1 + 1) % 1 - 0.5) < 0.12) return '#4a2e10'; return dx + dy < 0 ? '#e8b45a' : '#b88030' }   // vòng vạch quái
      if (r > 12.6) return '#5a3a14'
      if (r > 8) { if (Math.abs(((a / TAU * 8) % 1 + 1) % 1 - 0.5) < 0.2 && r > 9.5 && r < 11.5) return '#3a2410'; return dx + dy < 0 ? '#f4e2b0' : '#d8c08a' }
      if (r > 7.2) return '#8a5a1c'
      return dx + dy < 0 ? '#fff4d0' : '#e8d4a0'
    })
    for (let i = -10; i <= 10; i++) { const x = Math.round(25 + i * 0.6), y = Math.round(25 - i * 0.8); c.px(x, y, i > 0 ? '#e8282a' : '#2a5ad8'); if (Math.abs(i) < 7) c.px(x + 1, y, i > 0 ? '#ff6a4a' : '#5a8aff') }
    c.circ(25, 25, 1, '#ffd06a'); c.px(25, 25, '#ffffff')
  },
  bb_w1_10(c) {  // Dưỡng Nguyên Ngọc: ngọc bích tròn chứa xoáy sinh khí, đế gỗ
    paintXY(c, (x, y) => { const dx = x - 25, dy = y - 41; if (Math.abs(dx) > 11 - Math.max(0, dy) * 1.2 || dy < -1 || dy > 4) return null; return dy < 0.5 ? '#946238' : dx < 0 ? '#6a4428' : '#3a2416' })
    orb(c, 25, 25, 14, ['#0f4a32', '#1f8a62', '#4fc89a', '#b4f0d0'], (dx, dy, d) => { const a = Math.atan2(dy, dx) + d * 0.32; return Math.abs(Math.sin(a * 2)) < 0.12 && d > 3 && d < 12 ? '#e8fff2' : null })
  },
  bb_w2_5(c) {   // Hàn Hải Châu: ngọc trai băng, tinh thể sương quanh, sóng dưới
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, x0 = 25 + Math.cos(a) * 17, y0 = 24 + Math.sin(a) * 17; c.line(Math.round(x0), Math.round(y0), Math.round(25 + Math.cos(a) * 21), Math.round(24 + Math.sin(a) * 21), '#bfeaff', 1); c.px(Math.round(25 + Math.cos(a) * 21), Math.round(24 + Math.sin(a) * 21), '#ffffff') }
    paintXY(c, (x, y) => { const dy = y - (40 + Math.sin(x * 0.6) * 1.4); if (dy < 0 || dy > 4 || x < 8 || x > 42) return null; return dy < 1.2 ? '#e0f6ff' : '#3a8ad8' })
    orb(c, 25, 24, 13, ['#2a5ab0', '#5aa8e8', '#a8e0ff', '#eaf8ff'])
  },
  bb_w2_10(c) {  // Giao Nhân Lệ: giọt lệ ngọc xanh ngọc, bọt khí
    paintXY(c, (x, y) => {
      const dx = x - 25, dy = y - 30
      const inDrop = dy > 0 ? Math.hypot(dx, dy) < 12 : Math.abs(dx) < 12 * (1 + dy / 22) ** 1.6 && dy > -22
      if (!inDrop) return null
      const l = (dx + dy * 0.6) / 12
      if (Math.hypot(dx + 4.5, dy + 1) < 2.2) return '#ffffff'
      if (Math.abs(dx - 2 - Math.sin(dy * 0.4) * 2) < 0.6 && dy > -10 && dy < 8) return '#c8fff4'
      return l < -0.5 ? '#a8fff0' : l < 0.2 ? '#3fd8c8' : l < 0.8 ? '#1aa0a8' : '#0e6070'
    })
    for (const [x, y, r] of [[40, 14, 2], [9, 20, 1.5], [42, 30, 1]]) { c.ring(x, y, Math.round(r), '#a8fff0'); c.px(x - 1, y - 1, '#ffffff') }
  },
  bb_w3_5(c) {   // Tinh Lôi Tâm: cầu tím chứa tia sét vàng, tia điện quanh
    orb(c, 25, 25, 14, ['#2a145a', '#5a2ab0', '#9a5ae8', '#d8b8ff'], (dx, dy) => {
      const bolt = [[-2, -11], [3, -3], [-2, -1], [3, 10]]
      for (let i = 0; i < 3; i++) { const [x0, y0] = bolt[i], [x1, y1] = bolt[i + 1]; const t = clamp(((dx - x0) * (x1 - x0) + (dy - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2), 0, 1); const d = Math.hypot(dx - x0 - t * (x1 - x0), dy - y0 - t * (y1 - y0)); if (d < 0.8) return '#fff6c8'; if (d < 1.8) return '#ffd84a' }
      return null
    })
    for (const [x0, y0, x1, y1] of [[7, 12, 3, 16], [43, 34, 47, 30], [40, 9, 45, 6], [8, 38, 4, 42]]) { c.line(x0, y0, x1, y1, '#ffe865', 1); c.px(x1, y1, '#ffffff') }
  },
  bb_w3_10(c) {  // Huyền Tinh Hạch: tinh thể lục giác nhiều mặt + mảnh vụn bay
    const hex = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; hex.push(25 + Math.cos(a) * 12, 25 + Math.sin(a) * 16) }
    paintXY(c, (x, y) => {
      if (!pip(x, y, hex)) return null
      const dx = x - 25, dy = y - 25
      if (Math.hypot(dx, dy) < 4) return Math.hypot(dx, dy) < 2 ? '#ffffff' : '#a8f0ff'
      const face = dx < 0 ? (dy < -dx * 0.6 ? 0 : 1) : (dy < dx * 0.6 ? 2 : 3)
      return ['#a8d8ff', '#5a8ae0', '#7aaaf0', '#2a4ab0'][face]
    })
    for (const [x, y] of [[8, 10], [42, 12], [41, 40], [9, 38]]) { c.poly([x, y - 2, x + 2, y, x, y + 2, x - 2, y], '#7aaaf0'); c.px(x, y - 1, '#ffffff') }
  },
  bb_w4_5(c) {   // Thiên Binh Giáp Phiến: mảnh giáp vảy cá kim loại, viền vàng, vết nứt
    const shp = [9, 8, 41, 8, 41, 26, 25, 44, 9, 26]
    paintXY(c, (x, y) => {
      if (!pip(x, y, shp)) return null
      const dx = x - 25
      if (!pip(x, y, [11.5, 10.5, 38.5, 10.5, 38.5, 25, 25, 41, 11.5, 25])) return dx < 0 ? '#ffd06a' : '#a8761c'
      if (Math.abs(x - 30 - (y - 12) * 0.3) < 0.5 && y < 24 && y > 12) return '#3a3e4a'           // vết nứt
      const row = Math.floor((y - 10) / 5), off = row % 2 ? 2.5 : 0, cellX = ((x - 11 + off) % 5 + 5) % 5, cellY = (y - 10) % 5
      if (cellY < 0.9 || Math.hypot(cellX - 2.5, cellY - 5) > 3.6) return '#4a5060'               // vảy cá
      return cellX < 2 ? '#d8dce8' : '#9aa0b4'
    })
    c.circ(25, 22, 3, '#c8402a'); c.circ(25, 22, 1, '#ffd06a')
  },
  bb_w4_10(c) {  // Thanh Loan Vũ: lông vũ dài xanh lam-lục, mắt lông vũ
    const ax = axis(10, 44)
    paint(c, ax, (u, v, x, y) => {
      if (u < 0 || u > 46) return null
      const hw = u < 4 ? 0.8 : 7 * Math.sin(Math.min(1, (u - 4) / 40) * Math.PI) ** 0.7 + (u > 30 ? 1.2 : 0)
      if (Math.abs(v) > hw) return null
      if (Math.abs(v) < 0.6) return '#e8fff8'                                              // sống lông
      const eye = Math.hypot(u - 36, v)
      if (eye < 2) return '#1a2a6a'; if (eye < 3.4) return '#2fd0c0'; if (eye < 4.6) return '#ffd06a'
      const barb = Math.abs(((u + Math.abs(v) * 0.8) % 2.4) - 1.2) < 0.35
      return barb ? (v < 0 ? '#5ae8c8' : '#14705a') : (v < 0 ? '#2fb8a0' : '#1a8a7a')
    })
  },
  bb_w5_5(c) {   // Đại La Lệnh: lệnh bài vàng bo góc, ngọc đỏ, chữ khắc, tua
    paintXY(c, (x, y) => {
      const dx = x - 25, dy = y - 22
      const inT = Math.abs(dx) < 11 && dy > -14 && dy < 14 && !(Math.abs(dx) > 7 && dy < -10 && Math.hypot(Math.abs(dx) - 7, dy + 10) > 4)
      if (!inT) return null
      if (Math.abs(dx) > 9.6 || dy > 12.6 || (dy < -10 && Math.hypot(Math.abs(dx) - 7, dy + 10) > 2.6)) return dx < 0 ? '#ffe08a' : '#a8681c'
      if (Math.hypot(dx, dy + 6) < 3.2) return Math.hypot(dx, dy + 6) < 1.4 ? '#ffb0a0' : '#d8282a'
      if ((Math.abs(dx) < 4 && [1, 5].some((v) => Math.abs(dy - v) < 0.6)) || (Math.abs(dx) < 0.6 && dy > -1 && dy < 9) || (Math.abs(dx + 3) < 0.5 && dy > 5 && dy < 9)) return '#6a3a10'
      return dx < -4 ? '#ffd06a' : dx > 4 ? '#c88a28' : '#e8a93a'
    })
    tassel(c, 25, 36, ['#b81e24', '#ff6a3a'], 7, 0, false)
  },
  bb_w5_10(c) {  // Thượng Cổ Tàn Bi: mảnh bia đá vỡ, phù văn phát sáng, rêu
    const shp = [12, 6, 33, 4, 38, 10, 37, 22, 41, 30, 38, 44, 10, 44, 11, 30, 8, 20]
    paintXY(c, (x, y) => {
      if (!pip(x, y, shp)) return null
      if (Math.abs(x - 27 - (y - 4) * -0.25) < 0.5 && y < 20) return '#2a2a34'                      // vết nứt
      if (y > 40 && hash(x, y) > 0.4) return '#4a7a3a'                                              // rêu
      if (x > 14 && x < 33 && y > 12 && y < 38 && (Math.floor((x - 14) / 4) + Math.floor((y - 12) / 6)) % 3 === 0 && (x - 14) % 4 < 2.2 && (y - 12) % 6 < 3.5) return '#7fd8ff'   // phù văn
      return x < 16 ? '#a8a8b8' : x > 33 ? '#5a5a6a' : '#86869a'
    })
  },
  bb_w6_5(c) {   // Hỗn Độn Chi Tâm: hố xoáy đen, đĩa bồi tụ thất thải
    paintXY(c, (x, y) => {
      const dx = x - 25, dy = (y - 25) * 2.6, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx)
      if (r > 21 || r < 7) return null
      if (y - 25 < -1 && Math.hypot(x - 25, y - 25) < 9) return null
      const sp = Math.sin(a * 3 + r * 0.5)
      return sp > 0.4 ? RAINBOW[Math.floor((a + Math.PI) / TAU * 7 + r * 0.1) % 7] : sp > -0.3 ? '#6a4ac0' : '#2a1e5a'
    })
    orb(c, 25, 25, 8, ['#000000', '#0a0818', '#1c1638', '#3a2e6e'], (dx, dy, d) => (d > 7 ? '#c8b0ff' : null))
    paintXY(c, (x, y) => { const dx = x - 25, dy = (y - 25) * 2.6, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (y - 25 < 0.5 || r > 21 || r < 9) return null; const sp = Math.sin(a * 3 + r * 0.5); return sp > 0.4 ? RAINBOW[Math.floor((a + Math.PI) / TAU * 7 + r * 0.1) % 7] : sp > -0.3 ? '#6a4ac0' : '#2a1e5a' })
  },
  bb_w6_10(c) {  // Đạo Tổ Ấn: ấn ngọc vàng, đáy khắc thái cực, núm rồng cuộn
    paintXY(c, (x, y) => {
      const dx = x - 25
      if (y >= 22 && y <= 42 && Math.abs(dx) <= 13) {                                     // thân ấn
        if (y > 39) return dx < 0 ? '#c88a28' : '#8a5a14'
        if (Math.abs(dx) > 11.5) return dx < 0 ? '#ffe08a' : '#a8681c'
        const tx = dx, ty = y - 31, r = Math.hypot(tx, ty)
        if (r < 6.5) { const R0 = 6.5, top = Math.hypot(tx, ty + R0 / 2) < R0 / 2, bot = Math.hypot(tx, ty - R0 / 2) < R0 / 2; if (Math.hypot(tx, ty + R0 / 2) < 1.1) return '#140e2a'; if (Math.hypot(tx, ty - R0 / 2) < 1.1) return '#fff6e0'; return top ? '#fff6e0' : bot ? '#140e2a' : tx < 0 ? '#fff6e0' : '#140e2a' }
        if (r < 7.4) return '#ffd06a'
        return dx < -4 ? '#7fe0b0' : dx > 4 ? '#2f8a62' : '#4fb084'
      }
      // núm rồng cuộn
      const kx = dx, ky = y - 15, r = Math.hypot(kx, ky * 1.2)
      if (r < 8 && y < 22.5) { const a = Math.atan2(ky, kx) + r * 0.5; if (Math.sin(a * 2) > 0.2) return kx < 0 ? '#ffe08a' : '#c88a28'; return '#8a5a14' }
      return null
    })
    for (let a = 0; a < TAU; a += 0.02) { const x = Math.round(25 + Math.cos(a) * 21), y = Math.round(27 + Math.sin(a) * 19); if (Math.sin(a * 5) > 0.3) c.px(x, y, RAINBOW[Math.floor(a * 2.2) % 7]) }
  },
}
const BB_TIER = { bb_w1_5: 0, bb_w1_10: 0, bb_w2_5: 1, bb_w2_10: 1, bb_w3_5: 2, bb_w3_10: 2, bb_w4_5: 3, bb_w4_10: 3, bb_w5_5: 4, bb_w5_10: 4, bb_w6_5: 5, bb_w6_10: 5 }

// ---------------------------------------------------------------- xuất hình ô đồ (66x66)
const ICON = { w: 66, h: 66 }
const GLOW = (t) => (t >= 3 ? [glow('w', { r: 3, strength: 0.5, bands: 2, color: t === 5 ? 'v' : 'y' })] : [])
for (let t = 0; t < 6; t++) {
  sprite(`wp_sword_${t}`, ICON, (c) => drawSword(c, t, { ax: axis(7, 57), ph: 0 }), ...GLOW(t))
  sprite(`wp_blade_${t}`, ICON, (c) => drawBlade(c, t, { ax: axis(8, 56), ph: 0 }), ...GLOW(t))
  sprite(`wp_spear_${t}`, ICON, (c) => drawSpear(c, t, { ax: axis(3, 61), ph: 0, shaft: 52 }), ...GLOW(t))
  sprite(`wp_fist_${t}`, ICON, (c) => drawFist(c, t, { ax: axis(9, 55, 1.15), ph: 0 }), ...GLOW(t))
  sprite(`wp_bow_${t}`, ICON, (c) => drawBow(c, t, { pts: [[9, 10], [22, 44], [56, 57]], ph: 0 }), ...GLOW(t))
  sprite(`wp_fan_${t}`, ICON, (c) => drawFan(c, t, { pivot: [33, 46], r0: 11, r1: 30, ph: 0 }), ...GLOW(t))
  sprite(`clothes_${t}`, { w: 50, h: 50 }, (c) => drawRobe(c, t), ...GLOW(t))
  sprite(`shoes_${t}`, { w: 50, h: 50 }, (c) => drawShoes(c, t), ...GLOW(t))
  sprite(`accessory_${t}`, { w: 50, h: 50 }, (c) => drawPendant(c, t), ...GLOW(t))
}
for (const [id, fn] of Object.entries(BB)) sprite(id, { w: 50, h: 50 }, (c) => { fn(c); outlineNow(c) }, ...GLOW(BB_TIER[id]))

// ================================================================ HÌNH CẦM TAY (hiện cùng nhân vật ở Hành Trang)
// Đơn giản hơn hình ô đồ: bỏ sao lấp lánh / mây / tàn lửa rời; giữ dáng, màu, hộ thủ, ngọc, tua.
// Mỗi hình là dải 8 khung ngang (1 giây): linh khí chạy dọc thân (cấp Thần trở lên) và tua lay.
// Điểm cầm (nắm tay) ghi trong WEAPON_HOLD (src/config/items.ts) — đổi kích thước / gốc ở đây thì sửa theo.
const HELD = { frames: 8, fps: 8 }
const ph = (c) => (c.frame / HELD.frames) * TAU
for (let t = 0; t < 6; t++) {
  // kiếm / đao: cầm ngược (xoay 180°) — chuôi trên-phải trong tay, lưỡi chĩa xuống-trái; 48x52.
  // Điểm cầm ở phần TRÊN chuôi (u = 6.5 → (38,11)): dưới nắm tay còn lộ một đoạn chuôi rồi mới tới hộ thủ → nhìn ra là đang nắm.
  // Đao lật bên (mv = -1): lưỡi sắc quay xuống-phải (phía trước-dưới), sống ở trên.
  // Không vẽ tua khi cầm: đốc + tua nằm khuất sau thân.
  anim(`wp_sword_held_${t}`, { w: 48, h: 52, ...HELD }, (c) => drawSword(c, t, { ax: axis(42, 8, 0.7, -1), ph: ph(c), held: true }), ...GLOW(t))
  anim(`wp_blade_held_${t}`, { w: 48, h: 52, ...HELD }, (c) => drawBlade(c, t, { ax: axis(42, 8, 0.7, -1, -1), ph: ph(c), held: true }), ...GLOW(t))
  // thương: đốc trên-phải (sau vai), mũi dưới-trái; 82x82. Cầm GIỮA CÁN, cách khâu mũi 24 đơn vị (u = 62 → điểm cầm (39,41))
  anim(`wp_spear_held_${t}`, { w: 82, h: 82, ...HELD }, (c) => drawSpear(c, t, { ax: axis(79, 2, 0.9, -1), ph: ph(c), held: true, shaft: 86 }), ...GLOW(t))
  // cung xoay chéo: chuôi tại nắm tay; 64x56, điểm cầm (23,41)
  anim(`wp_bow_held_${t}`, { w: 64, h: 56, ...HELD }, (c) => drawBow(c, t, { pts: [[7, 7], [23, 41], [55, 47]], k: 0.72, ph: ph(c), held: true }), ...GLOW(t))
  // quạt nhỏ che ngực + bàn tay nắm cán; 34x26, trục quạt (17,21)
  anim(`wp_fan_held_${t}`, { w: 34, h: 26, ...HELD }, (c) => drawFan(c, t, {
    pivot: [17, 21], r0: 4.5, r1: 15, k: 0.5, folds: 9, ph: ph(c), held: true, tassel: false,
    hand: (c) => { c.rect(7, 20, 6, 3, '#262838'); c.hline(7, 20, 6, '#3a3c50'); c.rect(13, 19, 6, 4, '#f2cab0'); c.hline(13, 22, 6, '#c99a80'); c.px(18, 19, '#c99a80'); c.vline(15, 20, 2, '#c99a80') },
  }), ...GLOW(t))
  // quyền sáo: găng đeo trùm hai nắm tay (tĩnh) — near 13x13 tay gần, far 10x12 tay xa
  sprite(`wp_fist_near_${t}`, { w: 13, h: 13 }, (c) => knuckle(c, t, 11, 11, 1, 1))
  sprite(`wp_fist_far_${t}`, { w: 10, h: 12 }, (c) => knuckle(c, t, 8, 10, 1, 1))
}
/** Găng nhỏ trên nắm tay: ống cổ tay, phiến giáp mu, gai / vuốt đốt ngón nhô ra trước (bên trái) theo cấp */
function knuckle(c, t, w, h, ox, oy) {
  const P = TIER[t], B = P.B, A = P.guard, F = FIST[t]
  const X = (x) => ox + x, Y = (y) => oy + y
  c.rect(X(2), Y(0), w - 2, 3, A[1]); c.hline(X(2), Y(0), w - 2, A[2]); c.hline(X(2), Y(2), w - 2, A[0])
  c.rect(X(1), Y(3), w - 1, h - 3, B[1]); c.rect(X(2), Y(4), w - 4, 1, B[4]); c.vline(X(w - 2), Y(4), h - 5, B[2]); c.hline(X(2), Y(h - 1), w - 2, B[0])
  c.rect(X(3), Y(5), w - 6, h - 7, P.cosmos ? B[2] : B[3])
  if (P.gem) c.px(X(Math.floor(w / 2) + 1), Y(Math.floor(h / 2) + 1), P.gem)
  for (let y = 4; y < h - 1; y += 2) {
    c.px(X(1), Y(y), A[2])
    if (F.spike !== 'stud' || F.sl) c.px(X(0), Y(y), F.spike === 'flame' ? '#ffd06a' : P.cosmos ? RAINBOW[y % 7] : B[4])
  }
  if (t === 5) { c.px(X(3), Y(h - 2), RAINBOW[0]); c.px(X(5), Y(h - 2), RAINBOW[3]); c.px(X(w - 3), Y(1), RAINBOW[5]) }
  outlineNow(c)
}

// ================================================================ VŨ KHÍ TRONG TRẬN (góc nhìn top-down nghiêng, cầm tay phải)
// GIỮ ĐÚNG CÁCH CẦM Ở LOBBY: nắm chuôi, lưỡi / mũi chĩa chéo xuống ra phía ngoài — chỉ xoay theo hướng nhân vật.
// Mỗi món 1 dải 8 khung theo hướng (s, sw, w, nw, n, ne, e, se); ĐIỂM CẦM nằm đúng GIỮA khung.
// Góc (độ, 0 = phải, 90 = xuống) lấy theo các đường mẫu người dùng kẻ trên 8 hướng.
// Vị trí bàn tay theo hướng + khung bước: src/config/heroHands.ts (walk_battle.py).
const BATTLE_DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
const BATTLE_ANG = [126, 144, 160, 168, 32, 16, 40, 36]
// Thương: N / NE theo đường mẫu (cán chạy chéo qua LƯNG lên vai trái — nhìn từ sau lưng nên cán nằm TRƯỚC, thấy được)
const SPEAR_ANG = { n: 36, ne: 19 }
const SPEAR_WHOLE_FRONT = new Set(['n', 'ne'])
// Cung: GIỮ ĐỘ DÀI + ĐỘ CONG như lobby (dây ~36 điểm ảnh, bụng cung lồi ~9), CHUÔI (giữa thân cung) nằm đúng bàn tay;
// chỉ đổi hướng đặt theo tham khảo của người dùng: ang = hướng dây cung từ đầu cánh trên xuống đầu cánh dưới (độ),
// side = phía bụng cung lồi ra (+1 / −1 so với pháp tuyến (−sin, cos) của hướng dây). s / sw giữ cách cũ (cung lobby xoay).
const BOW_DIR = { w: { ang: 47, side: 1 }, nw: { ang: 36, side: 1 }, n: { ang: 111, side: -1 }, ne: { ang: 126, side: -1 }, e: { ang: 144, side: -1 }, se: { ang: 157, side: -1 } }
const BOW_LEN = 36, BOW_BULGE = 9
function bowPts(C, ang, side) {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * side, ny = dx * side
  const mx = C - nx * BOW_BULGE, my = C - ny * BOW_BULGE                    // giữa dây cung (chuôi ở C, lồi ra một đoạn)
  return [[mx - dx * BOW_LEN / 2, my - dy * BOW_LEN / 2], [C, C], [mx + dx * BOW_LEN / 2, my + dy * BOW_LEN / 2]]
}
function drawFanClosed(c, t, ax) {
  const P = TIER[t], L = FAN_LEAF[t]
  paint(c, ax, (u, v, x, y) => {
    if (u < 0 || u > 20) return null
    const hw = 1.0 + u * 0.075 - (u > 18.5 ? (u - 18.5) * 0.8 : 0)
    if (Math.abs(v) > hw) return null
    if (Math.abs(v) > hw - 0.7) return v < 0 ? P.guard[2] : P.guard[1]               // nan cái hai bên
    if (u > 15) return t === 5 ? RAINBOW[Math.floor(u * 2) % 7] : L[2]               // đầu quạt có màu tranh
    return Math.floor((v + 5) * 1.6) % 2 ? L[1] : L[0]                              // nếp gấp
  })
  const [px, py] = ax.xy(0.6, 0)
  c.circ(Math.round(px), Math.round(py), 1, P.guard[1]); c.px(Math.round(px), Math.round(py), P.gem ?? P.guard[2])
  outlineNow(c)
}
/** Trục đặt sao cho điểm u = ug nằm giữa khung (C, C); mv: lật bên để lưỡi đao luôn quay xuống */
const gripAxis = (C, k, deg, ug) => {
  const a = (deg * Math.PI) / 180, mv = Math.cos(a) < 0 ? -1 : 1
  return axisA(C - Math.cos(a) * ug * k, C - Math.sin(a) * ug * k, k, deg, mv)
}
/** Giữ một nửa hình theo đường vuông góc với góc cầm đi qua tâm khung: front = nửa phía mũi / đầu ngoài */
function half(c, C, deg, front) {
  const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const d = (x + 0.5 - C) * ux + (y + 0.5 - C) * uy
    if (front ? d < 0 : d >= 0) c.px(x, y, '_')
  }
}
for (let t = 0; t < 6; t++) BATTLE_DIRS.forEach((d, i) => {
  const deg = BATTLE_ANG[i]
  // kiếm / đao 64x64, tỉ lệ 0.4 (cỡ nhân vật trong trận / lobby ≈ 0.58), nắm giữa chuôi (u = 8)
  sprite(`wp_sword_b${d}_${t}`, { w: 64, h: 64 }, (c) => drawSword(c, t, { ax: gripAxis(32, 0.4, deg, 8), ph: 0, held: true, noFx: true }), ...GLOW(t))
  sprite(`wp_blade_b${d}_${t}`, { w: 64, h: 64 }, (c) => drawBlade(c, t, { ax: gripAxis(32, 0.4, deg, 8), ph: 0, held: true, noFx: true }), ...GLOW(t))
  // thương 80x80 như lobby: cầm giữa cán (u = 62), mũi chĩa theo góc, đốc ngược lại
  //   tách đôi tại chỗ cầm: _bf (nửa phía mũi, vẽ TRƯỚC thân) · _bk (nửa phía đốc, vẽ SAU thân)
  const sdeg = SPEAR_ANG[d] ?? deg, whole = SPEAR_WHOLE_FRONT.has(d)
  for (const fr of [true, false]) sprite(`wp_spear_b${fr ? 'f' : 'k'}${d}_${t}`, { w: 80, h: 80 }, (c) => {
    drawSpear(c, t, { ax: gripAxis(40, 0.5, sdeg, 62), ph: 0, held: true, noFx: true, shaft: 86 })
    if (whole) { if (!fr) c.rect(0, 0, 80, 80, '_') } else half(c, 40, sdeg, fr)
  }, ...GLOW(t))
  // cung 96x96 (bàn tay ở giữa khung): hướng có đường cong mẫu → vẽ đúng đường đó, đoạn bị thân che (hide) đưa ra sau;
  // s / sw: cung lobby xoay quanh chuôi theo góc − 135°, tách đôi tại chỗ cầm
  const bd = BOW_DIR[d]
  if (bd) {
    const pts = bowPts(48, bd.ang, bd.side)
    for (const fr of [true, false]) sprite(`wp_bow_b${fr ? 'f' : 'k'}${d}_${t}`, { w: 96, h: 96 }, (c) => {
      drawBow(c, t, { pts, k: 0.45, ph: 0, held: true, noFx: true })
      if (!fr) c.rect(0, 0, 96, 96, '_')                                     // cả cây ở một lớp (trước / sau theo bàn tay)
    }, ...GLOW(t))
  } else {
    const rot = ((deg - 135) * Math.PI) / 180, K = 0.6
    const pts = [[7, 7], [23, 41], [55, 47]].map(([x, y]) => { const dx = (x - 23) * K, dy = (y - 41) * K; return [48 + dx * Math.cos(rot) - dy * Math.sin(rot), 48 + dx * Math.sin(rot) + dy * Math.cos(rot)] })
    for (const fr of [true, false]) sprite(`wp_bow_b${fr ? 'f' : 'k'}${d}_${t}`, { w: 96, h: 96 }, (c) => { drawBow(c, t, { pts, k: 0.45, ph: 0, held: true, noFx: true }); half(c, 48, deg, fr) }, ...GLOW(t))
  }
  // quạt gấp 32x32, nắm ở đinh trục (u = 1.5)
  sprite(`wp_fan_b${d}_${t}`, { w: 32, h: 32 }, (c) => drawFanClosed(c, t, gripAxis(16, 0.85, deg, 1.5)), ...GLOW(t))
})
