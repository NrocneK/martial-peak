import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { EnemyManager } from './EnemyManager';
import type { Projectiles } from './Projectiles';
import type { Fx } from './Fx';
import type { OwnedSkill, RunState } from './RunState';
import type { Pickups } from './Pickups';
import { Ctx, type Skill } from './skills/Ctx';
import { WEAPON_IMPLS, type WeaponSkill } from './skills/weapon';
import { REALM_IMPLS, NguyenAnh, DaiDao } from './skills/realm';

type Impl = new (c: Ctx, own: OwnedSkill) => Skill;
const IMPLS: Record<string, Impl> = { ...WEAPON_IMPLS, ...REALM_IMPLS };

/**
 * Điều phối kỹ năng trong màn: mỗi kỹ năng sở hữu (vũ khí / cảnh giới) là một đối tượng hành vi riêng
 * (src/systems/skills/), tự lo hồi chiêu và hiệu ứng theo cấp + thức tỉnh.
 * Mỗi khung: đặt lại buff tạm thời của nhân vật → cập nhật từng kỹ năng (kỹ năng tự cộng buff của mình).
 */
export class SkillSystem {
  readonly ctx: Ctx;
  private readonly live = new Map<string, Skill>();

  constructor(scene: Phaser.Scene, player: Player, enemies: EnemyManager, proj: Projectiles, fx: Fx, private readonly run: RunState, pickups: Pickups) {
    this.ctx = new Ctx(scene, player, enemies, proj, fx, run, pickups);
    enemies.killListeners.push((e) => { for (const s of this.live.values()) s.onKill(e); });
    pickups.onXp = () => { for (const s of this.live.values()) s.onXp(); };
    player.lethalGuards.push(() => [...this.live.values()].some((s) => s.onLethal()));
  }

  /** Đối tượng hành vi của một kỹ năng đang sở hữu (tạo khi cần) */
  private get(own: OwnedSkill): Skill | null {
    let s = this.live.get(own.id);
    if (!s) {
      const C = IMPLS[own.id];
      if (!C) return null;
      s = new C(this.ctx, own);
      this.live.set(own.id, s);
      const me = s;
      if (me instanceof DaiDao) me.resetOthers = () => { for (const o of this.live.values()) if (o !== me) o.cd = 0; };
    }
    return s;
  }

  update(dt: number): void {
    const c = this.ctx, p = c.player;
    // buff tạm thời: mỗi kỹ năng cộng lại trong update của nó
    p.buffDmg = 1;
    p.dmgTaken = 1;
    p.armorBonus = 0;
    p.reflect = 0;
    c.areaBuff = 1;
    c.enemies.slowVuln = 0;
    let mul = 1;
    for (const s of this.live.values()) if (s instanceof DaiDao) mul = Math.min(mul, s.cdMul);
    c.cdMul = mul;
    const weapon = this.weaponSkill();
    for (const own of this.run.skills) {
      if (own.kind === 'passive') continue;
      const s = this.get(own);
      if (s instanceof NguyenAnh) s.weapon = weapon;
      s?.update(dt);
    }
  }

  private weaponSkill(): WeaponSkill | null {
    const w = this.run.skills.find((s) => s.kind === 'weapon');
    return w ? ((this.get(w) as WeaponSkill | null) ?? null) : null;
  }

  clear(): void {
    for (const s of this.live.values()) s.clear();
    this.live.clear();
  }
}
