// =====================================================================
// TIẾN TRÌNH VĨNH VIỄN (ngoài màn chơi). Tách hoàn toàn khỏi Phaser:
// giao diện HTML gọi các hàm ở đây, GameScene chỉ đọc computeMeta() / currentLoadout().
//
//   save.ts           cấu trúc save, đọc / ghi localStorage, nâng cấp save cũ, xuất / nhập
//   stats.ts          chỉ số tổng hợp (cảnh giới + trang bị + đan)
//   cultivation.ts    cảnh giới, tu vi, đột phá, luyện đan, kỹ năng mang theo
//   inventory.ts      trang bị, luyện khí, cường hóa, phân giải, tái luyện, hòm thưởng
//   worldProgress.ts  mở khóa thế giới / màn
//   rewards.ts        thưởng sau màn
//   quests.ts         nhiệm vụ hằng ngày + chính tuyến
//   cheats.ts         công cụ gỡ lỗi
// =====================================================================

export { getSave, resetAll, exportSave, importSave, setSound, type SaveData, type Result } from './save';
export { computeMeta, equippedItem, type MetaStats } from './stats';
export * from './cultivation';
export * from './inventory';
export * from './worldProgress';
export * from './rewards';
export * from './cheats';
export * from './quests';
