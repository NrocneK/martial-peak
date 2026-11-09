// =====================================================================
// CẢNH GIỚI (tiến trình vĩnh viễn kiểu tu tiên).
// 17 đại cảnh giới, mỗi đại cảnh giới chia 3 tầng: Sơ kỳ, Trung kỳ, Hậu kỳ (Đạo Tổ không chia kỳ, tổng 49 bậc, tier 0..48).
// Đạt Hậu kỳ và đầy thanh tu vi = VIÊN MÃN (đủ điều kiện đột phá lên đại cảnh giới kế tiếp).
//   Thế giới 1: Luyện Thể → Luyện Khí → Trúc Cơ → Kim Đan (4)
//   Thế giới 2: Nguyên Anh → Hóa Thần → Luyện Hư (3)
//   Thế giới 3: Hợp Thể → Đại Thừa → Độ Kiếp (3)
//   Thế giới 4: Chân Tiên → Thiên Tiên → Huyền Tiên (3)
//   Thế giới 5: Kim Tiên → Tiên Vương → Tiên Đế (3)
//   Thế giới 6: Đạo Tổ (1, KHÔNG chia kỳ, không còn thanh tu vi)
// Tiên Đế Viên mãn đột phá thẳng lên Đạo Tổ.
// =====================================================================

export interface RealmTier {
  index: number;
  world: number;
  name: string;
  /** Tên đại cảnh giới (không kèm kỳ) */
  group: string;
  /** Tên kỳ: Sơ kỳ / Trung kỳ / Hậu kỳ */
  phase: string;
  /** Tổng tu vi cần có để đạt tier này */
  cumTuVi: number;
}

/** [tên đại cảnh giới] theo từng thế giới */
export const WORLD_REALMS: Record<number, string[]> = {
  1: ['Luyện Thể', 'Luyện Khí', 'Trúc Cơ', 'Kim Đan'],
  2: ['Nguyên Anh', 'Hóa Thần', 'Luyện Hư'],
  3: ['Hợp Thể', 'Đại Thừa', 'Độ Kiếp'],
  4: ['Chân Tiên', 'Thiên Tiên', 'Huyền Tiên'],
  5: ['Kim Tiên', 'Tiên Vương', 'Tiên Đế'],
  6: ['Đạo Tổ'],
};
const PHASES = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ'];

/**
 * Chỉ số sức mạnh quy đổi: giữ nguyên đường cong cân bằng cũ (thang 0..36) dù số bậc tăng lên 49.
 * Mọi công thức chỉ số / kinh tế dùng thang này nên việc chia nhỏ cảnh giới không làm nhân vật mạnh lên.
 */
export function powerIdx(tier: number): number {
  return (tier * 36) / 48;
}

/** Chi phí tu vi để lên tier i (từ tier i-1). */
export function stepCost(i: number): number {
  if (i <= 0) return 0;
  return Math.round(40 * Math.pow(1.28, powerIdx(i - 1)));
}

function build(): RealmTier[] {
  const list: RealmTier[] = [];
  for (const w of [1, 2, 3, 4, 5, 6]) {
    for (const group of WORLD_REALMS[w]) {
      // Đạo Tổ (thế giới 6) là một bậc duy nhất, không chia kỳ
      const phases = w === 6 ? [''] : PHASES;
      for (const phase of phases) {
        const index = list.length;
        const prev = index === 0 ? 0 : list[index - 1].cumTuVi;
        list.push({ index, world: w, name: phase ? `${group} · ${phase}` : group, group, phase, cumTuVi: prev + stepCost(index) });
      }
    }
  }
  return list;
}

export const TIERS: RealmTier[] = build();
export const MAX_TIER = TIERS.length - 1; // 48

/** Tier đầu / cuối của mỗi thế giới (chỉ số 1..6) */
export const WORLD_FIRST_TIER: number[] = [0, 0, 12, 21, 30, 39, 48];
export const WORLD_LAST_TIER: number[] = [0, 11, 20, 29, 38, 47, 48];

export function tierName(i: number): string {
  return TIERS[Math.max(0, Math.min(MAX_TIER, i))].name;
}

/** Tu vi cần để đột phá lên tier kế tiếp. Ở bậc cuối: mức tu vi tối đa (Viên mãn tối thượng). */
export function nextTierNeed(tier: number): number | null {
  return tier >= MAX_TIER ? null : TIERS[tier + 1].cumTuVi;
}

/** Mức tu vi tối đa của bậc hiện tại. Đạo Tổ (bậc cuối) không còn thanh tu vi nên trả về mốc của chính nó. */
export function tierCap(tier: number): number {
  return tier >= MAX_TIER ? TIERS[MAX_TIER].cumTuVi : TIERS[tier + 1].cumTuVi;
}

/** Đã Viên mãn: Hậu kỳ và đầy thanh tu vi (Đạo Tổ không có Viên mãn) */
export function isPerfect(tier: number, tuVi: number): boolean {
  if (tier >= MAX_TIER) return false;
  const t = TIERS[Math.max(0, tier)];
  return t.phase === 'Hậu kỳ' && tuVi >= tierCap(tier);
}

/** Tên hiển thị kèm "Viên mãn" khi đủ điều kiện */
export function tierLabel(tier: number, tuVi: number): string {
  const t = TIERS[Math.max(0, Math.min(MAX_TIER, tier))];
  return isPerfect(tier, tuVi) ? `${t.group} · Viên mãn` : t.name;
}

/** Chi phí bước kế tiếp (dùng cho giá gói tu vi, đan dược...) */
export function nextStep(tier: number): number {
  return stepCost(Math.min(MAX_TIER, tier + 1));
}
