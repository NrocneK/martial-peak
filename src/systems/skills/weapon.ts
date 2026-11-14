// =====================================================================
// 6 KỸ NĂNG VŨ KHÍ — đòn đánh tự động theo loại vũ khí đang cầm.
// Hình ảnh: hàm hiệu ứng trong src/vfx/skillFx.ts (cùng hiệu ứng đã duyệt ở trang vfx-lab) chạy trên quái thật;
// mỗi lần hiệu ứng báo trúng đòn → kỹ năng tính sát thương + hiệu ứng phụ ở đây.
// Số liệu từng cấp (mảng 5 phần tử = cấp 1..5). Sát thương ghi theo tỉ lệ lực đánh (1 = 100%).
// =====================================================================
import type { Enemy } from '../../entities/Enemy';
import { SKILL_FX, type Stage } from '../../vfx/skillFx';
import { Skill } from './Ctx';

/** Kỹ năng vũ khí: có thêm % sát thương hiện tại */
export abstract class WeaponSkill extends Skill {
  /** % sát thương một đòn ở cấp hiện tại (đã tính thức tỉnh) */
  abstract pct(): number;
  /** Hồi chiêu gốc ở cấp hiện tại */
  abstract baseCd(): number;
  /** Chạy hiệu ứng của kỹ năng; `onHit` nhận từng lần trúng đòn */
  protected play(onHit: (e: Enemy, color: number) => void, opt?: Stage['opt'], range = 560): void {
    SKILL_FX[this.id]?.(this.c.stage(onHit, opt, range), this.aw);
  }
}

const isNormal = (e: Enemy) => !e.isBoss && e.behavior !== 'elite';

// ---------------------------------------------------------------- Ngự Kiếm Thuật
export class NguKiem extends WeaponSkill {
  pct() { return this.aw ? 2.6 : this.L([1, 1.2, 1.4, 1.65, 1.9]); }
  baseCd() { return this.aw ? 2.2 : this.L([1.2, 1.2, 1.1, 1.1, 1.0]); }
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(480)) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    // thường: 3 kiếm khí lao vào 3 quái gần nhất rồi vòng về; thức tỉnh: 6 kiếm xòe sau lưng, mỗi kiếm đuổi 2 mục tiêu
    this.play((e) => {
      const marked = e.markKiem > 0;
      c.hit(e, this.pct(), this.id, { crit: this.aw && marked ? true : undefined });
      if (this.lv >= 5) {
        e.markKiem = Math.min(this.aw ? 3 : 1, e.markKiem + 1);             // Kiếm Thương: +10% sát thương nhận / tầng
        e.markKiemT = 3;
      }
    }, undefined, 480);
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Bá Đao Trảm (xoay đao)
export class BaDao extends WeaponSkill {
  /** thời gian xoay còn lại — trong lúc xoay không thi triển lại */
  private spin = 0;
  pct() { return this.aw ? 1.3 : this.L([0.55, 0.65, 0.75, 0.85, 0.95]); }
  baseCd() { return this.L([5, 5, 4.8, 4.8, 4.5]); }
  private dur() { return this.aw ? 3.6 : this.L([2.4, 2.6, 2.8, 3, 3]); }
  update(dt: number): void {
    if (this.spin > 0) this.spin -= dt;
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    const R = c.area(this.aw ? 125 : this.L([90, 95, 100, 110, 115]));
    if (!c.nearest(R + 140)) return void (this.cd = 0);
    const dur = this.dur();
    this.cd = Math.max(c.cdW(this.baseCd()), dur + 0.4);
    this.spin = dur;
    const hits = new Map<Enemy, number>();
    this.play((e, color) => {
      if (color === 0xf0a0ff) return void c.hit(e, this.pct() * 1.5, this.id);   // thức tỉnh: đao khí văng ra
      if (this.aw && isNormal(e) && e.hp / e.maxHp < 0.15) return void c.hitRaw(e, e.hp + 1, this.id, { crit: false });   // hành quyết
      const nearest = color === 0xffffff;                                     // quái gần nhất nhận thêm 50%
      c.hit(e, this.pct() * (nearest ? 1.5 : 1), this.id);
      const n = (hits.get(e) ?? 0) + 1;
      hits.set(e, n);
      if (n === 6) {                                                          // PHÁ GIÁP: nhận thêm sát thương từ mọi nguồn
        e.shockAmt = Math.max(e.shockAmt, this.aw ? 0.3 : 0.2);
        e.shockT = c.ctrl(4);
      }
    }, { dur: dur * 1000, r: R });
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Phá Trận Thương
export class PhaThuong extends WeaponSkill {
  pct() { return this.aw ? 3.4 : this.L([1.3, 1.55, 1.8, 2.1, 2.4]); }
  baseCd() { return this.L([1.4, 1.4, 1.3, 1.3, 1.2]); }
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(this.aw ? 280 : 220)) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    // đâm thương năng lượng về quái gần nhất; thức tỉnh: mũi thương dài hơn + xoáy khí ở mũi
    this.play((e, color) => {
      const vortex = color === 0xb0ffe8;
      c.hit(e, this.pct() * (vortex ? 0.5 : 1), this.id, { noText: vortex });
      if (this.lv >= 5 && !vortex) { c.stun(e, 0.4); c.knock(e, c.player.x, c.player.y, 160); }
    }, undefined, 300);
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Băng Sơn Quyền
export class BangQuyen extends WeaponSkill {
  private armor: number[] = [];
  pct() { return this.aw ? 1.6 : this.L([0.6, 0.72, 0.84, 0.98, 1.12]); }
  baseCd() { return this.L([0.75, 0.75, 0.7, 0.7, 0.65]); }
  update(dt: number): void {
    const c = this.c, p = c.player;
    for (let i = this.armor.length - 1; i >= 0; i--) if ((this.armor[i] -= dt) <= 0) this.armor.splice(i, 1);
    p.armorBonus += this.armor.length;
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(c.area(100))) return void (this.cd = 0);
    const fury = this.aw && p.hp < p.stats.maxHp * 0.5 ? 1.3 : 1;          // máu dưới 50%: tốc đánh quyền +30%
    this.cd = c.cdW(this.baseCd()) / fury;
    // đấm vào quái gần nhất → chấn động quanh thân; thức tỉnh: thêm địa chấn lan rộng
    this.play((e, color) => {
      const quake = color === 0xffe090;
      c.hit(e, this.pct() * (quake ? 1.5 : 1), this.id, this.lv >= 3 ? { slow: 1, slowTime: 0.3 } : {});
      if (this.aw) c.hitRaw(e, p.stats.maxHp * 0.02, this.id, { noText: true });   // +2% HP tối đa mỗi đòn
      if (this.lv >= 3 && this.armor.length < 5) this.armor.push(2);         // +1 giáp mỗi quái trúng, tối đa 5
      if (this.lv >= 5) p.heal(c.atk(this.pct()) * 0.01);
    }, undefined, 260);
    c.sound('hit');
  }
}

// ---------------------------------------------------------------- Truy Tinh Tiễn
export class TruyTien extends WeaponSkill {
  pct() { return this.aw ? 2.8 : this.L([1.1, 1.3, 1.5, 1.75, 2.0]); }
  baseCd() { return this.L([1.0, 1.0, 0.95, 0.95, 0.9]); }
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    if (!c.nearest(c.area(420))) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    this.play((e) => {
      const far = this.lv >= 3 && Math.hypot(e.x - p.x, e.y - p.y) > 250 ? 1.3 : 1;
      c.hit(e, this.pct() * far, this.id);
    }, undefined, c.area(420));
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Thanh Phong Phiến
export class ThanhPhien extends WeaponSkill {
  pct() { return this.aw ? 0.9 : this.L([0.35, 0.42, 0.49, 0.57, 0.65]); }
  baseCd() { return this.aw ? 3.6 : this.L([3, 3, 2.8, 2.8, 2.6]); }
  update(dt: number): void {
    const c = this.c;
    if (this.lv >= 5) c.enemies.slowVuln = Math.max(c.enemies.slowVuln, 0.15);   // quái bị chậm nhận +15% từ mọi nguồn
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(360)) return void (this.cd = 0);
    this.cd = c.cdW(this.baseCd());
    // phất quạt gọi lốc xoáy (thức tỉnh 3 lốc): lốc tự đi tìm quái, hút quái nhỏ vào rồi kéo theo, gây sát thương mỗi nhịp
    const slow = this.L([0.15, 0.15, 0.15, 0.25, 0.25]);
    this.play((e) => c.hit(e, this.pct(), this.id, { slow, slowTime: 1.5, noText: true }), undefined, 420);
    c.sound('cast');
  }
}

export const WEAPON_IMPLS = { ngu_kiem: NguKiem, ba_dao: BaDao, pha_thuong: PhaThuong, bang_quyen: BangQuyen, truy_tien: TruyTien, thanh_phien: ThanhPhien };
