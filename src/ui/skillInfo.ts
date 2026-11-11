import { passiveById, skillById } from '../config/skills';

export interface SkillInfo {
  name: string;
  color: number;
}

/** Tên + màu của một kỹ năng bất kỳ (vũ khí / cảnh giới / bị động) */
export function skillInfo(id: string): SkillInfo {
  const d = id.startsWith('p_') ? passiveById(id) : skillById(id);
  return { name: d.name, color: d.color };
}
