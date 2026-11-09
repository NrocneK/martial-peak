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
  1: ['Hắc Sơn Đại Đương Gia', 'Thạch Linh Thủ Vệ', 'Thiếu Chủ Huyết Ảnh Môn', 'Yêu Vương Hắc Vân', 'Huyết Ma Lão Tổ'],
  2: ['Hải Yêu Vương Thương Lan', 'Tông Chủ Thiên Kiếm Tông', 'Ma Tôn Cửu U', 'Thánh Nữ Băng Hải Cung', 'Long Quy Trưởng Lão', 'Thương Lan Hải Hoàng'],
  3: ['Tinh Không Cự Thú', 'Tông Chủ Tinh Huyền Môn', 'Sứ Giả Cửu Thiên Điện', 'Lôi Kiếp Hóa Thân', 'Tinh Chủ Thiên Huyền'],
  4: ['Thiên Binh Thống Lĩnh', 'Linh Chi Tiên Tử', 'Thiên Hình Tôn Giả', 'Thanh Loan Tiên Quân', 'Cửu Thiên Điện Chủ'],
  5: ['Thượng Cổ Thủ Vệ', 'Tiên Vương Huyết Kiếm', 'Tiên Vương Hội Trưởng', 'Cổ Thần Phế Tích', 'Tiên Đế Vĩnh Dạ'],
  6: ['Hỗn Độn Linh Thể', 'Đạo Nô Thủ Hộ', 'Chấp Hành Giả Đại Đạo Lô', 'Hóa Thân Thái Hư', 'Thái Hư Đạo Tổ'],
};

/** Boss phụ (tên tạm) để đủ 10 màn mỗi thế giới */
export const FILLER_BOSSES: Record<number, string[]> = {
  1: ['Nhị Đương Gia Hắc Sơn', 'Sói Yêu Thủ Lĩnh', 'Ma Tu Hộ Pháp', 'Hổ Yêu Trấn Sơn', 'Đại Sư Huynh Phản Đồ'],
  2: ['Hải Tộc Hộ Vệ', 'Kiếm Tu Phản Tông', 'Ma Tu Tiên Phong', 'Giao Nhân Tế Tư'],
  3: ['Ngoại Vực Cường Giả', 'Hộ Pháp Tinh Huyền', 'Trùng Tộc Thống Lĩnh', 'Kiếp Lôi Thú', 'Thám Tử Tiên Giới'],
  4: ['Thiên Binh Tiên Phong', 'Hộ Pháp Cửu Thiên', 'Chấp Pháp Sứ', 'Thần Thú Trấn Giới', 'Tiên Tướng Sa Đọa'],
  5: ['Thượng Cổ Linh Thú', 'Hộ Vệ Tiên Vương', 'Tàn Hồn Cổ Tiên', 'Thạch Tượng Thượng Cổ', 'Tiên Binh Phản Loạn'],
  6: ['Hỗn Độn Ma Thú', 'Đạo Binh Vô Tâm', 'Tàn Niệm Đạo Tổ', 'Hư Không Cự Thú', 'Nô Lệ Đại Đạo'],
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
