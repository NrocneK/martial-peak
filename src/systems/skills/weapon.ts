// =====================================================================
// 6 KỸ NĂNG VŨ KHÍ — đòn đánh tự động theo loại vũ khí đang cầm.
// Số liệu từng cấp (mảng 5 phần tử = cấp 1..5) bám đúng bảng trong skills.json.
// Sát thương ghi theo tỉ lệ lực đánh (1 = 100%).
// =====================================================================
import { TEX } from '../../config/assets';
import { BASE_PLAYER_STATS } from '../../config/game';
import type { Enemy } from '../../entities/Enemy';
import type { Proj } from '../Projectiles';
import { Skill } from './Ctx';

/** Kỹ năng vũ khí: có thêm % sát thương hiện tại để Nguyên Anh dùng lại */
export abstract class WeaponSkill extends Skill {
  /** % sát thương một đòn ở cấp hiện tại (đã tính thức tỉnh) */
  abstract pct(): number;
  /** Hồi chiêu gốc ở cấp hiện tại */
  abstract baseCd(): number;
}

const isNormal = (e: Enemy) => !e.isBoss && e.behavior !== 'elite';

// ---------------------------------------------------------------- Ngự Kiếm Thuật
export class NguKiem extends WeaponSkill {
  pct() { return this.aw ? 2.6 : this.L([1, 1.2, 1.4, 1.65, 1.9]); }
  baseCd() { return this.L([1.2, 1.2, 1.1, 1.1, 1.0]); }
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    const n = this.aw ? 6 : this.L([1, 2, 2, 3, 4]);
    const targets = c.nearestN(n, 520);
    if (!targets.length) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    p.playAttack(Math.atan2(targets[0].y - p.y, targets[0].x - p.x));
    const pierce = this.L([2, 2, 4, 4, 4]);
    const back = this.L([0, 0, 0.5, 0.5, 1]);
    for (let i = 0; i < n; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i - targets.length + 1) * 0.25 : 0);
      const hit = (e: Enemy, pr: Proj) => {
        const marked = e.markKiem > 0;
        if (pr.returning && !this.aw) {
          if (back > 0) c.hit(e, this.pct() * back, this.id);
          return;
        }
        c.hit(e, this.pct(), this.id, { crit: this.aw && marked ? true : undefined });
        if (this.lv >= 5) {
          e.markKiem = Math.min(this.aw ? 3 : 1, e.markKiem + 1);          // Kiếm Thương
          e.markKiemT = 3;
        }
        if (!this.aw && pr.hits >= pierce && !pr.returning) {            // hết xuyên → bay về
          pr.returning = true;
          pr.hit.length = 0;
        }
      };
      if (this.aw) {
        c.proj.fireMine({ x: p.x, y: p.y, angle: a, speed: 560, r: 10, dmg: 0, pierce: 999, color: 0x9fd8ff, chase: true, homing: true, life: 4,
          tex: TEX.VFX_QI, texScale: 1.1, trail: 0x9fd8ff, trailW: 5, spark: true, hit });
      } else {
        c.proj.fireMine({ x: p.x, y: p.y, angle: a, speed: 520, r: 10, dmg: 0, pierce: 99, color: 0x9fd8ff, boomerang: true, maxDist: 300, life: 3,
          tex: TEX.BLADE, texScale: 0.8, tint: 0xcfe8ff, trail: 0x9fd8ff, trailW: 4, spark: true, hit });
      }
    }
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Bá Đao Trảm
export class BaDao extends WeaponSkill {
  private stacks = 0;
  private stackT = 0;
  pct() { return (this.aw ? 4 : this.L([1.6, 1.9, 2.2, 2.55, 2.9])) * (1 + this.stacks * 0.02); }
  baseCd() { return this.L([1.6, 1.6, 1.5, 1.5, 1.4]); }
  update(dt: number): void {
    if (this.stackT > 0 && (this.stackT -= dt) <= 0) this.stacks = 0;
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    const range = c.area(this.L([90, 105, 105, 120, 120]));
    const t = c.nearest(range + 160);
    if (!t) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    if (this.aw) {
      // chém 360° + đao khí bay 300px xuyên mọi mục tiêu
      p.playAttack(a);
      c.fx.sweep(p.x, p.y, range, a, Math.PI * 2, 0xff9a50);
      for (const e of c.inRadius(p.x, p.y, range)) this.cut(e, 1);
      c.proj.fireMine({ x: p.x, y: p.y, angle: a, speed: 520, r: 22, dmg: 0, pierce: 999, color: 0xff9a50, life: 300 / 520,
        tex: TEX.VFX_QI, texScale: 2.2, tint: 0xffb070, trail: 0xff9a50, trailW: 10, spark: true, hit: (e) => this.cut(e, 0.6) });
      c.sound('cast');
      return;
    }
    const arc = (this.L([120, 120, 160, 160, 160]) * Math.PI) / 180;
    this.slash(a, range, arc);
    if (this.lv >= 5) c.scene.time.delayedCall(180, () => this.slash(a + Math.PI, range, arc));   // nhát thứ 2 ra sau
  }
  private slash(a: number, range: number, arc: number): void {
    const c = this.c, p = c.player;
    if (!p.active) return;
    p.playAttack(a);
    c.fx.sweep(p.x, p.y, range, a, arc, 0xff9a50);
    let sp = 0;
    for (const e of c.inCone(p.x, p.y, range, a, arc / 2)) {
      this.cut(e, 1);
      c.knock(e, p.x, p.y, 140);
      if (sp++ < 8) c.fx.spark(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), 0xff9a50);
    }
    c.sound('cast');
  }
  private cut(e: Enemy, k: number): void {
    const c = this.c;
    if (this.aw && isNormal(e) && e.hp / e.maxHp < 0.15) {                  // hành quyết
      c.hitRaw(e, e.hp + 1, this.id, { crit: false });
      return;
    }
    const low = this.lv >= 3 && e.hp / e.maxHp < 0.2 ? 2 : 1;            // quái dưới 20% máu nhận gấp đôi
    c.hit(e, this.pct() * k * low, this.id);
  }
  onKill(e: Enemy): void {
    if (this.lv < 5 || e.lastSrc !== this.id) return;
    this.stacks = Math.min(this.aw ? 20 : 10, this.stacks + 1);
    this.stackT = 5;
  }
}

// ---------------------------------------------------------------- Phá Trận Thương
export class PhaThuong extends WeaponSkill {
  private dash = 0;
  private dashA = 0;
  private trails: { x1: number; y1: number; x2: number; y2: number; t: number; tick: number }[] = [];
  pct() {
    const base = this.aw ? 3.4 : this.L([1.3, 1.55, 1.8, 2.1, 2.4]);
    if (!this.aw) return base;
    const bonus = Math.max(0, this.c.st.moveSpeed / BASE_PLAYER_STATS.moveSpeed - 1);   // mỗi 1% tốc chạy cộng thêm → +1% sát thương
    return base * (1 + bonus);
  }
  baseCd() { return this.L([1.4, 1.4, 1.3, 1.3, 1.2]); }
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.dash > 0) {                                                    // lướt theo mũi thương
      const k = Math.min(this.dash, dt);
      p.x += Math.cos(this.dashA) * 800 * k;
      p.y += Math.sin(this.dashA) * 800 * k;
      this.dash -= dt;
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.t -= dt;
      c.fx.line(tr.x1, tr.y1, tr.x2, tr.y2, 14, 0xffd870, 0.05);
      if ((tr.tick -= dt) <= 0) {
        tr.tick = 0.5;
        for (const { e } of c.inLine(tr.x1, tr.y1, tr.x2, tr.y2, 28)) c.hit(e, 0.4, this.id, { noText: true });   // 80%/giây
      }
      if (tr.t <= 0) this.trails.splice(i, 1);
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(400)) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    const a = p.heading;                                                    // đâm theo hướng di chuyển
    const n = this.aw ? 1 : this.L([1, 1, 2, 2, 3]);
    for (let i = 0; i < n; i++) {
      if (i === 0) this.thrust(a, i === n - 1);
      else c.scene.time.delayedCall(150 * i, () => this.thrust(p.heading, i === n - 1));
    }
  }
  private thrust(a: number, last: boolean): void {
    const c = this.c, p = c.player;
    if (!p.active) return;
    const len = c.area(this.aw ? 240 : this.L([140, 165, 165, 190, 190]));
    const w = this.L([24, 24, 24, 32, 32]);
    const x2 = p.x + Math.cos(a) * len, y2 = p.y + Math.sin(a) * len;
    p.playAttack(a);
    c.fx.thrust(p.x, p.y, x2, y2, w + 4, 0xffd870);
    for (const { e, t } of c.inLine(p.x, p.y, x2, y2, w)) {
      const tip = this.lv >= 3 && t > 0.7 ? 1.5 : 1;                         // 30% cuối mũi thương +50%
      const stun = this.lv >= 5 && last && !this.aw;
      c.hit(e, this.pct() * tip, this.id);
      if (stun) {
        c.stun(e, 0.5);
        c.knock(e, p.x, p.y, 220);
      }
    }
    if (this.aw) {
      this.dash = 0.15;
      this.dashA = a;
      p.guardT = Math.max(p.guardT, 0.2);
      this.trails.push({ x1: p.x, y1: p.y, x2: p.x + Math.cos(a) * 120, y2: p.y + Math.sin(a) * 120, t: 2, tick: 0.1 });
    }
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Băng Sơn Quyền
export class BangQuyen extends WeaponSkill {
  private combo = 0;
  private armor: number[] = [];
  pct() { return this.aw ? 1.6 : this.L([0.6, 0.72, 0.84, 0.98, 1.12]); }
  baseCd() { return this.L([0.5, 0.5, 0.45, 0.45, 0.4]); }
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.armor.length - 1; i >= 0; i--) if ((this.armor[i] -= dt) <= 0) this.armor.splice(i, 1);
    p.armorBonus += this.armor.length;
    if ((this.cd -= dt) > 0) return;
    const range = c.area(this.L([60, 70, 70, 70, 70]));
    const t = c.nearest(range + 30);
    if (!t) return void (this.cd = 0);
    const fury = this.aw && p.hp < p.stats.maxHp * 0.5 ? 1.3 : 1;          // máu dưới 50%: tốc đánh quyền +30%
    this.cd = c.cdW(this.baseCd()) / fury;
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    p.playAttack(a);
    this.combo++;
    const extra = this.aw ? p.stats.maxHp * 0.02 : 0;                     // +2% HP tối đa mỗi đòn
    let hits = 0;
    for (const e of c.inCone(p.x, p.y, range + 30, a, 0.6)) {
      c.hit(e, this.pct(), this.id);
      if (extra) c.hitRaw(e, extra, this.id, { noText: true });
      hits++;
    }
    c.fx.spark(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, a, 0xff7a6a);
    if (this.lv >= 3) for (let i = 0; i < Math.min(hits, 5 - this.armor.length); i++) this.armor.push(2);   // +1 giáp / đòn, tối đa 5
    const every = this.lv >= 5 ? 2 : 3;
    if (this.combo % every === 0) this.quake(a);
    c.sound('hit');
  }
  private quake(a: number): void {
    const c = this.c, p = c.player;
    const r = c.area(70);
    const pct = this.aw ? this.pct() * 2 : this.L([1.5, 1.5, 1.5, 2, 2]);
    c.fx.shock(p.x, p.y, r, 0xff7a6a);
    let dealt = 0;
    for (const e of c.inRadius(p.x, p.y, r)) {
      dealt += c.hit(e, pct, this.id, this.lv >= 3 ? { slow: 1, slowTime: 0.4 } : {});
      c.knock(e, p.x, p.y, 120);
    }
    if (this.aw) {
      // 3 vết nứt lan 200px
      for (const k of [-0.5, 0, 0.5]) {
        const b = a + k, x2 = p.x + Math.cos(b) * c.area(200), y2 = p.y + Math.sin(b) * c.area(200);
        c.fx.thrust(p.x, p.y, x2, y2, 12, 0xff8a5a);
        for (const { e } of c.inLine(p.x, p.y, x2, y2, 26)) dealt += c.hit(e, pct, this.id);
      }
    }
    if (this.lv >= 5) p.heal(dealt * 0.01);                                 // hút 1% máu từ sát thương chấn động
  }
}

// ---------------------------------------------------------------- Truy Tinh Tiễn
export class TruyTien extends WeaponSkill {
  private shots = 0;
  private casts = 0;
  pct() { return this.aw ? 2.8 : this.L([1.1, 1.3, 1.5, 1.75, 2.0]); }
  baseCd() { return this.L([1.0, 1.0, 0.95, 0.95, 0.9]); }
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    const t = c.nearest(c.area(420));
    if (!t) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    this.casts++;
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    p.playAttack(a);
    if (this.aw) {
      for (let i = 0; i < 5; i++) this.arrow(a + (i - 2) * 0.16, true);
      if (this.casts % 10 === 0) this.meteor();
    } else {
      const n = this.L([1, 2, 2, 3, 3]);
      for (let i = 0; i < n; i++) {
        if (i === 0) this.arrow(a, false);
        else c.scene.time.delayedCall(100 * i, () => {
          const t2 = c.nearest(c.area(420));
          this.arrow(t2 ? Math.atan2(t2.y - p.y, t2.x - p.x) : a, false);
        });
      }
    }
    c.sound('cast');
  }
  private arrow(a: number, star: boolean): void {
    const c = this.c, p = c.player;
    this.shots++;
    const isStar = star || (this.lv >= 5 && this.shots % 5 === 0);
    c.proj.fireMine({
      x: p.x, y: p.y, angle: a, speed: 700, r: 7, dmg: 0, pierce: this.lv >= 3 ? 1 : 0, bounce: this.lv >= 5 ? 2 : 0,
      color: 0x9affb0, life: c.area(420) / 700 + 0.3, tex: TEX.VFX_ARROW, texScale: isStar ? 1.5 : 1, tint: isStar ? 0xffe080 : undefined,
      trail: isStar ? 0xffe080 : 0xc8ffc0, trailW: isStar ? 4 : 2, spark: true,
      hit: (e) => {
        const far = this.lv >= 3 && Math.hypot(e.x - p.x, e.y - p.y) > 250 ? 1.3 : 1;
        c.hit(e, this.pct() * far, this.id);
        if (isStar) {
          c.fx.burst(e.x, e.y, 60, 0xffe080, 0.25);
          c.aoe(e.x, e.y, c.area(60), 1.5, this.id);
        }
      },
    });
  }
  private meteor(): void {
    const c = this.c;
    const at = c.densest(520);
    if (!at) return;
    c.fx.warn(at.x, at.y, 90, 0.6, 0xffe080);
    c.scene.time.delayedCall(600, () => {
      c.fx.line(at.x - 120, at.y - 260, at.x, at.y, 14, 0xffe080, 0.25);
      c.fx.burst(at.x, at.y, 100, 0xffc040, 0.4);
      c.fx.ring(at.x, at.y, 100, 0xfff0a0, 0.4);
      c.aoe(at.x, at.y, c.area(90), 6, this.id);
      c.sound('explode');
    });
  }
}

// ---------------------------------------------------------------- Thanh Phong Phiến
export class ThanhPhien extends WeaponSkill {
  private casts = 0;
  pct() { return this.aw ? 1.9 : this.L([0.7, 0.84, 0.98, 1.14, 1.3]); }
  baseCd() { return this.L([1.1, 1.1, 1.0, 1.0, 0.95]); }
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.lv >= 5) c.enemies.slowVuln = Math.max(c.enemies.slowVuln, 0.15);   // quái bị chậm nhận +15% từ mọi nguồn
    if ((this.cd -= dt) > 0) return;
    const t = c.nearest(360);
    if (!t) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    this.casts++;
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    p.playAttack(a);
    const n = this.aw ? 12 : this.L([3, 4, 5, 5, 7]);
    const cone = this.aw ? Math.PI * 2 : (this.L([60, 60, 90, 90, 90]) * Math.PI) / 180;
    const slow = this.L([0.15, 0.15, 0.15, 0.25, 0.25]);
    const back = this.aw || this.lv >= 3;
    for (let i = 0; i < n; i++) {
      const b = this.aw ? a + (i / n) * Math.PI * 2 : a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * cone);
      c.proj.fireMine({
        x: p.x, y: p.y, angle: b, speed: 430, r: 12, dmg: 0, pierce: back ? 99 : 0, color: 0x80f0d0,
        boomerang: back, maxDist: c.area(240), life: back ? 3 : c.area(240) / 430,
        tex: TEX.VFX_FAN, texScale: 0.9, trail: 0x80f0d0, trailW: 3, spark: true,
        hit: (e) => c.hit(e, this.pct(), this.id, { slow, slowTime: 1.5 }),
      });
    }
    if (this.aw && this.casts % 4 === 0) {
      // lốc xoáy 4s tự đuổi địch, hút nhẹ, 120%/giây
      c.proj.fireMine({
        x: p.x, y: p.y, angle: a, speed: 150, r: 34, dmg: 0, pierce: 999, color: 0x80f0d0, life: 4, rehit: 0.5, drift: true, pull: 60,
        trail: 0x80f0d0, trailW: 4, hit: (e) => c.hit(e, 0.6, this.id, { noText: false }),
      });
    }
    c.sound('cast');
  }
}

export const WEAPON_IMPLS = { ngu_kiem: NguKiem, ba_dao: BaDao, pha_thuong: PhaThuong, bang_quyen: BangQuyen, truy_tien: TruyTien, thanh_phien: ThanhPhien };

