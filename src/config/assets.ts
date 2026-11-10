// =====================================================================
// Khóa (key) của mọi hình ảnh dùng trong game.
// Code chỉ gọi hình qua các key này. Khi có sprite thật, chỉ cần nạp ảnh
// (this.load.image) với cùng key trong BootScene là xong, không phải sửa chỗ khác.
// =====================================================================

export const TEX = {
  /** Nhân vật chính (Cố Trường Ca) trong trận: public/ui/hero_b_walk.png — 8 hàng hướng × (6 khung đi + 1 khung đứng) */
  PLAYER: 'player',
  /** Nền đất lặp vô hạn */
  GROUND: 'ground',
  /** Hình dạng quái (màu trắng, được nhuộm màu bằng setTint). Key = 'shape_' + tên hình. */
  SHAPE: 'shape_',
  /** Đạn của nhân vật (thanh dài, nhuộm màu theo kỹ năng) */
  PROJ: 'proj',
  /** Đạn của quái / boss */
  BULLET: 'bullet',
  /** Hạt XP */
  GEM: 'gem',
  /** Linh thạch */
  COIN: 'coin',
  /** Bình hồi máu */
  HEART: 'heart',
  /** Hình vũ khí cầm tay: key = 'weapon_' + id kỹ năng vũ khí (wp_sword...) */
  WEAPON: 'weapon_',
  /** Lưỡi kiếm xoay quanh người */
  BLADE: 'blade',
} as const;

/** Tên các scene (tránh gõ chuỗi tay ở nhiều nơi). */
export const SCENES = {
  BOOT: 'BootScene',
  GAME: 'GameScene',
} as const;

/** Hoạt ảnh đi bộ của nhân vật chính (tạo trong BootScene) */
/** Hướng của nhân vật trong trận, theo thứ tự hàng của hero_b_walk.png */
export const PLAYER_DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'] as const;
export type PlayerDir = (typeof PLAYER_DIRS)[number];
/** Khung đi bộ mỗi hướng (cột 0..5); cột 6 = đứng yên */
export const PLAYER_WALK_FRAMES = 6;
export const PLAYER_SHEET_COLS = PLAYER_WALK_FRAMES + 1;
export const PLAYER_FRAME = { w: 52, h: 68 };
/** Khóa hoạt ảnh đi theo hướng, vd. 'hero-walk-se' */
export const playerWalkAnim = (d: PlayerDir): string => `hero-walk-${d}`;
