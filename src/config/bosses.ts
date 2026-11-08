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
  1: ['Hắc Phong Trại Chủ', 'Thạch Bi Thủ Vệ', 'Lục Gia Minh Chủ', 'Hôi Y Quốc Sư', 'Tuần Giang Sứ Hạ Chấn'],
  2: ['Hồ Ảnh Yêu Hậu', 'Hàn Sương Tông Chủ', 'Huyết Giáp Ma Tướng', 'Thanh Lân Yêu Vương', 'Cửu U Ma Hoàng', 'Cốt Tổ Bạch Diệm'],
  3: ['Ám Tinh Lữ Khách', 'Tông Chủ Thiên Lôi Môn', 'Hải Thần Triều Tịch', 'Tinh Chủ Huyền Diệu', 'Trùng Hoàng Vạn Mục'],
  4: ['Kiếm Tu Hôi Hóa', 'Độc Cô Tàn Nguyệt', 'Ngao Thiên Đại Trưởng Lão', 'Yêu Thánh Xích Diễm', 'Chiến Thần Phế Tích'],
  5: ['Thất Tinh Tiên Quân', 'Trưởng Lão Thanh Loan Điện', 'Trưởng Lão Âm Dương Cung', 'Kim Tiên Hôi Hóa', 'Vô Quang Vương Bị Phong Ấn'],
  6: ['Vô Quang Lĩnh Chủ', 'Vô Quang Vực Chủ', 'Vô Quang Vương Giả', 'Hôi Sắc Cự Thần', 'Hư Tịch'],
};

/** Boss phụ (tên tạm) để đủ 10 màn mỗi thế giới */
export const FILLER_BOSSES: Record<number, string[]> = {
  1: ['Nhị Đương Gia Hắc Phong', 'Huyết Lang Vương', 'Hôi Tu Hộ Pháp', 'Hổ Yêu Trấn Sơn', 'Thạch Giáp Thú Vương'],
  2: ['Cốt Tộc Hộ Vệ', 'Yêu Tộc Tiên Phong', 'Ma Tu Trưởng Lão', 'Hồ Tộc Trưởng Lão'],
  3: ['Cự Thú Tinh Không', 'Cường Giả Ngoại Vực', 'Trưởng Lão Thiên Lôi', 'Hộ Pháp Huyền Diệu', 'Trùng Tộc Thống Lĩnh'],
  4: ['Long Huyết Chiến Tướng', 'Hộ Pháp Tàn Nguyệt', 'Tiên Phong Xích Diễm', 'Cự Thú Hư Không', 'Trưởng Lão Hôi Hóa'],
  5: ['Hộ Pháp Tiên Quân', 'Tiên Phong Thanh Loan', 'Hộ Pháp Âm Dương', 'Tiên Quân Sa Đọa', 'Cự Thú Hôi Hóa'],
  6: ['Thống Lĩnh Vô Quang', 'Nô Tướng Vô Quang', 'Hộ Vệ Lĩnh Chủ', 'Chúa Sào Vô Quang', 'Linh Thú Vô Quang'],
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
