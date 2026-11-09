// =====================================================================
// QUÁI THƯỜNG. Mỗi quái = 1 "kiểu hành vi" (code viết một lần trong EnemyManager)
// + bộ dữ liệu bên dưới. Thêm quái mới chỉ cần thêm tên vào bảng NAMES.
// 6 thế giới × 11 quái = 66 loại (8 quái thường + quái nhỏ + 2 tinh anh mỗi thế giới).
// =====================================================================

import type { Behavior } from './types';
import { mixColor } from '../utils/format';

export type Shape = 'circle' | 'diamond' | 'square' | 'tri' | 'star' | 'hex';

export interface BehaviorBase {
  hp: number;
  speed: number;
  dmg: number;
  /** XP rơi ra */
  xp: number;
  /** Bán kính (pixel) */
  r: number;
  shape: Shape;
  tint: number;
}

/** Chỉ số gốc theo kiểu hành vi (ở thế giới 1, đầu màn). Sẽ nhân với hệ số thế giới / thời gian. */
export const BEHAVIORS: Record<Behavior, BehaviorBase> = {
  chaser: { hp: 18, speed: 70, dmg: 6, xp: 2, r: 13, shape: 'circle', tint: 0xb0b0b0 },
  swift: { hp: 10, speed: 125, dmg: 4, xp: 2, r: 10, shape: 'tri', tint: 0xe0d070 },
  tank: { hp: 75, speed: 42, dmg: 10, xp: 6, r: 20, shape: 'square', tint: 0x707080 },
  ranged: { hp: 14, speed: 58, dmg: 6, xp: 3, r: 12, shape: 'diamond', tint: 0xb060d0 },
  phantom: { hp: 14, speed: 88, dmg: 5, xp: 3, r: 12, shape: 'circle', tint: 0x80e0f0 },
  exploder: { hp: 12, speed: 100, dmg: 0, xp: 3, r: 12, shape: 'star', tint: 0xe05030 },
  support: { hp: 26, speed: 58, dmg: 3, xp: 4, r: 13, shape: 'diamond', tint: 0x50d080 },
  summoner: { hp: 45, speed: 40, dmg: 4, xp: 8, r: 16, shape: 'hex', tint: 0x60a040 },
  swarm: { hp: 5, speed: 85, dmg: 3, xp: 1, r: 8, shape: 'circle', tint: 0xd0d0d0 },
  elite: { hp: 260, speed: 62, dmg: 14, xp: 30, r: 26, shape: 'star', tint: 0xf0c040 },
};

export interface EnemyDef {
  id: string;
  name: string;
  world: number;
  behavior: Behavior;
  color: number;
  /** Mốc thời gian xuất hiện trong màn: 1 = ngay từ đầu, 2 = sau 25%, 3 = sau 55% */
  tier: 1 | 2 | 3;
}

/** Màu chủ đạo của mỗi thế giới (chỉ số 1..6) */
export const WORLD_COLORS = [0, 0x9a7b55, 0x7b5aa6, 0x4a7fc9, 0x2fa89a, 0xd1ab35, 0x4a4a66];

/** Thứ tự tên: chaser, swift, tank, ranged, phantom, exploder, support, summoner, swarm, elite 1, elite 2 */
const ORDER: Behavior[] = [
  'chaser',
  'swift',
  'tank',
  'ranged',
  'phantom',
  'exploder',
  'support',
  'summoner',
  'swarm',
  'elite',
  'elite',
];
const TIER_OF: (1 | 2 | 3)[] = [1, 1, 2, 2, 2, 3, 3, 3, 1, 3, 3];

const NAMES: Record<number, string[]> = {
  1: ['Sơn Tặc', 'Sói Yêu', 'Thạch Giáp Thú', 'Cung Thủ Tà Tu', 'Oán Hồn', 'Huyết Trùng Nổ', 'Đạo Sĩ Ma Giáo', 'Nhện Mẫu', 'Trùng Nhỏ', 'Ma Tu Trưởng Lão', 'Đầu Mục Sơn Tặc'],
  2: ['Hải Binh', 'Giao Lang', 'Quy Giáp Thú', 'Pháp Sư Hải Tộc', 'U Linh Biển', 'Cầu Thủy Nổ', 'Y Sư Giao Nhân', 'Mẫu Hải Yêu', 'Tôm Binh', 'Hộ Vệ Hải Hoàng', 'Trưởng Lão Thiên Kiếm'],
  3: ['Tinh Thú', 'Lang Tinh Không', 'Giáp Thiết Ngoại Vực', 'Pháp Sư Tinh Huyền', 'Tinh Linh', 'Cầu Tinh Bạo', 'Tế Sư Lôi Môn', 'Trùng Mẫu', 'Tinh Trùng', 'Hộ Vệ Tinh Chủ', 'Sứ Giả Tiên Giới'],
  4: ['Thiên Binh', 'Phi Hạc Thần', 'Kim Giáp Thiên Tướng', 'Cung Thủ Thiên Binh', 'Du Hồn Tiên Giới', 'Lôi Châu Bạo', 'Tiên Y Cửu Thiên', 'Mẫu Linh Thú', 'Tiểu Linh Thú', 'Chấp Pháp Sứ', 'Hộ Pháp Cửu Thiên'],
  5: ['Tàn Hồn Cổ Tiên', 'Thượng Cổ Hung Thú', 'Thạch Tượng Thượng Cổ', 'Cổ Tiên Xạ Thủ', 'Oán Linh Cổ Tiên', 'Cổ Hỏa Bạo', 'Tế Tự Thượng Cổ', 'Mẫu Cổ Thú', 'Trùng Cổ', 'Tiên Vương Hộ Vệ', 'Cổ Thần Tàn Niệm'],
  6: ['Đạo Nô', 'Hỗn Độn Thú', 'Hỗn Độn Giáp', 'Xạ Thủ Hỗn Độn', 'Bóng Hỗn Độn', 'Hỗn Độn Bạo', 'Chú Sư Đạo Nô', 'Mẫu Hỗn Độn', 'Trùng Hỗn Độn', 'Chấp Hành Giả', 'Hộ Vệ Đạo Tổ'],
};

function build(): EnemyDef[] {
  const list: EnemyDef[] = [];
  for (let w = 1; w <= 6; w++) {
    NAMES[w].forEach((name, i) => {
      const behavior = ORDER[i];
      list.push({
        id: `e${w}_${i}`,
        name,
        world: w,
        behavior,
        color: mixColor(WORLD_COLORS[w], BEHAVIORS[behavior].tint, 0.45),
        tier: TIER_OF[i],
      });
    });
  }
  return list;
}

export const ENEMIES: EnemyDef[] = build();
export function enemiesOfWorld(world: number): EnemyDef[] {
  return ENEMIES.filter((e) => e.world === world);
}
