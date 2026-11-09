// =====================================================================
// Khóa (key) của mọi hình ảnh dùng trong game.
// Code chỉ gọi hình qua các key này. Khi có sprite thật, chỉ cần nạp ảnh
// (this.load.image) với cùng key trong BootScene là xong, không phải sửa chỗ khác.
// =====================================================================

export const TEX = {
  /** Nhân vật chính (Cố Trường Ca): spritesheet 4 khung đi bộ, public/ui/hero_walk.png */
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
export const PLAYER_WALK_ANIM = 'hero-walk';
