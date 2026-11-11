// =====================================================================
// Hằng số chung của game. Muốn chỉnh cảm giác điều khiển / camera thì sửa ở đây,
// không cần động vào logic trong scenes hay entities.
// =====================================================================

/** Chỉ số của nhân vật trong một lượt chơi (đã gồm cảnh giới + trang bị + đan dược + kỹ năng bị động). */
export interface PlayerStats {
  /** Máu tối đa */
  maxHp: number;
  /** Tốc độ di chuyển (pixel/giây) */
  moveSpeed: number;
  /** Hệ số nhân sát thương của mọi kỹ năng */
  damage: number;
  /** Hệ số tốc độ đánh (1 = 100%, càng cao hồi chiêu càng nhanh) */
  attackSpeed: number;
  /** Bán kính hút hạt XP (pixel) */
  pickupRange: number;
  /** Giáp: giảm sát thương nhận vào theo công thức giảm = giáp / (giáp + 100) */
  armor: number;
  /** Hồi máu mỗi giây (tỉ lệ máu tối đa) */
  regen: number;
  /** Tỉ lệ bạo kích 0..1 */
  crit: number;
  /** Sát thương bạo kích (2 = gấp đôi) */
  critDmg: number;
  /** Giảm hồi chiêu mọi kỹ năng (0..0.6) */
  cdr: number;
  /** Hệ số thời gian hiệu ứng (đốt, chậm, băng, choáng) */
  ctrlTime: number;
  /** Hệ số phạm vi kỹ năng */
  area: number;
  /** Hệ số XP nhận được */
  xpGain: number;
  /** Hệ số linh thạch nhận được */
  linhGain: number;
}

export const BASE_PLAYER_STATS: PlayerStats = {
  maxHp: 100,
  moveSpeed: 220,
  damage: 1,
  attackSpeed: 1,
  pickupRange: 80,
  armor: 0,
  regen: 0,
  crit: 0.05,
  critDmg: 2,
  cdr: 0,
  ctrlTime: 1,
  area: 1,
  xpGain: 1,
  linhGain: 1,
};

/** Bán kính thân nhân vật (pixel), dùng cho cả hình vẽ và vùng va chạm. */
export const PLAYER_RADIUS = 16;

/** Camera theo nhân vật. */
export const CAMERA = {
  /** 0..1: càng nhỏ camera càng "trễ" mượt, 1 = bám cứng. */
  lerp: 0.12,
};

/** Joystick ảo cho điện thoại (kiểu "động": hiện ra tại chỗ ngón tay chạm). */
export const JOYSTICK = {
  /** Bán kính vòng ngoài (pixel). Kéo ngón tay xa hơn bán kính này thì chỉ đạt tốc độ tối đa. */
  radius: 64,
  /** Bán kính núm tròn bên trong. */
  thumbRadius: 28,
  /** Vùng chết (0..1): kéo nhẹ hơn mức này thì coi như đứng yên. */
  deadZone: 0.12,
  /** Cho phép dùng chuột kéo như joystick (chỉ để thử trên máy tính). */
  allowMouse: false,
  /** Độ sâu vẽ: phải lớn hơn mọi thứ khác trong màn chơi. */
  depth: 1000,
};
