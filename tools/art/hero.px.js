// =====================================================================
// Nhân vật chính Cố Trường Ca (pixel art bằng pxl).
//   hero_full : dáng đứng lớn cho Lobby / màn Nhân Vật / màn nạp (idle 4 khung: thở, tóc + đai bay)
//   hero_walk : sprite nhỏ trong trận (đi bộ 4 khung; quay trái / phải bằng cách lật ngang trong code)
// Chạy:  node <pxl>/bin/pxl.js build tools/art/hero.px.js
// Rồi chép out/anims/hero_full.png, out/anims/hero_walk.png vào public/ui/
// =====================================================================
pal({
  k: '#160f24',                                                   // viền
  h: '#241a40', i: '#3b2e66', I: '#5d4c9c',                       // tóc đen tím (tối → sáng)
  j: '#f8d9b8', l: '#e8ae86', L: '#c47c5a',                       // da
  F: '#f8f9ff', E: '#dbe2f5', e: '#aab6da',                       // áo trắng
  X: '#4f7ee8', Y: '#2d4fa8', Z: '#8fb2ff', y: '#1f3570',         // lam (viền áo, đai, dải tóc)
  n: '#262d4c', N: '#39456e',                                     // quần
  b: '#1a1924', B: '#3a3850',                                     // ủng
  G: '#ffd36e', H: '#c9901f',                                     // vàng (khóa đai)
  w: '#ffffff', p: '#2a1f3c', P: '#5b49a0',                       // mắt (đồng tử tím)
})
ramps('keEF', 'hiI', 'LljF', 'yYXZ', 'nN', 'bB', 'HG')

// ---------------------------------------------------------------- Đầu (đối xứng, vẽ nửa trái rồi lật)
// 18x19: tóc mái nhọn, tóc mai ôm mặt, mắt to kiểu anime.
sprite('_head', { mx: true }, `
  .....hhhh
  ...hhiiii
  ..hhiiIIi
  .hhiiIIii
  .hiiiiiii
  hhihiihii
  hhhjhhjhi
  hhjjjhjjh
  hhjjjjjjj
  hhjhhhjjj
  hhjwppjjj
  hhjppPjjj
  hhjpPPjjj
  hhjjjjjjj
  .hhljjjjj
  .hhjjjjjL
  ..hjjjjjj
  ...ljjjjj
  .....llll`)

// ---------------------------------------------------------------- Dáng đứng lớn (36x64 sau viền)
anim('hero_full', { w: 34, h: 62, frames: 4, fps: 4, outline: 'k' }, (c) => {
  const f = c.frame
  const B = f === 1 || f === 2 ? 1 : 0                              // nhún khi thở (thân + đầu)
  const s = Math.round(Math.sin(c.phase * Math.PI * 2) * 1.4)       // gió: đuôi tóc, dải đai

  // ---- đuôi ngựa: bó cao trên đỉnh đầu bên phải, rủ xuống sau lưng
  c.poly([20, 4 + B, 23, 0 + B, 28 + s, 2 + B, 31 + s, 9 + B, 31 + s, 18 + B, 29 + s, 27 + B, 27 + s, 20 + B, 26, 11 + B, 22, 7 + B], 'h')
  c.poly([24, 1 + B, 28 + s, 3 + B, 30 + s, 10 + B, 29 + s, 17 + B, 27, 9 + B], 'i')
  c.line(28 + s, 5 + B, 29 + s, 12 + B, 'I')

  // ---- dải đai lam bay bên hông trái
  c.poly([11, 37 + B, 7, 41 + B, 4 - s, 50 + B, 6 - s, 51 + B, 9, 44 + B, 12, 40 + B], 'X')
  c.poly([7, 41 + B, 4 - s, 50 + B, 5 - s, 50 + B, 8, 43 + B], 'Y')

  // ---- ủng + quần (đứng yên trên đất)
  c.rect(11, 46, 5, 9, 'n'); c.rect(18, 46, 5, 9, 'n'); c.vline(14, 50, 5, 'N'); c.vline(21, 50, 5, 'N'); c.hline(11, 54, 5, 'N'); c.hline(18, 54, 5, 'N')
  c.rect(10, 55, 6, 6, 'b'); c.rect(18, 55, 6, 6, 'b'); c.hline(9, 61, 7, 'b'); c.hline(18, 61, 7, 'b')
  c.hline(11, 56, 4, 'B'); c.hline(19, 56, 4, 'B')

  // ---- vạt áo dưới: xòe chữ A, xẻ giữa, viền lam (ngắn để lộ quần + ủng)
  c.poly([11, 38 + B, 23, 38 + B, 26, 48, 18, 48, 17, 43, 16, 48, 8, 48], 'F')
  c.poly([8, 48, 11, 38 + B, 13, 38 + B, 11, 48], 'E')                  // nếp tối bên trái
  c.poly([21, 38 + B, 23, 38 + B, 26, 48, 23, 48], 'E')
  c.line(14, 41 + B, 13, 47, 'E'); c.line(20, 41 + B, 21, 47, 'E')        // nếp gấp
  c.hline(8, 48, 9, 'X'); c.hline(18, 48, 9, 'X'); c.hline(8, 49, 9, 'Y'); c.hline(18, 49, 9, 'Y')
  c.line(16, 43, 16, 48, 'X'); c.line(18, 43, 18, 48, 'X')

  // ---- thân áo
  c.poly([12, 23 + B, 22, 23 + B, 23, 38 + B, 11, 38 + B], 'F')
  c.poly([12, 23 + B, 14, 23 + B, 13, 38 + B, 11, 38 + B], 'E')
  c.poly([20, 23 + B, 22, 23 + B, 23, 38 + B, 21, 38 + B], 'E')
  // cổ áo chéo giao lĩnh: viền lam dày, áo lót trắng bên trong
  c.line(13, 23 + B, 19, 31 + B, 'X'); c.line(14, 23 + B, 20, 31 + B, 'X'); c.line(13, 24 + B, 18, 31 + B, 'Y')
  c.line(21, 23 + B, 17, 28 + B, 'X')
  // vai áo ngoài lam
  c.poly([9, 26 + B, 12, 23 + B, 14, 23 + B, 12, 27 + B], 'X'); c.poly([25, 26 + B, 22, 23 + B, 20, 23 + B, 22, 27 + B], 'X')
  c.px(12, 23 + B, 'Z'); c.px(21, 23 + B, 'Z')

  // ---- tay áo rộng kiểu cổ phong (trắng, ống loe, cổ tay lam)
  c.poly([9, 26 + B, 12, 26 + B, 13, 36 + B, 11, 41 + B, 4, 41 + B, 6, 33 + B], 'F')
  c.poly([9, 26 + B, 10, 27 + B, 8, 35 + B, 4, 41 + B, 6, 33 + B], 'E')
  c.poly([25, 26 + B, 22, 26 + B, 21, 36 + B, 23, 41 + B, 30, 41 + B, 28, 33 + B], 'F')
  c.poly([25, 26 + B, 24, 27 + B, 26, 35 + B, 30, 41 + B, 28, 33 + B], 'E')
  c.hline(4, 40 + B, 8, 'X'); c.hline(4, 41 + B, 8, 'Y'); c.hline(23, 40 + B, 8, 'X'); c.hline(23, 41 + B, 8, 'Y')
  c.line(12, 27 + B, 12, 34 + B, 'e'); c.line(22, 27 + B, 22, 34 + B, 'e')
  c.rect(7, 42 + B, 3, 3, 'j'); c.px(7, 44 + B, 'l')
  c.rect(24, 42 + B, 3, 3, 'j'); c.px(26, 44 + B, 'l')

  // ---- đai lam + khóa vàng
  c.rect(11, 35 + B, 13, 3, 'X'); c.hline(11, 35 + B, 13, 'Z'); c.hline(11, 37 + B, 13, 'Y')
  c.rect(15, 34 + B, 4, 5, 'G'); c.rect(16, 35 + B, 2, 3, 'H'); c.px(15, 34 + B, 'w')

  // ---- cổ + đầu
  c.rect(15, 20 + B, 4, 4, 'l'); c.hline(15, 20 + B, 4, 'L')
  c.stamp('_head', 8, 2 + B)
  // dây buộc tóc lam
  c.rect(20, 2 + B, 3, 3, 'X'); c.px(20, 2 + B, 'Z'); c.px(22, 4 + B, 'Y')
})

// ---------------------------------------------------------------- Sprite nhỏ trong trận (20x30 sau viền)
anim('hero_walk', { w: 18, h: 28, frames: 4, fps: 8, outline: 'k' }, (c) => {
  const f = c.frame
  const B = f % 2 === 1 ? 0 : 1          // khung bước (0, 2) thân thấp hơn 1px
  const liftL = f === 0 ? 2 : 0          // chân trái nhấc (khung 0), chân phải nhấc (khung 2)
  const liftR = f === 2 ? 2 : 0
  const s = [1, 0, -1, 0][f]

  // đuôi tóc
  c.poly([11, 1 + B, 14, 0 + B, 17, 3 + B, 17 - s, 9 + B, 15 - s, 13 + B, 14, 5 + B], 'h')
  c.line(15, 3 + B, 16 - s, 8 + B, 'i')
  // chân + ủng
  c.rect(5, 19, 3, 5 - liftL, 'n'); c.rect(4, 24 - liftL, 4, 3, 'b'); c.px(5, 24 - liftL, 'B')
  c.rect(10, 19, 3, 5 - liftR, 'n'); c.rect(10, 24 - liftR, 4, 3, 'b'); c.px(11, 24 - liftR, 'B')
  // vạt áo (xòe, lắc theo bước)
  c.poly([5, 15 + B, 13, 15 + B, 15 + s, 21, 3 + s, 21], 'F')
  c.poly([3 + s, 21, 5, 15 + B, 7, 15 + B, 6 + s, 21], 'E')
  c.hline(3 + s, 21, 13, 'X'); c.vline(9, 18, 4, 'X')
  // thân + tay áo
  c.rect(5, 11 + B, 8, 5, 'F'); c.rect(5, 11 + B, 2, 5, 'E')
  c.line(6, 11 + B, 9, 14 + B, 'X'); c.line(12, 11 + B, 10, 13 + B, 'X')
  c.poly([2, 13 + B, 5, 11 + B, 6, 16 + B, 2, 18 + B], 'F'); c.hline(2, 17 + B, 4, 'X')
  c.poly([16, 13 + B, 13, 11 + B, 12, 16 + B, 16, 18 + B], 'E'); c.hline(13, 17 + B, 4, 'X')
  c.px(3, 18 + B, 'j'); c.px(14, 18 + B, 'j')
  // đai + khóa
  c.rect(5, 15 + B, 8, 2, 'X'); c.rect(8, 15 + B, 2, 2, 'G')
  // đầu
  c.ellipse(9, 6 + B, 6, 5, 'j'); c.rect(3, 6 + B, 12, 4, 'j')
  c.poly([2, 9 + B, 2, 3 + B, 5, 0 + B, 13, 0 + B, 16, 3 + B, 16, 9 + B, 14, 5 + B, 12, 6 + B, 10, 4 + B, 8, 6 + B, 6, 4 + B, 4, 6 + B], 'h')
  c.poly([5, 2 + B, 8, 0 + B, 11, 0 + B, 7, 3 + B], 'i')
  c.vline(2, 6 + B, 5, 'h'); c.vline(16, 6 + B, 5, 'h')
  c.rect(12, 0 + B, 2, 2, 'X')
  c.rect(5, 7 + B, 2, 3, 'p'); c.rect(11, 7 + B, 2, 3, 'p'); c.px(5, 7 + B, 'w'); c.px(11, 7 + B, 'w'); c.px(6, 9 + B, 'P'); c.px(12, 9 + B, 'P')
  c.px(9, 10 + B, 'L')
})

// ---------------------------------------------------------------- Ngồi thiền (tab Tu Luyện)
// 58x58: kiết già trên bồ đoàn, tay kết ấn, mắt nhắm; hào quang + linh khí xoay quanh (8 khung).
function meditate(c) {
  const ph = c.phase * Math.PI * 2
  const B = Math.sin(ph) > 0.3 ? -1 : 0
  // bồ đoàn
  c.ellipse(29, 51, 22, 5, 'y'); c.ellipse(29, 50, 21, 4, 'Y'); c.hline(10, 49, 38, 'Z')
  // chân xếp bằng + vạt áo trắng phủ
  c.ellipse(29, 45, 20, 6, 'n'); c.ellipse(29, 44, 19, 5, 'N'); c.rect(13, 45, 6, 3, 'b'); c.rect(39, 45, 6, 3, 'b')
  c.poly([15, 37 + B, 43, 37 + B, 47, 45, 11, 45], 'F'); c.poly([11, 45, 15, 37 + B, 19, 37 + B, 16, 45], 'E'); c.hline(11, 45, 37, 'X')
  // đuôi tóc rủ sau lưng
  c.poly([34, 7 + B, 39, 7 + B, 41, 15 + B, 39, 27 + B, 36, 19 + B], 'h'); c.line(38, 9 + B, 39, 19 + B, 'i')
  // thân + cổ áo + đai
  c.rect(21, 21 + B, 16, 16, 'F'); c.rect(21, 21 + B, 4, 16, 'E'); c.rect(33, 21 + B, 4, 16, 'E')
  c.line(23, 21 + B, 29, 28 + B, 'X'); c.line(24, 21 + B, 30, 28 + B, 'X'); c.line(35, 21 + B, 30, 26 + B, 'X')
  c.rect(21, 32 + B, 16, 3, 'X'); c.hline(21, 32 + B, 16, 'Z'); c.rect(27, 31 + B, 4, 5, 'G')
  // tay áo rộng ôm vào lòng, tay kết ấn
  c.poly([21, 22 + B, 16, 27 + B, 14, 37 + B, 22, 39 + B, 25, 35 + B], 'F'); c.poly([37, 22 + B, 42, 27 + B, 44, 37 + B, 36, 39 + B, 33, 35 + B], 'E')
  c.hline(15, 38 + B, 9, 'X'); c.hline(35, 38 + B, 9, 'X')
  c.rect(24, 37 + B, 10, 3, 'j'); c.px(28, 36 + B, 'j'); c.px(29, 36 + B, 'j'); c.hline(25, 39 + B, 8, 'l')
  // cổ + đầu (mắt nhắm)
  c.rect(27, 18 + B, 4, 4, 'l')
  c.ellipse(29, 12 + B, 8, 7, 'j'); c.rect(22, 11 + B, 15, 6, 'j'); c.hline(24, 18 + B, 10, 'j')
  c.poly([20, 14 + B, 20, 7 + B, 24, 3 + B, 30, 2 + B, 35, 3 + B, 38, 7 + B, 38, 14 + B, 36, 10 + B, 33, 8 + B, 31, 11 + B, 29, 8 + B, 26, 11 + B, 24, 8 + B, 22, 11 + B], 'h')
  c.poly([22, 6 + B, 27, 3 + B, 31, 3 + B, 27, 6 + B, 24, 9 + B], 'i'); c.vline(20, 11 + B, 8, 'h'); c.vline(38, 11 + B, 8, 'h')
  c.rect(33, 2 + B, 3, 3, 'X')
  c.hline(24, 14 + B, 3, 'p'); c.hline(31, 14 + B, 3, 'p'); c.px(24, 13 + B, 'p'); c.px(33, 13 + B, 'p')
  c.px(29, 16 + B, 'l'); c.hline(28, 17 + B, 2, 'L')
  c.px(29, 10 + B, 'G')
}
anim('_med_body', { w: 58, h: 58, frames: 8, fps: 6, outline: 'k' }, meditate)
anim('hero_meditate', { w: 60, h: 60, frames: 8, fps: 6 },
  // hào quang + linh khí phía sau (không viền), rồi đặt thân người có viền lên trên
  (c) => {
    const ph = c.phase * Math.PI * 2
    for (let i = 0; i < 3; i++) c.ring(30, 29, 19 + i * 5 + Math.round(Math.sin(ph + i * 1.3) * 1.5), i === 1 ? 'Z' : 'X')
    for (let i = 0; i < 8; i++) { const a = ph + (i * Math.PI) / 4; c.px(Math.round(30 + Math.cos(a) * 27), Math.round(30 + Math.sin(a) * 19), i % 2 ? 'G' : 'Z') }
  },
  stamp('_med_body', 0, 0),
)
