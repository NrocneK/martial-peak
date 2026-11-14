// =====================================================================
// 14 KỸ NĂNG CẢNH GIỚI — mỗi đại cảnh giới mở 1 kỹ năng; trước màn chọn mang theo 3.
// Hình ảnh: hàm hiệu ứng trong src/vfx/skillFx.ts (cùng hiệu ứng đã duyệt ở trang vfx-lab) chạy trên quái thật;
// mỗi lần hiệu ứng báo trúng đòn → kỹ năng tính sát thương + hiệu ứng phụ ở đây (màu báo trúng phân biệt loại đòn).
// Số liệu từng cấp (mảng 5 phần tử = cấp 1..5). Sát thương ghi theo tỉ lệ lực đánh (1 = 100%).
// Đã bỏ: Kim Đan Hộ Luân, Nguyên Anh Xuất Khiếu (thay bằng Khí Long), Bất Diệt Kim Thân, Đế Ấn Trấn Thiên.
// =====================================================================
import type { Enemy } from '../../entities/Enemy';
import { SKILL_FX, stopLinhVuc, type Stage } from '../../vfx/skillFx';
import { Skill } from './Ctx';

const isNormal = (e: Enemy) => !e.isBoss && e.behavior !== 'elite';
const isElite = (e: Enemy) => !e.isBoss && e.behavior === 'elite';

/** Kỹ năng cảnh giới có hiệu ứng: chạy hàm hiệu ứng, `onHit` nhận từng lần trúng đòn */
abstract class FxSkill extends Skill {
  protected play(onHit: (e: Enemy, color: number) => void, opt?: Stage['opt'], range = 560): void {
    SKILL_FX[this.id]?.(this.c.stage(onHit, opt, range), this.aw);
  }
}

// ---------------------------------------------------------------- Hổ Khiếu Chấn
export class HoKhieu extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c, p = c.player;
    if (!c.nearest(c.area(this.aw ? 190 : 125) + 30)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([6, 6, 5.5, 5.5, 5]));
    const pct = this.aw ? 3.5 : this.L([1.2, 1.45, 1.7, 2.0, 2.3]);
    // hư ảnh đầu hổ gầm trên đầu → sóng xung kích lan quanh thân, đẩy lùi
    this.play((e) => {
      c.hit(e, pct, this.id, this.aw ? { slow: 1, slowTime: 0.8 } : {});
      if (this.aw) c.hitRaw(e, p.stats.maxHp * 0.04, this.id, { noText: true });   // +4% HP tối đa
      if (this.lv >= 3) {
        e.weakAmt = this.aw ? 0.35 : 0.2;                                    // Chấn Nhiếp: quái gây ít sát thương hơn
        e.weakT = c.ctrl(3);
      }
    }, undefined, 260);
    c.sound('explode');
  }
}

// ---------------------------------------------------------------- Linh Khí Đạn
export class LinhDan extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(520)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([2.4, 2.4, 2.2, 2.2, 2]));
    const pct = this.aw ? 2.1 : this.L([0.8, 0.96, 1.12, 1.3, 1.5]);
    this.play((e) => c.hit(e, pct, this.id), undefined, 520);
    c.sound('cast');
  }
  onKill(e: Enemy): void {
    if (this.lv >= 5 && e.lastSrc === this.id && Math.random() < 0.2) this.c.pickups.spawn('xp', e.x + 8, e.y, Math.max(1, e.xp));
  }
}

// ---------------------------------------------------------------- Liệt Hỏa Phù
export class HoaPhu extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(480)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([4.5, 4.5, 4.2, 4.2, 3.8]));
    const pct = this.aw ? 3.6 : this.L([1.4, 1.65, 1.9, 2.2, 2.5]);
    // ném bùa lửa → nổ cầu lửa + lửa cháy lan; thức tỉnh: lửa xanh + lốc lửa
    this.play((e, color) => {
      const swirl = color === 0x9fd8ff;                                       // lốc lửa: đòn phụ
      c.hit(e, pct * (swirl ? 0.35 : 1), this.id, { noText: swirl });
      e.burnDps = Math.max(e.burnDps, c.atk(0.2));                           // thiêu đốt 20%/giây
      e.burnT = Math.max(e.burnT, c.ctrl(3));
      e.burnStacks = this.aw ? Math.min(3, e.burnStacks + 1) : 1;
    }, undefined, 480);
    c.sound('explode');
  }
  onKill(e: Enemy): void {
    if (this.lv < 5 || e.burnT <= 0) return;                                 // chết khi đang cháy → nổ lan 80%
    const c = this.c;
    c.fx.burst(e.x, e.y, 50, 0xff7a30, 0.2);
    for (const o of c.inRadius(e.x, e.y, c.area(50))) if (o !== e) c.hit(o, 0.8, this.id, { noText: true });
  }
}

// ---------------------------------------------------------------- Khí Long (thay Nguyên Anh)
export class KhiLong extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(360)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([12, 12, 11, 11, 10]));
    const pct = this.aw ? 1.6 : this.L([0.7, 0.84, 0.98, 1.15, 1.3]);
    // rồng khí chui ra từ cổng xoáy dưới chân, lượn quanh thân chạm quái; thức tỉnh: huyết long lượn 1 vòng rồi đâm xuống đất nổ
    this.play((e, color) => {
      if (color === 0xffd0a0) return void c.hit(e, 4, this.id, { slow: 1, slowTime: 1 });   // huyết long trấn địa
      c.hit(e, pct, this.id);
    }, undefined, 420);
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Thần Thức Trảm
export class ThanThuc extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(260)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([5, 4.7, 4.4, 4.1, 3.8]));
    const pct = this.aw ? 5 : this.L([2.4, 2.9, 3.4, 4, 4.6]);
    // tay khí trên đầu nhân vật, lưỡi kiếm khí bọc bàn tay chém quái gần (thức tỉnh: 6 cánh tay)
    this.play((e) => {
      const big = this.lv >= 3 && (e.isBoss || isElite(e)) ? 1.5 : 1;          // +50% lên tinh anh và boss
      c.hit(e, pct * big, this.id);
      if (this.lv >= 2 && e.active) c.stun(e, 0.4);
    }, undefined, 300);
    c.sound('hit');
  }
}

// ---------------------------------------------------------------- Hư Không Liệt Phùng
export class HuKhong extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(420)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([9, 9, 8.5, 8.5, 8]));
    const dps = this.aw ? 1.8 : this.L([0.6, 0.72, 0.85, 1.0, 1.15]);
    const blast = this.aw ? 5 : this.L([1.5, 1.5, 2, 2, 2.5]);
    // hố đen xé không gian ở cụm quái: hút xoáy vào tâm, sát thương theo nhịp, khép lại thì nổ
    this.play((e, color) => {
      if (color === 0xc0a0ff) c.hit(e, blast, this.id);
      else c.hit(e, dps * 0.45, this.id, { noText: true });
    }, undefined, 420);
    if (this.lv >= 5 || this.aw) c.pickups.attract(c.player.x, c.player.y, c.area(240));   // hút vật phẩm + kinh nghiệm
  }
}

// ---------------------------------------------------------------- Pháp Tướng Thiên Địa
export class PhapTuong extends FxSkill {
  private avatar = 0;
  update(dt: number): void {
    const c = this.c;
    if (this.avatar > 0) {
      this.avatar -= dt;
      c.areaBuff = Math.max(c.areaBuff, 1.2);                                 // pháp tướng: mọi kỹ năng +20% phạm vi
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(480)) return void (this.cd = 0);
    this.cd = c.cdR(this.aw ? 12 : this.L([8, 8, 7.5, 7.5, 7]));
    const pct = this.aw ? 9 : this.L([3.5, 4.2, 4.9, 5.7, 6.5]);
    if (this.aw) this.avatar = 3.4;
    // pháp tướng khổng lồ hiện sau lưng, giáng chưởng xuống cụm quái (thức tỉnh: nhiều chưởng + giậm chân chấn cả màn hình)
    this.play((e) => {
      const stunned = this.lv >= 5 && e.slow >= 1 ? 1.3 : 1;                  // +30% lên quái đang choáng
      c.hit(e, pct * stunned, this.id, this.lv >= 3 ? { slow: 1, slowTime: 1 } : {});
    }, undefined, 520);
    c.sound('explode');
  }
}

// ---------------------------------------------------------------- Vạn Kiếm Quy Tông
export class VanKiem extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(320)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([10, 10, 9.5, 9.5, 9]));
    const pct = this.aw ? 1.3 : this.L([0.6, 0.72, 0.84, 0.98, 1.12]);
    // trận pháp dưới chân (đi theo nhân vật), mưa kiếm khí 9 màu rơi trong trận; thức tỉnh: trận vàng + 4 cự kiếm cắm trận
    this.play((e) => {
      const crit = this.aw && Math.random() < c.st.crit;
      c.hit(e, pct, this.id, { crit: crit ? true : undefined });
      if (this.lv >= 3) {                                                     // kiếm khí cắt: chảy máu 15%/giây
        e.bleedDps = Math.max(e.bleedDps, c.atk(0.15));
        e.bleedT = Math.max(e.bleedT, c.ctrl(2));
      }
    }, undefined, 420);
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Cửu Tiêu Thần Lôi
export class ThanLoi extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    if (!c.nearest(460)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([5, 5, 4.6, 4.6, 4.2]));
    const amp = this.aw ? 1 + c.st.cdr : 1;                                  // mỗi 1% giảm hồi chiêu → +1% sát thương sét
    const pct = (this.aw ? 3.2 : this.L([1.5, 1.8, 2.1, 2.45, 2.8])) * amp;
    // sét giáng xuống quái rồi lan sang quái gần; thức tỉnh: 9 tia + kiếp lôi nổ tàn dư
    this.play((e) => c.hit(e, pct, this.id, this.lv >= 3 ? { slow: 1, slowTime: 0.5 } : {}), undefined, 460);
    c.sound('explode');
  }
}

// ---------------------------------------------------------------- Tiên Nguyên Liên Hoa
export class LienHoa extends FxSkill {
  private t = 0;
  private tick = 0;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.t > 0) {
      // sen nở dưới chân (đi theo nhân vật): hồi máu + sát thương quanh thân mỗi 0,5 giây
      this.t -= dt;
      if ((this.tick -= dt) <= 0) {
        this.tick = 0.5;
        const r = c.area(this.aw ? 150 : 120);
        const hpS = this.aw ? 0.03 : this.L([0.015, 0.02, 0.02, 0.025, 0.03]);
        const amt = p.stats.maxHp * hpS * 0.5;
        const room = p.stats.maxHp - p.hp;
        p.heal(amt);
        if (this.lv >= 5 && amt > room) {                                    // máu hồi dư thành khiên
          p.shield = Math.min(p.stats.maxHp * (this.aw ? 0.4 : 0.2), p.shield + (amt - room));
          p.shieldT = Math.max(p.shieldT, 4);
        }
        const dps = this.aw ? 1.5 : this.L([0.5, 0.6, 0.7, 0.82, 0.95]);
        for (const e of c.inRadius(p.x, p.y, r)) {
          c.hit(e, dps * 0.5, this.id, { noText: true });
          if (this.lv >= 3) c.enemies.applySlow(e, 0.2, 0.6);
        }
      }
      if (this.t <= 0 && this.aw) {                                           // hoa tan hết → 9 cánh sen bay xoắn ốc 250%
        const ox = p.x, oy = p.y;
        c.scene.time.delayedCall(450, () => { for (const e of c.inRadius(ox, oy, c.area(260))) c.hit(e, 2.5, this.id); });
      }
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(360) && p.hp >= p.stats.maxHp) return void (this.cd = 0);
    this.cd = c.cdR(this.L([12, 12, 11, 11, 10]));
    this.t = 3.4;
    this.tick = 0.35;
    this.play(() => {}, undefined, 200);
  }
}

// ---------------------------------------------------------------- Ngân Hà Hàn Lưu
export class NganHa extends FxSkill {
  update(dt: number): void {
    if ((this.cd -= dt) > 0) return;
    const c = this.c;
    const range = c.area(this.aw ? 360 : this.L([300, 315, 330, 345, 360]));
    if (!c.nearest(range)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([8, 8, 7.5, 7.5, 7]));
    const dur = this.aw ? 3 : this.L([2.6, 2.8, 3, 3.2, 3.4]);
    const pct = this.aw ? 1.4 : this.L([0.5, 0.6, 0.7, 0.82, 0.95]);
    const count = new Map<Enemy, number>();
    const bossSlowed = new Set<Enemy>();
    // tia băng khóa quái XA NHẤT trong tầm (ưu tiên boss), quét trúng quái trên đường tia; 5 lần trúng → đóng băng.
    // Thức tỉnh: tia to + 3 tên lửa băng truy kích định kỳ
    this.play((e) => {
      c.hit(e, pct, this.id, { noText: true });
      if (e.isBoss) {                                                         // boss: chậm ngắn, chỉ 1 lần mỗi lần thi triển
        if (!bossSlowed.has(e)) { bossSlowed.add(e); c.enemies.applySlow(e, 0.3, 0.7); }
        return;
      }
      const n = (count.get(e) ?? 0) + 1;
      count.set(e, n);
      if (n === 5) {
        const ft = c.ctrl(1.6);
        e.frozenT = ft;
        c.enemies.applySlow(e, 1, ft);
      } else if (n < 5) c.enemies.applySlow(e, 0.3, c.ctrl(1));
    }, { range, dur: dur * 1000 }, range * 1.4);
    c.sound('cast');
  }
}

// ---------------------------------------------------------------- Huyền Hoàng Chung
export class HoangChung extends FxSkill {
  private t = 0;
  update(dt: number): void {
    const c = this.c, p = c.player;
    if (this.t > 0) {
      this.t -= dt;
      p.reflect = Math.max(p.reflect, this.aw ? 0.6 : this.lv >= 3 ? 0.3 : 0);
    }
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(360)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([14, 14, 13, 13, 12]));
    const dur = this.L([3, 3, 3.5, 3.5, 4]);
    this.t = dur;
    const sh = p.stats.maxHp * (this.aw ? 0.5 : this.L([0.15, 0.2, 0.2, 0.25, 0.3])) + (this.aw ? (p.stats.armor + p.armorBonus) * 10 : 0);
    p.shield = Math.max(p.shield, sh);
    p.shieldT = dur + 0.1;
    const start = c.scene.time.now;
    // chuông năng lượng úp lên người + trận đồ dưới chân; chuông rung → sóng vàng (thức tỉnh: rung thêm 3 hồi)
    this.play((e) => {
      const last = c.scene.time.now - start > dur * 1000 - 600;
      const pct = last ? (this.aw ? 7 : this.L([2.5, 3, 3.5, 4.1, 4.7])) : 2.5;
      c.hit(e, pct, this.id, this.lv >= 5 ? { slow: 1, slowTime: 1.2 } : {});
      c.knock(e, p.x, p.y, this.lv >= 3 ? 340 : 180);
      if (this.lv >= 5) c.proj.clearEnemy(p.x, p.y, c.area(170));            // xóa đạn địch
    }, { dur: dur * 1000, r: c.area(this.aw ? 190 : 160) }, 300);
  }
}

// ---------------------------------------------------------------- Tiên Vương Lĩnh Vực (duy trì vĩnh viễn)
export class LinhVuc extends FxSkill {
  private bonus = 0;
  private idle = 0;
  private shown = '';
  update(dt: number): void {
    const c = this.c, p = c.player;
    const r = c.area(this.aw ? 240 : this.L([150, 165, 165, 185, 185]));
    const key = `${this.aw}:${Math.round(r)}`;
    if (key !== this.shown) {                                                 // bật / đổi trận đồ khi lên cấp hoặc thức tỉnh
      this.shown = key;
      const dps = () => (this.aw ? 1.2 : this.L([0.35, 0.42, 0.5, 0.58, 0.68]));
      this.play((e) => c.hit(e, dps() * 0.6, this.id, { noText: true }), { r }, r + 40);
    }
    const vuln = this.aw ? 0.4 : this.L([0.1, 0.1, 0.18, 0.18, 0.25]);
    const slow = this.L([0.15, 0.15, 0.15, 0.25, 0.25]);
    for (const e of c.inRadius(p.x, p.y, r)) {
      e.domainT = 0.2;
      e.domainVuln = vuln;
      e.domainWeak = this.lv >= 3 ? 0.15 : 0;
      c.enemies.applySlow(e, slow, 0.25);
    }
    if (this.bonus > 0 && !this.aw && (this.idle += dt) > 5) this.bonus = 0;  // tan sau 5 giây không hạ quái
    p.buffDmg *= 1 + this.bonus;
  }
  onKill(e: Enemy): void {
    if (this.lv < 5) return;
    const c = this.c, p = c.player;
    const r = c.area(this.aw ? 240 : 185);
    if (Math.hypot(e.x - p.x, e.y - p.y) > r) return;
    this.bonus = Math.min(this.aw ? 0.6 : 0.3, this.bonus + 0.01);
    this.idle = 0;
  }
  clear(): void {
    stopLinhVuc();
    this.shown = '';
  }
}

// ---------------------------------------------------------------- Đại Đạo Quy Nhất
export class DaiDao extends FxSkill {
  private haste = 0;
  /** Gọi để hồi chiêu ngay mọi kỹ năng khác (SkillSystem gán) */
  resetOthers: (() => void) | null = null;
  /** Hệ số hồi chiêu toàn cục sau Đại Đạo Lô (SkillSystem đọc) */
  get cdMul(): number {
    return this.haste > 0 ? 0.5 : 1;
  }
  update(dt: number): void {
    const c = this.c;
    if (this.haste > 0) this.haste -= dt;
    if ((this.cd -= dt) > 0) return;
    if (!c.nearest(500)) return void (this.cd = 0);
    this.cd = c.cdR(this.L([45, 45, 42, 42, 40]));
    // ngưng đọng thời gian: trận âm dương bát quái nở từng vòng dưới chân → quy nhất về 1 điểm → nổ toàn màn hình
    const STOP = 2.7;
    c.enemies.timeStop = Math.max(c.enemies.timeStop, STOP);
    const startDealt = c.enemies.dealt;
    let first = true, stored = 0, n = 0;
    const pct = this.aw ? 45 : this.L([15, 18, 21, 24.5, 28]);
    this.play((e) => {
      if (first) {                                                           // nhát đầu của vụ nổ: chốt lượng sát thương tích lại
        first = false;
        n = c.fxTargets(900).length || 1;
        stored = this.lv >= 3 ? (c.enemies.dealt - startDealt) * (this.lv >= 5 ? 1 : 0.5) : 0;
        if (this.aw) this.haste = 10;                                        // Hỗn Nguyên Đại Đạo Lô: 10 giây mọi kỹ năng −50% hồi chiêu
        if (this.lv >= 5) c.scene.time.delayedCall(50, () => this.resetOthers?.());
        c.sound('explode');
      }
      if (this.aw && isNormal(e)) {                                          // luyện hóa quái thường thành linh thạch
        c.pickups.spawn('coin', e.x, e.y, c.enemies.coinValue);
        c.hitRaw(e, e.hp + 1, this.id, { crit: false, noText: true });
        return;
      }
      if (this.aw && e.isBoss) c.hitRaw(e, e.maxHp * 0.08, this.id, { crit: false });
      c.hit(e, pct, this.id);
      if (stored > 0 && e.active) c.hitRaw(e, stored / n, this.id, { crit: false });
    }, undefined, 900);
  }
}

export const REALM_IMPLS = {
  ho_khieu: HoKhieu, linh_dan: LinhDan, hoa_phu: HoaPhu, khi_long: KhiLong, than_thuc: ThanThuc,
  hu_khong: HuKhong, phap_tuong: PhapTuong, van_kiem: VanKiem, than_loi: ThanLoi, lien_hoa: LienHoa, ngan_ha: NganHa,
  hoang_chung: HoangChung, linh_vuc: LinhVuc, dai_dao: DaiDao,
};
