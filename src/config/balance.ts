import { powerIdx } from './realms';
// =====================================================================
// CÂN BẰNG GAME: mọi con số ảnh hưởng độ khó / nhịp độ nằm ở đây.
// Chỉnh file này để thử nghiệm mà không cần đụng vào logic.
// =====================================================================

export const RUN = {
  /** Tổng số kỹ năng tối đa trong một màn (tính cả kỹ năng vũ khí, không phân biệt chủ động / bị động) */
  maxSkills: 6,
  /** Cấp tối đa của một kỹ năng */
  maxLevel: 5,
  /** Số kỹ năng chủ động được mang vào màn */
  maxActive: 3,
  /** Số thẻ hiện ra mỗi lần lên cấp */
  cardChoices: 3,
  /** Hệ số tăng tỉ lệ xuất hiện cho kỹ năng chủ động đã chọn và bị động liên kết của nó */
  focusWeight: 3,
  /** Số quái tối đa cùng lúc trên màn hình (giữ game mượt trên điện thoại) */
  maxEnemies: 260,
  /** Tỉ lệ linh thạch giữ lại khi chết (30%) */
  deathKeep: 0.3,
  /** Thời gian bất tử ngắn sau khi bị đánh (giây) */
  hitInvuln: 0.45,
  /** Thời gian tối đa của một lần cập nhật (giây): chống nhảy vọt khi giật hình */
  maxStep: 0.05,
  /** Tốc độ hút hạt XP về phía nhân vật (pixel/giây) */
  magnetSpeed: 520,
  /** Số hạt XP / linh thạch tối đa nằm trên đất (vượt quá sẽ gộp giá trị) */
  maxPickups: 320,
} as const;

/** XP cần để lên từ cấp `level` lên cấp `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.floor(6 + level * 3 + level * level * 0.35);
}

/** Thời lượng một màn (giây) theo thứ tự màn trong thế giới (0..9): 8 phút → 12.5 phút. */
export function stageDuration(index: number): number {
  return 480 + index * 30;
}

/** Hệ số máu / sát thương của quái theo thế giới (1..6). Thiết kế bám theo sức mạnh nhân vật khi vào thế giới đó. */
export const WORLD_HP = [0, 1, 3.4, 5.7, 11, 24, 60];
export const WORLD_DMG = [0, 1, 3, 6, 8, 24, 55];
/** Hệ số tốc độ sinh quái theo thế giới (thế giới sau quái đông hơn, để không bị "chết trước khi kịp xuất hiện") */
export const WORLD_SPAWN = [0, 1, 1, 1.1, 1.25, 1.5, 1.8];

/** Quy mô kinh tế (linh thạch, nguyên liệu...) tăng theo cảnh giới. */
export function econScale(tier: number): number {
  return Math.pow(1.28, powerIdx(tier));
}

/** Hệ số sức mạnh nhân vật theo cảnh giới (tier 0..50, quy đổi qua powerIdx về thang cân bằng 0..36). */
export const TIER_POWER = {
  damage: (t: number) => 1 + 0.35 * powerIdx(t),
  hp: (t: number) => 1 + 0.3 * powerIdx(t),
  speed: (t: number) => 1 + Math.min(0.15, 0.004 * powerIdx(t)),
  armor: (t: number) => 2 * powerIdx(t),
  pickup: (t: number) => 1.5 * powerIdx(t),
};

/** Cấu hình đường cong độ khó trong một màn (t = tiến độ 0..1 của thời gian màn). */
export const DIFFICULTY = {
  /** Số quái sinh ra mỗi giây lúc đầu màn */
  baseSpawnRate: 2.2,
  /** Hệ số tăng tốc độ sinh quái từ đầu đến cuối màn */
  spawnGrowth: 2.4,
  /** Mỗi màn sau trong thế giới tăng thêm bao nhiêu độ khó (nhân) */
  perStage: 0.1,
  hpOverTime: 1.2,
  dmgOverTime: 0.5,
  speedOverTime: 0.25,
  /** Giây giữa hai lần xuất hiện quái tinh anh */
  eliteEvery: 75,
  /** Giây giữa hai đợt quái vây hãm */
  swarmEvery: 90,
  /** Tỉ lệ rơi linh thạch từ quái thường */
  coinChance: 0.03,
  /** Tỉ lệ rơi hồi máu từ quái thường */
  healChance: 0.004,
};
