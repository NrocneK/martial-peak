// Vạn Giới Tầm Quang — icon kỹ năng 32x32
// Khung: thép = kỹ năng vũ khí, ngọc = kỹ năng cảnh giới, bát giác đồng = bị động, vàng = thức tỉnh.
pal({
  k: "#14101f", x: "#05040a", w: "#ffffff",
  a: "#c9cfdb", A: "#7a8296",
  b: "#9fd8ff", B: "#3f7fd6", D: "#23408f",
  r: "#e2484a", R: "#9c2636",
  o: "#f08a2c", y: "#ffd95a", Y: "#c98f1e",
  g: "#6fd36a", G: "#2f8a4a",
  p: "#b77bf0", P: "#6a3fb0",
  c: "#5ff0e0", C: "#1f9c9c",
  m: "#8a5a34", M: "#5a3620",
  i: "#ff9ecf", I: "#d05a9a",
  z: "#fff3b0", Z: "#ffc83a", q: "#b8fff6",
  n: "#1d2140", N: "#2a2f5c",
  e: "#16302b", E: "#1f4a3d",
  u: "#3a1024", U: "#6a1d3c",
  s: "#8a94a8", S: "#555d73",
  j: "#4fc9a0", J: "#2b7f6b",
  t: "#c58a4a", T: "#7d5126",
  v: "#241a45", V: "#3a2a6e",
})

const rad = (d) => (d * Math.PI) / 180
// cung tròn theo góc (độ, 0 = phải, 90 = xuống)
function arc(c, cx, cy, r, a0, a1, col) {
  for (let a = a0; a <= a1; a += 2) c.px(Math.round(cx + r * Math.cos(rad(a))), Math.round(cy + r * Math.sin(rad(a))), col)
}
// kiếm: mũi tại (tx,ty), thân chạy theo hướng (dx,dy)
function sword(c, tx, ty, dx, dy, len, bc = "a", hc = "Y", gc = "m") {
  const ex = tx + dx * len, ey = ty + dy * len
  c.line(tx, ty, ex, ey, bc, 2)
  c.line(tx, ty, ex - dx, ey - dy, "w")
  c.line(ex - dy * 2, ey + dx * 2, ex + dy * 2, ey - dx * 2, hc)       // chắn tay
  c.line(ex + dx, ey + dy, ex + dx * 3, ey + dy * 3, gc)               // chuôi
  c.px(ex + dx * 4, ey + dy * 4, hc)
}
function star(c, x, y, col = "w", r = 2) {
  c.hline(x - r, y, r * 2 + 1, col); c.vline(x, y - r, r * 2 + 1, col)
}
function mpoly(c, pts, col) {          // vẽ đa giác và bản đối xứng qua trục x = 13
  c.poly(pts, col)
  c.poly(pts.map((v, i) => (i % 2 ? v : 26 - v)), col)
}

// ---------------- họa tiết (vùng vẽ 26x26) ----------------
const M = {
  // ===== vũ khí =====
  ngu_kiem(c, aw) {
    if (!aw) {
      c.line(4, 9, 9, 4, "b"); c.line(1, 14, 5, 10, "B")
      c.line(21, 12, 16, 17, "b"); c.line(22, 16, 18, 20, "B"); c.line(14, 24, 17, 21, "b")
      sword(c, 22, 3, -1, 1, 11)
    } else {
      sword(c, 5, 7, 0, 1, 10, "y", "Z", "R"); sword(c, 20, 7, 0, 1, 10, "y", "Z", "R")
      sword(c, 12, 1, 0, 1, 16, "z", "Z", "r")
      c.px(9, 3, "z"); c.px(16, 3, "z"); c.px(2, 5, "Z"); c.px(23, 5, "Z"); c.hline(8, 24, 10, "Z")
    }
  },
  ba_dao(c, aw) {
    const bl = aw ? "y" : "a", sl = aw ? "z" : "r"
    arc(c, 9, 17, 14, 265, 365, sl); arc(c, 9, 17, 15, 275, 355, aw ? "Z" : "R")
    if (aw) arc(c, 9, 17, 12, 285, 345, "r")
    c.poly([7, 19, 9, 21, 20, 11, 22, 4, 17, 8], bl)
    c.line(8, 19, 18, 9, "w"); c.line(21, 5, 20, 10, aw ? "Z" : "A")
    c.line(5, 18, 10, 23, "Y", 2); c.line(2, 24, 5, 21, "m", 2)
  },
  pha_thuong(c, aw) {
    c.line(2, 23, 16, 9, aw ? "R" : "m", 2)
    c.poly([15, 8, 18, 11, 24, 2], aw ? "z" : "a"); c.line(17, 9, 23, 3, "w")
    c.rect(13, 10, 3, 3, "r"); c.px(12, 13, "R"); c.px(13, 14, "r")
    if (!aw) { c.line(20, 13, 24, 9, "b"); c.line(11, 3, 14, 0, "b") }
    else {
      for (let t = 0; t < 22; t++) {          // long khí quấn quanh thân thương
        const x = 3 + t * 0.85, y = 22 - t * 0.85, o = Math.sin(t * 0.8) * 3.2
        c.px(Math.round(x + o), Math.round(y + o), t % 2 ? "Z" : "z")
      }
      star(c, 23, 3, "z", 2)
    }
  },
  bang_quyen(c, aw) {
    const f = aw ? "y" : "a", d = aw ? "Y" : "A"
    for (let i = 0; i < 4; i++) c.rect(7 + i * 3, 7, 3, 5, i % 2 ? d : f)
    c.rect(7, 11, 12, 7, f); c.rect(7, 16, 12, 2, d); c.rect(5, 12, 3, 5, d)
    c.hline(8, 8, 2, "w"); c.hline(14, 8, 2, "w")
    c.rect(9, 18, 8, 5, aw ? "r" : "Y"); c.hline(9, 20, 8, aw ? "R" : "m")
    const fx = aw ? "z" : "y"
    c.vline(13, 1, 4, fx); c.line(5, 2, 7, 4, fx); c.line(21, 2, 19, 4, fx)
    if (aw) { arc(c, 13, 12, 12, 200, 340, "Z"); c.line(2, 24, 6, 21, "z"); c.line(24, 24, 20, 21, "z"); c.line(1, 19, 4, 18, "Z"); c.line(25, 19, 22, 18, "Z") }
  },
  truy_tien(c, aw) {
    arc(c, 19, 13, 12, 115, 245, aw ? "Z" : "m"); arc(c, 20, 13, 12, 120, 240, aw ? "Y" : "M")
    c.line(14, 2, 14, 24, "a")
    const ar = aw ? "z" : "a"
    if (aw) { c.line(22, 7, 5, 4, "Z"); c.line(22, 19, 5, 22, "Z"); c.poly([2, 3, 6, 2, 6, 6], "z"); c.poly([2, 23, 6, 20, 6, 24], "z") }
    c.hline(4, 13, 20, ar); c.poly([1, 13, 6, 10, 6, 17], aw ? "w" : "w")
    c.px(23, 12, "r"); c.px(23, 14, "r"); c.px(24, 11, "r"); c.px(24, 15, "r")
    if (aw) star(c, 2, 13, "w", 2); else { c.px(3, 8, "b"); c.px(8, 6, "b") }
  },
  thanh_phien(c, aw) {
    const f = aw ? "y" : "c", F = aw ? "Y" : "C"
    const pts = [13, 22]
    for (let a = 205; a <= 335; a += 10) pts.push(Math.round(13 + 14 * Math.cos(rad(a))), Math.round(22 + 14 * Math.sin(rad(a))))
    c.poly(pts, f)
    arc(c, 13, 22, 13, 205, 335, "w"); arc(c, 13, 22, 9, 205, 335, F)
    for (let a = 205; a <= 335; a += 26) c.line(13, 22, Math.round(13 + 13 * Math.cos(rad(a))), Math.round(22 + 13 * Math.sin(rad(a))), "M")
    c.circ(13, 22, 1, "Y"); c.px(13, 24, "r"); c.px(13, 25, "r")
    if (!aw) { arc(c, 21, 6, 3, 180, 330, "b"); arc(c, 4, 5, 2, 200, 360, "b") }
    else { arc(c, 13, 22, 16, 215, 325, "q"); arc(c, 6, 5, 4, 150, 330, "q"); arc(c, 20, 5, 4, 210, 390, "q"); c.px(13, 2, "w") }
  },
  // ===== cảnh giới =====
  ho_khieu(c, aw) {
    const cl = aw ? "Z" : "o", ch = aw ? "z" : "y"
    arc(c, 13, 13, 12, 0, 360, aw ? "r" : "R")
    if (aw) { c.px(1, 3, "z"); c.px(24, 22, "z"); c.px(23, 2, "Z"); c.px(2, 23, "Z") }
    const n = aw ? 4 : 3, x0 = aw ? 6 : 8
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 5
      c.line(x + 2, 4, x - 2, 21, cl, 2); c.line(x + 2, 5, x, 14, ch)
    }
  },
  linh_dan(c, aw) {
    const o = aw ? "q" : "b", t = aw ? "c" : "B"
    c.line(12, 14, 3, 23, t, 3); c.line(11, 13, 5, 19, o)
    c.circ(16, 9, 6, t); c.circ(16, 9, 4, o); c.circ(15, 8, 2, "w")
    if (!aw) { c.px(5, 8, "b"); c.px(22, 19, "b"); c.px(8, 4, "w") }
    else { c.circ(5, 7, 2, "q"); c.px(5, 7, "w"); c.circ(21, 21, 2, "q"); c.px(21, 21, "w"); star(c, 16, 9, "w", 5); arc(c, 16, 9, 9, 0, 360, "C") }
  },
  hoa_phu(c, aw) {
    c.poly([4, 25, 2, 18, 6, 20, 8, 13, 12, 18, 14, 11, 18, 17, 21, 14, 23, 20, 21, 25], aw ? "r" : "o")
    c.poly([7, 25, 7, 21, 10, 22, 13, 17, 16, 22, 19, 21, 18, 25], aw ? "Z" : "y")
    if (aw) c.poly([10, 25, 13, 21, 16, 25], "z")
    c.rect(8, 1, 10, 16, aw ? "r" : "y"); c.rect(8, 1, 10, 2, aw ? "R" : "Y")
    const ru = aw ? "z" : "r"
    c.vline(13, 4, 11, ru); c.hline(10, 6, 6, ru); c.hline(11, 10, 4, ru); c.px(10, 13, ru); c.px(15, 13, ru)
    if (aw) { c.px(3, 8, "z"); c.px(22, 6, "z"); c.px(5, 3, "Z"); c.px(21, 11, "Z") }
  },
  kim_dan(c, aw) {
    arc(c, 13, 13, 9, 0, 360, "Y")
    if (aw) { for (let a = 0; a < 360; a += 3) c.px(Math.round(13 + 12 * Math.cos(rad(a))), Math.round(13 + 6 * Math.sin(rad(a))), "Z") }
    c.circ(13, 13, 3, "o"); c.circ(13, 13, 2, aw ? "z" : "y"); c.px(12, 12, "w")
    const n = aw ? 6 : 3
    for (let i = 0; i < n; i++) {
      const a = -90 + (i * 360) / n, x = Math.round(13 + 9 * Math.cos(rad(a))), y = Math.round(13 + 9 * Math.sin(rad(a)))
      c.circ(x, y, 2, aw ? "Z" : "y"); c.px(x - 1, y - 1, aw ? "z" : "w"); c.px(x + 1, y + 1, "Y")
    }
    if (aw) { c.vline(13, 7, 2, "z"); c.vline(13, 18, 2, "z"); c.hline(7, 13, 2, "z"); c.hline(18, 13, 2, "z") }
  },
  nguyen_anh(c, aw) {
    const f = aw ? "z" : "c", F = aw ? "Z" : "C"
    if (aw) { c.circ(4, 14, 2, "C"); c.poly([1, 22, 4, 16, 8, 22], "C"); c.circ(22, 14, 2, "C"); c.poly([19, 22, 22, 16, 26, 22], "C"); arc(c, 13, 7, 7, 150, 390, "Z") }
    else arc(c, 13, 13, 12, 200, 340, "b")
    c.ellipse(13, 21, 8, 2, F)
    c.poly([7, 20, 10, 13, 16, 13, 19, 20], f); c.line(8, 18, 12, 16, F); c.line(18, 18, 14, 16, F)
    c.circ(13, 8, 4, f); c.px(11, 8, "k"); c.px(15, 8, "k"); c.px(13, 3, F); c.px(13, 2, F)
    c.px(11, 6, "w")
  },
  than_thuc(c, aw) {
    if (!aw) {
      c.ellipse(13, 13, 11, 6, "w"); arc(c, 13, 15, 12, 205, 335, "P")
      c.circ(13, 13, 4, "p"); c.circ(13, 13, 2, "k"); c.px(12, 12, "w")
      c.vline(13, 1, 4, "p"); c.line(6, 3, 8, 6, "p"); c.line(20, 3, 18, 6, "p"); c.vline(13, 21, 4, "P")
    } else {
      for (let a = 0; a < 360; a += 30) c.line(Math.round(13 + 9 * Math.cos(rad(a))), Math.round(13 + 9 * Math.sin(rad(a))), Math.round(13 + 12 * Math.cos(rad(a))), Math.round(13 + 12 * Math.sin(rad(a))), "Z")
      c.ellipse(13, 13, 6, 11, "w"); c.ellipse(13, 13, 4, 8, "Z"); c.ellipse(13, 13, 1, 6, "k"); c.px(12, 9, "w")
      c.line(2, 24, 24, 2, "z")
    }
  },
  hu_khong(c, aw) {
    if (!aw) {
      c.poly([12, 0, 18, 7, 15, 11, 21, 18, 14, 26, 8, 18, 11, 13, 6, 7], "p")
      c.poly([12, 3, 16, 7, 13, 11, 18, 18, 14, 23, 11, 18, 13, 13, 9, 7], "x")
      c.px(12, 6, "w"); c.px(15, 17, "p"); c.px(13, 20, "w"); c.px(12, 9, "P")
      arc(c, 13, 13, 11, 150, 215, "P"); arc(c, 13, 13, 11, 330, 395, "P"); c.px(4, 6, "p"); c.px(22, 21, "p")
    } else {
      c.circ(13, 13, 12, "P")
      for (let k = 0; k < 3; k++) for (let t = 0; t < 26; t++) {
        const a = k * 120 + t * 11, r = 4 + t * 0.32
        c.px(Math.round(13 + r * Math.cos(rad(a))), Math.round(13 + r * Math.sin(rad(a))), t % 3 ? "p" : "z")
      }
      c.circ(13, 13, 4, "x"); arc(c, 13, 13, 5, 0, 360, "Z"); c.px(12, 12, "P")
    }
  },
  phap_tuong(c, aw) {
    const f = aw ? "y" : "y", d = aw ? "o" : "Y"
    if (aw) for (let a = 200; a <= 340; a += 20) c.line(Math.round(13 + 9 * Math.cos(rad(a))), Math.round(12 + 9 * Math.sin(rad(a))), Math.round(13 + 13 * Math.cos(rad(a))), Math.round(12 + 13 * Math.sin(rad(a))), "z")
    c.rect(8, 3, 2, 9, f); c.rect(11, 1, 2, 11, f); c.rect(14, 1, 2, 11, f); c.rect(17, 3, 2, 9, f)
    c.rect(7, 11, 13, 10, f); c.rect(4, 12, 3, 6, f); c.px(5, 18, f); c.px(6, 18, f); c.px(6, 19, f)
    c.rect(18, 12, 2, 9, d); c.hline(8, 20, 12, d); c.vline(10, 4, 7, d); c.vline(13, 2, 9, d); c.vline(16, 2, 9, d)
    c.circ(12, 15, 2, aw ? "i" : "r"); c.px(12, 15, aw ? "w" : "y")
    c.circ(5, 23, 2, "a"); c.circ(10, 24, 2, "w"); c.circ(16, 24, 2, "a"); c.circ(21, 23, 2, "w")
  },
  van_kiem(c, aw) {
    if (!aw) {
      const s = [[4, 12], [9, 20], [13, 14], [18, 24], [22, 16]]
      for (const [x, y] of s) { c.vline(x, y - 10, 9, "a"); c.px(x, y, "w"); c.px(x, y - 1, "w"); c.hline(x - 1, y - 10, 3, "Y"); c.px(x, y - 12, "m"); c.px(x, y - 11, "m") }
      c.px(6, 22, "b"); c.px(15, 22, "b"); c.px(22, 22, "b"); c.px(11, 4, "b")
    } else {
      for (let a = 0; a < 360; a += 12) c.px(Math.round(13 + 12 * Math.cos(rad(a))), Math.round(13 + 12 * Math.sin(rad(a))), "r")
      sword(c, 12, 10, 0, -1, 6, "y", "Z", "R"); sword(c, 12, 15, 0, 1, 6, "y", "Z", "R")
      sword(c, 10, 12, -1, 0, 6, "y", "Z", "R"); sword(c, 15, 12, 1, 0, 6, "y", "Z", "R")
      c.rect(11, 11, 4, 4, "r"); c.rect(12, 12, 2, 2, "z")
      for (const [x, y] of [[6, 6], [19, 6], [6, 19], [19, 19]]) c.px(x, y, "z")
    }
  },
  than_loi(c, aw) {
    const cl = aw ? "P" : "A", ch = aw ? "p" : "a"
    c.circ(7, 6, 4, cl); c.circ(13, 5, 5, cl); c.circ(19, 6, 4, cl); c.rect(5, 6, 16, 4, cl)
    c.circ(8, 5, 2, ch); c.circ(14, 4, 3, ch); c.hline(6, 9, 14, aw ? "v" : "S")
    c.poly([14, 9, 9, 17, 13, 17, 10, 26, 18, 14, 14, 14, 17, 9], aw ? "z" : "y"); c.line(14, 10, 12, 16, "w")
    if (aw) {
      c.line(6, 10, 3, 16, "p"); c.line(3, 16, 6, 16, "p"); c.line(6, 16, 3, 23, "p")
      c.line(20, 10, 23, 16, "p"); c.line(23, 16, 20, 16, "p"); c.line(20, 16, 23, 23, "p")
    }
  },
  lien_hoa(c, aw) {
    const p1 = aw ? "y" : "i", p2 = aw ? "o" : "I", lf = aw ? "c" : "G"
    if (aw) { c.rect(12, 0, 3, 9, "z"); c.vline(13, 0, 9, "w"); c.px(6, 3, "z"); c.px(20, 5, "z"); c.px(4, 9, "Z"); c.px(22, 10, "Z") }
    c.ellipse(13, 22, 11, 2, lf)
    mpoly(c, [0, 14, 4, 21, 12, 22, 7, 16], p2)
    mpoly(c, [4, 9, 6, 19, 12, 21, 10, 13], p1)
    c.poly([13, 5, 9, 14, 13, 21, 17, 14], p1); c.line(13, 8, 13, 19, p2); c.line(12, 8, 10, 14, "w")
    c.px(12, 20, "y"); c.px(14, 20, "y"); c.px(13, 21, "y")
  },
  ngan_ha(c, aw) {
    const f = aw ? "q" : "b"
    if (aw) for (let k = 0; k < 2; k++) for (let t = 0; t < 24; t++) {
      const a = k * 180 + t * 12, r = 3 + t * 0.42
      c.px(Math.round(13 + r * Math.cos(rad(a))), Math.round(13 + r * Math.sin(rad(a))), t % 2 ? "B" : "c")
    } else { arc(c, 13, 13, 12, 190, 260, "B"); arc(c, 13, 13, 12, 10, 80, "B") }
    const R = aw ? 11 : 9
    for (let a = 30; a < 360; a += 60) {
      const ca = Math.cos(rad(a)), sa = Math.sin(rad(a))
      c.line(13, 13, Math.round(13 + R * ca), Math.round(13 + R * sa), f)
      const bx = 13 + (R - 3) * ca, by = 13 + (R - 3) * sa
      c.line(Math.round(bx), Math.round(by), Math.round(bx + 3 * Math.cos(rad(a + 60))), Math.round(by + 3 * Math.sin(rad(a + 60))), f)
      c.line(Math.round(bx), Math.round(by), Math.round(bx + 3 * Math.cos(rad(a - 60))), Math.round(by + 3 * Math.sin(rad(a - 60))), f)
    }
    c.circ(13, 13, 2, "w"); c.px(3, 4, "w"); c.px(22, 3, "w"); c.px(23, 20, "w"); c.px(2, 21, "w")
  },
  hoang_chung(c, aw) {
    const f = aw ? "Z" : "Y", h = aw ? "z" : "y", d = aw ? "o" : "m"
    c.rect(11, 1, 4, 3, f); c.px(12, 2, "k"); c.px(13, 2, "k")
    c.poly([5, 21, 7, 10, 10, 4, 16, 4, 19, 10, 21, 21], f)
    c.poly([8, 20, 9, 10, 11, 6, 13, 6, 12, 10, 11, 20], h)
    c.hline(8, 9, 10, d); c.hline(6, 17, 14, d); c.rect(4, 20, 18, 2, h); c.hline(4, 22, 18, d)
    c.circ(13, 24, 1, d)
    const s = aw ? "z" : "b"
    arc(c, 13, 13, 12, 150, 210, s); arc(c, 13, 13, 12, 330, 390, s)
    if (aw) { arc(c, 13, 13, 14, 160, 200, "Z"); arc(c, 13, 13, 14, 340, 380, "Z"); c.rect(12, 12, 3, 3, "r"); c.px(13, 13, "z") }
  },
  kim_than(c, aw) {
    const f = "y", d = aw ? "o" : "Y"
    if (aw) { c.circ(13, 7, 7, "r"); c.circ(13, 7, 6, "R"); arc(c, 13, 7, 7, 0, 360, "Z"); for (let a = 180; a <= 360; a += 30) c.px(Math.round(13 + 10 * Math.cos(rad(a))), Math.round(7 + 10 * Math.sin(rad(a))), "z") }
    else arc(c, 13, 13, 12, 185, 355, "o")
    c.ellipse(13, 21, 10, 3, aw ? "i" : d); if (aw) c.hline(5, 23, 17, "I")
    c.poly([7, 20, 8, 12, 18, 12, 19, 20], f); c.line(7, 19, 12, 17, d); c.line(19, 19, 14, 17, d); c.rect(11, 16, 4, 2, d)
    c.circ(13, 7, 3, f); c.px(13, 3, d); c.px(12, 6, aw ? "z" : "w"); c.hline(12, 8, 3, d)
    if (aw) { c.line(9, 13, 9, 18, "z"); c.px(13, 14, "z") }
  },
  linh_vuc(c, aw) {
    const r1 = aw ? "r" : "p", r2 = aw ? "R" : "P"
    c.ellipse(13, 18, 12, 6, r2); c.ellipse(13, 18, 10, 4, aw ? "u" : "v")
    for (let a = 0; a < 360; a += 6) c.px(Math.round(13 + 12 * Math.cos(rad(a))), Math.round(18 + 6 * Math.sin(rad(a))), r1)
    for (let a = 0; a < 360; a += 20) c.px(Math.round(13 + 8 * Math.cos(rad(a))), Math.round(18 + 3 * Math.sin(rad(a))), r1)
    const cr = aw ? "z" : "y"
    c.poly([7, 12, 7, 4, 10, 8, 13, 2, 16, 8, 19, 4, 19, 12], cr); c.rect(7, 12, 12, 2, aw ? "Z" : "Y")
    c.px(10, 11, "r"); c.px(13, 10, aw ? "r" : "b"); c.px(16, 11, "r"); c.px(13, 4, "w")
    if (aw) { c.vline(13, 15, 9, "z"); c.hline(11, 17, 5, "Z"); c.px(13, 24, "w") }
  },
  de_an(c, aw) {
    const f = aw ? "Z" : "g", d = aw ? "Y" : "G", h = aw ? "z" : "c"
    c.vline(3, 2, 6, "a"); c.vline(22, 4, 6, "a"); c.vline(6, 0, 3, "A"); c.vline(19, 1, 3, "A")
    c.poly([10, 12, 10, 6, 12, 3, 14, 3, 16, 6, 16, 12], f); c.rect(14, 5, 2, 7, d); c.px(11, 5, h); c.hline(10, 11, 6, d)
    if (aw) { c.px(10, 4, "z"); c.px(16, 4, "z"); c.px(9, 3, "Z"); c.px(17, 3, "Z"); c.hline(11, 9, 5, "z") }
    c.rect(5, 12, 16, 9, f); c.rect(5, 12, 16, 2, h); c.rect(19, 14, 2, 7, d)
    c.rect(5, 21, 16, 2, "r"); c.hline(5, 23, 16, "R")
    c.box(8, 15, 9, 5, d); c.px(12, 17, d)
    if (aw) { c.line(1, 25, 4, 22, "z"); c.line(24, 25, 21, 22, "z"); c.hline(0, 23, 3, "Z"); c.hline(23, 23, 3, "Z"); c.px(12, 25, "z") }
  },
  dai_dao(c, aw) {
    const lt = aw ? "z" : "w", dk = aw ? "P" : "D"
    if (aw) for (let a = 0; a < 360; a += 45) {
      const ca = Math.cos(rad(a + 22)), sa = Math.sin(rad(a + 22))
      c.line(Math.round(13 + 11 * ca - 2 * sa), Math.round(13 + 11 * sa + 2 * ca), Math.round(13 + 11 * ca + 2 * sa), Math.round(13 + 11 * sa - 2 * ca), "Z")
    }
    const R = aw ? 8.5 : 10.5, h = R / 2
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) {
      const dx = x - 13, dy = y - 13
      if (dx * dx + dy * dy > R * R) continue
      let col = dx < 0 ? dk : lt
      if (dx * dx + (dy + h) * (dy + h) <= h * h) col = lt
      if (dx * dx + (dy - h) * (dy - h) <= h * h) col = dk
      c.px(x, y, col)
    }
    c.circ(13, Math.round(13 - h), 1, dk); c.circ(13, Math.round(13 + h), 1, lt)
    if (!aw) { c.px(2, 4, "b"); c.px(23, 22, "b"); c.px(22, 3, "w"); c.px(3, 22, "w") }
  },
}

// ---------------- bị động ----------------
const PM = {
  kiem_tam(c) {
    arc(c, 13, 12, 8, 0, 360, "b")
    sword(c, 13, 2, 0, 1, 14, "a", "Y", "m")
    star(c, 21, 5, "y", 2); c.px(5, 6, "w")
  },
  sat_phat(c) {
    c.poly([13, 14, 9, 22, 13, 25, 17, 22], "R"); c.poly([13, 17, 11, 22, 13, 24, 15, 22], "r")
    c.line(5, 4, 19, 18, "a", 2); c.line(5, 4, 17, 16, "w"); c.line(21, 4, 7, 18, "a", 2); c.line(21, 4, 9, 16, "w")
    c.line(16, 20, 21, 15, "R"); c.line(10, 20, 5, 15, "R"); c.px(21, 20, "r"); c.px(5, 20, "r"); c.px(22, 21, "r"); c.px(4, 21, "r")
  },
  tieu_dao(c) {
    c.rect(11, 4, 5, 11, "B"); c.rect(11, 13, 10, 5, "B"); c.rect(10, 3, 7, 2, "w"); c.hline(11, 18, 11, "a")
    c.vline(12, 6, 8, "b"); c.hline(17, 14, 3, "b")
    c.circ(6, 21, 2, "a"); c.circ(11, 22, 3, "w"); c.circ(17, 22, 2, "w"); c.circ(21, 21, 2, "a")
    c.hline(3, 8, 5, "c"); c.hline(1, 12, 6, "c"); c.hline(4, 16, 4, "c")
  },
  ba_the(c) {
    c.circ(9, 10, 5, "r"); c.circ(17, 10, 5, "r"); c.poly([4, 12, 23, 12, 13, 23], "r")
    c.circ(8, 8, 1, "w"); c.line(17, 21, 21, 14, "R"); c.px(13, 22, "R")
    c.rect(12, 9, 3, 9, "w"); c.rect(9, 12, 9, 3, "w")
  },
  tat_phong(c) {
    for (const [x, y, l] of [[3, 7, 12], [6, 13, 14], [3, 19, 10]]) {
      c.hline(x, y, l, "c"); c.hline(x + 2, y, l - 6, "w")
      arc(c, x + l, y - 2, 2, -90, 100, "c")
    }
    c.px(2, 10, "b"); c.px(22, 20, "b")
  },
  tu_linh(c) {
    arc(c, 13, 13, 11, 0, 360, "c")
    c.line(13, 3, 13, 23, "C"); c.line(3, 13, 23, 13, "C")
    for (const [x, y] of [[13, 3], [23, 13], [13, 23], [3, 13]]) { c.poly([x, y - 2, x + 3, y + 1, x, y + 3, x - 2, y + 1], "b"); c.px(x, y, "w") }
    c.poly([13, 7, 18, 13, 13, 20, 8, 13], "c"); c.poly([13, 7, 13, 20, 8, 13], "C"); c.line(12, 9, 10, 13, "w")
  },
  ngu_hanh(c) {
    c.poly([8, 3, 4, 11, 3, 17, 6, 22, 11, 22, 13, 17, 11, 11, 9, 13], "r"); c.poly([8, 12, 6, 17, 7, 21, 10, 21, 11, 17], "y")
    c.poly([18, 4, 14, 14, 15, 20, 18, 23, 21, 20, 23, 14], "B"); c.poly([18, 9, 16, 15, 17, 20, 19, 20], "b"); c.px(20, 16, "w")
    c.px(13, 2, "g"); c.px(13, 24, "y"); c.px(2, 8, "a"); c.px(24, 8, "m")
  },
  truong_sinh(c) {
    c.poly([4, 21, 2, 17, 6, 16, 10, 19, 10, 22], "G"); c.poly([22, 21, 24, 17, 20, 16, 16, 19, 16, 22], "g")
    c.circ(13, 14, 7, "i"); c.poly([13, 3, 9, 9, 17, 9], "i")
    c.line(13, 5, 14, 20, "I"); c.circ(10, 12, 2, "w"); c.px(16, 18, "I"); c.px(17, 16, "I")
  },
  than_hon(c) {
    c.poly([14, 1, 9, 9, 8, 14, 18, 14, 17, 8, 12, 6], "B")
    c.circ(13, 15, 7, "B"); c.circ(13, 15, 5, "b"); c.poly([13, 5, 11, 11, 15, 11], "b")
    c.circ(13, 16, 3, "w"); c.px(11, 15, "D"); c.px(15, 15, "D"); c.px(5, 6, "b"); c.px(21, 5, "b"); c.px(4, 20, "B")
  },
  phap_thien(c) {
    c.box(9, 9, 8, 8, "G"); c.rect(11, 11, 4, 4, "y"); c.px(12, 12, "w")
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = sx < 0 ? 8 : 17, cy = sy < 0 ? 8 : 17, ex = sx < 0 ? 3 : 22, ey = sy < 0 ? 3 : 22
      c.line(cx, cy, ex, ey, "g", 2)
      c.hline(sx < 0 ? ex : ex - 4, ey, 5, "g"); c.vline(ex, sy < 0 ? ey : ey - 4, 5, "g")
    }
  },
  huyen_vu(c) {
    c.poly([13, 1, 23, 7, 23, 19, 13, 25, 3, 19, 3, 7], "G")
    c.poly([13, 4, 20, 8, 20, 18, 13, 22, 6, 18, 6, 8], "g")
    c.poly([13, 9, 17, 11, 17, 15, 13, 17, 9, 15, 9, 11], "G")
    c.line(13, 4, 13, 9, "G"); c.line(13, 17, 13, 22, "G"); c.line(6, 8, 9, 11, "G"); c.line(20, 8, 17, 11, "G"); c.line(6, 18, 9, 15, "G"); c.line(20, 18, 17, 15, "G")
    c.line(7, 9, 11, 6, "w"); c.px(13, 13, "y")
  },
  thien_dao(c) {
    c.rect(6, 2, 14, 2, "Y"); c.rect(6, 22, 14, 2, "Y"); c.vline(7, 4, 18, "m"); c.vline(18, 4, 18, "m")
    c.poly([9, 4, 17, 4, 13, 13], "b"); c.poly([13, 13, 9, 22, 17, 22], "b")
    c.poly([10, 7, 16, 7, 13, 12], "y"); c.vline(13, 12, 6, "y"); c.poly([10, 22, 13, 18, 16, 22], "y")
    c.px(10, 5, "w"); star(c, 22, 8, "w", 1); star(c, 3, 16, "w", 1)
  },
}

// ---------------- khung ----------------
function frame(c, kind) {
  if (kind === "passive") {
    const o = (i) => [6 + i, i, 26 - i, i, 32 - i, 6 + i, 32 - i, 26 - i, 26 - i, 32 - i, 6 + i, 32 - i, i, 26 - i, i, 6 + i]
    c.poly(o(0), "k"); c.poly(o(1), "t"); c.poly(o(2), "T"); c.poly(o(3), "e")
    c.grad(4, 16, 24, 10, "eE", "v"); c.line(6, 2, 25, 2, "y"); c.line(2, 6, 5, 3, "y")
    return
  }
  const [hi, lo, bg] = kind === "weapon" ? ["s", "S", "nN"] : kind === "realm" ? ["j", "J", "vV"] : ["z", "Y", "uU"]
  c.rect(0, 0, 32, 32, "k"); c.rect(1, 1, 30, 30, lo); c.hline(1, 1, 30, hi); c.vline(1, 1, 30, hi)
  c.rect(2, 2, 28, 28, "k"); c.grad(3, 3, 26, 26, bg, "v")
  for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31]]) c.px(x, y, "_")
  if (kind === "awaken") {
    c.box(1, 1, 30, 30, "Z"); c.hline(1, 1, 30, "z"); c.vline(1, 1, 30, "z"); c.hline(2, 30, 29, "Y"); c.vline(30, 2, 29, "Y")
    for (const [x, y] of [[1, 1], [28, 1], [1, 28], [28, 28]]) { c.rect(x, y, 3, 3, "k"); c.px(x + 1, y + 1, "r") }
    for (const x of [15, 16]) { c.px(x, 0, "z"); c.px(x, 31, "z") }
    for (const y of [15, 16]) { c.px(0, y, "z"); c.px(31, y, "z") }
  }
}

const WEAPON = ["ngu_kiem", "ba_dao", "pha_thuong", "bang_quyen", "truy_tien", "thanh_phien"]
for (const id of Object.keys(M)) {
  const kind = WEAPON.includes(id) ? "weapon" : "realm"
  sprite("_m_" + id, { w: 26, h: 26, outline: "k" }, (c) => M[id](c, false))
  sprite("_m_" + id + "_aw", { w: 26, h: 26, outline: "k" }, (c) => M[id](c, true))
  sprite(id, { w: 32, h: 32 }, (c) => frame(c, kind), stamp("_m_" + id, 2, 2))
  sprite(id + "_aw", { w: 32, h: 32 }, (c) => frame(c, "awaken"), stamp("_m_" + id + "_aw", 2, 2), glow("z", { r: 2, strength: 0.25 }))
}
for (const id of Object.keys(PM)) {
  sprite("_m_p_" + id, { w: 26, h: 26, outline: "k" }, (c) => PM[id](c))
  sprite("p_" + id, { w: 32, h: 32 }, (c) => frame(c, "passive"), stamp("_m_p_" + id, 2, 2))
}

const ids = Object.keys(M)
sheet("skill_icons", [...ids, ...ids.map((i) => i + "_aw"), ...Object.keys(PM).map((i) => "p_" + i)], { cols: 12, pad: 0 })
