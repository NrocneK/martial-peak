// =====================================================================
// NHÂN VẬT TRONG TRẬN (Cố Trường Ca) — góc nhìn TOP-DOWN NGHIÊNG (camera nhìn chếch xuống ~35°).
// Cách làm: dựng nhân vật thành mô hình 3D đơn giản bằng các khối (cầu, elip, viên nhộng, nón cụt) dạng SDF,
// "chụp" bằng camera trực giao nghiêng rồi tô 3 sắc độ theo ánh sáng cố định + viền 1px.
// Ưu điểm: 8 hướng luôn khớp nhau; hoạt ảnh (đi, chạy, đánh) chỉ cần cử động khớp của mô hình.
// Hướng: 0 S (nhìn xuống màn hình), 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/hero_battle.px.js
// =====================================================================
pal({ k: '#120e1c' })

const W = 48, H = 58
const SCALE = 1.3                            // phóng mô hình (đơn vị mô hình → điểm ảnh)
const PITCH = (35 * Math.PI) / 180          // góc camera so với mặt đất
const GROUND = 53                            // hàng điểm ảnh của mặt đất (dưới chân)
const LIGHT = norm([-0.55, 0.75, 0.45])      // ánh sáng từ trên-trái-trước (cố định trong thế giới)

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l) }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a) => Math.hypot(a[0], a[1], a[2])

// ---------------------------------------------------------------- bảng màu (tối → sáng)
const MAT = {
  skin: ['#c99a80', '#f2cab0', '#ffe4d0'],
  hair: ['#12121b', '#2a2840', '#4a4670'],
  robe: ['#8f96b4', '#c8cce0', '#f2f2f8'],
  blue: ['#2c3e72', '#4a68aa', '#7c9ad6'],
  pants: ['#16182a', '#262c4c', '#3a4470'],
  boot: ['#22180f', '#3e2c1e', '#5e4430'],
  gold: ['#8a5e14', '#e0a838', '#fff0a8'],
  tie: ['#a8b0c8', '#e8ecf6', '#ffffff'],
  eye: ['#141024', '#141024', '#2a2448'],
}

// ---------------------------------------------------------------- SDF cơ bản (p: điểm trong hệ của nhân vật)
const sphere = (p, c, r) => len(sub(p, c)) - r
function ellipsoid(p, c, r) {   // gần đúng
  const q = sub(p, c), k0 = len([q[0] / r[0], q[1] / r[1], q[2] / r[2]]), k1 = len([q[0] / r[0] / r[0], q[1] / r[1] / r[1], q[2] / r[2] / r[2]])
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1
}
function capsule(p, a, b, ra, rb = ra) {   // viên nhộng / nón cụt bo tròn (bán kính đổi dần ra → rb)
  const pa = sub(p, a), ba = sub(b, a), h = Math.max(0, Math.min(1, dot(pa, ba) / dot(ba, ba)))
  return len(sub(pa, mul(ba, h))) - (ra + (rb - ra) * h)
}
function cone(p, y0, r0, y1, r1, cz = 0) {   // nón cụt thẳng đứng (vạt áo): y0 trên, y1 dưới
  const q = [p[0], p[1], p[2] - cz]
  const t = Math.max(0, Math.min(1, (y0 - q[1]) / (y0 - y1)))
  const r = r0 + (r1 - r0) * t
  const dr = Math.hypot(q[0], q[2]) - r
  const dy = Math.max(q[1] - y0, y1 - q[1])
  return Math.max(dr * 0.9, dy)
}

/**
 * Mô hình nhân vật. Trục: y lên, z = hướng mặt nhân vật nhìn, x = bên phải nhân vật.
 * pose: tham số cử động (để dành cho hoạt ảnh) — hiện là tư thế đứng.
 */
function model(p, pose = {}) {
  let best = 1e9, mat = null, part = ''
  const take = (d, m, nm) => { if (d < best) { best = d; mat = m; part = nm } }
  // chân + ủng
  for (const s of [-1, 1]) {
    take(ellipsoid(p, [s * 2.0, 1.2, 0.8], [1.5, 1.3, 2.4]), 'boot', 'boot')
    take(capsule(p, [s * 2.0, 2.2, 0], [s * 1.9, 10, 0], 1.6, 2.0), 'pants', 'leg')
  }
  // vạt đạo bào (nón cụt) — mở phía trước để lộ quần / áo trong
  take(cone(p, 12.8, 4.3, 4.6, 5.5, -0.3), 'robe', 'skirt')
  // thân áo
  take(ellipsoid(p, [0, 16.4, 0], [4.2, 5.0, 3.0]), 'robe', 'torso')
  // đai lưng
  take(cone(p, 13.6, 4.45, 12.2, 4.5, -0.1), 'blue', 'belt')
  // tay áo rộng + bàn tay
  for (const s of [-1, 1]) {
    take(sphere(p, [s * 4.4, 19.0, -0.2], 2.2), 'robe', 'shoulder')
    take(capsule(p, [s * 4.6, 18.4, -0.2], [s * 5.4, 14.2, 0.2], 1.8, 2.0), 'robe', 'arm')
    take(capsule(p, [s * 5.4, 14.2, 0.2], [s * 5.8, 11.2, 0.7], 2.0, 2.7), 'robe', 'sleeve')
    take(sphere(p, [s * 5.8, 10.5, 1.0], 1.1), 'skin', 'hand')
  }
  // cổ + đầu
  take(capsule(p, [0, 20.4, 0.3], [0, 22.2, 0.3], 1.3), 'skin', 'neck')
  take(sphere(p, [0, 25.6, 0.8], 5.9), 'skin', 'face')
  // tóc: mũ tóc lệch ra sau-lên (để lộ mặt), mái lưa thưa, tóc mai hai bên, đuôi ngựa buộc sau gáy-đỉnh
  take(sphere(p, [0, 27.6, -1.5], 6.3), 'hair', 'hair')
  for (const [x, y, z, r] of [[-2.7, 29.4, 4.6, 1.4], [0.1, 29.5, 5.0, 1.5], [2.8, 29.4, 4.5, 1.3], [-1.3, 28.7, 5.5, 0.9], [1.5, 28.6, 5.5, 0.9]]) take(sphere(p, [x, y, z], r), 'hair', 'bang')
  for (const s of [-1, 1]) take(capsule(p, [s * 4.8, 27.0, 2.6], [s * 4.9, 21.6, 3.4], 1.2, 0.7), 'hair', 'lock')
  take(sphere(p, [0, 29.6, -6.2], 1.4), 'tie', 'tie')
  const tail = [[0, 29.8, -6.9, 2.0], [0.5, 27.4, -9.4, 2.0], [0.8, 23.6, -10.6, 1.8], [0.5, 19.4, -10.8, 1.4], [0.1, 15.6, -10.0, 0.8]]
  for (let i = 0; i < tail.length - 1; i++) take(capsule(p, tail[i].slice(0, 3), tail[i + 1].slice(0, 3), tail[i][3], tail[i + 1][3]), 'hair', 'tail')
  // mắt
  for (const s of [-1, 1]) take(ellipsoid(p, [s * 2.15, 25.2, 6.2], [0.95, 1.6, 0.7]), 'eye', 'eye')
  // dải đai buông sau hông trái
  take(capsule(p, [-3.8, 12.8, -1.8], [-5.0, 9.6, -3.4], 0.8, 0.75), 'blue', 'sash')
  take(capsule(p, [-5.0, 9.6, -3.4], [-5.6, 6.2, -4.4], 0.75, 0.6), 'blue', 'sash')
  return [best, mat, part]
}

/** Màu theo vật liệu + chi tiết bề mặt (cổ áo, vạt mở, viền, khóa đai) */
function surface(mat, part, p) {
  const ang = Math.atan2(p[0], p[2])                 // 0 = chính diện
  if (part === 'skirt') {
    if (Math.abs(ang) < 0.42) return p[1] < 5.8 ? 'pants' : 'blue'     // vạt mở: áo trong xanh, dưới cùng lộ quần
    if (Math.abs(ang) < 0.62 || p[1] < 5.5) return 'blue'              // viền vạt + gấu áo
  }
  if (part === 'torso' && p[2] > 0.4) {
    const v = (p[1] - 14.0) * 0.62                                      // cổ áo giao lĩnh hình chữ V
    if (p[1] > 14.0 && Math.abs(p[0]) < v) return Math.abs(Math.abs(p[0]) - v) < 0.7 ? 'blue' : 'skin'
  }
  if (part === 'belt' && Math.abs(ang) < 0.28 && Math.abs(p[1] - 12.9) < 0.75) return 'gold'
  if (part === 'sleeve' && p[1] < 12.2) return 'blue'                   // cổ tay áo
  return mat
}

function render(c, dir) {
  const yaw = -(dir * Math.PI) / 4                        // 0 S, 1 SW ... (quay theo chiều kim đồng hồ trên màn hình)
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const back = [0, Math.sin(PITCH), Math.cos(PITCH)], up = [0, Math.cos(PITCH), -Math.sin(PITCH)], right = [1, 0, 0]
  const toLocal = (w) => [cy * w[0] - sy * w[2], w[1], sy * w[0] + cy * w[2]]   // thế giới → hệ nhân vật
  const toWorld = (l) => [cy * l[0] + sy * l[2], l[1], -sy * l[0] + cy * l[2]]
  const sdf = (w) => { const r = model(mul(toLocal(w), 1 / SCALE)); return [r[0] * SCALE, r[1], r[2]] }
  const cx = W / 2
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const X = px + 0.5 - cx, Y = GROUND - (py + 0.5)
    let o = add(add(mul(right, X), mul(up, Y)), mul(back, 60)), d = mul(back, -1), t = 0, hit = null
    for (let i = 0; i < 160 && t < 120; i++) {
      const q = add(o, mul(d, t)), [dist, mat, part] = sdf(q)
      if (dist < 0.02) { hit = [q, mat, part]; break }
      t += Math.max(dist * 0.8, 0.02)
    }
    if (!hit) continue
    const [q, mat, part] = hit
    const e = 0.05, n = norm([sdf(add(q, [e, 0, 0]))[0] - sdf(add(q, [-e, 0, 0]))[0], sdf(add(q, [0, e, 0]))[0] - sdf(add(q, [0, -e, 0]))[0], sdf(add(q, [0, 0, e]))[0] - sdf(add(q, [0, 0, -e]))[0]])
    const l = dot(n, LIGHT)
    const m = surface(mat, part, mul(toLocal(q), 1 / SCALE))
    const tone = l > 0.55 ? 2 : l > 0.05 ? 1 : 0
    c.px(px, py, MAT[m][tone])
  }
}

/** Viền 1px quanh nhân vật rồi bóng đổ elip dưới chân (bóng không viền) */
function finish(c) {
  const add = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.is(x, y, '*')) continue
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.is(x + dx, y + dy, '*'))) add.push([x, y])
  }
  for (const [x, y] of add) c.px(x, y, 'k')
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.is(x, y, '*')) continue
    if (((x + 0.5 - W / 2) / 10) ** 2 + ((y + 0.5 - GROUND - 0.5) / 3) ** 2 < 1) c.px(x, y, '#0a0c1a')
  }
}

const DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
DIRS.forEach((nm, i) => sprite(`hero_b_${nm}`, { w: W, h: H }, (c) => { render(c, i); finish(c) }))
sheet('hero_b_dirs', DIRS.map((n) => `hero_b_${n}`), { cols: 8, pad: 2 })
