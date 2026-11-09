// =====================================================================
// Pixel art cho giao diện "Vạn Giới Tầm Quang" (dựng bằng pxl).
// Chạy:  node <pxl>/bin/pxl.js build tools/art/ui.px.js --out tools/art/out
// Rồi chép out/scenes/menu_bg.png, out/sprites/*.png, out/anims/lantern.png vào public/ui/
// =====================================================================
pal({
  k: '#090c18', s: '#c9cfe6', L: '#ffc062', n: '#10152b', N: '#1a2140', m: '#29356a', M: '#3f5190', // đêm mực → xanh núi
  a: '#6f7690', A: '#a7adbf', // Hôi Khí (tro)
  y: '#ffbf5e', Y: '#e8862e', o: '#ffeab0', // ánh đèn hổ phách
  j: '#5fd0a5', J: '#2c8a74', // ngọc lục
  r: '#d4483b', R: '#8a2a30', // chu sa
  w: '#efe6d0',
})
ramps('knNmM', 'RrYyo', 'Jjo')

// ---------------------------------------------------------------- Phông menu
sprite('_hero', { outline: 'M' }, `
  ..kkk...
  .kkkkk..
  .kyyk...
  ..kkk...
  .NNNNm..
  NNNNNNm.
  NNmNNNmm
  NNmNNNm.
  .NmNNm..
  .NmNNm..
  .NNNNN..
  .NNNNN..
  .kk.kk..`)

scene('menu_bg', { w: 320, h: 180 },
  rect(0, 0, 320, 120, 'k'),
  grad(0, 0, 320, 122, 'knNmM', 'v'),
  // sao: mỗi sao một điểm, thưa dần xuống chân trời
  (c) => {
    const r = c.rng(11)
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * 320), y = Math.floor(r() * r() * 90)
      c.px(x, y, i % 9 === 0 ? 's' : i % 3 === 0 ? 'A' : 'a')
    }
  },
  // Quang Ấn vỡ trên trời: vòng sáng bị nứt, mảnh vỡ trôi lệch
  layer('seal', (c) => {
    // vòng Quang Ấn vẽ theo cung, chừa hai khe nứt
    const gaps = [[196, 238], [18, 34], [100, 108]]
    const rings = [[26, 'a'], [25, 'M'], [19, 'M'], [12, 'm']]
    for (const [r, col] of rings) {
      for (let d = 0; d < 360; d += 1.2) {
        if (gaps.some(([g0, g1]) => d >= g0 && d <= g1)) continue
        c.px(Math.round(236 + Math.cos((d * Math.PI) / 180) * r), Math.round(46 + Math.sin((d * Math.PI) / 180) * r), col)
      }
    }
    // mảnh vỡ trôi lệch + tia sáng lọt qua khe nứt
    c.rect(214, 28, 3, 2, 'a'); c.px(209, 24, 'M'); c.px(263, 62, 'a'); c.px(266, 66, 'M')
    c.px(228, 40, 's'); c.px(247, 56, 's'); c.px(236, 20, 'A')
  }),
  // núi xa → gần (tối dần để tách lớp), Hôi Khí tràn ở chân núi
  poly([0, 122, 0, 92, 28, 78, 52, 94, 84, 66, 118, 92, 150, 80, 190, 100, 222, 74, 262, 98, 292, 82, 320, 92, 320, 122], 'N'),
  layer('haze1', { light: 1, density: 0.5 }, rect(0, 104, 320, 18, 'a')),
  poly([0, 124, 0, 106, 36, 92, 70, 110, 108, 90, 150, 112, 196, 98, 240, 114, 284, 100, 320, 110, 320, 124], 'n'),
  layer('haze2', { light: 1, density: 0.35 }, rect(0, 112, 320, 12, 'a')),
  // sông Thanh Hà + vệt phản chiếu ánh sáng
  rect(0, 120, 320, 60, 'n'),
  grad(0, 120, 320, 60, 'Nnk', 'v'),
  hline(214, 124, 44, 'M'), hline(222, 127, 30, 'm'), hline(228, 131, 18, 'm'),
  hline(60, 150, 14, 'y'), hline(56, 153, 22, 'Y'), hline(62, 157, 10, 'Y'),
  // vách đá nơi người gác đèn đứng
  poly([0, 180, 0, 128, 32, 124, 74, 120, 98, 126, 118, 146, 132, 180], 'k'),
  poly([0, 128, 32, 124, 74, 120, 98, 126, 98, 128, 74, 124, 32, 128], 'N'),
  poly([190, 180, 214, 160, 250, 156, 288, 150, 320, 148, 320, 180], 'k'),
  // bờ lau bên phải
  (c) => {
    const r = c.rng(5)
    for (let i = 0; i < 26; i++) {
      const x = 226 + Math.floor(r() * 94), y = 148 + Math.floor(r() * 8), len = 5 + Math.floor(r() * 7)
      c.vline(x, y - len, len, 'n')
    }
  },
  stamp('_hero', 66, 107),
  // đèn cầm tay: thân + quầng sáng đổ lên vách đá
  rect(77, 108, 1, 7, 'a'),
  rect(76, 114, 3, 4, 'L'), px(77, 115, 'o'), px(76, 113, 'R'), px(78, 113, 'R'),
  layer('lamp-light', { light: 1, density: 0.3 }, circ(77, 116, 18, 'o')),
  layer('lamp-light2', { light: 1, density: 0.5 }, circ(77, 116, 11, 'o')),
  glow('L', { r: 10, strength: 0.5, color: 'L', bands: 4 }),
)

// ---------------------------------------------------------------- Đèn lồng (hoạt ảnh)
anim('lantern', { w: 20, h: 30, frames: 8, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2
  const f = Math.round(Math.sin(k) * 1)
  c.vline(10, 0, 4, 'a')
  c.rect(5, 4, 10, 2, 'R'); c.rect(6, 3, 8, 1, 'r')
  c.ellipse(10, 14, 6, 8, 'Y'); c.ellipse(10, 14, 4, 6, 'y')
  c.ellipse(10, 15 - f, 2, 3 + (c.frame % 2), 'o')
  c.vline(10, 6, 16, 'R'); c.hline(5, 14, 11, 'R')
  c.rect(6, 22, 8, 2, 'R'); c.rect(7, 24, 6, 1, 'r')
  c.vline(10, 25, 4, 'r'); c.px(9, 28, 'r'); c.px(11, 28, 'r')
})

// ---------------------------------------------------------------- Con dấu chu sa
sprite('seal', { w: 24, h: 24 },
  rect(1, 1, 22, 22, 'r'), box(1, 1, 22, 22, 'R'), box(3, 3, 18, 18, 'R'),
  // chữ "光" cách điệu: đèn trên đế
  rect(11, 6, 2, 3, 'w'), rect(7, 9, 10, 2, 'w'), rect(9, 11, 2, 5, 'w'), rect(13, 11, 2, 5, 'w'),
  rect(6, 17, 12, 2, 'w'), rect(5, 15, 2, 2, 'w'), rect(17, 15, 2, 2, 'w'),
  noise(1, 1, 22, 22, 'R', 0.06, 4, 'r'),
)

// ---------------------------------------------------------------- Biểu tượng tab (16x16)
sprite('ic_stage', { w: 16, h: 16 },
  poly([0, 15, 6, 5, 9, 10, 11, 7, 16, 15], 'M'),
  poly([0, 15, 3, 11, 5, 13, 7, 15], 'm'),
  poly([6, 5, 4, 8, 6, 8, 8, 8], 'w'),
  vline(11, 2, 6, 'A'), poly([12, 2, 16, 3, 12, 5], 'r'))
sprite('ic_cultivate', { w: 16, h: 16 },
  ellipse(4, 10, 2, 4, 'J'), ellipse(12, 10, 2, 4, 'J'),
  ellipse(8, 8, 2, 6, 'j'), ellipse(8, 10, 1, 4, 'o'),
  rect(3, 14, 10, 2, 'a'), px(8, 2, 'y'))
sprite('ic_alchemy', { w: 16, h: 16 },
  circ(8, 5, 3, 'j'), circ(8, 11, 4, 'j'), rect(6, 6, 4, 3, 'j'),
  circ(9, 10, 2, 'o'), circ(8, 12, 3, 'J'), circ(7, 10, 1, 'o'),
  rect(7, 0, 2, 2, 'y'), rect(6, 2, 4, 1, 'Y'))
sprite('ic_forge', { w: 16, h: 16 },
  poly([1, 6, 15, 6, 12, 9, 10, 9, 10, 12, 13, 12, 13, 15, 3, 15, 3, 12, 6, 12, 6, 9, 4, 9], 'a'),
  rect(1, 6, 14, 2, 'A'), rect(3, 13, 10, 2, 'M'), px(12, 2, 'y'), px(14, 3, 'o'), px(10, 3, 'Y'))
sprite('ic_gear', { w: 16, h: 16 },
  poly([5, 2, 7, 4, 9, 4, 11, 2, 15, 5, 14, 8, 12, 8, 12, 15, 4, 15, 4, 8, 2, 8, 1, 5], 'M'),
  poly([7, 4, 9, 4, 8, 6], 'n'), vline(8, 6, 9, 'm'), hline(5, 10, 6, 'y'),
  poly([1, 5, 5, 2, 5, 5, 2, 8], 'A'), poly([15, 5, 11, 2, 11, 5, 14, 8], 'a'))
sprite('ic_skill', { w: 16, h: 16 },
  rect(3, 3, 10, 10, 'w'), rect(2, 2, 12, 2, 'y'), rect(2, 12, 12, 2, 'Y'),
  hline(5, 6, 6, 'a'), hline(5, 8, 5, 'a'), hline(5, 10, 4, 'a'), circ(11, 9, 2, 'r'))

// ---------------------------------------------------------------- Biểu tượng tài nguyên
sprite('ic_linh', { w: 16, h: 16 },
  poly([8, 1, 14, 7, 8, 15, 2, 7], 'j'), poly([8, 1, 14, 7, 8, 7], 'o'), poly([2, 7, 8, 7, 8, 15], 'J'), px(6, 5, 'w'))
sprite('ic_herb', { w: 16, h: 16 },
  poly([3, 13, 3, 7, 9, 2, 13, 3, 12, 9, 6, 13], 'j'), line(3, 14, 11, 5, 'J'), poly([8, 4, 11, 4, 11, 7], 'o'))
sprite('ic_core', { w: 16, h: 16 },
  circ(8, 8, 6, 'R'), circ(8, 8, 5, 'r'), circ(6, 6, 2, 'o'), px(11, 10, 'Y'), px(10, 11, 'Y'))
sprite('ic_ore', { w: 16, h: 16 },
  poly([1, 14, 2, 7, 7, 3, 13, 5, 15, 14], 'M'), poly([1, 14, 2, 7, 6, 10, 5, 14], 'm'),
  poly([7, 3, 13, 5, 10, 8], 'A'), px(11, 11, 'y'), px(8, 12, 'y'))
sprite('ic_essence', { w: 16, h: 16 },
  poly([8, 0, 10, 6, 16, 8, 10, 10, 8, 16, 6, 10, 0, 8, 6, 6], 'y'),
  poly([8, 4, 9, 7, 12, 8, 9, 9, 8, 12, 7, 9, 4, 8, 7, 7], 'o'))

sheet('ui_icons', ['ic_*', 'seal'], { pad: 1 })
