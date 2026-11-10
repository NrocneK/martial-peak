import Phaser from 'phaser';
import { RUN } from '../config/balance';
import { TEX } from '../config/assets';
import { activeById } from '../config/activeSkills';
import { weaponById } from '../config/weapons';
import type { SkillDef } from '../config/types';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from './EnemyManager';
import type { Projectiles } from './Projectiles';
import type { Fx } from './Fx';
import type { OwnedSkill, RunState } from './RunState';
import { audio } from './Audio';

/** Số liệu của một kỹ năng sau khi tính cấp + thức tỉnh + chỉ số nhân vật */
export interface Resolved {
  damage: number;
  cooldown: number;
  count: number;
  area: number;
  speed: number;
  pierce: number;
  arc: number;
  width: number;
}

/**
 * Công thức cấp độ (áp cho mọi kỹ năng): sát thương +28%/cấp, hồi chiêu -5%/cấp, phạm vi +7%/cấp.
 * Thức tỉnh nhân thêm các hệ số trong `awaken`.
 */
export function resolveSkill(def: SkillDef, level: number, awakened: boolean, st: Player['stats']): Resolved {
  const L = level - 1;
  const aw = awakened && def.awaken ? def.awaken : null;
  const b = def.base;
  const count = (def.countByLevel?.[Math.min(L, def.countByLevel.length - 1)] ?? b.count) + (aw?.countAdd ?? 0);
  return {
    damage: b.damage * (1 + 0.28 * L) * st.damage * (aw?.damageMul ?? 1),
    cooldown: Math.max(0.12, (b.cooldown * (1 - 0.05 * L) * (aw?.cooldownMul ?? 1)) / st.attackSpeed),
    count,
    area: b.area * (1 + 0.07 * L) * st.area * (aw?.areaMul ?? 1),
    speed: b.speed,
    pierce: b.pierce,
    arc: ((b.arc ?? 90) * Math.PI) / 180,
    width: b.width ?? 10,
  };
}

interface Strike {
  x: number;
  y: number;
  t: number;
  dmg: number;
  area: number;
  color: number;
  slow: number;
}

export function defOf(s: OwnedSkill): SkillDef {
  return s.kind === 'weapon' ? weaponById(s.id) : activeById(s.id);
}

/**
 * Tự động thi triển kỹ năng vũ khí + chủ động. Mỗi `kind` (projectile, slash, beam...) được viết một lần,
 * kỹ năng cụ thể chỉ là dữ liệu trong config.
 */
export class SkillSystem {
  private readonly cd = new Map<string, number>();
  private readonly strikes: Strike[] = [];
  private readonly blades: Phaser.GameObjects.Image[] = [];
  private readonly buf: Enemy[] = [];
  private readonly buf2: Enemy[] = [];
  private orbitAngle = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: EnemyManager,
    private readonly proj: Projectiles,
    private readonly fx: Fx,
    private readonly run: RunState,
  ) {}

  update(dt: number): void {
    const st = this.player.stats;
    let blade = 0;
    this.orbitAngle += dt;
    for (const s of this.run.skills) {
      if (s.kind === 'passive') continue;
      const def = defOf(s);
      const r = resolveSkill(def, s.level, s.awakened, st);
      if (def.kind === 'orbit') {
        blade = this.orbit(def, s, r, blade, dt);
        continue;
      }
      if (def.kind === 'aura') this.fx.frameCircle(this.player.x, this.player.y, r.area, def.color, 0.08, 0.35);
      const left = (this.cd.get(s.id) ?? 0) - dt;
      if (left > 0) {
        this.cd.set(s.id, left);
        continue;
      }
      // Hết hồi chiêu: thi triển; nếu không có mục tiêu thì thử lại ngay khung sau
      if (this.cast(def, s, r)) this.cd.set(s.id, left + r.cooldown);
      else this.cd.set(s.id, 0);
    }
    // Ẩn các lưỡi kiếm dư
    for (let i = blade; i < this.blades.length; i++) this.blades[i].setVisible(false);
    this.updateStrikes(dt);
  }

  /** Thi triển một kỹ năng. Trả về false nếu chưa có mục tiêu (không tốn hồi chiêu). */
  private cast(def: SkillDef, s: OwnedSkill, r: Resolved): boolean {
    const p = this.player;
    switch (def.kind) {
      case 'projectile': {
        // hình đạn riêng của vũ khí: kiếm khí / mũi tên (kỹ năng chủ động cùng kiểu giữ đạn mặc định)
        const look = def.id === 'wp_sword' ? { tex: TEX.VFX_QI, texScale: 1.35, trail: 0x8fd8ff, trailW: 7, spark: true }
          : def.id === 'wp_bow' ? { tex: TEX.VFX_ARROW, trail: 0xc8ffc0, trailW: 2, spark: true } : {};
        const targets = this.nearestN(r.count, 650);
        if (targets.length === 0) return false;
        for (let i = 0; i < r.count; i++) {
          const t = targets[i % targets.length];
          const spread = targets.length < r.count ? (i - (r.count - 1) / 2) * 0.14 : 0;
          const a = Math.atan2(t.y - p.y, t.x - p.x) + spread;
          this.proj.fireMine({
            x: p.x, y: p.y, angle: a, speed: r.speed, r: r.width * 0.9, dmg: r.damage, pierce: r.pierce,
            color: def.color, homing: def.homing, slow: def.slow, ...look,
          });
        }
        audio.play('cast');
        return true;
      }
      case 'slash': {
        const t = this.enemies.nearest(p.x, p.y, r.area + 200);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        for (let i = 0; i < r.count; i++) {
          const a = base + (i * Math.PI * 2) / r.count;
          if (def.group === 'weapon') this.fx.sweep(p.x, p.y, r.area, a, r.arc, def.color);
          else this.fx.arc(p.x, p.y, r.area, a, r.arc, def.color);
          this.enemies.inRadius(p.x, p.y, r.area, this.buf);
          let sparks = 0;
          for (const e of this.buf) {
            const d = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - p.y, e.x - p.x) - a));
            if (d <= r.arc / 2) {
              this.enemies.hurt(e, r.damage, def.slow ?? 0);
              this.knock(e, 160);
              if (def.group === 'weapon' && sparks++ < 8) this.fx.spark(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), def.color);
            }
          }
        }
        audio.play('cast');
        return true;
      }
      case 'beam': {
        const t = this.enemies.nearest(p.x, p.y, 650);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        for (let i = 0; i < r.count; i++) {
          const a = base + (i - (r.count - 1) / 2) * 0.35;
          const ex = p.x + Math.cos(a) * r.area;
          const ey = p.y + Math.sin(a) * r.area;
          if (def.group === 'weapon') this.fx.thrust(p.x, p.y, ex, ey, r.width + 4, def.color);
          else this.fx.line(p.x, p.y, ex, ey, r.width + 6, def.color, 0.22);
          this.hitLine(p.x, p.y, ex, ey, r.width, r.damage, def.slow ?? 0);
        }
        audio.play('cast');
        return true;
      }
      case 'nova': {
        // Không cần mục tiêu, nhưng chỉ nổ khi có quái trong phạm vi để không phí hồi chiêu
        this.enemies.inRadius(p.x, p.y, r.area, this.buf);
        if (this.buf.length === 0) return false;
        if (def.group === 'weapon') this.fx.shock(p.x, p.y, r.area, def.color);
        else {
          this.fx.ring(p.x, p.y, r.area, def.color, 0.35);
          this.fx.burst(p.x, p.y, r.area, def.color, 0.3);
        }
        let sparks = 0;
        for (const e of this.buf) {
          this.enemies.hurt(e, r.damage, def.slow ?? 0);
          this.knock(e, 220);
          if (def.group === 'weapon' && sparks++ < 8) this.fx.spark(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), def.color);
        }
        audio.play('cast');
        return true;
      }
      case 'aura': {
        this.enemies.inRadius(p.x, p.y, r.area, this.buf);
        for (const e of this.buf) this.enemies.hurt(e, r.damage, def.slow ?? 0, true);
        return true; // luôn hoạt động theo nhịp
      }
      case 'strike': {
        const near = this.nearestN(r.count + 4, 560);
        if (near.length === 0) return false;
        // Chọn ngẫu nhiên không lặp
        const pick = near.slice().sort(() => Math.random() - 0.5).slice(0, r.count);
        for (const t of pick) {
          this.strikes.push({ x: t.x, y: t.y, t: 0.6, dmg: r.damage, area: r.area, color: def.color, slow: def.slow ?? 0 });
          this.fx.warn(t.x, t.y, r.area, 0.6, def.color);
        }
        audio.play('cast');
        return true;
      }
      case 'boomerang': {
        const t = this.enemies.nearest(p.x, p.y, 650);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        for (let i = 0; i < r.count; i++) {
          this.proj.fireMine({
            x: p.x, y: p.y, angle: base + (i - (r.count - 1) / 2) * 0.4, speed: r.speed, r: 16, dmg: r.damage,
            pierce: 99, color: def.color, boomerang: true, maxDist: r.area, life: 6,
            ...(def.id === 'wp_fan' ? { tex: TEX.VFX_FAN, texScale: 1.4, trail: 0xd0b0ff, trailW: 4, spark: true } : {}),
          });
        }
        audio.play('cast');
        return true;
      }
      case 'heal': {
        p.heal(p.stats.maxHp * def.base.damage * (1 + 0.2 * (s.level - 1)));
        this.fx.ring(p.x, p.y, 60, def.color, 0.5);
        return true;
      }
      default:
        return false;
    }
  }

  /** Kiếm xoay quanh người: luôn bật, mỗi lưỡi tự va chạm với quái */
  private orbit(def: SkillDef, s: OwnedSkill, r: Resolved, bladeIdx: number, dt: number): number {
    const p = this.player;
    const n = r.count;
    for (let i = 0; i < n; i++) {
      const a = this.orbitAngle * def.base.speed + (i / n) * Math.PI * 2;
      const bx = p.x + Math.cos(a) * r.area;
      const by = p.y + Math.sin(a) * r.area;
      let img = this.blades[bladeIdx];
      if (!img) {
        img = this.scene.add.image(0, 0, TEX.BLADE).setDepth(9);
        this.blades[bladeIdx] = img;
      }
      bladeIdx++;
      img.setVisible(true).setTint(def.color).setPosition(bx, by).setRotation(a + Math.PI / 2).setScale(0.6 + r.width / 40);
      this.enemies.inRadius(bx, by, r.width, this.buf2);
      for (const e of this.buf2) {
        if (e.tick[s.slot] > 0) continue;
        e.tick[s.slot] = r.cooldown;
        this.enemies.hurt(e, r.damage, def.slow ?? 0);
        this.knock(e, 120);
      }
    }
    void dt;
    return bladeIdx;
  }

  private updateStrikes(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t -= dt;
      if (s.t > 0) continue;
      this.strikes.splice(i, 1);
      this.fx.burst(s.x, s.y, s.area, s.color, 0.3);
      this.fx.ring(s.x, s.y, s.area, s.color, 0.3);
      audio.play('explode');
      this.enemies.inRadius(s.x, s.y, s.area, this.buf);
      for (const e of this.buf) this.enemies.hurt(e, s.dmg, s.slow);
    }
  }

  /** Gây sát thương cho mọi quái nằm gần đoạn thẳng (x1,y1)-(x2,y2) */
  private hitLine(x1: number, y1: number, x2: number, y2: number, w: number, dmg: number, slow: number): void {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const half = Math.hypot(x2 - x1, y2 - y1) / 2;
    this.enemies.grid.query(cx, cy, half + 40, this.buf);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (const e of this.buf) {
      if (!e.active) continue;
      let t = ((e.x - x1) * dx + (e.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const rr = w / 2 + e.r;
      if ((e.x - px) ** 2 + (e.y - py) ** 2 <= rr * rr) this.enemies.hurt(e, dmg, slow);
    }
  }

  private knock(e: Enemy, power: number): void {
    if (e.isBoss) return;
    const dx = e.x - this.player.x;
    const dy = e.y - this.player.y;
    const d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * power;
    e.ky += (dy / d) * power;
  }

  /** n quái gần nhất trong bán kính (sắp xếp tăng dần theo khoảng cách) */
  private nearestN(n: number, maxDist: number): Enemy[] {
    const p = this.player;
    const arr: { e: Enemy; d: number }[] = [];
    const m2 = maxDist * maxDist;
    for (const e of this.enemies.list) {
      if (!e.active) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < m2) arr.push({ e, d });
    }
    arr.sort((a, b) => a.d - b.d);
    return arr.slice(0, n).map((a) => a.e);
  }

  clear(): void {
    this.strikes.length = 0;
    this.cd.clear();
    for (const b of this.blades) b.setVisible(false);
  }
}

void RUN;
