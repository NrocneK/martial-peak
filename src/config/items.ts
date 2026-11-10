// =====================================================================
// TRANG BỊ, BÍ BẢO, ĐAN DƯỢC.
// 5 ô: vũ khí, y phục, giày, trang sức, bí bảo.
//  - Bí bảo: chỉ nhận được khi vượt các màn cố định (màn 5 và màn 10 của mỗi thế giới) lần đầu.
//  - 4 ô còn lại: nhận từ màn chơi (hiếm) và từ LUYỆN KHÍ.
// =====================================================================

import type { ItemStats, SlotId } from './types';

// ---------------------------------------------------------------------
// CẤP + PHẨM (hệ trang bị v1.0)
//   6 Cấp: Phàm (3 phẩm) · Linh (4) · Tiên (5) · Thần (5) · Thánh (5) · Đạo (không phân phẩm)
//   Phẩm: Hạ (trắng) · Trung (xanh lá) · Thượng (xanh dương) · Cực (tím) · Thượng Cổ (cam); Đạo cấp: thất thải hào quang.
//   Màu phẩm CHỈ hiện ở viền ảnh + tên, không đổi màu món đồ. Hình ảnh đổi theo Cấp (chất liệu).
// ---------------------------------------------------------------------
export interface GearTier {
  name: string;
  /** Số phẩm của cấp (Đạo = 1: không phân phẩm) */
  grades: number;
  /** Hệ số sức mạnh gốc */
  mul: number;
}
export const GEAR_TIERS: GearTier[] = [
  { name: 'Phàm', grades: 3, mul: 1 },
  { name: 'Linh', grades: 4, mul: 1.8 },
  { name: 'Tiên', grades: 5, mul: 3.2 },
  { name: 'Thần', grades: 5, mul: 5.6 },
  { name: 'Thánh', grades: 5, mul: 9.5 },
  { name: 'Đạo', grades: 1, mul: 17 },
];
export const DAO_TIER = 5;
export const QUALITIES = [
  { name: 'Hạ', color: '#eef0f4' },
  { name: 'Trung', color: '#4fd06a' },
  { name: 'Thượng', color: '#3f8cff' },
  { name: 'Cực', color: '#b45cff' },
  { name: 'Thượng Cổ', color: '#ff9a2e' },
];
/** Màu "thất thải" của Đạo cấp (dùng khi cần một màu đơn, vd. tên trong danh sách) — viền dùng gradient cầu vồng ở CSS */
export const DAO_COLOR = '#ffd765';
/** Bí bảo: bộ riêng, không cấp không phẩm */
export const BIBAO_COLOR = '#8fe4f8';
/** Mỗi phẩm cao hơn tăng thêm bao nhiêu sức mạnh trong cùng cấp */
export const QUALITY_STEP = 0.15;

export interface ItemInst {
  uid: number;
  slot: SlotId;
  /** Cấp 0..5 (Phàm..Đạo). Bí bảo: theo thế giới nhận được (chỉ để tính sức mạnh, không hiển thị) */
  tier: number;
  /** Phẩm 0..4 (Hạ..Thượng Cổ); Đạo cấp luôn 0 */
  quality: number;
  /** Cấp cường hóa 0..10 */
  level: number;
  weaponId?: string;
  bibaoId?: string;
  /** Thuộc tính phụ đã roll (lưu giá trị cụ thể, không roll lại khi tải game) */
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

/** Tên riêng của từng món theo Cấp (6 loại vũ khí + y phục, giày, trang sức = 9 × 6 = 54 món) */
export const GEAR_NAMES: Record<string, string[]> = {
  wp_sword: ['Thiết Kiếm', 'Bích Ngọc Kiếm', 'Lưu Vân Kiếm', 'Liệt Dương Kiếm', 'Thánh Quang Kiếm', 'Hỗn Độn Đạo Kiếm'],
  wp_blade: ['Thiết Đao', 'Bích Ngọc Đao', 'Lưu Vân Đao', 'Liệt Dương Đao', 'Thánh Quang Đao', 'Hỗn Độn Đạo Đao'],
  wp_spear: ['Thiết Thương', 'Bích Ngọc Thương', 'Lưu Vân Thương', 'Liệt Dương Thương', 'Thánh Quang Thương', 'Hỗn Độn Đạo Thương'],
  wp_fist: ['Thiết Quyền Sáo', 'Bích Ngọc Quyền Sáo', 'Lưu Vân Quyền Sáo', 'Liệt Dương Quyền Sáo', 'Thánh Quang Quyền Sáo', 'Hỗn Độn Đạo Quyền'],
  wp_bow: ['Mộc Cung', 'Bích Ngọc Cung', 'Lưu Vân Cung', 'Liệt Dương Cung', 'Thánh Quang Cung', 'Hỗn Độn Đạo Cung'],
  wp_fan: ['Trúc Phiến', 'Bích Ngọc Phiến', 'Lưu Vân Phiến', 'Liệt Dương Phiến', 'Thánh Quang Phiến', 'Hỗn Độn Đạo Phiến'],
  clothes: ['Thô Bố Y', 'Bích Ngọc Pháp Bào', 'Lưu Vân Tiên Y', 'Liệt Dương Thần Bào', 'Thánh Quang Đạo Bào', 'Hỗn Độn Đạo Y'],
  shoes: ['Thảo Hài', 'Bích Ngọc Ngoa', 'Lưu Vân Hài', 'Liệt Dương Chiến Ngoa', 'Thánh Quang Bộ Vân Hài', 'Hỗn Độn Đạo Hài'],
  accessory: ['Mộc Bội', 'Bích Ngọc Bội', 'Lưu Vân Bội', 'Liệt Dương Ấn', 'Thánh Quang Bội', 'Hỗn Độn Đạo Châu'],
};

/** Khóa tên / hình của món đồ: vũ khí theo loại, còn lại theo ô */
export function gearKey(it: Pick<ItemInst, 'slot' | 'weaponId'>): string {
  return it.slot === 'weapon' ? (it.weaponId ?? 'wp_sword') : it.slot;
}

/** Màu phẩm (viền + tên) */
export function itemColor(it: ItemInst): string {
  if (it.slot === 'bibao') return BIBAO_COLOR;
  if (it.tier >= DAO_TIER) return DAO_COLOR;
  return QUALITIES[it.quality]?.color ?? QUALITIES[0].color;
}

/** "Tiên cấp · Thượng phẩm" / "Đạo cấp" / "Bí bảo" */
export function itemRankLabel(it: ItemInst): string {
  if (it.slot === 'bibao') return 'Bí bảo';
  if (it.tier >= DAO_TIER) return 'Đạo cấp';
  return `${GEAR_TIERS[it.tier].name} cấp · ${QUALITIES[it.quality].name} phẩm`;
}

/** Thứ hạng tổng (0..22) để sắp xếp: cấp trước, phẩm sau */
export function itemRank(it: ItemInst): number {
  let r = 0;
  for (let t = 0; t < it.tier; t++) r += GEAR_TIERS[t].grades;
  return r + it.quality;
}

/** Đường dẫn hình món đồ (public/gear, vẽ bằng tools/art/gear.px.js) */
export function itemIcon(it: Pick<ItemInst, 'slot' | 'weaponId' | 'bibaoId' | 'tier'>): string {
  if (it.slot === 'bibao') return `/gear/${it.bibaoId}.png?v=${GEAR_ART_V}`;
  return `/gear/${gearKey(it)}_${it.tier}.png?v=${GEAR_ART_V}`;
}
/**
 * CÁCH CẦM vũ khí trên nhân vật (Hành Trang). Sprite nhân vật là hero_full 58x106 (nhìn xéo sang trái).
 * Hình cầm tay ({weaponId}_held_{tier}.png, vẽ trong tools/art/gear.px.js) là bản đơn giản của hình ô đồ,
 * đã vẽ sẵn đúng hướng cầm, dạng DẢI `frames` khung ngang (linh khí chạy quanh thân, tua lay) — chạy 1 giây / vòng.
 *   w, h   : cỡ MỘT khung · gx, gy: điểm cầm trên khung (trùng với điểm neo trên nhân vật)
 *   anchor : 'fist' = nắm tay phải (tay xa, mép trái) · 'chest' = trước ngực
 *   layer  : 'back' = SAU nhân vật (thân, tay áo che phần chuôi / phần đi qua sau lưng) · 'front' = trước nhân vật
 *   pose   : biến thể sprite nhân vật (vd. 'fan': bỏ nắm tay buông, cẳng tay gập lên cầm quạt trước ngực)
 *   cover  : vẽ đè lại nắm tay (hero_fist.png) lên chuôi → ngón tay nắm quanh chuôi, đốc nhô trên, hộ thủ dưới
 *   near   : (vũ khí nằm sau thân) bán kính quanh điểm cầm, tính bằng điểm ảnh hình, được đưa ra TRƯỚC thân —
 *            đoạn cán / chuôi trong lòng bàn tay lộ ra rồi nắm tay (cover) đè lên, phần còn lại vẫn khuất sau lưng
 */
export interface WeaponHold {
  w: number;
  h: number;
  gx: number;
  gy: number;
  anchor: 'fist' | 'chest';
  layer: 'back' | 'front';
  pose?: 'fan';
  cover?: boolean;
  near?: number;
}
/** Số khung của hình cầm tay */
export const HELD_FRAMES = 8;
export const WEAPON_HOLD: Record<string, WeaponHold> = {
  // kiếm, đao: tay buông → lưỡi chĩa xuống chéo phía trước; nắm tay vẽ đè lên giữa chuôi (đốc nhô lên trên, hộ thủ dưới)
  wp_sword: { w: 48, h: 52, gx: 38, gy: 12, anchor: 'fist', layer: 'front', cover: true },
  wp_blade: { w: 48, h: 52, gx: 38, gy: 12, anchor: 'fist', layer: 'front', cover: true },
  // thương cầm chéo: mũi chĩa xuống trước chân, đốc sau vai phải; đoạn qua lưng bị che
  wp_spear: { w: 82, h: 82, gx: 40, gy: 41, anchor: 'fist', layer: 'back', near: 7, cover: true },
  // cung xoay chéo: bụng cung tại nắm tay, cánh trên vươn ra ngoài, cánh dưới chạy sau thân
  wp_bow: { w: 64, h: 56, gx: 24, gy: 41, anchor: 'fist', layer: 'back', near: 7, cover: true },
  // quạt nhỏ che trước ngực (hình có sẵn bàn tay nắm cán); điểm neo = trục quạt
  wp_fan: { w: 34, h: 26, gx: 17, gy: 21, anchor: 'chest', layer: 'front', pose: 'fan' },
};
/** Nắm tay PHẢI (tay phía xa, mép trái) và điểm trước ngực trên hero_full 58x106 đã lật */
export const HERO_RIGHT_FIST = { x: 6, y: 56 };
export const HERO_CHEST = { x: 22, y: 45 };
/** Hình nắm tay riêng (public/ui/hero_fist.png, 6x7) đặt đè lên chuôi: góc trên-trái trên hero_full */
export const FIST_COVER = { x: 3, y: 54, w: 6, h: 7 };
/** Quyền sáo đeo hai tay: vị trí góc trên-trái của từng phiến giáp trên sprite nhân vật */
export const FIST_GEAR = [
  { img: 'near', x: 26, y: 50, w: 13, h: 13 },   // tay trái (tay gần, giữa thân)
  { img: 'far', x: 1, y: 50, w: 10, h: 12 },   // tay phải (tay xa, mép trái)
];

/** Đường dẫn hình vũ khí khi cầm: mặc định dải khung 'held'; quyền sáo dùng 'near' / 'far' (tĩnh) */
export function weaponHoldSrc(it: Pick<ItemInst, 'weaponId' | 'tier'>, img = 'held'): string {
  return `/gear/${it.weaponId}_${img}_${it.tier}.png?v=${GEAR_ART_V}`;
}

/** Đổi số này khi vẽ lại hình trang bị để trình duyệt tải bản mới */
export const GEAR_ART_V = 9;

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
  { id: 'bb_w5_5', name: 'Đại La Lệnh', world: 5, stageNo: 5, desc: 'Lệnh bài quyền uy của một vị Đại La Kim Tiên thượng cổ.' },
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
  if (it.slot === 'bibao') return bibaoById(it.bibaoId!).name;
  return GEAR_NAMES[gearKey(it)]?.[it.tier] ?? 'Trang bị';
}

/** Hệ số sức mạnh tổng của một trang bị */
export function itemPower(it: ItemInst): number {
  const lv = 1 + 0.1 * it.level;
  if (it.slot === 'bibao') {
    // bí bảo: mạnh theo thế giới nhận được, màn 10 mạnh hơn màn 5
    const b = bibaoById(it.bibaoId!);
    return GEAR_TIERS[Math.min(DAO_TIER, b.world - 1)].mul * (b.stageNo === 10 ? 1.4 : 1.15) * lv;
  }
  return GEAR_TIERS[it.tier].mul * (1 + QUALITY_STEP * it.quality) * lv;
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

/** Số dòng thuộc tính phụ theo phẩm: Hạ 0, Trung 1, Thượng 1, Cực 2, Thượng Cổ 3. Đạo cấp: 3. Bí bảo: không có. */
export const AFFIX_COUNT = [0, 1, 1, 2, 3];
export function affixCount(it: Pick<ItemInst, 'tier' | 'quality' | 'slot'>): number {
  if (it.slot === 'bibao') return 0;
  return it.tier >= DAO_TIER ? 3 : AFFIX_COUNT[it.quality];
}

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

/**
 * NGUỒN RƠI: mỗi thế giới ra 2 cấp — cấp chính và (ít hơn) cấp kế tiếp. Đạo cấp rất hiếm, chỉ từ thế giới 5-6.
 * [cấp, tỉ trọng] theo thế giới 1..6 (dùng cho cả rơi đồ sau màn và luyện khí, theo thế giới cao nhất đã mở).
 */
export const DROP_TIERS: Record<number, [number, number][]> = {
  1: [[0, 85], [1, 15]],
  2: [[1, 85], [2, 15]],
  3: [[2, 85], [3, 15]],
  4: [[3, 85], [4, 15]],
  5: [[4, 95], [5, 5]],
  6: [[4, 75], [5, 25]],
};
/** Tỉ trọng phẩm Hạ..Thượng Cổ (cắt theo số phẩm của cấp) */
export const QUALITY_WEIGHTS = [50, 28, 14, 6, 2];

function pick(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

/** Roll cấp + phẩm cho đồ rơi / luyện khí ở thế giới `world` (1..6) */
export function rollTierQuality(world: number): { tier: number; quality: number } {
  const opts = DROP_TIERS[Math.max(1, Math.min(6, world))];
  const tier = opts[pick(opts.map((o) => o[1]))][0];
  const quality = pick(QUALITY_WEIGHTS.slice(0, GEAR_TIERS[tier].grades));
  return { tier, quality };
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
