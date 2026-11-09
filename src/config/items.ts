// =====================================================================
// TRANG BỊ, BÍ BẢO, ĐAN DƯỢC.
// 5 ô: vũ khí, y phục, giày, trang sức, bí bảo.
//  - Bí bảo: chỉ nhận được khi vượt các màn cố định (màn 5 và màn 10 của mỗi thế giới) lần đầu.
//  - 4 ô còn lại: nhận từ màn chơi (hiếm) và từ LUYỆN KHÍ.
// =====================================================================

import type { ItemStats, SlotId } from './types';

export interface Rarity {
  name: string;
  color: string;
  mul: number;
}

export const RARITIES: Rarity[] = [
  { name: 'Phàm', color: '#9aa0a6', mul: 1 },
  { name: 'Linh', color: '#4caf50', mul: 1.5 },
  { name: 'Bảo', color: '#3f8cff', mul: 2.2 },
  { name: 'Thánh', color: '#b45cff', mul: 3.2 },
  { name: 'Thần', color: '#ffc83d', mul: 4.6 },
];

export interface ItemInst {
  uid: number;
  slot: SlotId;
  rarity: number;
  /** Cấp cường hóa 0..10 */
  level: number;
  /** Thế giới nơi chế tạo / nhận được (1..6): quyết định "phẩm cấp" cơ bản */
  grade: number;
  weaponId?: string;
  bibaoId?: string;
  /** Thuộc tính phụ đã roll (lưu giá trị cụ thể, không roll lại khi tải game). Save cũ không có = rỗng. */
  affixes?: RolledAffix[];
  /** Đã khóa: không bán / phân giải được */
  locked?: boolean;
}

export interface RolledAffix {
  id: string;
  v: number;
}

export const MAX_ITEM_LEVEL = 10;

export const WEAPON_ITEM_NAMES: Record<string, string> = {
  wp_sword: 'Kiếm',
  wp_blade: 'Đao',
  wp_spear: 'Thương',
  wp_fist: 'Quyền Sáo',
  wp_bow: 'Cung',
  wp_fan: 'Phiến',
};

const SLOT_BASE_NAMES: Record<Exclude<SlotId, 'weapon' | 'bibao'>, string> = {
  clothes: 'Y Phục',
  shoes: 'Hài',
  accessory: 'Ngọc Bội',
};

export interface BibaoDef {
  id: string;
  name: string;
  world: number;
  /** Màn nhận được (5 hoặc 10) */
  stageNo: number;
  desc: string;
}

export const BIBAOS: BibaoDef[] = [
  { id: 'bb_w1_5', name: 'Tụ Bảo La Bàn', world: 1, stageNo: 5, desc: 'La bàn tìm bảo do một vị tông chủ vô danh để lại trong bí cảnh Thanh Vân.' },
  { id: 'bb_w1_10', name: 'Dưỡng Nguyên Ngọc', world: 1, stageNo: 10, desc: 'Ngọc dưỡng nguyên của Huyết Ma Lão Tổ, nay đã được tẩy sạch ma khí.' },
  { id: 'bb_w2_5', name: 'Hàn Hải Châu', world: 2, stageNo: 5, desc: 'Viên châu lấy từ đáy Thương Lan, lạnh buốt ngàn năm không tan.' },
  { id: 'bb_w2_10', name: 'Giao Nhân Lệ', world: 2, stageNo: 10, desc: 'Giọt lệ của Hải Hoàng, chứa sinh khí dồi dào của biển cả.' },
  { id: 'bb_w3_5', name: 'Tinh Lôi Tâm', world: 3, stageNo: 5, desc: 'Trái tim sấm sét kết tinh giữa tinh không.' },
  { id: 'bb_w3_10', name: 'Huyền Tinh Hạch', world: 3, stageNo: 10, desc: 'Hạch tinh thể của Tinh Chủ Thiên Huyền, hé lộ một phần âm mưu của tiên giới.' },
  { id: 'bb_w4_5', name: 'Thiên Binh Giáp Phiến', world: 4, stageNo: 5, desc: 'Mảnh giáp của thiên binh, mang theo thần lực hộ thể.' },
  { id: 'bb_w4_10', name: 'Thanh Loan Vũ', world: 4, stageNo: 10, desc: 'Lông vũ của Thanh Loan Tiên Quân, nhẹ như gió, nhanh như chớp.' },
  { id: 'bb_w5_5', name: 'Tiên Vương Lệnh', world: 5, stageNo: 5, desc: 'Lệnh bài quyền uy của một vị Tiên Vương thượng cổ.' },
  { id: 'bb_w5_10', name: 'Thượng Cổ Tàn Bi', world: 5, stageNo: 10, desc: 'Mảnh bia đá khắc sự thật về nguồn gốc con đường tu luyện.' },
  { id: 'bb_w6_5', name: 'Hỗn Độn Chi Tâm', world: 6, stageNo: 5, desc: 'Lõi sức mạnh của Hỗn Độn Thần Vực.' },
  { id: 'bb_w6_10', name: 'Đạo Tổ Ấn', world: 6, stageNo: 10, desc: 'Ấn ký của Đạo Tổ: vật chứng cho con đường tự mình tạo ra.' },
];

export function bibaoById(id: string): BibaoDef {
  const b = BIBAOS.find((x) => x.id === id);
  if (!b) throw new Error('Không có bí bảo ' + id);
  return b;
}

export function itemName(it: ItemInst): string {
  const r = RARITIES[it.rarity].name;
  if (it.slot === 'bibao') return bibaoById(it.bibaoId!).name;
  if (it.slot === 'weapon') return `${r} Phẩm ${WEAPON_ITEM_NAMES[it.weaponId!] ?? 'Vũ Khí'}`;
  return `${r} Phẩm ${SLOT_BASE_NAMES[it.slot]}`;
}

/** Hệ số sức mạnh tổng của một trang bị */
export function itemPower(it: ItemInst): number {
  const gradeMul = 1 + 0.5 * (it.grade - 1);
  return RARITIES[it.rarity].mul * (1 + 0.1 * it.level) * gradeMul;
}

/** Chỉ số do trang bị mang lại (tính theo công thức, không lưu) */
export function itemStats(it: ItemInst): ItemStats {
  const out: ItemStats = { ...baseStats(it) };
  // Thuộc tính phụ cộng thêm bên ngoài công thức gốc (không làm đổi sức mạnh đồ cũ)
  for (const a of it.affixes ?? []) {
    const d = AFFIXES.find((x) => x.id === a.id);
    if (d) out[d.stat] = (out[d.stat] ?? 0) + a.v;
  }
  return out;
}

function baseStats(it: ItemInst): ItemStats {
  const P = itemPower(it);
  switch (it.slot) {
    case 'weapon':
      return { damage: 0.25 * P, atkSpeed: 0.08 * P };
    case 'clothes':
      return { maxHp: 0.3 * P, armor: 10 * P };
    case 'shoes':
      return { moveSpeed: 0.05 * P, pickup: 25 * P, regen: 0.0015 * P };
    case 'accessory':
      return { crit: 0.03 * P, xpGain: 0.08 * P, linhGain: 0.1 * P, damage: 0.08 * P };
    case 'bibao':
      return { damage: 0.2 * P, maxHp: 0.2 * P, atkSpeed: 0.1 * P, area: 0.1 * P };
  }
}

// ---------------------------------------------------------------------
// THUỘC TÍNH PHỤ (affix): số dòng theo phẩm chất, mỗi dòng roll trong khoảng [min, max]
// ---------------------------------------------------------------------
export interface AffixDef {
  id: string;
  name: string;
  stat: keyof ItemStats;
  min: number;
  max: number;
  /** true: giá trị là điểm tuyệt đối (giáp, px); false: tỉ lệ (0.03 = 3%) */
  flat?: boolean;
  slots: SlotId[];
}

export const AFFIXES: AffixDef[] = [
  { id: 'a_damage', name: 'Công Kích', stat: 'damage', min: 0.02, max: 0.06, slots: ['weapon', 'accessory'] },
  { id: 'a_atk', name: 'Tốc Công', stat: 'atkSpeed', min: 0.02, max: 0.05, slots: ['weapon', 'accessory'] },
  { id: 'a_crit', name: 'Sát Ý', stat: 'crit', min: 0.01, max: 0.03, slots: ['weapon', 'accessory'] },
  { id: 'a_area', name: 'Quảng Vực', stat: 'area', min: 0.02, max: 0.06, slots: ['weapon', 'accessory'] },
  { id: 'a_hp', name: 'Hộ Mệnh', stat: 'maxHp', min: 0.03, max: 0.08, slots: ['clothes'] },
  { id: 'a_armor', name: 'Thiết Bích', stat: 'armor', min: 2, max: 8, flat: true, slots: ['clothes'] },
  { id: 'a_regen', name: 'Hồi Xuân', stat: 'regen', min: 0.001, max: 0.003, slots: ['clothes', 'shoes'] },
  { id: 'a_move', name: 'Phong Hành', stat: 'moveSpeed', min: 0.02, max: 0.05, slots: ['shoes'] },
  { id: 'a_pickup', name: 'Dẫn Linh', stat: 'pickup', min: 8, max: 25, flat: true, slots: ['shoes', 'accessory'] },
  { id: 'a_xp', name: 'Ngộ Đạo', stat: 'xpGain', min: 0.03, max: 0.08, slots: ['accessory'] },
  { id: 'a_linh', name: 'Tụ Tài', stat: 'linhGain', min: 0.03, max: 0.08, slots: ['accessory'] },
];

/** Số dòng thuộc tính phụ theo phẩm chất: Phàm 0, Linh 1, Bảo 1, Thánh 2, Thần 2 (bí bảo không có) */
export const AFFIX_COUNT = [0, 1, 1, 2, 2];

export function affixText(a: RolledAffix): string {
  const d = AFFIXES.find((x) => x.id === a.id);
  if (!d) return '?';
  const val = d.flat ? `+${Math.round(a.v)}` : `+${(a.v * 100).toFixed(d.stat === 'regen' ? 2 : 1)}%`;
  return `${d.name} ${val}`;
}

/** Roll một dòng thuộc tính phụ hợp lệ với ô, không trùng các id trong `exclude` */
export function rollAffix(slot: SlotId, exclude: string[]): RolledAffix | null {
  const pool = AFFIXES.filter((a) => a.slots.includes(slot) && !exclude.includes(a.id));
  if (pool.length === 0) return null;
  const d = pool[Math.floor(Math.random() * pool.length)];
  const raw = d.min + Math.random() * (d.max - d.min);
  return { id: d.id, v: d.flat ? Math.round(raw) : Math.round(raw * 1000) / 1000 };
}

/** Mô tả chỉ số dạng chữ để hiển thị (chỉ phần gốc; thuộc tính phụ hiển thị riêng bằng affixText) */
export function itemStatLines(it: ItemInst): string[] {
  const s = baseStats(it);
  const pct = (v: number) => `${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)}%`;
  const out: string[] = [];
  if (s.damage) out.push(`Sát thương +${pct(s.damage)}`);
  if (s.atkSpeed) out.push(`Tốc độ đánh +${pct(s.atkSpeed)}`);
  if (s.maxHp) out.push(`Máu +${pct(s.maxHp)}`);
  if (s.armor) out.push(`Giáp +${Math.round(s.armor)}`);
  if (s.moveSpeed) out.push(`Tốc chạy +${pct(s.moveSpeed)}`);
  if (s.pickup) out.push(`Phạm vi nhặt +${Math.round(s.pickup)}`);
  if (s.regen) out.push(`Hồi máu +${pct(s.regen)}/giây`);
  if (s.crit) out.push(`Chí mạng +${pct(s.crit)}`);
  if (s.xpGain) out.push(`XP +${pct(s.xpGain)}`);
  if (s.linhGain) out.push(`Linh thạch +${pct(s.linhGain)}`);
  if (s.area) out.push(`Phạm vi kỹ năng +${pct(s.area)}`);
  return out;
}

/** Tỉ lệ ra phẩm chất khi luyện khí, dịch chuyển theo thế giới cao nhất đã mở (grade 1..6) */
export function rarityWeights(grade: number): number[] {
  const g = grade - 1;
  return [Math.max(10, 60 - g * 8), 28 + g * 1, 9 + g * 3, 2.5 + g * 1.6, 0.5 + g * 0.6];
}

// ---------------------------------------------------------------------
// ĐAN DƯỢC (luyện đan)
// ---------------------------------------------------------------------
export type PillId = 'tuvi' | 'hp' | 'dmg' | 'def';

export interface PillDef {
  id: PillId;
  name: string;
  desc: string;
  herb: number;
  core: number;
  /** Hệ số chi phí linh thạch so với "một bước tu vi" kế tiếp */
  linhFactor: number;
  /** Số lần dùng tối đa (đan tăng vĩnh viễn), 0 = không giới hạn */
  cap: number;
}

export const PILLS: PillDef[] = [
  { id: 'tuvi', name: 'Tụ Khí Đan', desc: 'Tăng tu vi bằng 25% bước đột phá kế tiếp.', herb: 3, core: 0, linhFactor: 0.03, cap: 0 },
  { id: 'hp', name: 'Cường Thể Đan', desc: 'Tăng vĩnh viễn 2% máu tối đa.', herb: 2, core: 2, linhFactor: 0.02, cap: 40 },
  { id: 'dmg', name: 'Cương Khí Đan', desc: 'Tăng vĩnh viễn 2% sát thương.', herb: 2, core: 2, linhFactor: 0.02, cap: 40 },
  { id: 'def', name: 'Hộ Thể Đan', desc: 'Tăng vĩnh viễn 3 giáp.', herb: 2, core: 1, linhFactor: 0.02, cap: 30 },
];
