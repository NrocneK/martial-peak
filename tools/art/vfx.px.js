// =====================================================================
// HÌNH ĐẠN của đòn đánh vũ khí (VFX) — pixel art bằng pxl. Hướng bay = sang PHẢI (+x); game xoay theo hướng bay.
//   vfx_qi    : kiếm khí trăng lưỡi liềm (Kiếm Khí Trảm)          30x18
//   vfx_arrow : mũi tên có lông đuôi + vệt gió (Truy Phong Tiễn)  26x9
//   vfx_fan   : cánh quạt tròn 8 nan (Hồi Toàn Phiến, game xoay tít) 22x22
// Các hiệu ứng còn lại (đường chém, thương khí, sóng chấn, tia tóe) vẽ bằng Graphics trong src/systems/Fx.ts.
// Chạy:  node <pxl>/bin/pxl.js build tools/art/vfx.px.js  → chép out/sprites/vfx_*.png vào public/vfx/
// =====================================================================
pal({ k: '#0e0a18', w: '#ffffff' })

/** Tô theo tọa độ màn hình */
function paintXY(c, f) { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const col = f(x + 0.5, y + 0.5); if (col) c.px(x, y, col) } }

// ---- kiếm khí: vành trăng khuyết lồi về phía trước, lõi trắng, mép lam, đuôi mờ dần
sprite('vfx_qi', { w: 30, h: 18 }, (c) => {
  const cx = 12, cy = 9
  paintXY(c, (x, y) => {
    const dx = x - cx, dy = y - cy
    const outer = Math.hypot(dx, dy) < 16 && dx > -3
    const inner = Math.hypot(dx + 6, dy) < 13.5
    if (!outer || inner) return null
    const t = Math.hypot(dx + 6, dy) - 13.5                 // độ dày tính từ mép trong
    const tail = Math.abs(dy) / 9                            // hai mũi nhọn → mảnh dần
    if (t > 5.0 - tail * 3.2) return null
    if (t < 1.6) return '#ffffff'
    if (t < 3.0) return '#c8f0ff'
    return '#5ab8ff'
  })
  // vệt khí mờ phía sau
  for (const [y, l] of [[6, 6], [9, 9], [12, 6]]) for (let i = 0; i < l; i++) c.px(9 - l + i, y, i < l / 2 ? '#2a6ab8' : '#5ab8ff')
})

// ---- mũi tên: cán gỗ, mũi thép, lông đuôi trắng-lục; vệt gió mảnh phía sau
sprite('vfx_arrow', { w: 26, h: 9 }, (c) => {
  c.hline(5, 4, 15, '#8a5a30'); c.hline(6, 3, 13, '#b88050')                // cán
  c.poly([19, 1, 25, 4.5, 19, 8], '#c8d4e0'); c.poly([19, 2, 24, 4.5, 19, 4.5], '#ffffff')   // mũi
  c.line(3, 1, 7, 3, '#e8fff0'); c.line(3, 7, 7, 5, '#7ae8a0'); c.line(4, 1, 8, 3, '#7ae8a0'); c.line(4, 7, 8, 5, '#e8fff0')   // lông đuôi
  c.px(0, 4, '#5ab870'); c.px(2, 4, '#9ff0b8')                                 // gió
})

// ---- cánh quạt tròn: 8 nan, mặt quạt tím nhạt xen tím đậm, viền vàng, đinh trục giữa
sprite('vfx_fan', { w: 22, h: 22 }, (c) => {
  const cx = 11, cy = 11, R = 10
  paintXY(c, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy)
    if (r > R) return null
    const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * 8, f = a - Math.floor(a)
    if (r > R - 1.1) return '#ffd86a'                       // viền vàng
    if (r < 2.2) return r < 1.2 ? '#ffffff' : '#e0a838'     // đinh trục
    if (f < 0.12) return '#4a2e8a'                          // nan
    return f < 0.56 ? '#d8c4ff' : '#9a7ae8'                  // nếp sáng / tối
  })
})
