import Phaser from 'phaser';
import { TEX } from '../config/assets';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from './EnemyManager';
import type { Fx } from './Fx';

/** Một viên đạn (của người chơi hoặc của quái). Dùng pool, không tạo mới liên tục. */
export class Proj {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  r = 8;
  dmg = 1;
  pierce = 0;
  life = 3;
  homing = false;
  slow = 0;
  color = 0xffffff;
  /** boomerang: đã bay ra tối đa chưa / quãng đường đã bay / quãng đường tối đa */
  boomerang = false;
  returning = false;
  traveled = 0;
  maxDist = 0;
  speed = 0;
  /** Hiệu ứng: vệt bay theo (màu, độ dày; 0 = không) và tia tóe khi trúng */
  trail = 0;
  trailW = 0;
  spark = false;
  /** Đánh lặp: sau bao nhiêu giây được đánh lại cùng quái (0 = không); bộ đếm */
  rehit = 0;
  rehitT = 0;
  /** Lốc xoáy: chậm dần về phía quái gần nhất, không quay đầu như boomerang */
  drift = false;
  slowTime = 2;
  /** Những quái đã bị trúng (để xuyên mà không đánh trùng) */
  readonly hit: Enemy[] = [];
  constructor(readonly img: Phaser.GameObjects.Image) {
    img.setVisible(false).setActive(false);
  }
}

/**
 * Quản lý đạn của người chơi (kiếm khí, kim bạc, phi quạt) và đạn của quái / boss.
 */
export class Projectiles {
  private readonly mine: Proj[] = [];
  private readonly theirs: Proj[] = [];
  private readonly tmp: Enemy[] = [];
  /** Lớp hiệu ứng (vệt bay, tia tóe) — GameScene gán sau khi tạo */
  fx: Fx | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: EnemyManager,
  ) {}

  private take(pool: Proj[], tex: string, max: number): Proj | null {
    let p = pool.find((q) => !q.active);
    if (!p) {
      if (pool.length >= max) return null;
      p = new Proj(this.scene.add.image(0, 0, tex).setDepth(8));
      pool.push(p);
    }
    p.active = true;
    p.hit.length = 0;
    p.img.setVisible(true).setActive(true);
    return p;
  }

  /** Bắn đạn của người chơi. */
  fireMine(o: {
    x: number;
    y: number;
    angle: number;
    speed: number;
    r: number;
    dmg: number;
    pierce: number;
    color: number;
    homing?: boolean;
    slow?: number;
    boomerang?: boolean;
    maxDist?: number;
    life?: number;
    /** hình đạn riêng (vẽ sẵn màu, không nhuộm); mặc định TEX.PROJ nhuộm theo color */
    tex?: string;
    texScale?: number;
    trail?: number;
    trailW?: number;
    spark?: boolean;
    rehit?: number;
    drift?: boolean;
    slowTime?: number;
  }): void {
    const p = this.take(this.mine, TEX.PROJ, 220);
    if (!p) return;
    p.x = o.x;
    p.y = o.y;
    p.vx = Math.cos(o.angle) * o.speed;
    p.vy = Math.sin(o.angle) * o.speed;
    p.speed = o.speed;
    p.r = o.r;
    p.dmg = o.dmg;
    p.pierce = o.pierce;
    p.color = o.color;
    p.homing = !!o.homing;
    p.slow = o.slow ?? 0;
    p.boomerang = !!o.boomerang;
    p.returning = false;
    p.traveled = 0;
    p.maxDist = o.maxDist ?? 0;
    p.life = o.life ?? 3;
    p.trail = o.trail ?? 0;
    p.trailW = o.trailW ?? 0;
    p.spark = !!o.spark;
    p.rehit = o.rehit ?? 0;
    p.rehitT = p.rehit;
    p.drift = !!o.drift;
    p.slowTime = o.slowTime ?? 2;
    if (o.tex) p.img.setTexture(o.tex).clearTint().setScale(o.texScale ?? 1).setRotation(o.angle).setPosition(p.x, p.y);
    else p.img.setTexture(TEX.PROJ).setTint(o.color).setScale(Math.max(0.6, o.r / 9)).setRotation(o.angle).setPosition(p.x, p.y);
  }

  /** Bắn đạn của quái / boss. */
  fireEnemy(x: number, y: number, angle: number, speed: number, dmg: number, color: number, r = 8): void {
    const p = this.take(this.theirs, TEX.BULLET, 400);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.r = r;
    p.dmg = dmg;
    p.life = 7;
    p.img.setTexture(TEX.BULLET).setTint(color).setScale(r / 8).setRotation(0).setPosition(x, y);
  }

  update(dt: number): void {
    const pl = this.player;
    // --- Đạn của người chơi ---
    for (const p of this.mine) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.kill(p);
        continue;
      }
      if (p.homing) this.steer(p, dt);
      if (p.rehit > 0 && (p.rehitT -= dt) <= 0) {
        p.rehitT = p.rehit;
        p.hit.length = 0;
      }
      if (p.drift) {
        this.steer(p, dt, 1.4);
        p.img.rotation += dt * 14;
      }
      if (p.boomerang) {
        if (!p.returning && p.traveled >= p.maxDist) {
          p.returning = true;
          p.hit.length = 0; // lượt về đánh lại được
        }
        if (p.returning) {
          const a = Math.atan2(pl.y - p.y, pl.x - p.x);
          p.vx = Math.cos(a) * p.speed * 1.15;
          p.vy = Math.sin(a) * p.speed * 1.15;
          if (Math.hypot(pl.x - p.x, pl.y - p.y) < 24) {
            this.kill(p);
            continue;
          }
        }
        p.img.rotation += dt * 18;
      }
      const sx = p.vx * dt;
      const sy = p.vy * dt;
      if (p.trail && this.fx) this.fx.trail(p.x, p.y, p.x + sx, p.y + sy, p.trailW, p.trail);
      p.x += sx;
      p.y += sy;
      p.traveled += Math.hypot(sx, sy);
      p.img.setPosition(p.x, p.y);
      if (!p.boomerang && !p.drift) p.img.setRotation(Math.atan2(p.vy, p.vx));

      this.enemies.grid.query(p.x, p.y, p.r + 60, this.tmp);
      for (let i = 0; i < this.tmp.length; i++) {
        const e = this.tmp[i];
        if (!e.active || p.hit.includes(e)) continue;
        const rr = p.r + e.r;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        p.hit.push(e);
        this.enemies.hurt(e, p.dmg, p.slow, false, p.slowTime);
        if (p.spark && this.fx) this.fx.spark(e.x, e.y, Math.atan2(p.vy, p.vx), p.trail || p.color);
        if (!p.boomerang && !p.drift) {
          if (p.pierce <= 0) {
            this.kill(p);
            break;
          }
          p.pierce--;
        }
      }
    }
    // --- Đạn của quái ---
    for (const p of this.theirs) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.img.setPosition(p.x, p.y);
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      const rr = p.r + pl.r * 0.7;
      if (dx * dx + dy * dy < rr * rr) {
        pl.takeDamage(p.dmg);
        this.kill(p);
        continue;
      }
      if (p.life <= 0 || dx * dx + dy * dy > 1600 * 1600) this.kill(p);
    }
  }

  /** Đạn tự tìm quái: quay dần về phía quái gần nhất */
  private steer(p: Proj, dt: number, turn = 5): void {
    const t = this.enemies.nearest(p.x, p.y, 520, p.hit);
    if (!t) return;
    const want = Math.atan2(t.y - p.y, t.x - p.x);
    const cur = Math.atan2(p.vy, p.vx);
    const na = Phaser.Math.Angle.RotateTo(cur, want, turn * dt);
    p.vx = Math.cos(na) * p.speed;
    p.vy = Math.sin(na) * p.speed;
  }

  private kill(p: Proj): void {
    p.active = false;
    p.img.setVisible(false).setActive(false);
  }

  clear(): void {
    for (const p of this.mine) this.kill(p);
    for (const p of this.theirs) this.kill(p);
  }

  /** Số đạn của quái đang bay (dùng cho thống kê / kiểm thử) */
  get enemyBulletCount(): number {
    return this.theirs.filter((p) => p.active).length;
  }
}

