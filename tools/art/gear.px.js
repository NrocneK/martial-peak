// =====================================================================
// BỘ SƯU TẬP TRANG BỊ (66 hình) — pixel art bằng pxl.
//   6 vũ khí × 6 cấp (48x48)  : wp_sword | wp_blade | wp_spear | wp_fist | wp_bow | wp_fan  _0.._5
//   y phục / giày / trang sức × 6 cấp (32x32) : clothes_ | shoes_ | accessory_  0..5
//   12 bí bảo (32x32)         : bb_w1_5 ... bb_w6_10
// Cấp = CHẤT LIỆU (Phàm sắt-gỗ · Linh đồng-ngọc · Tiên bạc-mây · Thần vàng-đỏ · Thánh bạch kim · Đạo hắc thạch tinh quang).
// Màu PHẨM không nằm trong hình (chỉ ở viền + tên, do giao diện vẽ).
// Vũ khí: chuôi ở góc dưới-trái (điểm cầm GRIP), mũi chĩa lên-phải → cầm tay phải (phía xa) thì lưỡi vươn ra sau lưng.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/gear.px.js   → chép out/sprites/{wp_*,clothes_*,shoes_*,accessory_*,bb_*}.png vào public/gear/
// =====================================================================
pal({ k: '#120e1c', w: '#ffffff', y: '#fff6c8', v: '#c8b0ff' })

// ---------------------------------------------------------------- bảng chất liệu theo cấp
// m: kim loại (tối → sáng) · a: điểm nhấn · c: vải · g: ngọc / đá quý · h: chuôi / cán
const T = [
  { m: ['#2e3038', '#555a66', '#8a909c', '#c8ccd4'], a: ['#4a2e1c', '#7a4f2e', '#a8774a'], c: ['#5a4a38', '#8c7658', '#bba987'], g: null, h: ['#3a2416', '#6a4428'] },
  { m: ['#1f3b2b', '#3f6b4c', '#6fa877', '#b5e3b0'], a: ['#14513f', '#2fa37f', '#7fe3c0'], c: ['#24503e', '#3f8a66', '#86c9a0'], g: '#5fe0a0', h: ['#3b2a1a', '#6a4a2a'] },
  { m: ['#3c4a66', '#7486a8', '#b8c8e6', '#f0f6ff'], a: ['#2b4f99', '#4f86da', '#9cc4ff'], c: ['#8ea4cc', '#cdd9f0', '#ffffff'], g: '#8fe4f8', h: ['#26304a', '#46587e'] },
  { m: ['#5a3410', '#a8681c', '#e8a93a', '#ffe08a'], a: ['#6e1622', '#b8282e', '#ff6a4a'], c: ['#6e1820', '#a8303a', '#e8705a'], g: '#ff5a3a', h: ['#3a1410', '#6e2a1c'] },
  { m: ['#7a7f94', '#c3c8d8', '#eef1f8', '#ffffff'], a: ['#a8761c', '#f2c85a', '#fff2b0'], c: ['#b9c0d4', '#e8ecf6', '#ffffff'], g: '#fff6c8', h: ['#8a6a2a', '#d6b25a'] },
  { m: ['#120e22', '#2a2246', '#4a3d7a', '#8a78d8'], a: ['#3a2a6a', '#7a5ad8', '#c8b0ff'], c: ['#18122e', '#2e2456', '#54468e'], g: '#c8b0ff', h: ['#0c0a18', '#2a2246'] },
]
const RAINBOW = ['#ff5a7a', '#ffb84a', '#ffe865', '#5ff0a0', '#5ab8ff', '#a87aff', '#ff7ae0']

// điểm sáng lấp lánh (Thánh: vàng trắng, Đạo: thất thải)
function sparkles(c, t, pts) {
  if (t < 4) return
  pts.forEach(([x, y], i) => {
    const col = t === 5 ? RAINBOW[i % RAINBOW.length] : '#fff6c8'
    c.px(x, y, col); c.px(x - 1, y, col); c.px(x + 1, y, col); c.px(x, y - 1, col); c.px(x, y + 1, col); c.px(x, y, 'w')
  })
}

// ================================================================ VŨ KHÍ (48x48)
// Trục chéo: chuôi (8,40) → mũi (42,6). Hướng dọc lưỡi (1,-1), hướng ngang lưỡi (1,1).
function sword(c, t) {
  const P = T[t], M = P.m, A = P.a
  // lưỡi: thân + sống sáng + mép
  c.line(16, 32, 41, 7, M[1], 4); c.line(16, 32, 41, 7, M[2], 2); c.line(17, 31, 40, 8, M[3], 1)
  c.px(42, 6, M[3]); c.px(43, 5, M[2])
  if (t === 3) for (let i = 0; i < 6; i++) { c.px(20 + i * 3, 30 - i * 3, A[2]); c.px(21 + i * 3, 30 - i * 3, A[1]) }   // hỏa văn
  if (t === 5) for (let i = 0; i < 7; i++) c.px(19 + i * 3, 29 - i * 3, RAINBOW[i])                                      // tinh quang
  // đốc (chắn tay) vuông góc với lưỡi
  const gw = t >= 4 ? 7 : t >= 2 ? 6 : 4
  c.line(14 - gw, 30 - gw, 14 + gw - 4, 30 + gw - 4, A[1], 3); c.line(14 - gw, 30 - gw, 14 + gw - 4, 30 + gw - 4, A[2], 1)
  if (t >= 2) { c.circ(14 - gw, 30 - gw, 2, A[2]); c.circ(14 + gw - 4, 30 + gw - 4, 2, A[2]) }   // đầu đốc cuộn mây
  if (P.g) { c.circ(13, 31, 2, P.g); c.px(12, 30, '#ffffff') }
  // chuôi quấn dây + núm
  c.line(6, 42, 12, 36, P.h[0], 3); for (let i = 0; i < 3; i++) c.px(8 + i * 2, 40 - i * 2, P.h[1])
  c.circ(5, 43, 2, A[1]); c.px(4, 42, A[2])
  if (t >= 3) { c.line(4, 45, 1, 47, A[1], 1); c.px(1, 47, A[2]) }   // tua kiếm
  sparkles(c, t, [[30, 10], [38, 18], [24, 24]])
}

function blade(c, t) {
  const P = T[t], M = P.m, A = P.a
  // lưỡi đao bản rộng, lưng thẳng, lưỡi cong phình về phía mũi
  c.poly([15, 33, 38, 8, 43, 5, 44, 10, 40, 18, 32, 27, 20, 37], M[1])
  c.poly([16, 32, 38, 9, 42, 7, 41, 11, 22, 33], M[2])
  c.line(15, 33, 38, 8, M[3], 1)
  if (t === 3) c.poly([24, 32, 34, 22, 36, 24, 26, 34], A[1])
  if (t === 5) for (let i = 0; i < 6; i++) c.px(22 + i * 3, 33 - i * 3, RAINBOW[i])
  // đốc tròn + chuôi + vòng đuôi đao
  c.ellipse(14, 34, 4, 4, A[1]); c.ellipse(14, 34, 2, 2, P.g ?? A[2])
  c.line(6, 42, 12, 36, P.h[0], 3); for (let i = 0; i < 3; i++) c.px(8 + i * 2, 40 - i * 2, P.h[1])
  c.ring(4, 44, 3, A[1]); if (t >= 2) c.ring(4, 44, 2, A[2])
  if (t >= 4) c.poly([40, 4, 46, 1, 45, 6], A[2])   // mũi đao chạm hoa văn
  sparkles(c, t, [[34, 12], [28, 24]])
}

function spear(c, t) {
  const P = T[t], M = P.m, A = P.a
  // cán dài suốt đường chéo
  c.line(2, 46, 34, 14, P.h[0], 3); c.line(3, 45, 33, 15, P.h[1], 1)
  for (let i = 0; i < 4; i++) c.px(6 + i * 7, 41 - i * 7, A[1])            // vòng đai cán
  // tua đỏ (hoặc màu nhấn) dưới mũi
  c.poly([32, 16, 30, 24, 33, 22, 35, 25, 36, 18], A[1]); c.px(33, 20, A[2])
  // mũi thương hình lá
  c.poly([34, 14, 39, 5, 46, 1, 43, 9, 36, 16], M[1]); c.poly([35, 14, 40, 6, 45, 2, 38, 13], M[2]); c.line(36, 13, 45, 2, M[3], 1)
  if (t >= 2) { c.poly([33, 11, 37, 13, 35, 9], A[2]); c.poly([37, 17, 39, 13, 41, 15], A[2]) }   // ngạnh mây
  if (P.g) { c.circ(35, 15, 1, P.g) }
  if (t === 5) for (let i = 0; i < 6; i++) c.px(8 + i * 5, 39 - i * 5, RAINBOW[i])
  sparkles(c, t, [[42, 10], [26, 26]])
}

function fist(c, t) {
  const P = T[t], M = P.m, A = P.a
  // găng tay chiến (nhìn chéo): bao cổ tay + nắm đấm + đốt giáp + gai quyền
  c.poly([8, 40, 18, 46, 24, 38, 14, 30], P.h[0]); c.poly([10, 39, 18, 44, 22, 38, 14, 32], P.h[1])   // bao cổ tay
  c.ellipse(26, 26, 13, 11, M[1]); c.ellipse(25, 25, 11, 9, M[2]); c.ellipse(22, 22, 5, 4, M[3])
  for (let i = 0; i < 4; i++) { c.ellipse(28 + i * 3, 15 + i * 3, 3, 2, M[3]); c.px(30 + i * 3, 14 + i * 3, A[2]) }   // đốt ngón
  for (let i = 0; i < 4; i++) c.poly([30 + i * 3, 13 + i * 3, 35 + i * 3, 9 + i * 3, 33 + i * 3, 15 + i * 3], t >= 3 ? A[2] : M[3])   // gai quyền
  c.line(14, 30, 24, 38, A[1], 2)                              // viền cổ tay
  if (P.g) { c.circ(22, 28, 3, A[1]); c.circ(22, 28, 2, P.g); c.px(21, 27, '#ffffff') }
  if (t === 5) for (let i = 0; i < 5; i++) c.px(17 + i * 4, 33 - i * 2, RAINBOW[i])
  sparkles(c, t, [[38, 26], [14, 18]])
}

function bow(c, t) {
  const P = T[t], M = P.m, A = P.a
  // cung dựng đứng, THON (sâu 11px) để khi cầm tay phía xa vẫn lộ hai cánh ngoài thân:
  // chuôi cầm (10,24) là phần phình nhất, hai cánh cong về phải, dây cung thẳng ở x = 21 (hướng vào người cầm)
  const bx = (y) => Math.round(10 + 11 * ((Math.abs(y - 24) / 22) ** 2))
  for (let y = 2; y <= 46; y++) { const x = bx(y); c.rect(x - 1, y, 3, 1, P.h[0]); c.px(x, y, P.h[1]) }
  c.line(21, 3, 21, 45, '#e8e2d0', 1)                         // dây cung
  c.rect(8, 20, 5, 9, A[1]); c.rect(9, 21, 3, 7, A[2])        // chuôi quấn
  c.circ(20, 2, 2, M[2]); c.circ(20, 46, 2, M[2])             // đầu cánh bịt kim loại
  if (t >= 2) { c.poly([9, 10, 5, 6, 8, 12], A[2]); c.poly([9, 38, 5, 42, 8, 36], A[2]) }   // vân mây cánh
  if (t >= 3) { c.line(11, 14, 15, 6, A[1], 1); c.line(11, 34, 15, 42, A[1], 1) }
  if (P.g) { c.circ(10, 24, 2, P.g); c.px(9, 23, 'w') }
  if (t === 5) for (let i = 0; i < 7; i++) { const y = 6 + i * 6; c.px(bx(y) + 1, y, RAINBOW[i]) }
  sparkles(c, t, [[16, 8], [16, 40]])
}

function fan(c, t) {
  const P = T[t], M = P.m, A = P.a
  // quạt xếp mở 1/4 vòng: trục ở chuôi (8,40), nan tỏa lên-phải bán kính 36
  const cx = 8, cy = 40, R = 37
  for (let a = -84; a <= -6; a += 1) {
    const r = (a * Math.PI) / 180
    for (let d = 12; d <= R; d++) {
      const x = Math.round(cx + Math.cos(r) * d), y = Math.round(cy + Math.sin(r) * d)
      const band = Math.floor((a + 84) / 13) % 2
      c.px(x, y, d > R - 3 ? A[0] : band ? P.c[1] : P.c[2])
    }
  }
  for (let a = -84; a <= -6; a += 13) { const r = (a * Math.PI) / 180; c.line(cx, cy, Math.round(cx + Math.cos(r) * R), Math.round(cy + Math.sin(r) * R), M[1], 1) }   // nan
  // họa tiết trên giấy quạt theo cấp
  const mid = (d, a) => [Math.round(cx + Math.cos((a * Math.PI) / 180) * d), Math.round(cy + Math.sin((a * Math.PI) / 180) * d)]
  if (t >= 1) { const [x, y] = mid(26, -45); c.circ(x, y, 3, A[1]); c.circ(x, y, 1, P.g ?? A[2]) }
  if (t >= 2) for (const a of [-70, -20]) { const [x, y] = mid(28, a); c.ring(x, y, 2, A[2]) }
  if (t >= 3) { const [x, y] = mid(20, -45); c.line(x - 4, y + 2, x + 4, y - 6, A[2], 1) }
  if (t === 5) for (let i = 0; i < 7; i++) { const [x, y] = mid(32, -80 + i * 12); c.px(x, y, RAINBOW[i]) }
  c.circ(cx, cy, 3, M[2]); c.px(cx, cy, M[3])                                       // đinh trục
  if (t >= 3) { c.line(cx - 2, cy + 2, cx - 6, cy + 7, A[1], 1); c.px(cx - 6, cy + 7, A[2]) }   // tua quạt
  sparkles(c, t, [[30, 12], [40, 30]])
}

const WEAPON_DRAW = { wp_sword: sword, wp_blade: blade, wp_spear: spear, wp_fist: fist, wp_bow: bow, wp_fan: fan }
for (const [id, fn] of Object.entries(WEAPON_DRAW)) for (let t = 0; t < 6; t++) {
  sprite(`${id}_${t}`, { w: 48, h: 48, outline: 'k' }, (c) => fn(c, t), ...(t >= 4 ? [glow('w', { r: 3, strength: 0.45, bands: 2, color: t === 5 ? 'v' : 'y' })] : []))
}

// ================================================================ Y PHỤC / GIÀY / TRANG SỨC (32x32)
function clothes(c, t) {
  const P = T[t], C = P.c, A = P.a
  // áo bào xếp trên giá: vai, hai tay áo rộng, thân dài, cổ chéo, đai lưng
  c.poly([6, 7, 26, 7, 31, 18, 27, 20, 24, 13, 25, 30, 7, 30, 8, 13, 5, 20, 1, 18], C[1])
  c.poly([6, 7, 12, 7, 11, 30, 7, 30, 8, 13, 5, 20, 1, 18], C[0])
  c.poly([20, 7, 26, 7, 31, 18, 27, 20, 24, 13, 25, 30, 22, 30], C[2])
  c.line(12, 7, 18, 15, A[1], 2); c.line(20, 7, 16, 12, A[1], 2)                 // cổ chéo giao lĩnh
  c.rect(8, 17, 17, 3, A[1]); c.hline(8, 17, 17, A[2])                         // đai
  c.hline(7, 29, 18, A[1]); c.line(1, 18, 5, 20, A[1], 1); c.line(31, 18, 27, 20, A[1], 1)   // viền gấu + cổ tay áo
  if (P.g) { c.circ(16, 18, 1, P.g) }
  if (t >= 2) for (const x of [10, 21]) { c.ring(x, 25, 2, A[2]) }              // vân mây
  if (t === 3) { c.poly([12, 28, 14, 22, 16, 26, 18, 21, 20, 28], A[1]) }       // hỏa văn
  if (t === 5) for (let i = 0; i < 6; i++) c.px(9 + i * 3, 23 + (i % 2) * 3, RAINBOW[i])
  sparkles(c, t, [[16, 3], [28, 26]])
}

function shoes(c, t) {
  const P = T[t], C = P.c, A = P.a
  // một chiếc hài / ngoa nhìn nghiêng: ống + bàn + đế cong mũi
  const tall = t >= 3 ? 4 : 0   // chiến ngoa cấp cao: ống cao hơn
  c.poly([9, 6 - tall, 19, 6 - tall, 19, 20, 27, 22, 30, 26, 29, 28, 4, 28, 6, 20], C[1])
  c.poly([9, 6 - tall, 12, 6 - tall, 11, 20, 6, 28, 4, 28, 6, 20], C[0])
  c.rect(4, 26, 26, 3, P.h[0]); c.hline(5, 26, 24, P.h[1])                       // đế
  c.poly([27, 22, 31, 21, 30, 26], A[1])                                          // mũi hài vểnh
  c.hline(9, 6 - tall, 11, A[1]); c.rect(9, 12, 10, 2, A[1])                     // viền miệng + dây buộc
  if (P.g) c.circ(14, 13, 1, P.g)
  if (t >= 2) { c.ring(23, 24, 2, A[2]) }
  if (t >= 4) { c.poly([4, 18, 0, 14, 5, 15], A[2]); c.poly([4, 22, 0, 20, 5, 20], A[2]) }   // cánh "bộ vân"
  if (t === 5) for (let i = 0; i < 5; i++) c.px(8 + i * 4, 22, RAINBOW[i])
  sparkles(c, t, [[24, 10], [8, 4]])
}

function accessory(c, t) {
  const P = T[t], M = P.m, A = P.a
  // dây treo + nút thắt + mặt bội + tua
  c.line(16, 0, 16, 6, A[1], 1); c.rect(14, 5, 5, 3, A[1]); c.px(16, 6, A[2])
  if (t === 0) { c.rect(10, 9, 13, 13, P.h[0]); c.rect(11, 10, 11, 11, P.h[1]); c.hline(13, 14, 7, P.h[0]); c.hline(13, 17, 7, P.h[0]) }        // thẻ gỗ
  else if (t === 3) { c.rect(9, 9, 15, 14, M[1]); c.rect(10, 10, 13, 12, M[2]); c.rect(13, 13, 7, 6, A[1]); c.rect(14, 14, 5, 4, A[2]) }       // ấn vàng
  else if (t === 5) { c.circ(16, 16, 8, M[1]); c.circ(16, 16, 6, M[2]); c.circ(14, 14, 2, M[3]); for (let i = 0; i < 6; i++) { const a = i * 1.05; c.px(Math.round(16 + Math.cos(a) * 5), Math.round(16 + Math.sin(a) * 5), RAINBOW[i]) } }   // đạo châu
  else {
    const col = t === 1 ? [P.a[0], P.a[1], P.a[2]] : [M[1], M[2], M[3]]
    c.circ(16, 16, 8, col[0]); c.circ(16, 16, 7, col[1]); c.circ(16, 16, 3, '.'); c.ring(16, 16, 3, col[0]); c.px(13, 12, col[2]); c.px(12, 13, col[2])   // ngọc bích / bạc
    if (t >= 2) { c.ring(16, 16, 8, A[2]) }
  }
  if (P.g && t !== 5) c.circ(16, 25, 1, P.g)
  // tua
  c.rect(15, 24, 3, 2, A[1]); for (let i = 0; i < 4; i++) c.vline(14 + i, 26, 5 - (i % 2), A[t >= 3 ? 2 : 1])
  if (t >= 4) c.ring(16, 16, 11, A[2])
  sparkles(c, t, [[6, 8], [27, 22]])
}

const SLOT_DRAW = { clothes, shoes, accessory }
for (const [id, fn] of Object.entries(SLOT_DRAW)) for (let t = 0; t < 6; t++) {
  sprite(`${id}_${t}`, { w: 32, h: 32, outline: 'k' }, (c) => fn(c, t), ...(t >= 4 ? [glow('w', { r: 2, strength: 0.4, bands: 2, color: t === 5 ? 'v' : 'y' })] : []))
}

// ================================================================ BÍ BẢO (12 × 32x32)
const BB = {
  // Tụ Bảo La Bàn: la bàn gỗ đồng, kim đỏ
  bb_w1_5: (c) => { c.circ(16, 16, 13, '#6a4428'); c.circ(16, 16, 11, '#c8a060'); c.circ(16, 16, 9, '#e8d6a0'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.px(Math.round(16 + Math.cos(a) * 10), Math.round(16 + Math.sin(a) * 10), '#6a4428') } c.line(10, 22, 22, 10, '#d8463c', 2); c.line(16, 16, 10, 22, '#2e3038', 2); c.circ(16, 16, 2, '#ffd765') },
  // Dưỡng Nguyên Ngọc: viên ngọc xanh có vân
  bb_w1_10: (c) => { c.ellipse(16, 17, 11, 12, '#1d6b55'); c.ellipse(16, 16, 9, 10, '#2fa37f'); c.ellipse(13, 12, 4, 4, '#7fe3c0'); c.px(12, 10, '#ffffff'); c.line(12, 22, 20, 18, '#14513f', 1) },
  // Hàn Hải Châu: ngọc trai băng xanh trên vỏ sò
  bb_w2_5: (c) => { c.poly([3, 24, 16, 30, 29, 24, 24, 20, 8, 20], '#4a7aa8'); c.poly([5, 24, 16, 28, 27, 24], '#8cc0e8'); c.circ(16, 15, 8, '#8fe4f8'); c.circ(16, 15, 6, '#d6f8ff'); c.circ(13, 12, 2, '#ffffff') },
  // Giao Nhân Lệ: giọt lệ xanh biển
  bb_w2_10: (c) => { c.poly([16, 2, 24, 16, 24, 22, 16, 29, 8, 22, 8, 16], '#2d68cf'); c.poly([16, 5, 22, 16, 22, 21, 16, 26, 10, 21, 10, 16], '#5ea8f2'); c.ellipse(13, 18, 2, 4, '#c2e4fc'); c.px(12, 15, '#ffffff') },
  // Tinh Lôi Tâm: lõi sấm tím có tia sét
  bb_w3_5: (c) => { c.circ(16, 16, 10, '#3a2a6a'); c.circ(16, 16, 8, '#7a5ad8'); c.poly([18, 6, 11, 17, 16, 17, 13, 27, 22, 14, 17, 14], '#ffe865'); c.px(15, 15, '#ffffff') },
  // Huyền Tinh Hạch: tinh thể lục giác
  bb_w3_10: (c) => { c.poly([16, 2, 26, 9, 26, 23, 16, 30, 6, 23, 6, 9], '#2b4f99'); c.poly([16, 2, 26, 9, 16, 16, 6, 9], '#9cc4ff'); c.poly([16, 16, 26, 9, 26, 23, 16, 30], '#4f86da'); c.line(16, 16, 16, 30, '#c2e4fc', 1); c.px(12, 8, '#ffffff') },
  // Thiên Binh Giáp Phiến: mảnh giáp vàng
  bb_w4_5: (c) => { c.poly([6, 4, 26, 4, 28, 18, 16, 30, 4, 18], '#a8681c'); c.poly([8, 6, 24, 6, 25, 17, 16, 27, 7, 17], '#e8a93a'); c.rect(12, 9, 8, 2, '#ffe08a'); c.rect(12, 13, 8, 2, '#ffe08a'); c.circ(16, 20, 2, '#b8282e') },
  // Thanh Loan Vũ: lông vũ xanh lục
  bb_w4_10: (c) => { c.line(6, 28, 24, 4, '#e8e2d0', 1); for (let i = 0; i < 10; i++) { c.line(8 + i * 2, 26 - i * 2, 4 + i * 2, 18 - i * 2, i % 2 ? '#2fa37f' : '#5fd0a5', 1); c.line(8 + i * 2, 26 - i * 2, 16 + i * 2, 26 - i * 2, i % 2 ? '#3f86d4' : '#7fb8f0', 1) } c.circ(24, 6, 2, '#ffd765') },
  // Đại La Lệnh: lệnh bài vàng đỏ
  bb_w5_5: (c) => { c.rect(9, 3, 14, 26, '#6e1622'); c.rect(10, 4, 12, 24, '#b8282e'); c.rect(12, 7, 8, 18, '#e8a93a'); c.rect(13, 8, 6, 16, '#ffe08a'); c.vline(16, 10, 12, '#6e1622'); c.hline(14, 13, 5, '#6e1622'); c.hline(14, 18, 5, '#6e1622'); c.circ(16, 3, 2, '#ffd765') },
  // Thượng Cổ Tàn Bi: bia đá vỡ khắc chữ
  bb_w5_10: (c) => { c.poly([6, 6, 24, 3, 27, 10, 25, 29, 5, 29], '#625e86'); c.poly([8, 8, 22, 5, 24, 11, 23, 27, 7, 27], '#a3a0bf'); for (let i = 0; i < 4; i++) c.hline(10, 11 + i * 4, 10 - (i % 2) * 3, '#46426a'); c.line(18, 5, 14, 14, '#46426a', 1) },
  // Hỗn Độn Chi Tâm: tim hỗn độn đen tím, quầng thất thải
  bb_w6_5: (c) => { c.circ(16, 16, 11, '#120e22'); c.circ(16, 16, 9, '#2a2246'); c.circ(16, 16, 5, '#4a3d7a'); c.circ(16, 16, 2, '#c8b0ff'); for (let i = 0; i < 7; i++) { const a = i * 0.9; c.px(Math.round(16 + Math.cos(a) * 11), Math.round(16 + Math.sin(a) * 11), RAINBOW[i]) } },
  // Đạo Tổ Ấn: ấn triện ngọc trắng, núm hình rồng cách điệu, chữ đỏ
  bb_w6_10: (c) => { c.rect(6, 14, 20, 14, '#c9cfdf'); c.rect(7, 15, 18, 12, '#eef1f7'); c.poly([10, 14, 12, 6, 20, 6, 22, 14], '#e8a93a'); c.poly([12, 6, 16, 2, 20, 6], '#ffe08a'); c.rect(10, 18, 12, 6, '#d8463c'); c.hline(12, 20, 8, '#eef1f7'); c.vline(16, 18, 6, '#eef1f7') },
}
for (const [id, fn] of Object.entries(BB)) sprite(id, { w: 32, h: 32, outline: 'k' }, fn)

// ================================================================ HÌNH "KHI CẦM" (chỉ hiển thị trên tay nhân vật, không phải ô đồ)
// Tọa độ khớp nắm tay trên sprite nhân vật (xem WEAPON_HOLD trong src/config/items.ts).

// --- Thương cầm CHÉO 80x80: MŨI dưới-trái (trước chân, chĩa xuống), ĐỐC trên-phải (sau vai). Điểm cầm (24,55).
// Mũi vẽ bằng tọa độ lật tâm: m(x) = 79 - x (áp cho cả x lẫn y) để giữ nguyên hình mũi lá cũ.
function spearDiag(c, t) {
  const P = T[t], M = P.m, A = P.a
  const m = (v) => 79 - v, mp = (arr) => arr.map(m)
  c.line(13, 66, 76, 3, P.h[0], 3); c.line(14, 65, 75, 4, P.h[1], 1)           // cán
  for (const d of [30, 44, 62]) c.line(3 + d, 76 - d, 4 + d, 75 - d, A[1], 3)   // vòng đai cán
  c.line(75, 4, 78, 1, M[1], 3)                                                   // đốc cán bịt kim loại (sau vai)
  c.poly(mp([62, 15, 60, 23, 64, 20, 67, 24, 69, 17]), A[1]); c.px(m(64), m(18), A[2])   // tua dưới mũi
  c.poly(mp([65, 14, 70, 5, 78, 1, 75, 9, 67, 16]), M[1]); c.poly(mp([66, 14, 71, 6, 77, 2, 69, 13]), M[2]); c.line(m(67), m(13), m(77), m(2), M[3], 1)   // mũi lá
  if (t >= 2) { c.poly(mp([64, 11, 68, 13, 66, 9]), A[2]); c.poly(mp([68, 17, 70, 13, 72, 15]), A[2]) }   // ngạnh mây
  if (P.g) c.px(m(66), m(15), P.g)
  if (t === 5) for (let i = 0; i < 6; i++) c.px(24 + i * 9, 55 - i * 9, RAINBOW[i])
  sparkles(c, t, [[5, 69], [40, 40]])
}
for (let t = 0; t < 6; t++) sprite(`wp_spear_diag_${t}`, { w: 80, h: 80, outline: 'k' }, (c) => spearDiag(c, t))

// --- Cung xoay CHÉO 62x52: bụng cung (chuôi) ở (22,40) = nắm tay; cánh trên tới (3,4), cánh dưới tới (57,48); dây thẳng giữa 2 đầu.
function bowDiag(c, t) {
  const P = T[t], M = P.m, A = P.a
  const T1 = [3, 4], G = [22, 40], T2 = [57, 48]
  const C = [2 * G[0] - (T1[0] + T2[0]) / 2, 2 * G[1] - (T1[1] + T2[1]) / 2]   // điểm điều khiển để đường cong đi qua chuôi
  const at = (u) => [(1 - u) ** 2 * T1[0] + 2 * (1 - u) * u * C[0] + u * u * T2[0], (1 - u) ** 2 * T1[1] + 2 * (1 - u) * u * C[1] + u * u * T2[1]]
  c.line(T1[0], T1[1], T2[0], T2[1], '#e8e2d0', 1)                               // dây cung
  for (let i = 0; i <= 120; i++) { const [x, y] = at(i / 120); c.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, P.h[0]) }
  for (let i = 0; i <= 120; i++) { const [x, y] = at(i / 120); c.px(Math.round(x), Math.round(y) - 1, P.h[1]) }
  c.circ(T1[0], T1[1], 2, M[2]); c.circ(T2[0], T2[1], 2, M[2])                  // đầu cánh bịt kim loại
  c.rect(G[0] - 3, G[1] - 3, 6, 6, A[1]); c.rect(G[0] - 2, G[1] - 2, 4, 4, A[2]) // chuôi quấn
  if (P.g) { c.px(G[0], G[1], P.g); c.px(G[0] - 1, G[1], P.g) }
  if (t >= 2) for (const u of [0.18, 0.82]) { const [x, y] = at(u); c.ring(Math.round(x), Math.round(y), 2, A[2]) }   // vân mây cánh
  if (t >= 3) for (const u of [0.3, 0.7]) { const [x, y] = at(u); c.px(Math.round(x) - 1, Math.round(y) + 1, A[1]) }
  if (t === 5) for (let i = 0; i < 7; i++) { const [x, y] = at(0.08 + i * 0.14); c.px(Math.round(x), Math.round(y), RAINBOW[i]) }
  sparkles(c, t, [[8, 14], [46, 46]])
}
for (let t = 0; t < 6; t++) sprite(`wp_bow_diag_${t}`, { w: 62, h: 52, outline: 'k' }, (c) => bowDiag(c, t))

// --- Quạt nhỏ CHE TRƯỚC NGỰC 30x22: quạt xòe nửa vòng hướng lên, trục ở (15,19), có bàn tay nắm cán + cổ tay áo.
function fanHeld(c, t) {
  const P = T[t], M = P.m, A = P.a
  const cx = 15, cy = 19, R = 14
  for (let a = -168; a <= -12; a++) {
    const r = (a * Math.PI) / 180
    for (let d = 5; d <= R; d++) {
      const x = Math.round(cx + Math.cos(r) * d), y = Math.round(cy + Math.sin(r) * d)
      const band = Math.floor((a + 168) / 20) % 2
      c.px(x, y, d >= R - 1 ? A[0] : band ? P.c[1] : P.c[2])
    }
  }
  for (let a = -168; a <= -12; a += 20) { const r = (a * Math.PI) / 180; c.line(cx, cy, Math.round(cx + Math.cos(r) * R), Math.round(cy + Math.sin(r) * R), M[1], 1) }
  if (t >= 1) { c.circ(15, 10, 2, A[1]); c.px(15, 10, P.g ?? A[2]) }
  if (t >= 2) for (const x of [8, 22]) c.px(x, 11, A[2])
  if (t === 5) for (let i = 0; i < 7; i++) { const r = ((-160 + i * 23) * Math.PI) / 180; c.px(Math.round(cx + Math.cos(r) * 11), Math.round(cy + Math.sin(r) * 11), RAINBOW[i]) }
  // bàn tay nắm cán quạt + cổ tay áo (tay phải đi từ phía sau thân ra)
  c.rect(5, 18, 6, 3, '#262838'); c.hline(5, 18, 6, '#3a3c50')
  c.rect(11, 17, 6, 4, '#f2cab0'); c.hline(11, 20, 6, '#c99a80'); c.px(16, 17, '#c99a80'); c.vline(13, 18, 2, '#c99a80')
  c.circ(15, 19, 1, M[2])
  sparkles(c, t, [[4, 8], [26, 8]])
}
for (let t = 0; t < 6; t++) sprite(`wp_fan_held_${t}`, { w: 30, h: 22, outline: 'k' }, (c) => fanHeld(c, t))

// --- Quyền sáo đeo CẢ HAI TAY: găng giáp có khối + viền đen (nổi lên khỏi nắm tay, không dẹt như hình xăm).
// Cấu tạo (nhìn nghiêng, phía trước = trái): ống cổ tay loe ở trên, phiến giáp mu bàn tay, hàng gai đốt ngón nhô ra trước.
// near = tay gần (giữa thân), far = tay xa (mép trái, nhỏ hơn).
function knuckle(c, t, w, h) {
  const P = T[t], M = P.m, A = P.a
  c.rect(2, 0, w - 2, 3, A[1]); c.hline(2, 0, w - 2, A[2]); c.hline(2, 2, w - 2, A[0] ?? M[0])   // ống cổ tay (màu điểm nhấn)
  c.rect(1, 3, w - 1, h - 3, M[1])                                                // phiến giáp
  c.rect(2, 4, w - 4, 1, M[3]); c.vline(w - 2, 4, h - 5, M[2]); c.hline(2, h - 1, w - 2, M[0])   // sáng mép trên, tối mép dưới → có khối
  c.rect(3, 5, w - 6, h - 7, M[2])
  for (let y = 4; y < h - 1; y += 2) { c.px(0, y, M[3]); c.px(1, y, t >= 3 ? A[2] : M[2]) }   // gai đốt ngón nhô ra trước
  if (P.g) c.px(Math.floor(w / 2) + 1, Math.floor(h / 2) + 1, P.g)
  if (t === 5) { c.px(3, h - 2, RAINBOW[0]); c.px(5, h - 2, RAINBOW[3]); c.px(w - 3, 1, RAINBOW[5]) }
}
for (let t = 0; t < 6; t++) {
  sprite(`wp_fist_near_${t}`, { w: 11, h: 11, outline: 'k' }, (c) => knuckle(c, t, 11, 11))
  sprite(`wp_fist_far_${t}`, { w: 8, h: 10, outline: 'k' }, (c) => knuckle(c, t, 8, 10))
}
