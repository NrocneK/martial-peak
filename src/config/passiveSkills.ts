// =====================================================================
// KỸ NĂNG BỊ ĐỘNG. Mỗi kỹ năng vũ khí / chủ động liên kết với một bị động (trường linkedPassive).
// Tối đa 5 cấp. Mỗi cấp cộng `per` vào chỉ số tương ứng (xem RunState.recompute).
// =====================================================================

import type { PassiveDef } from './types';

export const PASSIVES: PassiveDef[] = [
  { id: 'p_hp', name: 'Cường Thể Quyết', desc: 'Tăng máu tối đa', stat: 'maxHp', per: 0.1, unit: 'pct', color: 0xff7070 },
  { id: 'p_move', name: 'Phong Ảnh Bộ', desc: 'Tăng tốc độ di chuyển', stat: 'moveSpeed', per: 0.06, unit: 'pct', color: 0x70e0ff },
  { id: 'p_damage', name: 'Cương Khí Công', desc: 'Tăng sát thương mọi kỹ năng', stat: 'damage', per: 0.1, unit: 'pct', color: 0xffb050 },
  { id: 'p_atk', name: 'Tâm Pháp Tinh Thông', desc: 'Tăng tốc độ đánh (hồi chiêu nhanh hơn)', stat: 'atkSpeed', per: 0.08, unit: 'pct', color: 0xffe070 },
  { id: 'p_armor', name: 'Hộ Thể Thần Công', desc: 'Tăng giáp', stat: 'armor', per: 8, unit: 'flat', color: 0xa0a0c0 },
  { id: 'p_pickup', name: 'Linh Thức Dẫn Khí', desc: 'Tăng phạm vi hút XP', stat: 'pickup', per: 0.25, unit: 'pct', color: 0x80ffb0 },
  { id: 'p_area', name: 'Cửu Tiêu Ấn', desc: 'Tăng phạm vi kỹ năng', stat: 'area', per: 0.08, unit: 'pct', color: 0xc090ff },
  { id: 'p_regen', name: 'Hồi Nguyên Quyết', desc: 'Hồi máu mỗi giây', stat: 'regen', per: 0.004, unit: 'pct', color: 0x70ff90 },
  { id: 'p_xp', name: 'Ngộ Tính Thiên Phú', desc: 'Tăng XP nhận được', stat: 'xpGain', per: 0.08, unit: 'pct', color: 0x90c0ff },
  { id: 'p_crit', name: 'Phá Giáp Chân Ý', desc: 'Tăng tỉ lệ chí mạng (gấp đôi sát thương)', stat: 'crit', per: 0.05, unit: 'pct', color: 0xff9060 },
  { id: 'p_luck', name: 'Tụ Bảo Phù', desc: 'Tăng linh thạch nhận được', stat: 'linhGain', per: 0.1, unit: 'pct', color: 0xffd860 },
];

export function passiveById(id: string): PassiveDef {
  const p = PASSIVES.find((x) => x.id === id);
  if (!p) throw new Error('Không có kỹ năng bị động ' + id);
  return p;
}

/** Mô tả giá trị ở một cấp, ví dụ "+20%" hoặc "+16" */
export function passiveValueText(p: PassiveDef, level: number): string {
  const v = p.per * level;
  if (p.unit === 'flat') return `+${Math.round(v)}`;
  const pct = v * 100;
  return `+${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
}
