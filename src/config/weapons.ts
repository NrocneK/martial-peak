// =====================================================================
// KỸ NĂNG THEO VŨ KHÍ. Mỗi loại vũ khí có 1 kỹ năng riêng, là đòn đánh thường TỰ ĐỘNG thi triển.
// Vũ khí là một ô trang bị; loại vũ khí quyết định kỹ năng này.
// Mọi cấp: sát thương +28%, hồi chiêu -5%, phạm vi +7% mỗi cấp (xem resolveSkill).
// =====================================================================

import type { SkillDef } from './types';

export const WEAPONS: SkillDef[] = [
  {
    id: 'wp_sword',
    name: 'Kiếm Khí Trảm',
    desc: 'Bắn kiếm khí về phía quái gần nhất, xuyên qua 1 quái.',
    group: 'weapon',
    kind: 'projectile',
    linkedPassive: 'p_damage',
    unlockTier: 0,
    color: 0xcfe8ff,
    base: { damage: 14, cooldown: 0.85, count: 1, area: 0, speed: 520, pierce: 1, width: 10 },
    countByLevel: [1, 1, 2, 2, 3],
  },
  {
    id: 'wp_blade',
    name: 'Liệt Đao Trảm',
    desc: 'Chém một nhát hình quạt rộng về phía quái gần nhất.',
    group: 'weapon',
    kind: 'slash',
    linkedPassive: 'p_hp',
    unlockTier: 0,
    color: 0xffb070,
    base: { damage: 22, cooldown: 1.1, count: 1, area: 125, speed: 0, pierce: 0, arc: 110 },
    countByLevel: [1, 1, 2, 2, 2],
  },
  {
    id: 'wp_spear',
    name: 'Phá Không Thương',
    desc: 'Đâm một đường thương xuyên thẳng qua mọi quái trên đường.',
    group: 'weapon',
    kind: 'beam',
    linkedPassive: 'p_area',
    unlockTier: 0,
    color: 0xffe9a0,
    base: { damage: 24, cooldown: 1.3, count: 1, area: 270, speed: 0, pierce: 0, width: 28 },
    countByLevel: [1, 1, 1, 2, 2],
  },
  {
    id: 'wp_fist',
    name: 'Phích Lịch Quyền',
    desc: 'Quyền kình nổ ra quanh người, đánh mọi quái ở gần.',
    group: 'weapon',
    kind: 'nova',
    linkedPassive: 'p_atk',
    unlockTier: 0,
    color: 0xff9090,
    base: { damage: 12, cooldown: 0.7, count: 1, area: 88, speed: 0, pierce: 0 },
  },
  {
    id: 'wp_bow',
    name: 'Truy Phong Tiễn',
    desc: 'Bắn nhanh nhiều mũi tên về phía quái.',
    group: 'weapon',
    kind: 'projectile',
    linkedPassive: 'p_crit',
    unlockTier: 0,
    color: 0xb8ffb0,
    base: { damage: 9, cooldown: 0.55, count: 1, area: 0, speed: 660, pierce: 0, width: 7 },
    countByLevel: [1, 2, 2, 3, 3],
  },
  {
    id: 'wp_fan',
    name: 'Hồi Toàn Phiến',
    desc: 'Ném quạt bay ra rồi quay về, xuyên qua mọi quái.',
    group: 'weapon',
    kind: 'boomerang',
    linkedPassive: 'p_move',
    unlockTier: 0,
    color: 0xd0b0ff,
    base: { damage: 14, cooldown: 1.2, count: 1, area: 280, speed: 430, pierce: 999, width: 16 },
    countByLevel: [1, 1, 2, 2, 3],
  },
];

export function weaponById(id: string): SkillDef {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) throw new Error('Không có vũ khí ' + id);
  return w;
}
