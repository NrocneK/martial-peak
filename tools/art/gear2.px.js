// =====================================================================
// BỘ TRANG BỊ v2 ("xịn hơn") — bản thử: Kiếm 6 cấp, 64x64.
// Kỹ thuật: vẽ theo "shader" trên trục chéo — mỗi điểm ảnh đổi sang tọa độ (u dọc lưỡi, v ngang lưỡi),
// hàm hình dạng trả về màu → đổ bóng đều (nửa trên-trái sáng, nửa dưới-phải tối, sống lưỡi bắt sáng).
// =====================================================================
pal({ k: '#0e0a18', w: '#ffffff', y: '#fff3b0', v: '#d8c4ff' })

const SQ = Math.SQRT1_2
/** Trục chéo: gốc (ox, oy) = đầu chuôi, u hướng lên-phải, v hướng xuống-phải (vuông góc). */
function axis(ox, oy) {
  const uv = (x, y) => { const dx = x + 0.5 - ox, dy = y + 0.5 - oy; return [(dx - dy) * SQ, (dx + dy) * SQ] }
  const xy = (u, v) => [ox + (u + v) * SQ, oy + (-u + v) * SQ]
  return { uv, xy }
}
/** Tô mọi điểm ảnh theo hàm f(u, v, x, y) → màu | null */
function paint(c, ax, f) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const [u, v] = ax.uv(x, y); const col = f(u, v, x, y); if (col) c.px(x, y, col)
  }
}
const lerp = (a, b, t) => a + (b - a) * t
const RAINBOW = ['#ff5a7a', '#ffb84a', '#ffe865', '#5ff0a0', '#5ab8ff', '#a87aff', '#ff7ae0']

function star(c, x, y, col, big) {
  c.px(x, y, 'w'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + dx, y + dy, col)
  if (big) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.px(x + dx, y + dy, col)
}

// ---------------------------------------------------------------- KIẾM
// Mỗi cấp: bảng màu lưỡi (B: tối→sáng 5 màu), chuôi, đốc, tua, + hình lưỡi / hộ thủ riêng.
const SWORD = [
  { // 0 Phàm — Thiết Kiếm: thép xám, hộ thủ thanh sắt thẳng, chuôi quấn da nâu
    B: ['#2b2d36', '#4c505c', '#757b88', '#a4aab6', '#d6dae2'], len: 60, hw: 3.4,
    guard: { w: 7, d: 2.2, col: ['#3a2a20', '#6b4a32', '#9a6e48'], shape: 'bar' },
    grip: ['#2a1810', '#5a3620', '#7c5030'], pom: ['#3a2a20', '#6b4a32', '#9a6e48'], tassel: null,
  },
  { // 1 Linh — Bích Ngọc Kiếm: lưỡi bạc ánh lục, rãnh máu khảm ngọc, hộ thủ hình mây cuộn, tua lục
    B: ['#1c3a30', '#3e6e5a', '#74a892', '#b4dcc8', '#e8fff2'], len: 62, hw: 3.0, fuller: '#38d39a',
    guard: { w: 8, d: 2.6, col: ['#0f3d2e', '#1f8a62', '#5fe0a8'], shape: 'cloud' },
    grip: ['#10261e', '#1e4a38', '#2f6e52'], pom: ['#0f3d2e', '#1f8a62', '#7ff0c0'], tassel: ['#167a52', '#3fd08e'], gem: '#7ff0c0',
  },
  { // 2 Tiên — Lưu Vân Kiếm: lưỡi mảnh dài trắng-lam, khắc phù văn, hộ thủ cánh vút, tua trắng dài
    B: ['#2a3a64', '#5a74ae', '#98b2e2', '#d2e2fa', '#ffffff'], len: 64, hw: 2.9, runes: '#7fd8ff',
    guard: { w: 10, d: 2.4, col: ['#2a3a7a', '#5a7ad8', '#b8d0ff'], shape: 'wing' },
    grip: ['#1a2040', '#2e3a6a', '#46588e'], pom: ['#2a3a7a', '#7fb8ff', '#e0f4ff'], tassel: ['#a8b8e0', '#ffffff'], gem: '#8fe4f8',
  },
  { // 3 Thần — Liệt Dương Kiếm: lưỡi rộng vàng đỏ, mép lửa gợn sóng, hộ thủ mặt trời có gai, ngọc đỏ
    B: ['#5a1a10', '#a8401c', '#e8862a', '#ffc85a', '#fff2b0'], len: 62, hw: 4.0, flame: '#ff4a2a',
    guard: { w: 10, d: 3.0, col: ['#6a1a14', '#c8402a', '#ffb04a'], shape: 'sun' },
    grip: ['#2a0a0a', '#5a1414', '#8a2020'], pom: ['#6a1a14', '#c8402a', '#ffd06a'], tassel: ['#b81e24', '#ff6a3a'], gem: '#ff3a2a',
  },
  { // 4 Thánh — Thánh Quang Kiếm: lưỡi bạch kim viền vàng, hộ thủ đĩa nhật quang, vầng hào quang
    B: ['#6a6f88', '#a8aec4', '#dfe3f0', '#f6f8ff', '#ffffff'], len: 64, hw: 3.4, inlay: '#f2c85a',
    guard: { w: 11, d: 3.2, col: ['#8a5e14', '#e8b440', '#fff2b0'], shape: 'halo' },
    grip: ['#5a4214', '#a8822c', '#e0c060'], pom: ['#8a5e14', '#e8b440', '#ffffff'], tassel: ['#e8b440', '#fff2b0'], gem: '#fffbe0', aura: '#fff3b0',
  },
  { // 5 Đạo — Hỗn Độn Đạo Kiếm: lưỡi hư không chứa tinh tú, mép thất thải, hộ thủ thái cực
    B: ['#0a0818', '#1c1638', '#3a2e6e', '#6a58c0', '#c8b8ff'], len: 64, hw: 3.6, cosmos: true,
    guard: { w: 11, d: 3.2, col: ['#2a1e5a', '#6a50d0', '#d8c8ff'], shape: 'taiji' },
    grip: ['#08060f', '#1a1430', '#2e2456'], pom: ['#140e2a', '#6a50d0', '#e0d0ff'], tassel: ['#7a5ad8', '#ff7ae0'], gem: '#e0d0ff', aura: '#c8b0ff',
  },
]

/** Viền tay: chỉ quanh thân vật (hiệu ứng vẽ sau không bị viền) */
function outlineNow(c, col) {
  const add = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.is(x, y, '*')) continue
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < c.w && y + dy < c.h && c.is(x + dx, y + dy, '*'))) add.push([x, y])
  }
  for (const [x, y] of add) c.px(x, y, col)
}
const hash = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h) }

function drawSword(c, t) {
  const S = SWORD[t], B = S.B, G = S.guard, C = G.col
  const ax = axis(7, 57)
  const pom = 2.6, g0 = 17, gc = g0 + G.d, g1 = g0 + G.d * 2, tip = S.len + 10
  const taper = 10
  // ---- lưỡi
  paint(c, ax, (u, v, x, y) => {
    if (u < g1 - 1 || u > tip) return null
    let hw = S.hw
    if (u > tip - taper) hw = S.hw * Math.pow((tip - u) / taper, 0.8)
    if (S.flame && v > 0 && u < tip - taper) hw += Math.max(0, Math.sin(u * 0.75)) * 1.6
    if (Math.abs(v) > hw + 0.1) return null
    const e = hw - Math.abs(v)
    if (S.cosmos) {
      if (e < 0.8) return RAINBOW[Math.floor(u / 3) % 7]
      const h = hash(x, y)
      if (h > 0.95) return '#ffffff'
      if (h > 0.89) return B[4]
      if (Math.abs(v) < 0.5) return B[3]
      return v < 0 ? B[2] : B[1]
    }
    if (S.flame && v > 0 && e < 1.4 && u < tip - taper) return Math.sin(u * 0.75) > 0.6 ? '#ffe08a' : S.flame
    if (e < 0.7) return v < 0 ? B[4] : B[1]                                   // mép lưỡi
    if (S.inlay && e < 1.5) return S.inlay                                    // viền vàng khảm
    if (S.fuller && Math.abs(v) < 1.2 && u < tip - taper - 3 && u > g1 + 2) return Math.abs(v) < 0.5 ? '#c8ffe8' : S.fuller   // rãnh khảm ngọc
    if (S.runes && Math.abs(v) < 0.9 && u > g1 + 3 && u < tip - taper - 2 && (Math.floor(u) % 6 < 3)) return S.runes            // phù văn
    if (Math.abs(v) < 0.5) return B[4]                                        // sống lưỡi
    return v < 0 ? B[3] : B[2]
  })
  // ---- chuôi quấn chéo
  paint(c, ax, (u, v) => {
    if (u < pom || u > g0 + 0.5 || Math.abs(v) > 1.7) return null
    if (v > 0.9) return S.grip[0]
    return (Math.floor(u * 0.8 + v * 0.8) % 2) ? S.grip[2] : S.grip[1]
  })
  // ---- hộ thủ (mỗi cấp một kiểu)
  paint(c, ax, (u, v) => {
    const du = u - gc, av = Math.abs(v), r = Math.hypot(du, v)
    let ins = false
    switch (G.shape) {
      case 'bar': ins = Math.abs(du) < 1.3 && av < G.w || (av > G.w - 2 && av < G.w + 0.6 && Math.abs(du) < 2.1); break                // thanh thẳng, hai đầu bịt
      case 'cloud': ins = (Math.abs(du - av * av * 0.05) < 1.4 && av < G.w) || Math.hypot(du - 3.2, av - G.w) < 2.0 || r < 2.6; break   // cong về mũi + cuộn mây hai đầu
      case 'wing': ins = (Math.abs(du - av * 0.55) < 1.3 + (G.w - av) * 0.08 && av < G.w) || r < 2.4; break                         // cánh vút
      case 'sun': ins = r < 3.6 || (Math.abs(du) < 1.2 && av < G.w - 1) || (Math.abs(du + av * 0.6) < 1 && av < G.w) || (Math.abs(du - av * 0.9) < 0.9 && av < G.w - 2); break
      case 'halo': ins = r < 3.8 || (Math.abs(du - av * av * 0.045) < 1.3 && av < G.w) || Math.hypot(du - G.w * G.w * 0.045, av - G.w) < 1.6; break   // đĩa + cánh cong vầng nguyệt
      case 'taiji': ins = r < 4.4 || (Math.abs(du - av * av * 0.06) < 1.1 && av < G.w); break
    }
    if (!ins) return null
    if (G.shape === 'taiji' && r < 3.6) {
      const R = 3.6, top = Math.hypot(du, v + R / 2) < R / 2, bot = Math.hypot(du, v - R / 2) < R / 2
      if (Math.hypot(du, v + R / 2) < 0.8) return '#140e2a'
      if (Math.hypot(du, v - R / 2) < 0.8) return '#f4f0ff'
      return top ? '#f4f0ff' : bot ? '#140e2a' : du < 0 ? '#f4f0ff' : '#140e2a'
    }
    if (S.gem && r < 1.6) return r < 0.8 ? '#ffffff' : S.gem
    const ref = G.shape === 'cloud' || G.shape === 'taiji' ? du - av * av * 0.05 : G.shape === 'halo' ? du - av * av * 0.045 : G.shape === 'wing' ? du - av * 0.55 : du
    if (ref < -0.5) return C[2]                      // mép phía chuôi bắt sáng
    if (ref > 0.7) return v > 0 ? C[0] : C[1]        // mép phía mũi: tối, nửa dưới tối hơn
    return v > 2 ? C[0] : C[1]
  })
  // ---- đốc chuôi
  paint(c, ax, (u, v) => {
    const r = Math.hypot(u - 1, v)
    if (r > 2.7) return null
    if (S.gem && r < 1.2) return S.gem
    return u < 0.8 && v < 0.4 ? S.pom[2] : r > 1.9 ? S.pom[0] : S.pom[1]
  })
  outlineNow(c, 'k')
  // ---- tua kiếm: dây + nút thắt + chùm sợi buông
  if (S.tassel) {
    const [px, py] = ax.xy(-2.2, 0); const x0 = Math.round(px), y0 = Math.round(py)
    const T = S.tassel, L = t >= 2 ? 10 : 7
    c.vline(x0, y0, 2, T[0]); c.rect(x0 - 1, y0 + 2, 3, 2, T[1]); c.px(x0, y0 + 2, '#ffffff')
    for (let i = 0; i < L; i++) {
      const sw = Math.round(Math.sin(i * 0.5) * 1.3)
      for (let j = -1; j <= 1; j++) c.px(x0 + j + sw, y0 + 4 + i, j === -1 ? T[1] : T[0])
    }
    if (t === 5) for (let j = -1; j <= 1; j++) c.px(x0 + j + Math.round(Math.sin(L * 0.5) * 1.3), y0 + 4 + L, RAINBOW[j + 4])
  }
  // ---- hiệu ứng theo cấp (không viền)
  // linh khí: dải liền mạch uốn quanh lưỡi, chỉ hiện ở phần ngoài lưỡi (như quấn vòng ra sau)
  const wisp = (cols, amp, ph, from, to) => {
    let prev = null
    for (let u = from; u < to; u += 0.35) {
      const v = Math.sin(u * 0.2 + ph) * amp
      if (Math.abs(v) < S.hw + 1.6) { prev = null; continue }
      const [x, y] = ax.xy(u, v), X = Math.round(x), Y = Math.round(y)
      if (prev && (prev[0] !== X || prev[1] !== Y)) c.px(X, Y, cols[Math.floor(u / 4) % cols.length])
      prev = [X, Y]
    }
  }
  if (t === 1) for (const [u, v] of [[44, -7], [60, 6]]) { const [x, y] = ax.xy(u, v); c.px(Math.round(x), Math.round(y), '#7ff0c0') }
  if (t === 2) { for (const [u, v] of [[50, -9], [34, 9]]) { const [x, y] = ax.xy(u, v); c.hline(Math.round(x) - 3, Math.round(y), 6, '#d8e8ff'); c.hline(Math.round(x) - 1, Math.round(y) - 1, 4, '#ffffff') } }
  if (t === 3) { wisp(['#ff8a2a', '#ffd06a', '#ff4a2a'], 8, 0, g1 + 4, tip - 4); for (const [u, v] of [[40, -9], [62, 8], [52, -10]]) { const [x, y] = ax.xy(u, v); c.px(Math.round(x), Math.round(y), '#ffd06a'); c.px(Math.round(x), Math.round(y) - 1, '#ff6a2a') } }
  if (t === 4) { wisp(['#fff3b0', '#ffffff', '#f2c85a'], 8.5, 1, g1 + 2, tip - 2); star(c, 54, 8, '#fff3b0', true); star(c, 34, 16, '#fff3b0'); star(c, 58, 32, '#fff3b0') }
  if (t === 5) { wisp(RAINBOW, 8.5, 0.5, g1 + 2, tip - 2); star(c, 55, 7, '#ff7ae0', true); star(c, 33, 15, '#5ab8ff'); star(c, 59, 31, '#ffe865') }
}
for (let t = 0; t < 6; t++) sprite(`v2_sword_${t}`, { w: 66, h: 66 }, (c) => drawSword(c, t),
  ...(t >= 3 ? [glow('w', { r: 3, strength: 0.5, bands: 2, color: t === 5 ? 'v' : 'y' })] : []))
