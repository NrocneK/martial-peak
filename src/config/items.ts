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
  { id: 'bb_w1_5', name: 'Sơn Hà Tàn Đồ', world: 1, stageNo: 5, desc: 'Tàn đồ chứa linh khí đất trời Trung Đô.' },
  { id: 'bb_w1_10', name: 'Truyền Thừa Ngọc Giản', world: 1, stageNo: 10, desc: 'Ngọc giản ghi lại truyền thừa cổ xưa.' },
  { id: 'bb_w2_5', name: 'Băng Phách Châu', world: 2, stageNo: 5, desc: 'Viên châu băng giá ngàn năm.' },
  { id: 'bb_w2_10', name: 'Ma Đế Huyết Ấn', world: 2, stageNo: 10, desc: 'Ấn ký nhuốm máu của Ma Đế.' },
  { id: 'bb_w3_5', name: 'Lôi Viêm Tâm', world: 3, stageNo: 5, desc: 'Trái tim lôi viêm cuồn cuộn sức mạnh.' },
  { id: 'bb_w3_10', name: 'Tử Tinh Hạch', world: 3, stageNo: 10, desc: 'Hạch tinh thể của Tinh Chủ Tử Tinh.' },
  { id: 'bb_w4_5', name: 'Long Cốt Trụ', world: 4, stageNo: 5, desc: 'Cột xương rồng cổ đại.' },
  { id: 'bb_w4_10', name: 'Yêu Thánh Linh Ấn', world: 4, stageNo: 10, desc: 'Linh ấn của Yêu Thánh.' },
  { id: 'bb_w5_5', name: 'Thiên Quân Lệnh', world: 5, stageNo: 5, desc: 'Lệnh bài quyền uy của Thiên Quân.' },
  { id: 'bb_w5_10', name: 'Mặc Hóa Tinh Thạch', world: 5, stageNo: 10, desc: 'Tinh thạch nhiễm mặc khí đáng sợ.' },
  { id: 'bb_w6_5', name: 'Mặc Chi Tâm', world: 6, stageNo: 5, desc: 'Lõi sức mạnh của Mặc tộc.' },
  { id: 'bb_w6_10', name: 'Sáng Thế Ngọc', world: 6, stageNo: 10, desc: 'Viên ngọc chứa sức mạnh sáng thế.' },
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

/** Mô tả chỉ số dạng chữ để hiển thị */
export function itemStatLines(it: ItemInst): string[] {
  const s = itemStats(it);
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
