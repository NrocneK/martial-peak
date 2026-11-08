import { RUN, xpForLevel } from '../config/balance';
import { newRunMods, type RunMods } from '../config/types';
import { PASSIVES } from '../config/passiveSkills';
import type { PlayerStats } from '../config/game';
import type { MetaStats } from './Progression';

export interface OwnedSkill {
  id: string;
  kind: 'weapon' | 'active' | 'passive';
  level: number;
  awakened: boolean;
  /** Vị trí (0..5) dùng cho bộ đếm sát thương riêng trên quái */
  slot: number;
}

/**
 * Trạng thái của MỘT lượt chơi: cấp, XP, các kỹ năng đang có, linh thạch nhặt được...
 * Không chứa logic hiển thị, chỉ là dữ liệu + công thức tính chỉ số.
 */
export class RunState {
  level = 1;
  xp = 0;
  /** Số lần lên cấp đang chờ chọn thẻ */
  pendingLevels = 0;
  linh = 0;
  kills = 0;
  time = 0;
  readonly skills: OwnedSkill[] = [];
  /** Kỹ năng chủ động được chọn gần nhất (để tăng tỉ lệ ra thẻ liên quan) */
  lastActive: string | null = null;
  mods: RunMods = newRunMods();

  constructor(
    readonly meta: MetaStats,
    readonly loadout: string[],
  ) {}

  get xpNeed(): number {
    return xpForLevel(this.level);
  }

  /** Cộng XP (đã nhân hệ số may mắn từ bên ngoài nếu cần). Trả về số lần lên cấp. */
  addXp(n: number): void {
    this.xp += n * this.meta.xpGain * this.mods.xpGain;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.pendingLevels++;
    }
  }

  find(id: string): OwnedSkill | undefined {
    return this.skills.find((s) => s.id === id);
  }

  /** Tổng số kỹ năng đã có (tính cả vũ khí) */
  get count(): number {
    return this.skills.length;
  }

  get hasFreeSlot(): boolean {
    return this.skills.length < RUN.maxSkills;
  }

  add(id: string, kind: OwnedSkill['kind']): OwnedSkill {
    const used = new Set(this.skills.map((s) => s.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const s: OwnedSkill = { id, kind, level: 1, awakened: false, slot };
    this.skills.push(s);
    return s;
  }

  /** Tính lại chỉ số nhân vật từ: chỉ số ngoài màn (cảnh giới, trang bị, đan) + kỹ năng bị động trong màn. */
  recompute(): PlayerStats {
    const m = newRunMods();
    for (const s of this.skills) {
      if (s.kind !== 'passive') continue;
      const def = PASSIVES.find((p) => p.id === s.id);
      if (def) m[def.stat] += def.per * s.level;
    }
    this.mods = m;
    const b = this.meta;
    return {
      maxHp: b.maxHp * m.maxHp,
      moveSpeed: b.moveSpeed * m.moveSpeed,
      damage: b.damage * m.damage,
      attackSpeed: b.atkSpeed * m.atkSpeed,
      pickupRange: b.pickup * m.pickup,
      armor: b.armor + m.armor,
      regen: b.regen + m.regen,
      crit: Math.min(0.95, b.crit + m.crit),
      area: b.area * m.area,
      xpGain: b.xpGain * m.xpGain,
      linhGain: b.linhGain * m.linhGain,
    };
  }
}
