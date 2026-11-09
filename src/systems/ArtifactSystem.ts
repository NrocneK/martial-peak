import { weaponById } from '../config/weapons';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from './EnemyManager';
import type { Pickups } from './Pickups';
import type { Fx } from './Fx';
import type { RunState } from './RunState';
import { audio } from './Audio';

/** Phần cộng thêm tạm thời do bí bảo (áp lên chỉ số nhân vật, xóa sạch khi hết màn) */
export interface ArtifactBuff {
  damage: number; // +0.12 = +12%
  atk: number;
  armor: number;
  pickup: number; // hệ số nhân (1 = không đổi)
}

/**
 * Hiệu ứng riêng của 12 bí bảo. Mọi hiệu ứng chỉ sống trong một màn chơi (không lưu).
 * Hook: update(dt) theo thời gian, onKill, onHit (nhận sát thương), onLevel. Hồi chiêu dùng bảng cd.
 * Muốn đổi số liệu: sửa hằng số trong từng `case` bên dưới.
 */
export class ArtifactSystem {
  readonly buff: ArtifactBuff = { damage: 0, atk: 0, armor: 0, pickup: 1 };
  /** true khi buff đổi → GameScene tính lại chỉ số */
  dirty = false;
  private readonly cd: Record<string, number> = {};
  private readonly zones: { x: number; y: number; t: number; tick: number; r: number; dmg: number }[] = [];
  private lvl5 = false;
  private crowd = false;
  private scan = 0;
  private armT = 0;
  private atkT = 0;
  private dmgT = 0;
  private maxLevelSeen = 1;

  constructor(
    private readonly id: string | null,
    private readonly player: Player,
    private readonly enemies: EnemyManager,
    private readonly pickups: Pickups,
    private readonly fx: Fx,
    private readonly run: RunState,
  ) {
    if (id === 'bb_w2_5') enemies.slowBonus = 1.08;
    // Hồi chiêu khởi đầu (hiệu ứng định kỳ không kích hoạt ngay giây đầu)
    this.cd.timer = id === 'bb_w1_5' ? 45 : id === 'bb_w3_5' ? 20 : id === 'bb_w5_10' ? 35 : id === 'bb_w6_10' ? 30 : 0;
  }

  /** Sát thương cơ sở của kỹ năng vũ khí hiện tại (dùng cho đòn phụ của bí bảo) */
  private baseDmg(): number {
    const w = this.run.skills.find((s) => s.kind === 'weapon');
    return (w ? weaponById(w.id).base.damage : 10) * this.player.stats.damage;
  }

  private heal(frac: number): void {
    this.player.heal(this.player.stats.maxHp * frac);
    this.fx.ring(this.player.x, this.player.y, 50, 0x60ff90, 0.4);
  }

  private setBuff<K extends keyof ArtifactBuff>(k: K, v: number): void {
    if (this.buff[k] !== v) {
      this.buff[k] = v;
      this.dirty = true;
    }
  }

  update(dt: number): void {
    const p = this.player;
    for (const k of Object.keys(this.cd)) if (k !== 'timer' && this.cd[k] > 0) this.cd[k] -= dt;
    // Hết thời gian các buff tạm
    if (this.armT > 0 && (this.armT -= dt) <= 0) this.setBuff('armor', 0);
    if (this.atkT > 0 && (this.atkT -= dt) <= 0) this.setBuff('atk', 0);
    if (this.dmgT > 0 && (this.dmgT -= dt) <= 0) this.setBuff('damage', this.crowd ? 0.1 : 0);
    // Vùng sát thương (Thượng Cổ Tàn Bi)
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      z.tick -= dt;
      this.fx.frameCircle(z.x, z.y, z.r, 0x8040c0, 0.18, 0.5);
      if (z.tick <= 0) {
        z.tick = 0.5;
        const list: Enemy[] = [];
        this.enemies.inRadius(z.x, z.y, z.r, list);
        for (const e of list) this.enemies.hurt(e, z.dmg, 0, true);
      }
      if (z.t <= 0) this.zones.splice(i, 1);
    }

    switch (this.id) {
      case 'bb_w1_5': // Tụ Bảo La Bàn: mỗi 45 giây hút toàn bộ vật phẩm
        if ((this.cd.timer -= dt) <= 0) {
          this.cd.timer = 45;
          this.pickups.magnetAll();
          this.fx.ring(p.x, p.y, 120, 0xe0c070, 0.5);
        }
        break;
      case 'bb_w3_5': // Tinh Lôi Tâm: mỗi 20 giây một tia sét 60% sát thương vào quái gần nhất
        if ((this.cd.timer -= dt) <= 0) {
          this.cd.timer = 20;
          const t = this.enemies.nearest(p.x, p.y, 700);
          if (t) {
            this.fx.line(t.x, t.y - 400, t.x, t.y, 8, 0xffe060, 0.3);
            this.fx.burst(t.x, t.y, 60, 0xffe060, 0.3);
            this.enemies.hurt(t, this.baseDmg() * 0.6 * 3);
            audio.play('explode');
          } else this.cd.timer = 1; // chưa có quái: thử lại sớm
        }
        break;
      case 'bb_w3_10': // Huyền Tinh Hạch: dưới 50% máu, phạm vi nhặt +10%
        this.scan -= dt;
        if (this.scan <= 0) {
          this.scan = 0.25;
          this.setBuff('pickup', p.hp < p.stats.maxHp * 0.5 ? 1.1 : 1);
        }
        break;
      case 'bb_w5_5': // Tiên Vương Lệnh: >=30 quái gần → +10% sát thương, tắt khi <20
        this.scan -= dt;
        if (this.scan <= 0) {
          this.scan = 0.5;
          let n = 0;
          for (const e of this.enemies.list) if (e.active && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 250 * 250) n++;
          const want = this.crowd ? n >= 20 : n >= 30;
          if (want !== this.crowd) {
            this.crowd = want;
            if (this.dmgT <= 0) this.setBuff('damage', want ? 0.1 : 0);
          }
        }
        break;
      case 'bb_w5_10': // Thượng Cổ Tàn Bi: mỗi 35 giây tạo vùng sát thương 3 giây gần nhân vật
        if ((this.cd.timer -= dt) <= 0) {
          this.cd.timer = 35;
          const a = Math.random() * 6.28;
          this.zones.push({ x: p.x + Math.cos(a) * 90, y: p.y + Math.sin(a) * 90, t: 3, tick: 0, r: 110, dmg: this.baseDmg() * 1.2 });
        }
        break;
      case 'bb_w6_10': // Đạo Tổ Ấn: mỗi 30 giây +12% sát thương 6 giây (không chồng)
        if ((this.cd.timer -= dt) <= 0) {
          this.cd.timer = 30;
          this.dmgT = 6;
          this.setBuff('damage', 0.12);
          this.fx.ring(p.x, p.y, 90, 0xffd060, 0.5);
        }
        break;
    }
    // Lên cấp (theo dõi sự thay đổi của run.level)
    if (this.run.level > this.maxLevelSeen) {
      this.maxLevelSeen = this.run.level;
      this.onLevel(this.run.level);
    }
  }

  private onLevel(level: number): void {
    // Dưỡng Nguyên Ngọc: lần đầu đạt cấp 5 trong màn, hồi 20% máu
    if (this.id === 'bb_w1_10' && !this.lvl5 && level >= 5) {
      this.lvl5 = true;
      this.heal(0.2);
    }
  }

  /** Quái bị hạ (tinh anh hoặc boss được tính "kết liễu") */
  onKill(e: Enemy): void {
    const big = e.isBoss || e.behavior === 'elite';
    if (!big) return;
    if (this.id === 'bb_w2_10' && !(this.cd.heal > 0)) {
      this.cd.heal = 30;
      this.heal(0.08);
    }
    if (this.id === 'bb_w4_10') {
      this.atkT = 8;
      this.setBuff('atk', 0.1); // không chồng: chỉ làm mới thời gian
    }
  }

  /** Nhân vật vừa nhận sát thương thật sự */
  onHit(): void {
    const p = this.player;
    if (this.id === 'bb_w4_5' && !(this.cd.armor > 0)) {
      this.cd.armor = 25;
      this.armT = 3;
      this.setBuff('armor', 20);
    }
    if (this.id === 'bb_w6_5' && !(this.cd.shield > 0) && p.hp < p.stats.maxHp * 0.3) {
      this.cd.shield = 60;
      p.shield = p.stats.maxHp * 0.15;
      p.shieldT = 5;
      this.fx.ring(p.x, p.y, 70, 0x80c0ff, 0.5);
    }
  }
}
