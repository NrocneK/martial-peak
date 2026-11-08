// =====================================================================
// CẢNH GIỚI (tiến trình vĩnh viễn kiểu tu tiên).
// Mỗi "tier" là một bậc tu vi. Toàn bộ danh sách được dựng từ bảng định nghĩa bên dưới.
//   Thế giới 1: 6 cảnh giới lớn, KHÔNG chia tầng nhỏ.
//   Thế giới 2-4: mỗi cảnh giới chia 3 tầng.
//   Thế giới 5: Cửu Tiêu 9 phẩm (Địa Tiên / Thiên Tiên / Kim Tiên).
//   Thế giới 6: Thái Sơ (cuối cùng, không chia tầng).
// =====================================================================

export interface RealmTier {
  index: number;
  world: number;
  name: string;
  /** Tên cảnh giới lớn (không kèm tầng) */
  group: string;
  /** Tổng tu vi cần có để đạt tier này */
  cumTuVi: number;
}

const PHAM = ['Nhất', 'Nhị', 'Tam', 'Tứ', 'Ngũ', 'Lục', 'Thất', 'Bát', 'Cửu'];

/** [tên cảnh giới, số tầng nhỏ] theo từng thế giới (1..4) */
const WORLD_REALMS: Record<number, [string, number][]> = {
  1: [
    ['Luyện Thể', 1],
    ['Dẫn Khí', 1],
    ['Ngưng Mạch', 1],
    ['Kết Đan', 1],
    ['Hóa Anh', 1],
    ['Ngự Hư', 1],
  ],
  2: [
    ['Thông Thần', 3],
    ['Hợp Đạo', 3],
  ],
  3: [
    ['Nguyên Thần', 3],
    ['Quy Hư', 3],
    ['Thiên Vương', 3],
  ],
  4: [
    ['Đại Thừa', 3],
    ['Độ Kiếp', 3],
  ],
};

/** Chi phí tu vi để lên tier i (từ tier i-1). Tăng 28% mỗi bậc. */
export function stepCost(i: number): number {
  if (i <= 0) return 0;
  return Math.round(40 * Math.pow(1.28, i - 1));
}

function build(): RealmTier[] {
  const list: RealmTier[] = [];
  const push = (world: number, name: string, group: string) => {
    const index = list.length;
    const prev = index === 0 ? 0 : list[index - 1].cumTuVi;
    list.push({ index, world, name, group, cumTuVi: prev + stepCost(index) });
  };

  for (const w of [1, 2, 3, 4]) {
    for (const [name, subs] of WORLD_REALMS[w]) {
      for (let s = 1; s <= subs; s++) {
        push(w, subs === 1 ? name : `${name} tầng ${s}`, name);
      }
    }
  }
  // Thế giới 5: Cửu Tiêu 9 phẩm
  for (let p = 0; p < 9; p++) {
    const title = p < 3 ? 'Địa Tiên' : p < 6 ? 'Thiên Tiên' : 'Kim Tiên';
    push(5, `Cửu Tiêu ${PHAM[p]} phẩm (${title})`, 'Cửu Tiêu');
  }
  // Thế giới 6: Thái Sơ
  push(6, 'Thái Sơ', 'Thái Sơ');
  return list;
}

export const TIERS: RealmTier[] = build();
export const MAX_TIER = TIERS.length - 1; // 36

/** Tier đầu tiên của mỗi thế giới (chỉ số 1..6) */
export const WORLD_FIRST_TIER: number[] = [0, 0, 6, 12, 21, 27, 36];
/** Tier cuối cùng của mỗi thế giới */
export const WORLD_LAST_TIER: number[] = [0, 5, 11, 20, 26, 35, 36];

export function tierName(i: number): string {
  return TIERS[Math.max(0, Math.min(MAX_TIER, i))].name;
}

/** Tu vi cần để đột phá lên tier kế tiếp (null nếu đã tối đa) */
export function nextTierNeed(tier: number): number | null {
  return tier >= MAX_TIER ? null : TIERS[tier + 1].cumTuVi;
}

/** Chi phí bước kế tiếp (dùng cho giá gói tu vi, đan dược...) */
export function nextStep(tier: number): number {
  return stepCost(Math.min(MAX_TIER, tier + 1));
}
