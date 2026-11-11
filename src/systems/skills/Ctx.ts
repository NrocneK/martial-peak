import Phaser from 'phaser';
import { ATK_BASE } from '../../config/skills';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { EnemyManager } from '../EnemyManager';
import type { Projectiles } from '../Projectiles';
import type { Fx } from '../Fx';
import type { RunState, OwnedSkill } from '../RunState';
import type { Pickups } from '../Pickups';
import { audio } from '../Audio';

export interface HitOpts {
  /** undefined = tung bạo kích theo tỉ lệ; true = luôn bạo kích; false = không */
  crit?: boolean;
  /** 0..1 (1 = choáng / đóng băng đứng yên) */
  slow?: number;
  /** thời gian khống chế gốc (giây) — tự nhân "thời gian hiệu ứng" của nhân vật */
  slowTime?: number;
  noText?: boolean;
}

/**
 * Bộ công cụ dùng chung cho mọi kỹ năng: tính sát thương theo % lực đánh, hồi chiêu, phạm vi,
 * tìm mục tiêu (gần nhất, máu cao nhất, cụm đông nhất), gây sát thương vùng / đường thẳng / hình quạt.
 */
export class Ctx {
  /** Buff phạm vi tạm thời (Thông Thiên Pháp Tướng +20%) — đặt lại mỗi khung */
  areaBuff = 1;
  /** Hệ số hồi chiêu toàn cục (Hỗn Nguyên Đại Đạo Lô: 0.5 trong 10 giây) */
  cdMul = 1;
  private readonly tmp: Enemy[] = [];

  constructor(
    readonly scene: Phaser.Scene,
    readonly player: Player,
    readonly enemies: EnemyManager,
    readonly proj: Projectiles,
    readonly fx: Fx,
    readonly run: RunState,
    readonly pickups: Pickups,
  ) {}

  get st(): Player['stats'] {
    return this.player.stats;
  }

  /** Sát thương gốc của pct (1 = 100%) lực đánh */
  atk(pct: number): number {
    return ATK_BASE * this.st.damage * this.player.buffDmg * pct;
  }

  /** Thời gian hiệu ứng (đốt, chậm, băng, choáng) sau khi nhân chỉ số */
  ctrl(t: number): number {
    return t * this.st.ctrlTime;
  }

  /** Phạm vi (pixel) sau khi nhân chỉ số phạm vi */
  area(px: number): number {
    return px * this.st.area * this.areaBuff;
  }

  /** Hồi chiêu kỹ năng vũ khí: chia tốc đánh, trừ giảm hồi chiêu */
  cdW(sec: number): number {
    return Math.max(0.12, (sec / this.st.attackSpeed) * (1 - this.st.cdr) * this.cdMul);
  }

  /** Hồi chiêu kỹ năng cảnh giới: trừ giảm hồi chiêu */
  cdR(sec: number): number {
    return Math.max(0.3, sec * (1 - this.st.cdr) * this.cdMul);
  }

  /** Gây pct% lực đánh lên một quái. Trả về sát thương thực. */
  hit(e: Enemy, pct: number, src: string, o: HitOpts = {}): number {
    return this.enemies.strike(e, this.atk(pct), { crit: o.crit, slow: o.slow, slowTime: this.ctrl(o.slowTime ?? 2), noText: o.noText, src });
  }

  /** Gây sát thương cố định (đã tính sẵn, ví dụ % máu tối đa) */
  hitRaw(e: Enemy, dmg: number, src: string, o: HitOpts = {}): number {
    return this.enemies.strike(e, dmg, { crit: o.crit, slow: o.slow, slowTime: this.ctrl(o.slowTime ?? 2), noText: o.noText, src });
  }

  /** Choáng (quái thường đứng yên; boss chỉ bị chậm 30%) */
  stun(e: Enemy, t: number): void {
    this.enemies.applySlow(e, e.isBoss ? 0.6 : 1, this.ctrl(t));     // BossAI chỉ nhận nửa → 30%
  }

  /** Quái trong vòng tròn (bản sao mảng: an toàn khi quái chết giữa vòng lặp) */
  inRadius(x: number, y: number, r: number): Enemy[] {
    return this.enemies.inRadius(x, y, r, this.tmp).slice();
  }

  /** Gây sát thương vùng; trả về danh sách quái trúng */
  aoe(x: number, y: number, r: number, pct: number, src: string, o: HitOpts = {}, each?: (e: Enemy) => void): Enemy[] {
    const list = this.inRadius(x, y, r);
    for (const e of list) {
      this.hit(e, pct, src, o);
      each?.(e);
    }
    return list;
  }

  /** Quái nằm trong hình quạt (tâm x,y, bán kính r, hướng ang, nửa góc half) */
  inCone(x: number, y: number, r: number, ang: number, half: number): Enemy[] {
    return this.inRadius(x, y, r).filter((e) => Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - y, e.x - x) - ang)) <= half + Math.atan2(e.r, Math.max(1, Math.hypot(e.x - x, e.y - y))));
  }

  /** Quái nằm trên đoạn thẳng rộng w. Trả kèm t (0..1: vị trí dọc đoạn) */
  inLine(x1: number, y1: number, x2: number, y2: number, w: number): { e: Enemy; t: number }[] {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, half = Math.hypot(x2 - x1, y2 - y1) / 2;
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    const out: { e: Enemy; t: number }[] = [];
    for (const e of this.inRadius(cx, cy, half + 20)) {
      const t = Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / L2));
      const px = x1 + dx * t, py = y1 + dy * t, rr = w / 2 + e.r;
      if ((e.x - px) ** 2 + (e.y - py) ** 2 <= rr * rr) out.push({ e, t });
    }
    return out;
  }

  nearest(r: number, x = this.player.x, y = this.player.y, exclude?: Enemy[]): Enemy | null {
    return this.enemies.nearest(x, y, r, exclude);
  }

  /** n quái gần nhất trong bán kính */
  nearestN(n: number, r: number): Enemy[] {
    const p = this.player;
    return this.enemies.list
      .filter((e) => e.active && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r * r)
      .sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2))
      .slice(0, n);
  }

  /** n quái nhiều máu nhất trong bán kính (r <= 0: toàn màn hình) */
  highestHp(n: number, r: number): Enemy[] {
    const p = this.player;
    return this.enemies.list
      .filter((e) => e.active && (r <= 0 || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r * r))
      .sort((a, b) => b.hp - a.hp)
      .slice(0, n);
  }

  /** Tâm cụm quái đông nhất trong tầm (xét tối đa 40 quái gần) */
  densest(range = 480, r = 90): { x: number; y: number } | null {
    const cands = this.nearestN(40, range);
    if (!cands.length) return null;
    let best = cands[0], bn = -1;
    for (const c of cands) {
      let n = 0;
      for (const o of cands) if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < r * r) n++;
      if (n > bn) {
        bn = n;
        best = c;
      }
    }
    return { x: best.x, y: best.y };
  }

  /** Đẩy quái ra xa điểm (x, y) */
  knock(e: Enemy, x: number, y: number, power: number): void {
    if (e.isBoss || power <= 0) return;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * power;
    e.ky += (dy / d) * power;
  }

  /** Hút quái về điểm (x, y) với tốc độ sp (pixel/giây) */
  pull(e: Enemy, x: number, y: number, sp: number, dt: number): void {
    if (e.isBoss) return;
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
    if (d < 6) return;
    const k = Math.min(d, sp * dt);
    e.x += (dx / d) * k;
    e.y += (dy / d) * k;
  }

  /** Góc từ người chơi tới quái gần nhất (hoặc hướng đang nhìn) */
  aimAngle(r = 650): number {
    const t = this.nearest(r);
    return t ? Math.atan2(t.y - this.player.y, t.x - this.player.x) : this.player.heading;
  }

  sound(k: Parameters<typeof audio.play>[0]): void {
    audio.play(k);
  }
}

/** Lớp cơ sở cho một kỹ năng đang sở hữu trong màn */
export abstract class Skill {
  /** Bộ đếm hồi chiêu (giây) */
  cd = 0;

  constructor(
    protected readonly c: Ctx,
    protected readonly own: OwnedSkill,
  ) {}

  /** Cấp hiện tại 1..5 */
  get lv(): number {
    return this.own.level;
  }

  get aw(): boolean {
    return this.own.awakened;
  }

  get id(): string {
    return this.own.id;
  }

  /** Giá trị theo cấp từ bảng 5 phần tử */
  L<T>(arr: T[]): T {
    return arr[Math.min(arr.length, this.lv) - 1];
  }

  abstract update(dt: number): void;
  /** Quái bị hạ (bất kể nguồn); kiểm tra e.lastSrc để biết có phải do mình */
  onKill(_e: Enemy): void {}
  /** Nhặt một viên kinh nghiệm */
  onXp(): void {}
  /** Nhận đòn chí tử: trả về true nếu cứu được */
  onLethal(): boolean {
    return false;
  }
  /** Dọn hình ảnh khi kết thúc màn */
  clear(): void {}
}
