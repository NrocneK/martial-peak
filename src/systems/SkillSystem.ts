import Phaser from 'phaser';
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
  /** Khống chế: mức làm chậm (0..1) và thời gian (giây) */
  slow: number;
  slowTime: number;
}

/**
 * Công thức cấp độ (áp cho mọi kỹ năng): sát thương +28%/cấp (hoặc `growth` riêng), hồi chiêu -5%/cấp, phạm vi +7%/cấp.
 * Thức tỉnh nhân thêm các hệ số trong `awaken` (kể cả xuyên thêm, khống chế lâu hơn).
 * Kỹ năng 'heal': `damage` là TỈ LỆ máu hồi (không nhân chỉ số sát thương của nhân vật).
 */
export function resolveSkill(def: SkillDef, level: number, awakened: boolean, st: Player['stats']): Resolved {
  const L = level - 1;
  const aw = awakened && def.awaken ? def.awaken : null;
  const b = def.base;
  const count = (def.countByLevel?.[Math.min(L, def.countByLevel.length - 1)] ?? b.count) + (aw?.countAdd ?? 0);
  return {
    damage: b.damage * (1 + (def.growth ?? 0.28) * L) * (def.kind === 'heal' ? 1 : st.damage) * (aw?.damageMul ?? 1),
    cooldown: Math.max(0.12, (b.cooldown * (1 - 0.05 * L) * (aw?.cooldownMul ?? 1)) / st.attackSpeed),
    count,
    area: b.area * (1 + 0.07 * L) * st.area * (aw?.areaMul ?? 1),
    speed: b.speed,
    pierce: b.pierce + (aw?.pierceAdd ?? 0),
    arc: ((b.arc ?? 90) * Math.PI) / 180,
    width: (b.width ?? 10) * (def.kind === 'tornado' ? Math.sqrt(st.area * (aw?.areaMul ?? 1)) : 1),
    slow: def.slow ?? 0,
    slowTime: (def.slowTime ?? 2) * (aw?.ctrlMul ?? 1),
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
  slowTime: number;
  knock: number;
  /** vùng cháy để lại sau khi nổ (0 = không) */
  burnPct: number;
  burnTime: number;
}

/** Vùng cháy trên mặt đất: mỗi 0.5 giây đốt quái bên trong */
interface Zone {
  x: number;
  y: number;
  r: number;
  t: number;
  tick: number;
  dmg: number;
  color: number;
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
  private readonly zones: Zone[] = [];
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
    this.updateZones(dt);
  }

  /** Gây sát thương + khống chế theo số liệu kỹ năng */
  private hit(e: Enemy, r: Resolved, dmg = r.damage, noText = false): void {
    this.enemies.hurt(e, dmg, r.slow, noText, r.slowTime);
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
          if (i === 0 && def.group === 'weapon') p.playAttack(a);
          this.proj.fireMine({
            x: p.x, y: p.y, angle: a, speed: r.speed, r: r.width * 0.9, dmg: r.damage, pierce: r.pierce,
            color: def.color, homing: def.homing, slow: r.slow, slowTime: r.slowTime, ...look,
          });
        }
        audio.play('cast');
        return true;
      }
      case 'slash': {
        const t = this.enemies.nearest(p.x, p.y, r.area + 200);
        if (!t) return false;
        const a = Math.atan2(t.y - p.y, t.x - p.x);
        // nhiều nhát = chém LIỀN nhau cùng hướng (mỗi nhát cách 0.18 giây), không chém ra sau lưng
        for (let i = 0; i < r.count; i++) {
          if (i === 0) this.slash(def, r, a);
          else this.scene.time.delayedCall(180 * i, () => this.slash(def, r, a));
        }
        return true;
      }
      case 'beam': {
        const t = this.enemies.nearest(p.x, p.y, 650);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        if (def.group === 'weapon') p.playAttack(base);
        for (let i = 0; i < r.count; i++) {
          const a = base + (i - (r.count - 1) / 2) * 0.35;
          const ex = p.x + Math.cos(a) * r.area;
          const ey = p.y + Math.sin(a) * r.area;
          if (def.group === 'weapon') this.fx.thrust(p.x, p.y, ex, ey, r.width + 4, def.color);
          else this.fx.line(p.x, p.y, ex, ey, r.width + 6, def.color, 0.22);
          this.hitLine(p.x, p.y, ex, ey, r.width, r);
        }
        audio.play('cast');
        return true;
      }
      case 'nova': {
        // Không cần mục tiêu, nhưng chỉ nổ khi có quái trong phạm vi để không phí hồi chiêu
        this.enemies.inRadius(p.x, p.y, r.area, this.buf);
        if (this.buf.length === 0) return false;
        if (def.group === 'weapon') {
          this.fx.shock(p.x, p.y, r.area, def.color);
          const n = this.buf[0];
          p.playAttack(n ? Math.atan2(n.y - p.y, n.x - p.x) : null);
        }
        else {
          this.fx.ring(p.x, p.y, r.area, def.color, 0.35);
          this.fx.burst(p.x, p.y, r.area, def.color, 0.3);
        }
        let sparks = 0;
        for (const e of this.buf) {
          this.hit(e, r);
          this.knock(e, def.knock ?? 220);
          if (def.group === 'weapon' && sparks++ < 8) this.fx.spark(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), def.color);
        }
        audio.play('cast');
        return true;
      }
      case 'aura': {
        this.enemies.inRadius(p.x, p.y, r.area, this.buf);
        for (const e of this.buf) {
          this.hit(e, r, r.damage, true);
          if (def.knock) this.knock(e, def.knock);
        }
        return true; // luôn hoạt động theo nhịp
      }
      case 'strike': {
        const near = this.nearestN(r.count + 4, 560);
        if (near.length === 0) return false;
        // Chọn ngẫu nhiên không lặp
        const pick = near.slice().sort(() => Math.random() - 0.5).slice(0, r.count);
        for (const t of pick) {
          const burn = def.burn ?? (s.awakened && def.id === 'ac_skyfire' ? { pct: 0.18, time: 3 } : null);
          this.strikes.push({
            x: t.x, y: t.y, t: 0.6, dmg: r.damage, area: r.area, color: def.color, slow: r.slow, slowTime: r.slowTime,
            knock: def.knock ?? 0, burnPct: burn?.pct ?? 0, burnTime: burn?.time ?? 0,
          });
          this.fx.warn(t.x, t.y, r.area, 0.6, def.color);
        }
        audio.play('cast');
        return true;
      }
      case 'boomerang': {
        const t = this.enemies.nearest(p.x, p.y, 650);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        if (def.group === 'weapon') p.playAttack(base);
        for (let i = 0; i < r.count; i++) {
          this.proj.fireMine({
            x: p.x, y: p.y, angle: base + (i - (r.count - 1) / 2) * 0.4, speed: r.speed, r: r.width, dmg: r.damage,
            pierce: 99, color: def.color, boomerang: true, maxDist: r.area, life: 6,
            ...(def.id === 'wp_fan' ? { tex: TEX.VFX_FAN, texScale: 1.4, trail: 0xd0b0ff, trailW: 4, spark: true } : {}),
          });
        }
        audio.play('cast');
        return true;
      }
      case 'heal': {
        // chỉ vận công khi đã mất >= 10% máu (không phí hồi chiêu lúc máu đầy)
        if (p.hp > p.stats.maxHp * 0.9) return false;
        p.heal(p.stats.maxHp * r.damage);
        this.fx.ring(p.x, p.y, 60, def.color, 0.5);
        this.fx.burst(p.x, p.y, 50, def.color, 0.35);
        return true;
      }
      case 'chain': {
        // sét đánh quái gần nhất, rồi nảy sang quái gần đó chưa bị đánh (tối đa count lần)
        let cur = this.enemies.nearest(p.x, p.y, 560);
        if (!cur) return false;
        let fx0 = p.x, fy0 = p.y - 20;
        const done: Enemy[] = [];
        for (let i = 0; i < r.count && cur; i++) {
          this.fx.line(fx0, fy0, cur.x, cur.y, i === 0 ? 7 : 5, def.color, 0.2);
          this.fx.burst(cur.x, cur.y, 26, def.color, 0.2);
          this.hit(cur, r);
          done.push(cur);
          fx0 = cur.x; fy0 = cur.y;
          cur = this.enemies.nearest(cur.x, cur.y, r.area, done);
        }
        audio.play('cast');
        return true;
      }
      case 'rain': {
        // kiếm giáng tức thì xuống nhiều quái khác nhau trong tầm
        const near = this.nearestN(r.count * 2, 480);
        if (near.length === 0) return false;
        const pick = near.sort(() => Math.random() - 0.5).slice(0, r.count);
        for (const t of pick) {
          this.fx.line(t.x, t.y - 150, t.x, t.y, 6, def.color, 0.18);
          this.fx.burst(t.x, t.y, r.area, def.color, 0.22);
          this.enemies.inRadius(t.x, t.y, r.area, this.buf);
          for (const e of this.buf) this.hit(e, r);
        }
        audio.play('cast');
        return true;
      }
      case 'tornado': {
        const t = this.enemies.nearest(p.x, p.y, 520);
        if (!t) return false;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        for (let i = 0; i < r.count; i++) {
          this.proj.fireMine({
            x: p.x, y: p.y, angle: base + (i - (r.count - 1) / 2) * 0.7, speed: r.speed, r: r.width, dmg: r.damage,
            pierce: 999, color: def.color, life: r.area / r.speed, rehit: def.rehit ?? 0.35, drift: true,
            slow: r.slow, slowTime: r.slowTime, trail: def.color, trailW: 3,
          });
        }
        audio.play('cast');
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
        this.hit(e, r);
        this.knock(e, def.knock ?? 120);
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
      for (const e of this.buf) {
        this.enemies.hurt(e, s.dmg, s.slow, false, s.slowTime);
        if (s.knock) this.knockFrom(e, s.x, s.y, s.knock);
      }
      if (s.burnPct > 0 && this.zones.length < 40) {
        this.zones.push({ x: s.x, y: s.y, r: s.area * 0.85, t: s.burnTime, tick: 0.5, dmg: s.dmg * s.burnPct, color: s.color });
      }
    }
  }

  private updateZones(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      if (z.t <= 0) {
        this.zones.splice(i, 1);
        continue;
      }
      this.fx.frameCircle(z.x, z.y, z.r, z.color, 0.1 * Math.min(1, z.t), 0.25 * Math.min(1, z.t));
      z.tick -= dt;
      if (z.tick > 0) continue;
      z.tick += 0.5;
      this.enemies.inRadius(z.x, z.y, z.r, this.buf);
      for (const e of this.buf) this.enemies.hurt(e, z.dmg, 0, true);
    }
  }

  /** Một nhát chém hình quạt (kỹ năng 'slash') */
  private slash(def: SkillDef, r: Resolved, a: number): void {
    const p = this.player;
    if (!p.active) return;
    if (def.group === 'weapon') {
      p.playAttack(a);
      this.fx.sweep(p.x, p.y, r.area, a, r.arc, def.color);
    } else this.fx.arc(p.x, p.y, r.area, a, r.arc, def.color);
    this.enemies.inRadius(p.x, p.y, r.area, this.buf);
    let sparks = 0;
    for (const e of this.buf) {
      const d = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - p.y, e.x - p.x) - a));
      if (d > r.arc / 2) continue;
      this.hit(e, r);
      this.knock(e, def.knock ?? 160);
      if (def.group === 'weapon' && sparks++ < 8) this.fx.spark(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), def.color);
    }
    audio.play('cast');
  }

  /** Gây sát thương cho mọi quái nằm gần đoạn thẳng (x1,y1)-(x2,y2) */
  private hitLine(x1: number, y1: number, x2: number, y2: number, w: number, r: Resolved): void {
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
      if ((e.x - px) ** 2 + (e.y - py) ** 2 <= rr * rr) this.hit(e, r);
    }
  }

  private knock(e: Enemy, power: number): void {
    this.knockFrom(e, this.player.x, this.player.y, power);
  }

  /** Đẩy quái ra xa điểm (x, y) */
  private knockFrom(e: Enemy, x: number, y: number, power: number): void {
    if (e.isBoss || power <= 0) return;
    const dx = e.x - x;
    const dy = e.y - y;
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
    this.zones.length = 0;
    this.cd.clear();
    for (const b of this.blades) b.setVisible(false);
  }
}

