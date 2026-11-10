// =====================================================================
// Khóa (key) của mọi hình ảnh dùng trong game.
// Code chỉ gọi hình qua các key này. Khi có sprite thật, chỉ cần nạp ảnh
// (this.load.image) với cùng key trong BootScene là xong, không phải sửa chỗ khác.
// =====================================================================

export const TEX = {
  /** Nhân vật chính (Cố Trường Ca) trong trận: public/ui/hero_b_walk.png — 8 hàng hướng × (6 khung đi + 1 khung đứng) */
  PLAYER: 'player',
  /** Tư thế CẦM QUẠT (tay phải trước ngực): public/ui/hero_bf_walk.png, cùng bố cục với PLAYER */
  PLAYER_FAN: 'player_fan',
  /** Chém kiếm / đao theo mẫu: public/ui/hero_b_slash.png — 8 hàng hướng × 2 cột (lấy đà, chém), xem heroSlash.ts */
  PLAYER_SLASH: 'player_slash',
  /** Kéo cung theo mẫu: public/ui/hero_b_draw.png — 8 hàng hướng × 12 cột (cấp cung 0..5 × [kéo, buông]), khung 84x72 */
  PLAYER_DRAW: 'player_draw',
  /** Nền đất lặp vô hạn */
  GROUND: 'ground',
  /** Hình dạng quái (màu trắng, được nhuộm màu bằng setTint). Key = 'shape_' + tên hình. */
  SHAPE: 'shape_',
  /** Đạn của nhân vật (thanh dài, nhuộm màu theo kỹ năng) */
  PROJ: 'proj',
  /** Hình đạn đòn đánh vũ khí (tools/art/vfx.px.js → public/vfx/): kiếm khí, mũi tên, cánh quạt */
  VFX_QI: 'vfx_qi',
  VFX_ARROW: 'vfx_arrow',
  VFX_FAN: 'vfx_fan',
  /** Đạn của quái / boss */
  BULLET: 'bullet',
  /** Hạt XP */
  GEM: 'gem',
  /** Linh thạch */
  COIN: 'coin',
  /** Bình hồi máu */
  HEART: 'heart',
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
export const playerWalkAnim = (d: PlayerDir, fan = false): string => `hero-${fan ? 'fan' : 'walk'}-${d}`;

/** Phiên bản bộ icon kỹ năng (đổi khi vẽ lại để trình duyệt tải ảnh mới) */
export const SKILL_ICON_V = 2;
/** Icon kỹ năng 64x64 (vẽ trong tools/art/skills.px.js): vũ khí wp_*, chủ động ac_*, bị động p_* */
export function skillIcon(id: string): string {
  return `/skills/${id}.png?v=${SKILL_ICON_V}`;
}
/** Kiểu nền CSS cho một ô hiển thị icon kỹ năng (khung + nền đã vẽ sẵn trong ảnh, phần ngoài khung trong suốt) */
export function skillIconStyle(id: string): Record<string, string> {
  return { background: `url('${skillIcon(id)}') center / 100% 100% no-repeat transparent` };
}
