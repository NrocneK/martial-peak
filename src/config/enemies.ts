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
  1: [
    'Sơn Tặc',
    'Sói Yêu',
    'Thạch Giáp Thú',
    'Tà Tu Xạ Thủ',
    'Du Hồn',
    'Huyết Trùng',
    'Yêu Đạo Sĩ',
    'Độc Nhện Mẫu',
    'Tiểu Trùng',
    'Tà Tu Trưởng Lão',
    'Sơn Tặc Đầu Mục',
  ],
  2: [
    'Yêu Binh',
    'Yêu Lang',
    'Cốt Giáp Thú',
    'Ma Tu Chú Sư',
    'U Linh',
    'Ma Hỏa Cầu',
    'Hồ Yêu Pháp Sư',
    'Mị Yêu Tử Mẫu',
    'Ma Trùng',
    'Ma Tướng Cận Vệ',
    'Băng Tông Trưởng Lão',
  ],
  3: [
    'Tinh Thú',
    'Phong Lang Tinh Không',
    'Thiết Giáp Ngoại Vực',
    'Lôi Viêm Đệ Tử',
    'Tinh Linh',
    'Tinh Bạo Cầu',
    'Tử Tinh Pháp Sư',
    'Trùng Mẫu',
    'Tinh Trùng',
    'Tinh Chủ Hộ Vệ',
    'Lạc Hải Tinh Tướng',
  ],
  4: [
    'Ma Hóa Tu Sĩ',
    'Yêu Báo Tinh Giới',
    'Long Giáp Vệ',
    'Tịch Mậu Môn Đồ',
    'Hư Không Du Hồn',
    'Long Huyết Bạo',
    'Yêu Thánh Hộ Pháp',
    'Long Mẫu',
    'Tinh Giới Tiểu Trùng',
    'Long Tộc Trưởng Lão',
    'Yêu Thánh Cận Vệ',
  ],
  5: [
    'Thiên Quân Đệ Tử',
    'Lang Gia Tu Sĩ',
    'Thần Quân Hộ Vệ',
    'Âm Dương Môn Đồ',
    'Hóa Mặc Du Hồn',
    'Mặc Hóa Bạo',
    'Thất Xảo Pháp Sư',
    'Mặc Hóa Mẫu',
    'Mặc Trùng',
    'Thần Quân Mặc Hóa',
    'Thiên Quân Hộ Pháp',
  ],
  6: [
    'Mặc Đồ',
    'Mặc Nô Lang',
    'Mặc Giáp Thú',
    'Mặc Tộc Xạ Thủ',
    'Mặc Ảnh',
    'Mặc Bạo',
    'Mặc Tộc Chú Sư',
    'Mặc Sào Mẫu',
    'Mặc Trùng',
    'Lĩnh Chủ Hộ Vệ',
    'Vực Chủ Hộ Vệ',
  ],
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
const BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

export function enemyById(id: string): EnemyDef {
  const e = BY_ID.get(id);
  if (!e) throw new Error('Không có quái ' + id);
  return e;
}

export function enemiesOfWorld(world: number): EnemyDef[] {
  return ENEMIES.filter((e) => e.world === world);
}
