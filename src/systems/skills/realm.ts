// =====================================================================
// 17 KỸ NĂNG CẢNH GIỚI — mỗi đại cảnh giới mở 1 kỹ năng; trước màn chọn mang theo 3.
// Số liệu từng cấp (mảng 5 phần tử = cấp 1..5) bám đúng bảng trong skills.json.
// Vật thể trong trận (kim đan, nguyên anh, chuông, đế ấn, pháp tướng, sen) vẽ bằng hình khối phát sáng TEX.SHAPE*.
// =====================================================================
import Phaser from 'phaser';
import { TEX } from '../../config/assets';
import type { Enemy } from '../../entities/Enemy';
import { Skill } from './Ctx';
import type { WeaponSkill } from './weapon';

const isNormal = (e: Enemy) => !e.isBoss && e.behavior !== 'elite';
const isElite = (e: Enemy) => !e.isBoss && e.behavior === 'elite';

// ---------------------------------------------------------------- Hổ Khiếu Chấn
export class HoKhieu extends Skill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    const r = c.area(this.L([110, 125, 125, 140, 140]));
    if (!c.nearest(r + 40)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([6, 6, 5.5, 5.5, 5]));
    if (this.aw) {
      // hư ảnh Bạch Hổ vồ vào cụm địch đông nhất
      const at = c.densest(420);
      if (at) {
        c.fx.thrust(p.x, p.y, at.x, at.y, 26, 0xffe0a0, 0.3);
        c.fx.burst(at.x, at.y, 90, 0xffe0a0, 0.3);
        c.aoe(at.x, at.y, c.area(90), 3.5, this.id);
      }
    }
    this.wave(r, false);
    if (this.lv >= 5 || this.aw) c.scene.time.delayedCall(350, () => this.wave(r * 1.15, true));
  }
  private wave(r: number, second: boolean): void {
    const c = this.c, p = c.player;
    if (!p.active) return;
    const pct = this.aw ? 3.5 : this.L([1.2, 1.45, 1.7, 2.0, 2.3]);
    c.fx.shock(p.x, p.y, r, 0xffe0a0);
    c.fx.ring(p.x, p.y, r * 0.7, 0xfff4d0, 0.35);
    for (const e of c.inRadius(p.x, p.y, r)) {
      c.hit(e, pct, this.id, second ? { slow: 1, slowTime: 0.8 } : {});
      if (this.aw) c.hitRaw(e, p.stats.maxHp * 0.04, this.id, { noText: true });     // +4% HP tối đa
      if (this.lv >= 3) {
        e.weakAmt = this.aw ? 0.35 : 0.2;                                    // Chấn Nhiếp
        e.weakT = c.ctrl(3);
      }
      c.knock(e, p.x, p.y, 260);
    }
    c.sound('explode');
  }
}

// ---------------------------------------------------------------- Linh Khí Đạn
export class LinhDan extends Skill {
  private charge = 0;
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(560)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([2, 2, 1.8, 1.8, 1.6]));
    const n = this.aw ? 9 : this.L([2, 3, 3, 4, 6]);
    const pct = this.aw ? 2.1 : this.L([0.8, 0.96, 1.12, 1.3, 1.5]);
    for (let i = 0; i < n; i++) this.bullet((i / n) * Math.PI * 2, pct, 7, 0x70c8ff);
    if (this.aw && this.charge > 0) {
      for (let i = 0; i < this.charge; i++) this.bullet(Math.random() * Math.PI * 2, 0.4, 4, 0xc8ecff);
      this.charge = 0;
    }
    c.sound('cast');
  }
  private bullet(a: number, pct: number, r: number, color: number): void {
    const c = this.c, p = c.player;
    c.proj.fireMine({
      x: p.x, y: p.y, angle: a, speed: 340, r, dmg: 0, pierce: 0, color, homing: true, life: 3, trail: color, trailW: 2, spark: true,
      hit: (e) => {
        c.hit(e, pct, this.id);
        if (this.lv >= 3) {                                                  // nổ vùng nhỏ 60px
          c.fx.burst(e.x, e.y, 60, color, 0.2);
          for (const o of c.inRadius(e.x, e.y, c.area(60))) if (o !== e) c.hit(o, pct * 0.5, this.id, { noText: true });
        }
      },
    });
  }
  onKill(e: Enemy): void {
    if (this.lv >= 5 && e.lastSrc === this.id && Math.random() < 0.2) this.c.pickups.spawn('xp', e.x + 8, e.y, Math.max(1, e.xp));
  }
  onXp(): void {
    if (this.aw) this.charge = Math.min(30, this.charge + 1);
  }
}

// ---------------------------------------------------------------- Liệt Hỏa Phù
interface Field { x: number; y: number; r: number; t: number; tick: number; dps: number }
export class HoaPhu extends Skill {
  private fields: Field[] = [];
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.t -= dt;
      c.fx.frameCircle(f.x, f.y, f.r, 0xff6a2a, 0.14 * Math.min(1, f.t), 0.35 * Math.min(1, f.t));
      if ((f.tick -= dt) <= 0) {
        f.tick = 0.5;
        for (const e of c.inRadius(f.x, f.y, f.r)) {
          c.hit(e, f.dps * 0.5, this.id, { noText: true, crit: false });
          if (this.aw) this.burn(e);                                         // không tắt khi còn đứng trong lửa
        }
      }
      if (f.t <= 0) this.fields.splice(i, 1);
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(520)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([4.5, 4.5, 4.2, 4.2, 3.8]));
    const pct = this.aw ? 3.6 : this.L([1.4, 1.65, 1.9, 2.2, 2.5]);
    const r = c.area(this.L([70, 70, 70, 85, 85]));
    const spots: { x: number; y: number }[] = [];
    if (this.aw) {
      for (let i = 0; i < 5; i++) {                                          // 5 bùa rơi thành vòng quanh thân
        const a = (i / 5) * Math.PI * 2;
        spots.push({ x: p.x + Math.cos(a) * 110, y: p.y + Math.sin(a) * 110 });
      }
    } else {
      const first = c.densest(480);
      if (first) spots.push(first);
      const others = c.nearestN(12, 480).sort(() => Math.random() - 0.5);
      for (let i = 1; i < this.L([1, 2, 2, 3, 3]) && others.length; i++) {
        const o = others.pop()!;
        spots.push({ x: o.x, y: o.y });
      }
    }
    for (const s of spots) {
      c.fx.warn(s.x, s.y, r, 0.5, 0xff6a2a);
      c.scene.time.delayedCall(500, () => {
        c.fx.burst(s.x, s.y, r, 0xff7a30, 0.3);
        c.fx.ring(s.x, s.y, r, 0xffc060, 0.3);
        for (const e of c.inRadius(s.x, s.y, r)) {
          c.hit(e, pct, this.id);
          this.burn(e);
        }
        if (this.lv >= 3 || this.aw) this.fields.push({ x: s.x, y: s.y, r: r * (this.aw ? 1.2 : 1), t: this.aw ? 6 : 3, tick: 0.5, dps: 0.4 });
        c.sound('explode');
      });
    }
  }
  private burn(e: Enemy): void {
    const c = this.c;
    e.burnDps = Math.max(e.burnDps, c.atk(0.2));                             // thiêu đốt 20%/giây
    e.burnT = Math.max(e.burnT, c.ctrl(3));
    e.burnStacks = this.aw ? Math.min(3, e.burnStacks + 1) : 1;
  }
  onKill(e: Enemy): void {
    if (this.lv < 5 || e.burnT <= 0) return;                                  // chết khi đang cháy → nổ lan 80%
    const c = this.c;
    c.fx.burst(e.x, e.y, 50, 0xff7a30, 0.2);
    for (const o of c.inRadius(e.x, e.y, c.area(50))) if (o !== e) c.hit(o, 0.8, this.id, { noText: true });
  }
}

// ---------------------------------------------------------------- Kim Đan Hộ Luân
export class KimDan extends Skill {
  private imgs: Phaser.GameObjects.Image[] = [];
  private ang = 0;
  private on = true;
  private phase = 0;
  private touches = 0;
  private healSec = 0;
  private healT = 0;
  update(dt: number): void {
    const c = this.c, p = c.player;
    const always = this.lv >= 5 || this.aw;
    const onT = this.L([5, 5, 6, 6, 99]), offT = this.L([3, 3, 2.5, 2.5, 0]);
    this.phase += dt;
    if (!always) {
      if (this.on && this.phase > onT) { this.on = false; this.phase = 0; }
      else if (!this.on && this.phase > c.cdR(offT)) { this.on = true; this.phase = 0; }
    } else this.on = true;
    if ((this.healT += dt) >= 1) { this.healT = 0; this.healSec = 0; }
    this.ang += dt * 2.6;
    const rings = this.aw ? [{ n: 4, r: 80, dir: 1 }, { n: 5, r: 140, dir: -1 }] : [{ n: this.L([2, 3, 3, 4, 5]), r: this.L([80, 80, 80, 95, 95]), dir: 1 }];
    let k = 0;
    const pct = this.aw ? 1.4 : this.L([0.5, 0.6, 0.7, 0.82, 0.95]);
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++, k++) {
        let im = this.imgs[k];
        if (!im) {
          im = c.scene.add.image(0, 0, TEX.SHAPE + 'circle').setDepth(9).setScale(0.3).setTint(0xffd040);
          this.imgs[k] = im;
        }
        if (!this.on) { im.setVisible(false); continue; }
        const a = this.ang * ring.dir + (i / ring.n) * Math.PI * 2;
        const R = c.area(ring.r);
        const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        im.setVisible(true).setPosition(x, y);
        c.fx.frameCircle(x, y, 11, 0xffe080, 0.18, 0.5);
        if (this.lv >= 3) c.proj.clearEnemy(x, y, 12);                       // chặn đạn thường
        for (const e of c.inRadius(x, y, 14)) {
          if (e.tick[this.own.slot] > 0) continue;
          e.tick[this.own.slot] = 0.5;
          c.hit(e, pct, this.id);
          c.knock(e, p.x, p.y, 90);
          this.touches++;
          if (this.lv >= 5) {                                               // hồi 0.2% HP mỗi lần chạm, trần 2%/giây
            const want = p.stats.maxHp * 0.002 * (this.aw ? 2 : 1);
            const cap = p.stats.maxHp * 0.02 * (this.aw ? 2 : 1) - this.healSec;
            if (cap > 0) { p.heal(Math.min(want, cap)); this.healSec += Math.min(want, cap); }
          }
          if (this.aw && this.touches % 9 === 0) this.launch(x, y);
        }
      }
    }
    for (; k < this.imgs.length; k++) this.imgs[k].setVisible(false);
  }
  private launch(x: number, y: number): void {
    const c = this.c;
    const t = c.nearest(400, x, y);
    if (!t) return;
    c.fx.thrust(x, y, t.x, t.y, 8, 0xffd040, 0.2);
    c.fx.burst(t.x, t.y, 70, 0xffd040, 0.3);
    c.aoe(t.x, t.y, c.area(70), 3, this.id);
  }
  clear(): void {
    for (const im of this.imgs) im.destroy();
    this.imgs = [];
  }
}

// ---------------------------------------------------------------- Nguyên Anh Xuất Khiếu
export class NguyenAnh extends Skill {
  private imgs: Phaser.GameObjects.Image[] = [];
  private life = 0;
  private shot = 0;
  private reuse = 0;
  private ang = 0;
  private guardCd = 0;
  private gone = 0;
  weapon: WeaponSkill | null = null;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.guardCd > 0) this.guardCd -= dt;
    if (this.gone > 0) this.gone -= dt;
    const n = this.aw ? 1 : this.L([1, 1, 1, 1, 2]);
    if (this.aw) this.life = this.gone > 0 ? 0 : 1;
    else {
      this.life -= dt;
      if ((this.cd -= dt) <= 0 && c.nearest(560)) {
        this.cd = c.cdR(this.L([12, 12, 11, 11, 10]));
        this.life = this.L([6, 7, 7, 8, 8]);
      }
    }
    this.ang += dt * 1.6;
    for (let i = 0; i < 2; i++) {
      let im = this.imgs[i];
      if (!im) { im = c.scene.add.image(0, 0, TEX.SHAPE + 'circle').setDepth(11).setScale(0.36); this.imgs[i] = im; }
      im.setTint(this.aw ? 0xffe6a0 : 0x70ffd8);
      if (this.life <= 0 || i >= n) { im.setVisible(false); continue; }
      const a = this.ang + i * Math.PI;
      im.setVisible(true).setPosition(p.x + Math.cos(a) * 46, p.y - 34 + Math.sin(a) * 14).setAlpha(0.85);
      c.fx.frameCircle(im.x, im.y, 16, this.aw ? 0xffe6a0 : 0x70ffd8, 0.15, 0.6);
    }
    if (this.life <= 0) return;
    // bắn linh quang
    const rate = this.L([1, 1, 1, 1.5, 1.5]);
    const pct = this.aw ? 2.0 : this.L([0.7, 0.84, 0.98, 1.15, 1.3]);
    if ((this.shot -= dt) <= 0) {
      this.shot = 1 / rate;
      for (let i = 0; i < n; i++) {
        const im = this.imgs[i];
        const t = c.nearest(520, im.x, im.y);
        if (t) this.bolt(im.x, im.y, t, pct, 0x70ffd8);
      }
    }
    // dùng lại kỹ năng vũ khí: một đòn cùng sát thương × 40% / 60% / 100%
    if (this.lv >= 3 && this.weapon && (this.reuse -= dt) <= 0) {
      this.reuse = c.cdW(this.weapon.baseCd());
      const k = this.aw ? 1 : this.lv >= 5 ? 0.6 : 0.4;
      for (let i = 0; i < n; i++) {
        const im = this.imgs[i];
        const t = c.nearest(520, im.x, im.y);
        if (t) this.bolt(im.x, im.y, t, this.weapon.pct() * k, 0xffffff);
      }
    }
  }
  private bolt(x: number, y: number, t: Enemy, pct: number, color: number): void {
    const c = this.c;
    c.proj.fireMine({ x, y, angle: Math.atan2(t.y - y, t.x - x), speed: 480, r: 6, dmg: 0, pierce: 0, color, homing: true, life: 2, trail: color, trailW: 2,
      hit: (e) => c.hit(e, pct, this.id) });
  }
  onLethal(): boolean {
    if (!this.aw || this.guardCd > 0 || this.gone > 0) return false;      // nguyên anh hy sinh thay, hồi 30% máu
    const p = this.c.player;
    this.guardCd = 60;
    this.gone = 10;
    p.hp = p.stats.maxHp * 0.3;
    p.guardT = 1.5;
    this.c.fx.burst(p.x, p.y, 120, 0x70ffd8, 0.5);
    return true;
  }
  clear(): void {
    for (const im of this.imgs) im.destroy();
    this.imgs = [];
  }
}

// ---------------------------------------------------------------- Thần Thức Trảm
export class ThanThuc extends Skill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    const range = this.lv >= 4 || this.aw ? 0 : 400;
    const n = this.L([1, 1, 2, 2, 3]);
    const targets = c.highestHp(n, range === 0 ? 900 : range);
    if (!targets.length) return void (this.cd = 0);
    this.cd = c.cdR(this.L([5, 5, 4.6, 4.6, 4.2]));
    const pct = this.aw ? 8 : this.L([3, 3.6, 4.2, 4.9, 5.6]);
    for (const e of targets) {
      c.fx.line(e.x - 40, e.y - 40, e.x + 40, e.y + 40, 6, 0xc8a0ff, 0.25);
      c.fx.line(e.x + 30, e.y - 50, e.x - 30, e.y + 50, 3, 0xffffff, 0.2);
      c.fx.burst(e.x, e.y, 40, 0xc8a0ff, 0.25);
      const big = this.lv >= 3 && (e.isBoss || isElite(e)) ? 1.5 : 1;         // +50% lên tinh anh và boss
      c.hit(e, pct * big, this.id, { crit: this.aw ? true : undefined });
      if (this.aw && e.active) c.hitRaw(e, e.hp * (e.isBoss ? 0.005 : 0.03), this.id, { noText: true, crit: false });
      if (this.lv >= 2 && e.active) c.stun(e, 0.5);
      if (this.lv >= 5 && e.active) {
        e.shockAmt = this.aw ? 0.25 : 0.15;                                   // Thần Hồn Chấn Động
        e.shockT = c.ctrl(4);
      }
    }
    c.sound('hit');
  }
  onKill(e: Enemy): void {
    if (!this.aw || e.lastSrc !== this.id) return;                           // nổ hồn 200% lan 120px
    const c = this.c;
    c.fx.burst(e.x, e.y, 120, 0xc8a0ff, 0.35);
    for (const o of c.inRadius(e.x, e.y, c.area(120))) if (o !== e) c.hit(o, 2, this.id + '_soul', { noText: true });
  }
}

// ---------------------------------------------------------------- Hư Không Liệt Phùng
interface Rift { x: number; y: number; r: number; t: number; tick: number; bonus: number; hole: boolean }
export class HuKhong extends Skill {
  private rifts: Rift[] = [];
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      const f = this.rifts[i];
      f.t -= dt;
      c.fx.frameCircle(f.x, f.y, f.r, 0xa060ff, 0.12, 0.5);
      c.fx.frameCircle(f.x, f.y, f.hole ? 26 : 12, 0x1a0830, 0.9, 0.9);
      const sp = this.aw ? 180 : 90;
      const dps = this.aw ? 1.8 : this.L([0.6, 0.72, 0.85, 1.0, 1.15]);
      for (const e of c.inRadius(f.x, f.y, f.r)) c.pull(e, f.x, f.y, sp, dt);
      if (this.lv >= 5 || this.aw) {
        c.pickups.attract(f.x, f.y, f.r);                                    // hút vật phẩm + kinh nghiệm về phía bạn
      }
      if ((f.tick -= dt) <= 0) {
        f.tick = 0.5;
        for (const e of c.inRadius(f.x, f.y, f.r)) c.hit(e, dps * 0.5, this.id, { noText: true });
      }
      if (f.t <= 0) {
        if (this.lv >= 3 || this.aw) {                                       // khép lại nổ
          const pct = this.aw ? 5 * (1 + f.bonus) : 2;
          c.fx.burst(f.x, f.y, f.r, 0xc080ff, 0.4);
          c.fx.ring(f.x, f.y, f.r, 0xe0c0ff, 0.4);
          c.aoe(f.x, f.y, f.r, pct, this.id);
          c.sound('explode');
        }
        this.rifts.splice(i, 1);
      }
    }
    void p;
    if ((this.cd -= dt) > 0) return;
    const at = c.densest(460);
    if (!at) return void (this.cd = 0);
    this.cd = c.cdR(this.L([9, 9, 8.5, 8.5, 8]));
    if (this.aw) {
      this.rifts.push({ x: at.x, y: at.y, r: c.area(240), t: 6, tick: 0.5, bonus: 0, hole: true });
      return;
    }
    const r = c.area(this.L([130, 130, 130, 160, 160]));
    const life = this.L([3, 3.5, 3.5, 4, 4]);
    this.rifts.push({ x: at.x, y: at.y, r, t: life, tick: 0.5, bonus: 0, hole: false });
    if (this.lv >= 5) {
      const o = c.nearestN(20, 460).find((e) => Math.hypot(e.x - at.x, e.y - at.y) > r * 1.5);
      if (o) this.rifts.push({ x: o.x, y: o.y, r, t: life, tick: 0.5, bonus: 0, hole: false });
    }
  }
  onKill(e: Enemy): void {
    if (!this.aw || !isNormal(e)) return;
    for (const f of this.rifts) if (f.hole && Math.hypot(e.x - f.x, e.y - f.y) < f.r) f.bonus = Math.min(2, f.bonus + 0.02);
  }
}

// ---------------------------------------------------------------- Pháp Tướng Thiên Địa
interface Print { x: number; y: number; r: number; t: number }
export class PhapTuong extends Skill {
  private prints: Print[] = [];
  private avatar = 0;
  private palmT = 0;
  private stompT = 0;
  private img: Phaser.GameObjects.Image | null = null;
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const pr = this.prints[i];
      pr.t -= dt;
      c.fx.frameCircle(pr.x, pr.y, pr.r, 0xffc860, 0.08, 0.25);
      for (const e of c.inRadius(pr.x, pr.y, pr.r)) c.enemies.applySlow(e, 0.3, 0.3);   // dấu chưởng làm chậm 30%
      if (pr.t <= 0) this.prints.splice(i, 1);
    }
    if (this.avatar > 0) {
      this.avatar -= dt;
      c.areaBuff = Math.max(c.areaBuff, 1.2);                                 // mọi kỹ năng +20% phạm vi
      if (!this.img) this.img = c.scene.add.image(0, 0, TEX.SHAPE + 'hex').setDepth(4).setScale(2.6).setAlpha(0.2).setTint(0xffc860);
      this.img.setVisible(true).setPosition(p.x, p.y - 70);
      if ((this.palmT -= dt) <= 0) {
        this.palmT = 2;
        const at = c.densest(480);
        if (at) this.palm(at.x, at.y, c.area(160), 9);
      }
      if ((this.stompT -= dt) <= 0) {
        this.stompT = 4;
        c.fx.shock(p.x, p.y, 520, 0xffc860, 0.5);
        c.scene.cameras.main.shake(150, 0.004);
        c.aoe(p.x, p.y, 700, 1.5, this.id, { noText: true });
      }
      if (this.avatar <= 0) this.img.setVisible(false);
    }
    if ((this.cd -= dt) > 0) return;
    const at = c.densest(480);
    if (!at) return void (this.cd = 0);
    if (this.aw) {
      this.cd = c.cdR(12);
      this.avatar = 8;
      this.palmT = 0;
      this.stompT = 1;
      return;
    }
    this.cd = c.cdR(this.L([8, 8, 7.5, 7.5, 7]));
    const r = c.area(this.L([100, 115, 115, 130, 130]));
    const pct = this.L([3.5, 4.2, 4.9, 5.7, 6.5]);
    if (this.lv >= 5) {
      this.palm(at.x - 60, at.y, r, pct);
      c.scene.time.delayedCall(300, () => this.palm(at.x + 60, at.y, r, pct));
    } else this.palm(at.x, at.y, r, pct);
  }
  private palm(x: number, y: number, r: number, pct: number): void {
    const c = this.c;
    c.fx.warn(x, y, r, 0.6, 0xffc860);
    const im = c.scene.add.image(x, y - 220, TEX.SHAPE + 'circle').setDepth(12).setScale(r / 60).setAlpha(0.55).setTint(0xffc860);
    c.scene.tweens.add({ targets: im, y, duration: 600, ease: 'Quad.easeIn', onComplete: () => im.destroy() });
    c.scene.time.delayedCall(600, () => {
      c.fx.burst(x, y, r, 0xffc860, 0.4);
      c.fx.shock(x, y, r * 1.2, 0xfff0c0, 0.4);
      for (const e of c.inRadius(x, y, r)) {
        const stunned = this.lv >= 5 && e.slow >= 1 ? 1.3 : 1;              // +30% lên quái đang choáng
        c.hit(e, pct * stunned, this.id, this.lv >= 3 ? { slow: 1, slowTime: 1 } : {});
      }
      if (this.lv >= 3) this.prints.push({ x, y, r, t: 3 });
      c.sound('explode');
    });
  }
  clear(): void {
    this.img?.destroy();
    this.img = null;
  }
}

// ---------------------------------------------------------------- Vạn Kiếm Quy Tông
interface Stuck { x: number; y: number; t: number; im: Phaser.GameObjects.Image }
export class VanKiem extends Skill {
  private rain = 0;
  private acc = 0;
  private stuck: Stuck[] = [];
  private cx = 0;
  private cy = 0;
  private array = 0;
  private pillars: Phaser.GameObjects.Image[] = [];
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      const s = this.stuck[i];
      s.t -= dt;
      for (const e of c.inRadius(s.x, s.y, 18)) {                            // chạm kiếm cắm đất → chảy máu 15%/giây
        e.bleedDps = Math.max(e.bleedDps, c.atk(0.15));
        e.bleedT = Math.max(e.bleedT, c.ctrl(2));
      }
      s.im.setAlpha(Math.min(1, s.t * 2));
      if (s.t <= 0) { s.im.destroy(); this.stuck.splice(i, 1); }
    }
    if (this.array > 0) {
      // Tru Tiên Kiếm Trận: 10 kiếm/giây trong trận, quái không thể rời trận
      this.array -= dt;
      const R = c.area(260);
      c.fx.frameCircle(this.cx, this.cy, R, 0xd8e8ff, 0.05, 0.5);
      for (const e of c.inRadius(this.cx, this.cy, R + 40)) {
        const d = Math.hypot(e.x - this.cx, e.y - this.cy);
        if (d > R - 8 && !e.isBoss) { e.x = this.cx + ((e.x - this.cx) / d) * (R - 8); e.y = this.cy + ((e.y - this.cy) / d) * (R - 8); }
      }
      this.acc += dt * 10;
      while (this.acc >= 1) { this.acc--; this.drop(this.cx, this.cy, R, 1.3); }
      if (this.array <= 0) { for (const im of this.pillars) im.destroy(); this.pillars = []; }
    }
    if (this.rain > 0) {
      const total = this.L([12, 16, 16, 22, 30]);
      this.acc += (dt / 3) * total;
      this.rain -= dt;
      while (this.acc >= 1) { this.acc--; this.drop(p.x, p.y, c.area(this.L([180, 180, 180, 210, 210])), this.L([0.45, 0.54, 0.63, 0.74, 0.85])); }
      if (this.rain <= 0 && this.lv >= 5) {                                   // cự kiếm 400% vào mục tiêu mạnh nhất
        const t = c.highestHp(1, 500)[0];
        if (t) {
          c.fx.line(t.x, t.y - 220, t.x, t.y, 22, 0xffffff, 0.3);
          c.fx.burst(t.x, t.y, 80, 0xd8e8ff, 0.35);
          c.hit(t, 4, this.id);
          c.sound('explode');
        }
      }
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(420)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([10, 10, 9.5, 9.5, 9]));
    if (this.aw) {
      this.array = 6;
      this.cx = p.x;
      this.cy = p.y;
      const R = c.area(260);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        c.fx.line(x, y - 240, x, y, 26, 0xffffff, 0.3);
        this.pillars.push(c.scene.add.image(x, y - 26, TEX.BLADE).setDepth(9).setScale(2.4).setRotation(Math.PI / 2).setTint(0xfff0c0));
      }
    } else this.rain = 3;
  }
  /** Một thanh kiếm rơi ngẫu nhiên trong vòng tròn */
  private drop(x0: number, y0: number, R: number, pct: number): void {
    const c = this.c;
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R;
    const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
    c.fx.line(x, y - 90, x, y, 5, 0xd8e8ff, 0.16);
    c.fx.burst(x, y, 30, 0xd8e8ff, 0.18);
    const crit = this.aw && Math.random() < c.st.crit;
    for (const e of c.inRadius(x, y, c.area(30))) c.hit(e, pct, this.id, { crit: crit ? true : undefined, noText: false });
    if (crit) {                                                              // bạo kích trong trận nổ kiếm khí 60%
      c.fx.ring(x, y, 50, 0xffffff, 0.2);
      for (const e of c.inRadius(x, y, c.area(50))) c.hit(e, 0.6, this.id, { noText: true });
    }
    if (this.lv >= 3 && !this.aw && this.stuck.length < 40) {
      const im = c.scene.add.image(x, y - 12, TEX.BLADE).setDepth(6).setScale(0.7).setRotation(Math.PI / 2).setTint(0xd8e8ff);
      this.stuck.push({ x, y, t: 2, im });
    }
  }
  clear(): void {
    for (const s of this.stuck) s.im.destroy();
    for (const im of this.pillars) im.destroy();
    this.stuck = [];
    this.pillars = [];
  }
}

// ---------------------------------------------------------------- Cửu Tiêu Thần Lôi
export class ThanLoi extends Skill {
  private casts = 0;
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    const pool = c.nearestN(30, 460);
    if (!pool.length) return void (this.cd = 0);
    this.cd = c.cdR(this.L([5, 5, 4.6, 4.6, 4.2]));
    this.casts++;
    const amp = this.aw ? 1 + c.st.cdr : 1;                                  // mỗi 1% giảm hồi chiêu → +1% sát thương sét
    const pct = (this.aw ? 4.8 : this.L([1.8, 2.15, 2.5, 2.9, 3.3])) * amp;
    let bolts = this.aw ? 9 : this.L([2, 3, 3, 4, 6]);
    if (this.lv >= 5 && Math.random() < 0.15) bolts++;
    const jumps = this.L([2, 2, 4, 4, 4]);
    for (let i = 0; i < bolts; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      this.bolt(t, pct, jumps);
    }
    if (this.aw && this.casts % 3 === 0) {                                   // kiếp lôi 1500%
      const t = c.highestHp(1, 700)[0];
      if (t) {
        c.fx.line(t.x, t.y - 400, t.x, t.y, 30, 0xd0b0ff, 0.4);
        c.fx.burst(t.x, t.y, 120, 0xb090ff, 0.45);
        c.hit(t, 15 * amp, this.id);
      }
    }
    c.sound('explode');
  }
  private bolt(first: Enemy, pct: number, jumps: number): void {
    const c = this.c;
    c.fx.line(first.x + 20, first.y - 260, first.x, first.y, 6, 0xb090ff, 0.22);
    c.fx.burst(first.x, first.y, 34, 0xd0c0ff, 0.2);
    c.hit(first, pct, this.id, this.lv >= 3 ? { slow: 1, slowTime: 0.5 } : {});
    let cur: Enemy | null = first;
    const done: Enemy[] = [first];
    let k = pct;
    for (let j = 0; j < jumps && cur; j++) {
      const nx: Enemy | null = c.nearest(170, cur.x, cur.y, done);
      if (!nx) break;
      if (this.lv < 5) k *= 0.8;                                             // mỗi lần lan −20% (cấp 5: không giảm)
      c.fx.line(cur.x, cur.y, nx.x, nx.y, 3, 0xd0c0ff, 0.18);
      c.hit(nx, k, this.id, this.lv >= 3 ? { slow: 1, slowTime: 0.5 } : {});
      done.push(nx);
      cur = nx;
    }
  }
}

// ---------------------------------------------------------------- Tiên Nguyên Liên Hoa
export class LienHoa extends Skill {
  private t = 0;
  private x = 0;
  private y = 0;
  private tick = 0;
  private img: Phaser.GameObjects.Image | null = null;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.t > 0) {
      this.t -= dt;
      if (this.aw) { this.x = p.x; this.y = p.y; }                            // sen đi theo nhân vật
      const r = c.area(this.aw ? 160 : this.L([120, 120, 120, 145, 145]));
      c.fx.frameCircle(this.x, this.y, r, 0xff9ad0, 0.12, 0.45);
      if (!this.img) this.img = c.scene.add.image(0, 0, TEX.SHAPE + 'circle').setDepth(3).setAlpha(0.5).setTint(0xffd0e8);
      this.img.setScale(0.5);
      for (let k = 0; k < 8; k++) {                                         // 8 cánh sen xoay chậm
        const a = (k / 8) * Math.PI * 2 + this.t * 0.4;
        c.fx.frameCircle(this.x + Math.cos(a) * r * 0.45, this.y + Math.sin(a) * r * 0.45, r * 0.22, 0xff9ad0, 0.1, 0.4);
      }
      this.img.setVisible(true).setPosition(this.x, this.y);
      const inside = Math.hypot(p.x - this.x, p.y - this.y) < r;
      if ((this.tick -= dt) <= 0) {
        this.tick = 0.5;
        const dps = this.aw ? 1.5 : this.L([0.5, 0.6, 0.7, 0.82, 0.95]);
        let healed = 0;
        if (inside) {
          const hpS = this.aw ? 0.02 : this.L([0.01, 0.013, 0.013, 0.013, 0.02]);
          const amt = p.stats.maxHp * hpS * 0.5;
          const room = p.stats.maxHp - p.hp;
          p.heal(amt);
          healed = amt;
          if (this.lv >= 5 && amt > room) {                                  // máu hồi dư thành khiên
            const cap = p.stats.maxHp * (this.aw ? 0.4 : 0.2);
            p.shield = Math.min(cap, p.shield + (amt - room));
            p.shieldT = Math.max(p.shieldT, 4);
          }
        }
        const extra = this.aw ? healed * 0.3 : 0;                             // 30% lượng hồi → sát thương thêm
        for (const e of c.inRadius(this.x, this.y, r)) {
          c.hit(e, dps * 0.5, this.id, { noText: true });
          if (extra > 0) c.hitRaw(e, extra, this.id, { noText: true });
          if (this.lv >= 3) c.enemies.applySlow(e, 0.2, 0.6);
        }
      }
      if (this.t <= 0) {
        this.img.setVisible(false);
        if (this.aw) {                                                       // tàn: bắn 9 cánh sen 250%
          for (let i = 0; i < 9; i++) {
            c.proj.fireMine({ x: this.x, y: this.y, angle: (i / 9) * Math.PI * 2, speed: 380, r: 10, dmg: 0, pierce: 3, color: 0xff9ad0, life: 1.2,
              trail: 0xff9ad0, trailW: 4, spark: true, hit: (e) => c.hit(e, 2.5, this.id) });
          }
        }
      }
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(360)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([14, 14, 13, 13, 12]));
    this.t = this.aw ? 8 : this.L([5, 5, 5, 6, 6]);
    this.x = p.x;
    this.y = p.y;
    this.tick = 0;
  }
  clear(): void {
    this.img?.destroy();
    this.img = null;
  }
}

// ---------------------------------------------------------------- Ngân Hà Hàn Lưu
export class NganHa extends Skill {
  private t = 0;
  private ang = 0;
  update(dt: number): void {
    const c = this.c, p = c.player;
    const active = this.aw || this.t > 0;
    if (this.t > 0) this.t -= dt;
    if (active) {
      this.ang += dt * Math.PI;                                              // 1 vòng / 2 giây
      const n = this.aw ? 4 : this.L([1, 1, 2, 2, 3]);
      const len = c.area(this.aw ? 300 : this.L([200, 230, 230, 230, 230]));
      const pct = this.aw ? 2.5 : this.L([0.9, 1.08, 1.26, 1.47, 1.68]);
      const need = this.aw ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const a = this.ang + (i / n) * Math.PI * 2;
        const x2 = p.x + Math.cos(a) * len, y2 = p.y + Math.sin(a) * len;
        c.fx.line(p.x, p.y, x2, y2, 10, 0x9fe8ff, 0.05);
        c.fx.line(p.x, p.y, x2, y2, 3, 0xffffff, 0.05);
        for (const { e } of c.inLine(p.x, p.y, x2, y2, 22)) {
          if (e.tick[this.own.slot] > 0) continue;
          e.tick[this.own.slot] = 0.5;
          if (e.frozenT > 0 && (this.aw ? isNormal(e) && e.hp / e.maxHp < 0.25 : this.lv >= 5)) {
            // quái đang đóng băng vỡ tan
            c.fx.burst(e.x, e.y, 60, 0xcff4ff, 0.3);
            if (this.aw) c.hitRaw(e, e.hp + 1, this.id, { crit: false });
            else for (const o of c.inRadius(e.x, e.y, c.area(60))) c.hit(o, 1.5, this.id, { noText: o !== e });
            e.frozenT = 0;
            continue;
          }
          c.hit(e, pct, this.id, { slow: 0.3, slowTime: 2 });
          if (this.lv >= 3 || this.aw) {
            e.chillHits++;
            e.chillT = 3;
            if (e.chillHits >= need) {
              e.chillHits = 0;
              const ft = c.ctrl(this.aw ? 2.5 : 1.5);
              e.frozenT = ft;
              c.enemies.applySlow(e, 1, ft);
            }
          }
        }
      }
    }
    if (this.aw) return;
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(260)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([7, 7, 6.5, 6.5, 6]));
    this.t = this.lv >= 4 ? 4 : 2;
  }
}

// ---------------------------------------------------------------- Huyền Hoàng Chung
export class HoangChung extends Skill {
  private t = 0;
  private rings = 0;
  private ringT = 0;
  private img: Phaser.GameObjects.Image | null = null;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.t > 0) {
      this.t -= dt;
      p.reflect = Math.max(p.reflect, this.aw ? 0.6 : this.lv >= 3 ? 0.3 : 0);
      if (!this.img) this.img = c.scene.add.image(0, 0, TEX.SHAPE + 'tri').setDepth(12).setScale(0.7).setAlpha(0.9).setRotation(-Math.PI / 2).setTint(0xf0c040);
      this.img.setVisible(true).setPosition(p.x, p.y - 44);
      c.fx.frameCircle(p.x, p.y, 34, 0xf0c040, 0.12, 0.6);
      if (this.aw && this.rings > 0 && (this.ringT -= dt) <= 0) {           // chuông ngân 3 hồi, mỗi 2 giây
        this.ringT = 2;
        this.rings--;
        this.wave(2.5);
      }
      const broken = p.shield <= 0;
      if (broken || this.t <= 0) {
        this.t = 0;
        p.shield = 0;
        this.img.setVisible(false);
        this.wave(this.aw ? 7 : this.L([2.5, 3, 3.5, 4.1, 4.7]));
        if (broken && this.aw) this.cd *= 0.5;                               // vỡ: hoàn 50% hồi chiêu
      }
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(360)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([16, 16, 15, 15, 14]));
    this.t = this.L([5, 5, 5, 6, 6]);
    const sh = p.stats.maxHp * (this.aw ? 0.5 : this.L([0.15, 0.2, 0.2, 0.25, 0.3])) + (this.aw ? (p.stats.armor + p.armorBonus) * 10 : 0);
    p.shield = Math.max(p.shield, sh);
    p.shieldT = this.t + 0.1;
    this.rings = this.aw ? 3 : 0;
    this.ringT = 2;
  }
  private wave(pct: number): void {
    const c = this.c, p = c.player;
    const r = c.area(160);
    c.fx.shock(p.x, p.y, r, 0xf0c040);
    c.fx.ring(p.x, p.y, r * 0.75, 0xfff0a0, 0.4);
    for (const e of c.inRadius(p.x, p.y, r)) {
      c.hit(e, pct, this.id, this.lv >= 5 ? { slow: 1, slowTime: 1.2 } : {});
      c.knock(e, p.x, p.y, this.lv >= 3 ? 340 : 180);
    }
    if (this.lv >= 5) c.proj.clearEnemy(p.x, p.y, r);                        // xóa đạn địch
    c.sound('explode');
  }
  clear(): void {
    this.img?.destroy();
    this.img = null;
  }
}

// ---------------------------------------------------------------- Bất Diệt Kim Thân
export class KimThan extends Skill {
  private t = 0;
  private age = 0;
  private tick = 0;
  private revived = false;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.t > 0) {
      this.t -= dt;
      this.age += dt;
      p.buffDmg *= 1 + (this.aw ? 0.5 : this.L([0.15, 0.2, 0.2, 0.25, 0.3]));
      p.dmgTaken *= 1 - (this.aw ? 0.5 : this.L([0.2, 0.25, 0.25, 0.3, 0.35]));
      const guard = this.aw ? 2 : this.L([0, 0, 1, 1, 2]);
      if (this.age < guard) p.guardT = Math.max(p.guardT, 0.05);            // miễn sát thương những giây đầu
      const r = c.area(this.lv >= 5 || this.aw ? 120 : 90);
      c.fx.frameCircle(p.x, p.y, r, 0xffd860, 0.14, 0.6);
      p.setTint(0xffe080);
      if ((this.tick -= dt) <= 0) {
        this.tick = 0.5;
        const dps = this.aw ? 1.5 : this.L([0.4, 0.48, 0.56, 0.66, 0.76]);
        const armorDmg = this.aw ? (p.stats.armor + p.armorBonus) * 5 * 0.5 : 0;
        for (const e of c.inRadius(p.x, p.y, r)) {
          c.hit(e, dps * 0.5, this.id, { noText: true });
          if (armorDmg > 0) c.hitRaw(e, armorDmg, this.id, { noText: true });
        }
      }
      if (this.t <= 0) p.clearTint();
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(300)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([20, 20, 19, 19, 18]));
    this.t = this.aw ? 10 : this.L([6, 6, 6, 7, 7]);
    this.age = 0;
  }
  onLethal(): boolean {
    if (!this.aw || this.revived || this.t <= 0) return false;              // chết khi có kim thân: hồi sinh 50% máu (1 lần / trận)
    const p = this.c.player;
    this.revived = true;
    p.hp = p.stats.maxHp * 0.5;
    p.guardT = 2;
    this.c.fx.burst(p.x, p.y, 140, 0xffd860, 0.6);
    return true;
  }
}

// ---------------------------------------------------------------- Tiên Vương Lĩnh Vực
export class LinhVuc extends Skill {
  private tick = 0;
  private bonus = 0;
  private idle = 0;
  private kills = 0;
  update(dt: number): void {
    const c = this.c, p = c.player;
    const r = c.area(this.aw ? 240 : this.L([150, 165, 165, 185, 185]));
    const vuln = this.aw ? 0.4 : this.L([0.1, 0.1, 0.18, 0.18, 0.25]);
    const slow = this.L([0.15, 0.15, 0.15, 0.25, 0.25]);
    c.fx.frameCircle(p.x, p.y, r, 0xff4a5a, 0.05, 0.35);
    for (const e of c.inRadius(p.x, p.y, r)) {
      e.domainT = 0.2;
      e.domainVuln = vuln;
      e.domainWeak = this.lv >= 3 ? 0.15 : 0;
      c.enemies.applySlow(e, slow, 0.25);
    }
    if (this.bonus > 0 && !this.aw && (this.idle += dt) > 5) this.bonus = 0;  // tan sau 5 giây không hạ quái
    p.buffDmg *= 1 + this.bonus;
    if ((this.tick -= dt) <= 0) {
      this.tick = 0.5;
      const dps = this.aw ? 1.2 : this.L([0.35, 0.42, 0.5, 0.58, 0.68]);
      for (const e of c.inRadius(p.x, p.y, r)) c.hit(e, dps * 0.5, this.id, { noText: true });
    }
  }
  onKill(e: Enemy): void {
    if (this.lv < 5) return;
    const c = this.c, p = c.player;
    const r = c.area(this.aw ? 240 : 185);
    if (Math.hypot(e.x - p.x, e.y - p.y) > r) return;
    this.bonus = Math.min(this.aw ? 0.6 : 0.3, this.bonus + 0.01);
    this.idle = 0;
    if (this.aw && ++this.kills % 10 === 0) {                                // huyết kiếm 500%
      const t = c.enemies.list.find((x) => x.active && (x.isBoss || isElite(x))) ?? c.nearest(600);
      if (t) {
        c.fx.thrust(p.x, p.y, t.x, t.y, 12, 0xff3a4a, 0.3);
        c.fx.burst(t.x, t.y, 60, 0xff3a4a, 0.3);
        c.hit(t, 5, this.id);
      }
    }
  }
}

// ---------------------------------------------------------------- Đế Ấn Trấn Thiên
interface Zone { x: number; y: number; r: number; t: number }
export class DeAn extends Skill {
  private zones: Zone[] = [];
  update(dt: number): void {
    const c = this.c;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      c.fx.frameCircle(z.x, z.y, z.r, 0xffd040, 0.08, 0.35);
      for (const e of c.inRadius(z.x, z.y, z.r)) {
        c.enemies.applySlow(e, 0.5, 0.3);
        e.suppressT = 0.3;
      }
      if (z.t <= 0) this.zones.splice(i, 1);
    }
    if ((this.cd -= dt) > 0) return;
    const at = c.densest(520);
    if (!at) return void (this.cd = 0);
    this.cd = c.cdR(this.L([18, 18, 17, 17, 16]));
    if (this.aw) {
      this.seal(at.x, at.y, c.area(380), 26, 1);
      const targets = c.nearestN(9, 700);
      for (let i = 0; i < 9 && targets.length; i++) {                        // 9 kim long đuổi 9 mục tiêu
        const t = targets[i % targets.length];
        c.proj.fireMine({ x: at.x, y: at.y, angle: Math.atan2(t.y - at.y, t.x - at.x) + (i - 4) * 0.2, speed: 420, r: 12, dmg: 0, pierce: 0,
          color: 0xffd040, homing: true, life: 3, trail: 0xffd040, trailW: 7, spark: true, hit: (e) => this.hitSeal(e, 4) });
      }
      return;
    }
    const r = c.area(this.L([170, 185, 185, 205, 205]));
    const pct = this.L([9, 10.8, 12.6, 14.7, 17]);
    this.seal(at.x, at.y, r, pct, 1);
    if (this.lv >= 5) c.scene.time.delayedCall(450, () => this.seal(at.x, at.y, r, pct * 0.6, 0));
  }
  private seal(x: number, y: number, r: number, pct: number, main: number): void {
    const c = this.c;
    c.fx.warn(x, y, r, 1, 0xffd040);
    const im = c.scene.add.image(x, y - 300, TEX.SHAPE + 'square').setDepth(12).setScale(r / 52).setAlpha(0.6).setTint(0xffd040);
    c.scene.tweens.add({ targets: im, y, duration: 1000, ease: 'Cubic.easeIn', onComplete: () => im.destroy() });
    c.scene.time.delayedCall(1000, () => {
      c.fx.burst(x, y, r, 0xffd040, 0.5);
      c.fx.shock(x, y, r * 1.15, 0xfff0a0, 0.5);
      for (const e of c.inRadius(x, y, r)) this.hitSeal(e, pct);
      if (main && (this.lv >= 5 || this.aw)) this.zones.push({ x, y, r, t: this.aw ? 8 : 4 });
      c.sound('explode');
    });
  }
  private hitSeal(e: Enemy, pct: number): void {
    const c = this.c;
    const execN = this.aw ? 0.35 : this.lv >= 3 ? 0.25 : 0.2;
    const ratio = e.hp / e.maxHp;
    if ((isNormal(e) && ratio < execN) || (this.aw && isElite(e) && ratio < 0.1)) {   // hành quyết
      c.hitRaw(e, e.hp + 1, this.id, { crit: false });
      return;
    }
    const boss = this.lv >= 3 && e.isBoss ? 1.3 : 1;
    c.hit(e, pct * boss, this.id, this.lv >= 3 ? { slow: 1, slowTime: 1.5 } : {});
  }
}

// ---------------------------------------------------------------- Đại Đạo Quy Nhất
export class DaiDao extends Skill {
  private stop = 0;
  private startDealt = 0;
  private furnace = 0;
  private haste = 0;
  /** Gọi để hồi chiêu ngay mọi kỹ năng khác (SkillSystem gán) */
  resetOthers: (() => void) | null = null;
  /** Hệ số hồi chiêu toàn cục sau Đại Đạo Lô (SkillSystem đọc) */
  get cdMul(): number {
    return this.haste > 0 ? 0.5 : 1;
  }
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.haste > 0) this.haste -= dt;
    if (this.furnace > 0) {
      // Đại Đạo Lô: luyện hóa quái thường trên màn hình thành linh thạch + kinh nghiệm
      this.furnace -= dt;
      c.fx.frameCircle(p.x, p.y, 700, 0xe8e0ff, 0.06, 0.3);
      for (const e of c.inRadius(p.x, p.y, 700)) {
        if (isNormal(e)) {
          c.pickups.spawn('coin', e.x, e.y, c.enemies.coinValue);
          c.hitRaw(e, e.hp + 1, this.id, { crit: false, noText: true });
        }
      }
      if (this.furnace <= 0) {
        for (const e of c.inRadius(p.x, p.y, 900)) if (e.isBoss) c.hitRaw(e, e.maxHp * 0.08, this.id, { crit: false });
        c.aoe(p.x, p.y, 700, 45, this.id);
        c.fx.burst(p.x, p.y, 600, 0xe8e0ff, 0.6);
        this.haste = 10;                                                    // 10 giây mọi kỹ năng −50% hồi chiêu
      }
    }
    if (this.stop > 0) {
      this.stop -= dt;
      c.fx.frameCircle(p.x, p.y, 700, 0x8a80c0, 0.08, 0.2);
      if (this.stop <= 0) this.explode();
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(500)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([45, 45, 42, 42, 40]));
    if (this.aw) {
      this.furnace = 5;
      c.enemies.timeStop = Math.max(c.enemies.timeStop, 5);
      return;
    }
    this.stop = this.L([2, 2.5, 2.5, 3, 3]);
    c.enemies.timeStop = Math.max(c.enemies.timeStop, this.stop);
    this.startDealt = c.enemies.dealt;
  }
  private explode(): void {
    const c = this.c, p = c.player;
    const stored = this.lv >= 3 ? (c.enemies.dealt - this.startDealt) * (this.lv >= 5 ? 1 : 0.5) : 0;
    c.fx.burst(p.x, p.y, 600, 0xe8e0ff, 0.6);
    c.fx.shock(p.x, p.y, 700, 0xffffff, 0.6);
    const list = c.aoe(p.x, p.y, 700, this.L([15, 18, 21, 24.5, 28]), this.id);
    if (stored > 0 && list.length) for (const e of list) c.hitRaw(e, stored / list.length, this.id, { crit: false });
    if (this.lv >= 5) this.resetOthers?.();
    c.sound('explode');
  }
}

export const REALM_IMPLS = {
  ho_khieu: HoKhieu, linh_dan: LinhDan, hoa_phu: HoaPhu, kim_dan: KimDan, nguyen_anh: NguyenAnh, than_thuc: ThanThuc,
  hu_khong: HuKhong, phap_tuong: PhapTuong, van_kiem: VanKiem, than_loi: ThanLoi, lien_hoa: LienHoa, ngan_ha: NganHa,
  hoang_chung: HoangChung, kim_than: KimThan, linh_vuc: LinhVuc, de_an: DeAn, dai_dao: DaiDao,
};
