import Phaser from 'phaser';
import { TEX } from '../config/assets';
import { RUN } from '../config/balance';
import { audio } from './Audio';
import type { Player } from '../entities/Player';
import type { RunState } from './RunState';

export type PickupType = 'xp' | 'coin' | 'heal';

class Pickup {
  active = false;
  type: PickupType = 'xp';
  x = 0;
  y = 0;
  value = 1;
  magnet = false;
  constructor(readonly img: Phaser.GameObjects.Image) {
    img.setVisible(false).setActive(false);
  }
}

/** Hạt XP, linh thạch, bình máu rơi trên đất. Hút về nhân vật khi vào phạm vi. */
export class Pickups {
  private readonly pool: Pickup[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly run: RunState,
  ) {}

  spawn(type: PickupType, x: number, y: number, value: number): void {
    // Quá nhiều vật phẩm trên đất → gộp giá trị vào vật phẩm cùng loại gần nhất để không tụt FPS
    let p = this.pool.find((q) => !q.active);
    if (!p) {
      if (this.pool.length >= RUN.maxPickups) {
        let best: Pickup | null = null;
        let bd = Infinity;
        for (const q of this.pool) {
          if (q.type !== type) continue;
          const d = (q.x - x) ** 2 + (q.y - y) ** 2;
          if (d < bd) {
            bd = d;
            best = q;
          }
        }
        if (best) {
          best.value += value;
          return;
        }
        return;
      }
      p = new Pickup(this.scene.add.image(0, 0, TEX.GEM).setDepth(3));
      this.pool.push(p);
    }
    p.active = true;
    p.type = type;
    p.x = x + (Math.random() - 0.5) * 14;
    p.y = y + (Math.random() - 0.5) * 14;
    p.value = value;
    p.magnet = false;
    const img = p.img.setVisible(true).setActive(true).setPosition(p.x, p.y).clearTint();
    if (type === 'xp') img.setTexture(TEX.GEM);
    else if (type === 'coin') img.setTexture(TEX.COIN);
    else img.setTexture(TEX.HEART);
    this.style(p);
  }

  private style(p: Pickup): void {
    if (p.type !== 'xp') {
      p.img.setScale(1);
      return;
    }
    // Màu / cỡ theo giá trị: xanh lam (nhỏ) → xanh lục → vàng → đỏ (lớn)
    const v = p.value;
    const [c, s] = v < 5 ? [0x60b0ff, 1] : v < 20 ? [0x60e090, 1.2] : v < 80 ? [0xffd050, 1.5] : [0xff6060, 1.9];
    p.img.setTint(c).setScale(s);
  }

  /** Nhặt ngay toàn bộ linh thạch còn trên đất (dùng khi thắng màn để không mất thưởng boss rơi ra) */
  collectCoins(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (p.type === 'coin') this.run.linh += p.value * this.player.stats.linhGain;
      p.active = false;
      p.img.setVisible(false).setActive(false);
    }
  }

  /** Hút toàn bộ vật phẩm về phía nhân vật (dùng khi hạ boss) */
  magnetAll(): void {
    for (const p of this.pool) if (p.active) p.magnet = true;
  }

  update(dt: number): void {
    const pl = this.player;
    const range = pl.stats.pickupRange;
    for (const p of this.pool) {
      if (!p.active) continue;
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (!p.magnet && d2 < range * range) p.magnet = true;
      if (p.magnet) {
        const d = Math.sqrt(d2) || 1;
        const sp = RUN.magnetSpeed * (1 + Math.max(0, 1 - d / 400));
        p.x += (dx / d) * sp * dt;
        p.y += (dy / d) * sp * dt;
        p.img.setPosition(p.x, p.y);
      }
      const pick = pl.r + 8;
      if (d2 < pick * pick) this.collect(p);
    }
  }

  private collect(p: Pickup): void {
    p.active = false;
    p.img.setVisible(false).setActive(false);
    if (p.type === 'xp') this.run.addXp(p.value);
    else if (p.type === 'coin') this.run.linh += p.value * this.player.stats.linhGain;
    else this.player.heal(this.player.stats.maxHp * 0.25);
    audio.play('pickup');
  }

  /** Vật phẩm gần nhất trong bán kính (dùng cho bot kiểm thử) */
  nearest(x: number, y: number, range: number): { x: number; y: number } | null {
    let best: Pickup | null = null;
    let bd = range * range;
    for (const p of this.pool) {
      if (!p.active) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.img.setVisible(false).setActive(false);
    }
  }
}
