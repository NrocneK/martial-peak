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

// ---------------------------------------------------------------- Dáng đứng lớn (theo ảnh concept)
// Tỉ lệ ~5 đầu. Áo trong trắng cổ chéo, áo ngoài lam, ống tay trắng + bao cổ tay sẫm, đai lam khóa tròn vàng,
// dải đai dài bay sang trái, quần lam sẫm ống rộng, ủng đen, đứng dạng chân, tay nắm.
// 40x80 (chưa viền) → 42x82; 4 khung idle: thở (thân nhún 1px), đuôi tóc + dải đai lay theo gió.
pal({ o: '#4a6cb4', O: '#2f4b88', q: '#88a6e0', Q: '#1d3263', d: '#1e2a52', D: '#2e3d70', g: '#ffcf5a', t: '#3b3456' })
anim('hero_full', { w: 40, h: 80, frames: 4, fps: 4, outline: 'k' }, (c) => {
  const f = c.frame
  const B = f === 1 || f === 2 ? 1 : 0
  const s = Math.round(Math.sin(c.phase * Math.PI * 2) * 1.5)

  // ---- dải đai dài bay sang trái (sau thân)
  c.poly([14, 40 + B, 9, 44 + B, 4 - s, 52 + B, 1 - s, 60 + B, 4 - s, 61 + B, 8 - s, 53 + B, 12, 47 + B, 16, 43 + B], 'o')
  c.poly([9, 44 + B, 4 - s, 52 + B, 1 - s, 60 + B, 3 - s, 60 + B, 6 - s, 52 + B], 'O')
  // ---- đuôi ngựa: buộc cao, vồng lên rồi rủ xuống sau vai phải
  c.poly([22, 4 + B, 25, 0 + B, 30, 1 + B, 33 + s, 6 + B, 34 + s, 14 + B, 32 + s, 22 + B, 30 + s, 16 + B, 29, 8 + B, 26, 5 + B], 'h')
  c.poly([27, 1 + B, 31, 3 + B, 33 + s, 9 + B, 31 + s, 13 + B, 29, 6 + B], 'i')
  c.line(31, 4 + B, 32 + s, 10 + B, 'I')

  // ---- ủng + quần ống rộng (chân dạng, đứng yên)
  c.poly([11, 54, 19, 54, 19, 70, 10, 70, 9, 62], 'd'); c.poly([21, 54, 29, 54, 31, 62, 30, 70, 21, 70], 'd')
  c.poly([11, 54, 14, 54, 13, 70, 10, 70, 9, 62], 'D'); c.poly([25, 54, 29, 54, 31, 62, 30, 70, 27, 70], 'Q')
  c.line(15, 58, 16, 68, 'Q'); c.line(25, 58, 24, 68, 'D')
  c.rect(10, 70, 9, 9, 'b'); c.rect(21, 70, 9, 9, 'b'); c.rect(8, 77, 11, 3, 'b'); c.rect(21, 77, 11, 3, 'b')
  c.hline(10, 70, 9, 'B'); c.hline(21, 70, 9, 'B'); c.hline(10, 72, 9, 't'); c.hline(21, 72, 9, 't'); c.px(12, 75, 'B'); c.px(23, 75, 'B')

  // ---- vạt áo: áo ngoài lam xòe hai bên, vạt trắng phía trước xẻ giữa
  c.poly([12, 40 + B, 28, 40 + B, 32, 62, 22, 60, 20, 50, 18, 60, 8, 62], 'o')
  c.poly([8, 62, 12, 40 + B, 14, 40 + B, 12, 62], 'q'); c.poly([26, 40 + B, 28, 40 + B, 32, 62, 28, 62], 'O')
  c.poly([15, 40 + B, 20, 40 + B, 19, 50, 17, 59, 14, 58], 'F'); c.poly([20, 40 + B, 25, 40 + B, 26, 58, 23, 59, 21, 50], 'E')
  c.line(16, 44, 15, 57, 'E'); c.line(24, 44, 24, 57, 'e')
  c.hline(8, 62, 5, 'q'); c.hline(28, 62, 5, 'Q')

  // ---- thân: áo ngoài lam, áo trong trắng cổ chéo
  c.poly([13, 21 + B, 27, 21 + B, 28, 40 + B, 12, 40 + B], 'o')
  c.poly([13, 21 + B, 16, 21 + B, 15, 40 + B, 12, 40 + B], 'q'); c.poly([25, 22 + B, 27, 21 + B, 28, 40 + B, 25, 40 + B], 'O')
  c.poly([16, 21 + B, 24, 21 + B, 24, 36 + B, 16, 36 + B], 'F'); c.poly([21, 21 + B, 24, 21 + B, 24, 36 + B, 22, 36 + B], 'E')
  c.line(16, 21 + B, 22, 30 + B, 'q'); c.line(17, 21 + B, 23, 30 + B, 'q'); c.line(24, 21 + B, 20, 26 + B, 'O')
  c.line(15, 22 + B, 15, 36 + B, 'O'); c.line(25, 22 + B, 25, 36 + B, 'Q')

  // ---- tay: vai áo ngoài lam → ống tay trắng rộng → bao cổ tay sẫm → nắm tay
  c.poly([13, 21 + B, 10, 24 + B, 8, 33 + B, 12, 34 + B, 14, 26 + B], 'o'); c.poly([10, 24 + B, 8, 33 + B, 10, 33 + B, 12, 25 + B], 'q')
  c.poly([27, 21 + B, 30, 24 + B, 32, 33 + B, 28, 34 + B, 26, 26 + B], 'O')
  c.poly([8, 33 + B, 12, 33 + B, 13, 40 + B, 7, 41 + B], 'F'); c.poly([7, 41 + B, 8, 33 + B, 9, 33 + B, 9, 41 + B], 'E')
  c.poly([28, 33 + B, 32, 33 + B, 33, 41 + B, 27, 40 + B], 'E')
  c.rect(7, 40 + B, 6, 3, 'd'); c.hline(7, 40 + B, 6, 'D'); c.rect(27, 40 + B, 6, 3, 'd'); c.hline(27, 40 + B, 6, 'D')
  c.rect(8, 43 + B, 4, 4, 'j'); c.hline(8, 46 + B, 4, 'l'); c.px(8, 44 + B, 'l')
  c.rect(28, 43 + B, 4, 4, 'j'); c.hline(28, 46 + B, 4, 'l'); c.px(31, 44 + B, 'l')

  // ---- đai lam + khóa tròn vàng
  c.rect(12, 36 + B, 16, 4, 'O'); c.hline(12, 36 + B, 16, 'o'); c.hline(12, 39 + B, 16, 'Q')
  c.circ(20, 38 + B, 2, 'g'); c.px(20, 38 + B, 'H'); c.px(19, 37 + B, 'w')

  // ---- cổ + đầu (khuôn mặt thon, mắt sắc)
  c.rect(18, 18 + B, 4, 4, 'l'); c.hline(18, 18 + B, 4, 'L')
  c.ellipse(20, 12 + B, 6, 7, 'j'); c.rect(14, 10 + B, 12, 5, 'j')
  c.poly([15, 15 + B, 25, 15 + B, 23, 19 + B, 20, 20 + B, 17, 19 + B], 'j'); c.px(17, 19 + B, 'l'); c.px(23, 19 + B, 'l')
  // tóc: chỏm + mái lệch sang trái + tóc mai
  c.poly([13, 13 + B, 13, 6 + B, 16, 2 + B, 21, 1 + B, 25, 2 + B, 27, 6 + B, 27, 13 + B, 25, 9 + B, 23, 8 + B, 21, 10 + B, 18, 8 + B, 16, 11 + B, 15, 9 + B], 'h')
  c.poly([16, 3 + B, 21, 2 + B, 19, 5 + B, 16, 8 + B], 'i'); c.px(17, 3 + B, 'I'); c.px(18, 3 + B, 'I')
  c.vline(13, 10 + B, 7, 'h'); c.vline(14, 12 + B, 5, 'h'); c.vline(27, 10 + B, 6, 'h'); c.vline(26, 12 + B, 3, 'h')
  // dây buộc tóc lam
  c.rect(23, 2 + B, 3, 3, 'o'); c.px(23, 2 + B, 'q'); c.line(26, 4 + B, 28, 7 + B, 'o')
  // mày + mắt (sắc, đồng tử tím) + mũi + miệng
  c.hline(15, 11 + B, 3, 'h'); c.hline(22, 11 + B, 3, 'h'); c.px(18, 11 + B, 'h'); c.px(21, 11 + B, 'h')
  c.rect(16, 12 + B, 2, 2, 'p'); c.rect(22, 12 + B, 2, 2, 'p'); c.px(16, 12 + B, 'w'); c.px(22, 12 + B, 'w'); c.px(17, 13 + B, 'P'); c.px(23, 13 + B, 'P')
  c.px(20, 14 + B, 'l'); c.px(20, 15 + B, 'L'); c.hline(19, 17 + B, 3, 'L')
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
  c.rect(5, 19, 3, 5 - liftL, 'd'); c.rect(4, 24 - liftL, 4, 3, 'b'); c.px(5, 24 - liftL, 'B')
  c.rect(10, 19, 3, 5 - liftR, 'd'); c.rect(10, 24 - liftR, 4, 3, 'b'); c.px(11, 24 - liftR, 'B')
  // vạt áo (xòe, lắc theo bước)
  c.poly([5, 15 + B, 13, 15 + B, 15 + s, 21, 3 + s, 21], 'o')
  c.poly([3 + s, 21, 5, 15 + B, 7, 15 + B, 6 + s, 21], 'q')
  c.poly([8, 16 + B, 10, 16 + B, 10, 21, 8, 21], 'F'); c.hline(3 + s, 21, 13, 'O')
  // thân + tay áo
  c.rect(5, 11 + B, 8, 5, 'o'); c.rect(7, 11 + B, 4, 4, 'F'); c.rect(5, 11 + B, 2, 5, 'q')
  c.line(7, 11 + B, 9, 13 + B, 'q'); c.line(11, 11 + B, 10, 12 + B, 'O')
  c.poly([2, 13 + B, 5, 11 + B, 6, 16 + B, 2, 18 + B], 'F'); c.hline(2, 17 + B, 4, 'd')
  c.poly([16, 13 + B, 13, 11 + B, 12, 16 + B, 16, 18 + B], 'E'); c.hline(13, 17 + B, 4, 'd')
  c.px(3, 18 + B, 'j'); c.px(14, 18 + B, 'j')
  // đai + khóa
  c.rect(5, 15 + B, 8, 2, 'O'); c.rect(8, 15 + B, 2, 2, 'g')
  // đầu
  c.ellipse(9, 6 + B, 6, 5, 'j'); c.rect(3, 6 + B, 12, 4, 'j')
  c.poly([2, 9 + B, 2, 3 + B, 5, 0 + B, 13, 0 + B, 16, 3 + B, 16, 9 + B, 14, 5 + B, 12, 6 + B, 10, 4 + B, 8, 6 + B, 6, 4 + B, 4, 6 + B], 'h')
  c.poly([5, 2 + B, 8, 0 + B, 11, 0 + B, 7, 3 + B], 'i')
  c.vline(2, 6 + B, 5, 'h'); c.vline(16, 6 + B, 5, 'h')
  c.rect(12, 0 + B, 2, 2, 'o')
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
  c.ellipse(29, 45, 20, 6, 'd'); c.ellipse(29, 44, 19, 5, 'D'); c.rect(13, 45, 6, 3, 'b'); c.rect(39, 45, 6, 3, 'b')
  c.poly([15, 37 + B, 43, 37 + B, 47, 45, 11, 45], 'o'); c.poly([11, 45, 15, 37 + B, 19, 37 + B, 16, 45], 'q'); c.poly([26, 37 + B, 32, 37 + B, 33, 45, 25, 45], 'F'); c.hline(11, 45, 37, 'O')
  // đuôi tóc rủ sau lưng
  c.poly([34, 7 + B, 39, 7 + B, 41, 15 + B, 39, 27 + B, 36, 19 + B], 'h'); c.line(38, 9 + B, 39, 19 + B, 'i')
  // thân + cổ áo + đai
  c.rect(21, 21 + B, 16, 16, 'o'); c.rect(21, 21 + B, 4, 16, 'q'); c.rect(33, 21 + B, 4, 16, 'O'); c.rect(25, 21 + B, 8, 11, 'F')
  c.line(25, 21 + B, 29, 27 + B, 'q'); c.line(33, 21 + B, 30, 25 + B, 'O')
  c.rect(21, 32 + B, 16, 3, 'O'); c.hline(21, 32 + B, 16, 'o'); c.circ(29, 33 + B, 2, 'g')
  // tay áo rộng ôm vào lòng, tay kết ấn
  c.poly([21, 22 + B, 16, 27 + B, 14, 37 + B, 22, 39 + B, 25, 35 + B], 'F'); c.poly([37, 22 + B, 42, 27 + B, 44, 37 + B, 36, 39 + B, 33, 35 + B], 'E')
  c.hline(15, 38 + B, 9, 'd'); c.hline(35, 38 + B, 9, 'd')
  c.rect(24, 37 + B, 10, 3, 'j'); c.px(28, 36 + B, 'j'); c.px(29, 36 + B, 'j'); c.hline(25, 39 + B, 8, 'l')
  // cổ + đầu (mắt nhắm)
  c.rect(27, 18 + B, 4, 4, 'l')
  c.ellipse(29, 12 + B, 8, 7, 'j'); c.rect(22, 11 + B, 15, 6, 'j'); c.hline(24, 18 + B, 10, 'j')
  c.poly([20, 14 + B, 20, 7 + B, 24, 3 + B, 30, 2 + B, 35, 3 + B, 38, 7 + B, 38, 14 + B, 36, 10 + B, 33, 8 + B, 31, 11 + B, 29, 8 + B, 26, 11 + B, 24, 8 + B, 22, 11 + B], 'h')
  c.poly([22, 6 + B, 27, 3 + B, 31, 3 + B, 27, 6 + B, 24, 9 + B], 'i'); c.vline(20, 11 + B, 8, 'h'); c.vline(38, 11 + B, 8, 'h')
  c.rect(33, 2 + B, 3, 3, 'o')
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
