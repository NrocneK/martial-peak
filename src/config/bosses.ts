// =====================================================================
// BOSS. Mỗi màn có 1 boss cuối. Danh sách boss chính do bạn cung cấp (theo từng thế giới);
// các màn còn lại trong 10 màn dùng boss phụ (tên tạm do mình đặt, bạn có thể sửa tại đây).
// Mỗi boss có 3-4 chiêu (pattern), chuyển giai đoạn ở 50% máu (chiêu nhanh hơn, nhiều đạn hơn).
// =====================================================================

import { hashStr } from '../utils/format';
import { WORLD_COLORS } from './enemies';

export type BossPattern = 'charge' | 'radial' | 'volley' | 'slam' | 'summon' | 'spiral';
const PATTERNS: BossPattern[] = ['charge', 'radial', 'volley', 'slam', 'summon', 'spiral'];

export interface BossDef {
  id: string;
  name: string;
  world: number;
  /** true = boss trong danh sách của bạn; false = boss phụ (tên tạm) */
  main: boolean;
  /** true = boss chốt thế giới (màn 10) */
  final: boolean;
  color: number;
  /** Bán kính (pixel) */
  r: number;
  patterns: BossPattern[];
}

/** Boss chính theo thứ tự xuất hiện (cuối danh sách = boss chốt thế giới) */
export const MAIN_BOSSES: Record<number, string[]> = {
  1: [
    'Đại Đương Gia Sơn Tặc',
    'Truyền Thừa Thủ Vệ',
    'Đại Sư Thủ Lĩnh Bát Đại Gia Tộc',
    'Tà Vương',
    'Dương Bách',
  ],
  2: ['Mị Yêu', 'Băng Tông', 'Ma Tướng', 'Yêu Vương', 'Ma Đế', 'Khoa La (Cốt Tộc)'],
  3: ['U Ám Tinh Cường Giả', 'Tông Chủ Lôi Viêm Tông', 'Lạc Hải', 'Tinh Chủ Tử Tinh', 'Trùng Đế'],
  4: ['Tu Sĩ Ma Hóa', 'Tịch Mậu', 'Long Tộc Trưởng Lão', 'Yêu Thánh', 'Mạc Thắng'],
  5: [
    'Thất Xảo Thiên Quân',
    'Lang Gia Trưởng Lão',
    'Âm Dương Trưởng Lão',
    'Thần Quân Mặc Hóa',
    'Mặc Tộc Vương Chủ Bị Phong Ấn',
  ],
  6: ['Mặc Tộc Lĩnh Chủ', 'Mặc Tộc Vực Chủ', 'Mặc Tộc Vương Chủ', 'Mặc Sắc Cự Thần Linh', 'Mặc'],
};

/** Boss phụ (tên tạm) để đủ 10 màn mỗi thế giới */
export const FILLER_BOSSES: Record<number, string[]> = {
  1: ['Sơn Tặc Nhị Đương Gia', 'Huyết Lang Vương', 'Tà Tu Hộ Pháp', 'Yêu Hổ Trấn Sơn', 'Thạch Giáp Thú Vương'],
  2: ['Cốt Tộc Hộ Vệ Trưởng', 'Yêu Tộc Tiên Phong', 'Ma Tu Trưởng Lão', 'Hồ Yêu Trưởng Lão'],
  3: ['Tinh Không Cự Thú', 'Ngoại Vực Cường Giả', 'Lôi Viêm Trưởng Lão', 'Tử Tinh Hộ Pháp', 'Trùng Tộc Thống Lĩnh'],
  4: ['Long Huyết Chiến Tướng', 'Tịch Mậu Hộ Pháp', 'Yêu Thánh Tiên Phong', 'Hư Không Cự Thú', 'Ma Hóa Trưởng Lão'],
  5: ['Thiên Quân Hộ Pháp', 'Lang Gia Tiên Phong', 'Âm Dương Hộ Pháp', 'Thần Quân Sa Đọa', 'Mặc Hóa Cự Thú'],
  6: ['Mặc Đồ Thống Lĩnh', 'Mặc Nô Tướng', 'Mặc Tộc Hộ Vệ Trưởng', 'Mặc Sào Chi Chủ', 'Mặc Linh Thú'],
};

export function makeBoss(world: number, name: string, id: string, main: boolean, final: boolean): BossDef {
  const h = hashStr(id);
  const s = h % 6;
  // 3 chiêu (boss chốt thế giới có 4 chiêu); các chỉ số s, s+2, s+3/4 luôn khác nhau
  const idx = final ? [s, (s + 1) % 6, (s + 3) % 6, (s + 4) % 6] : [s, (s + 2) % 6, (s + 3 + (h % 2)) % 6];
  const base = WORLD_COLORS[world];
  return {
    id,
    name,
    world,
    main,
    final,
    color: base,
    r: final ? 56 : main ? 44 : 36,
    patterns: idx.map((i) => PATTERNS[i]),
  };
}

/** Chỉ số gốc của boss (ở thế giới 1). Nhân với hệ số thế giới + màn. */
export const BOSS_BASE = {
  hp: 2800,
  speed: 52,
  contactDmg: 12,
  bulletDmg: 9,
  xpGem: 150,
};
