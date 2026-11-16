// Tu luyện (cảnh giới, tu vi, đột phá, "cắn đá"), luyện đan, và kỹ năng chủ động mang theo.

import { REALM_SKILLS as ACTIVES } from '../../config/skills';
import { PILLS, PILL_GRADES, pillGradeRates, rollPillGrade, type PillId } from '../../config/items';
import { MAX_TIER, TIERS, isPerfect, nextStep, nextTierNeed } from '../../config/realms';
import { ALL_STAGES } from '../../config/worlds';
import { data, fail, ok, save, type Result } from './save';
import { gameCompleted } from './worldProgress';
import { track } from './quests';

// ---------------------------------------------------------------------
// Cảnh giới / tu vi
// ---------------------------------------------------------------------
/** Đang ở Viên mãn (Hậu kỳ + đầy tu vi) */
export function perfected(): boolean {
  return isPerfect(data.tier, data.tuVi);
}

/** Boss cuối game: phải đánh bại mới được bước lên Đạo Tổ */
export const FINAL_BOSS_NAME = ALL_STAGES[ALL_STAGES.length - 1].boss.name;

/** Đang đứng trước ngưỡng Đạo Tổ nhưng chưa đánh bại boss cuối */
export function daoToLocked(): boolean {
  return data.tier === MAX_TIER - 1 && !gameCompleted();
}

export function canBreakthrough(): boolean {
  const need = nextTierNeed(data.tier);
  return need !== null && data.tuVi >= need && !daoToLocked();
}

/** `ending: true` khi vừa bước lên Đạo Tổ (giao diện sẽ chiếu đoạn kết) */
export function breakthrough(): Result & { ending?: boolean } {
  if (data.tier >= MAX_TIER) return fail('Đã đạt cảnh giới cao nhất.');
  if (daoToLocked()) return fail(`Phải đánh bại ${FINAL_BOSS_NAME} mới có thể bước lên Đạo Tổ.`);
  if (!canBreakthrough()) return fail('Chưa đủ tu vi để đột phá.');
  data.tier++;
  track('cultivate');
  if (data.tier === MAX_TIER) {
    save();
    return { ...ok(`Đột phá thành công: ${TIERS[data.tier].name}!`), ending: true };
  }
  // Đột phá có thể mở khóa kỹ năng chủ động mới
  const unlocked = ACTIVES.filter((a) => a.unlockTier === data.tier).map((a) => a.name);
  save();
  return ok(`Đột phá thành công: ${TIERS[data.tier].name}!` + (unlocked.length ? ` Mở khóa kỹ năng: ${unlocked.join(', ')}.` : ''));
}

/** Gói tu vi bán bằng linh thạch ("cắn đá") */
export function packInfo(): { cost: number; gain: number } {
  const step = nextStep(data.tier);
  return { cost: Math.max(1, Math.ceil(0.12 * step)), gain: Math.max(1, Math.ceil(0.1 * step)) };
}

export function buyPack(count: number): Result {
  const { cost, gain } = packInfo();
  const maxByLinh = Math.floor(data.linh / cost);
  const n = Math.min(count, maxByLinh);
  if (n <= 0) return fail('Không đủ linh thạch.');
  data.linh -= cost * n;
  data.tuVi += gain * n;
  track('cultivate');
  save();
  return ok(`Hấp thụ ${n} gói linh thạch, nhận ${gain * n} tu vi.`);
}

// ---------------------------------------------------------------------
// Luyện đan
// ---------------------------------------------------------------------
export function pillLinhCost(id: PillId): number {
  const def = PILLS.find((p) => p.id === id)!;
  return Math.max(1, Math.ceil(def.linhFactor * nextStep(data.tier)));
}

type CapPill = Exclude<PillId, 'tuvi'>;

/** Số viên đan tăng vĩnh viễn đã dùng (Tụ Khí Đan: 0, không giới hạn) */
export function pillUsedCount(id: PillId): number {
  return id === 'tuvi' ? 0 : data.pillUsed[id];
}

/** Số viên đang cất trong túi trữ vật (`grade` bỏ trống = mọi phẩm) */
export function pillStock(id: PillId, grade?: number): number {
  const b = data.pillBag[id];
  return grade === undefined ? b.reduce((a, x) => a + x, 0) : b[grade];
}

/** Đại cảnh giới hiện tại (0..16) — quyết định tỉ lệ phẩm đan */
export function majorRealm(): number {
  const groups: string[] = [];
  for (const t of TIERS) if (!groups.includes(t.group)) groups.push(t.group);
  return groups.indexOf(TIERS[data.tier].group);
}

export function pillRates(): number[] {
  return pillGradeRates(majorRealm());
}

/** Tu vi nhận được khi dùng 1 Tụ Khí Đan phẩm `grade` (tính theo cảnh giới LÚC DÙNG) */
export function tuviPillGain(grade: number): number {
  return Math.ceil(0.25 * PILL_GRADES[grade].mul * nextStep(data.tier));
}

/** Luyện đan: ra phẩm ngẫu nhiên, cất vào túi trữ vật */
export function craftPill(id: PillId): Result & { grade?: number } {
  const def = PILLS.find((p) => p.id === id)!;
  if (def.cap > 0 && pillUsedCount(id) + pillStock(id) >= def.cap) return fail('Số đã dùng và đang cất trong túi đã đủ giới hạn của loại đan này.');
  const linh = pillLinhCost(id);
  if (data.mats.herb < def.herb || data.mats.core < def.core) return fail('Không đủ nguyên liệu.');
  if (data.linh < linh) return fail('Không đủ linh thạch.');
  data.mats.herb -= def.herb;
  data.mats.core -= def.core;
  data.linh -= linh;
  const grade = rollPillGrade(majorRealm());
  data.pillBag[id][grade]++;
  track('alchemy');
  save();
  return { ...ok(`Luyện thành ${def.name} ${PILL_GRADES[grade].name} phẩm, đã cất vào túi trữ vật.`), grade };
}

/** Dùng `count` viên đan `id` phẩm `grade` trong túi trữ vật */
export function usePill(id: PillId, grade: number, count: number): Result {
  const def = PILLS.find((p) => p.id === id)!;
  let n = Math.min(count, data.pillBag[id][grade]);
  if (n <= 0) return fail('Trong túi không còn loại đan này.');
  const gname = `${def.name} ${PILL_GRADES[grade].name} phẩm`;
  if (id === 'tuvi') {
    if (data.tier >= MAX_TIER) return fail('Đạo Tổ không cần tu vi nữa.');
    const gain = tuviPillGain(grade) * n;
    data.pillBag.tuvi[grade] -= n;
    data.tuVi += gain;
    track('cultivate');
    save();
    return ok(`Dùng ${n} ${gname}, nhận ${gain} tu vi.`);
  }
  const k = id as CapPill;
  n = Math.min(n, def.cap - data.pillUsed[k]);
  if (n <= 0) return fail('Đã dùng đủ giới hạn loại đan này.');
  data.pillBag[k][grade] -= n;
  data.pillUsed[k] += n;
  data.pills[k] += PILL_GRADES[grade].mul * n;
  save();
  return ok(`Dùng ${n} ${gname}. Hiệu quả tăng vĩnh viễn.`);
}

// ---------------------------------------------------------------------
// Kỹ năng chủ động mang theo (tối đa 3)
// ---------------------------------------------------------------------
export function toggleLoadout(id: string): Result {
  const a = ACTIVES.find((x) => x.id === id);
  if (!a || a.unlockTier > data.tier) return fail('Kỹ năng chưa mở khóa.');
  const i = data.loadout.indexOf(id);
  if (i >= 0) {
    data.loadout.splice(i, 1);
  } else {
    if (data.loadout.length >= 3) return fail('Chỉ mang được tối đa 3 kỹ năng cảnh giới.');
    data.loadout.push(id);
  }
  save();
  return ok('Đã cập nhật kỹ năng mang theo.');
}

/** Loadout hợp lệ (loại bỏ kỹ năng chưa mở khóa) */
export function currentLoadout(): string[] {
  return data.loadout.filter((id) => ACTIVES.some((a) => a.id === id && a.unlockTier <= data.tier)).slice(0, 3);
}

/** Ghi nhận lần đầu thức tỉnh một kỹ năng trong màn → mở công thức trong Sách Công Pháp */
export function recordAwaken(id: string): void {
  if (data.awakened.includes(id)) return;
  data.awakened.push(id);
  save();
}

export function isAwakenKnown(id: string): boolean {
  return data.awakened.includes(id);
}
