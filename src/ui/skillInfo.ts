import { weaponById } from '../config/weapons';
import { activeById } from '../config/activeSkills';
import { passiveById } from '../config/passiveSkills';

export interface SkillInfo {
  name: string;
  color: number;
}

/** Tên + màu của một kỹ năng bất kỳ (vũ khí / chủ động / bị động) */
export function skillInfo(id: string): SkillInfo {
  if (id.startsWith('wp_')) {
    const d = weaponById(id);
    return { name: d.name, color: d.color };
  }
  if (id.startsWith('ac_')) {
    const d = activeById(id);
    return { name: d.name, color: d.color };
  }
  const p = passiveById(id);
  return { name: p.name, color: p.color };
}
