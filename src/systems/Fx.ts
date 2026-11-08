import Phaser from 'phaser';

type FxType = 'ring' | 'burst' | 'arc' | 'line' | 'warn' | 'warnLine';

interface FxItem {
  type: FxType;
  x: number;
  y: number;
  x2: number;
  y2: number;
  r: number;
  ang: number;
  arc: number;
  w: number;
  color: number;
  life: number;
  max: number;
}

/**
 * Hiệu ứng hình ảnh (vòng sóng, vệt chém, tia, vùng cảnh báo...) vẽ bằng MỘT đối tượng Graphics duy nhất,
 * vẽ lại mỗi khung hình. Cách này không tạo / hủy đối tượng liên tục nên rất nhẹ.
 */
export class Fx {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly items: FxItem[] = [];
  private readonly MAX = 160;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(9);
  }

  /** Gọi đầu mỗi khung hình: xóa nét vẽ cũ. Sau đó các hàm vẽ tức thời (frame*) mới có tác dụng. */
  begin(): void {
    this.gfx.clear();
  }

  // --- Hiệu ứng có thời lượng ---
  private add(it: Partial<FxItem> & { type: FxType; x: number; y: number; color: number; life: number }): void {
    if (this.items.length >= this.MAX) this.items.shift();
    this.items.push({ x2: 0, y2: 0, r: 0, ang: 0, arc: 0, w: 3, max: it.life, ...it });
  }
  ring(x: number, y: number, r: number, color: number, life = 0.3): void {
    this.add({ type: 'ring', x, y, r, color, life, w: 3 });
  }
  burst(x: number, y: number, r: number, color: number, life = 0.25): void {
    this.add({ type: 'burst', x, y, r, color, life });
  }
  arc(x: number, y: number, r: number, ang: number, arcRad: number, color: number, life = 0.18): void {
    this.add({ type: 'arc', x, y, r, ang, arc: arcRad, color, life });
  }
  line(x: number, y: number, x2: number, y2: number, w: number, color: number, life = 0.18): void {
    this.add({ type: 'line', x, y, x2, y2, w, color, life });
  }
  /** Vòng cảnh báo đỏ (sắp có đòn đánh xuống vị trí này) */
  warn(x: number, y: number, r: number, life: number, color = 0xff4040): void {
    this.add({ type: 'warn', x, y, r, color, life });
  }
  /** Dải cảnh báo thẳng (boss lao tới) */
  warnLine(x: number, y: number, x2: number, y2: number, w: number, life: number): void {
    this.add({ type: 'warnLine', x, y, x2, y2, w, color: 0xff4040, life });
  }

  // --- Vẽ tức thời (chỉ tồn tại đúng khung hình này, dùng cho kỹ năng luôn bật) ---
  frameCircle(x: number, y: number, r: number, color: number, fillAlpha: number, lineAlpha = 0.6): void {
    if (fillAlpha > 0) {
      this.gfx.fillStyle(color, fillAlpha);
      this.gfx.fillCircle(x, y, r);
    }
    if (lineAlpha > 0) {
      this.gfx.lineStyle(2, color, lineAlpha);
      this.gfx.strokeCircle(x, y, r);
    }
  }

  /** Vẽ và cập nhật các hiệu ứng có thời lượng */
  draw(dt: number): void {
    const g = this.gfx;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const p = 1 - f.life / f.max; // 0 → 1
      switch (f.type) {
        case 'ring':
          g.lineStyle(f.w, f.color, 1 - p);
          g.strokeCircle(f.x, f.y, f.r * (0.4 + 0.6 * p));
          break;
        case 'burst':
          g.fillStyle(f.color, 0.55 * (1 - p));
          g.fillCircle(f.x, f.y, f.r * (0.6 + 0.4 * p));
          break;
        case 'arc':
          g.fillStyle(f.color, 0.5 * (1 - p));
          g.slice(f.x, f.y, f.r, f.ang - f.arc / 2, f.ang + f.arc / 2, false);
          g.fillPath();
          break;
        case 'line':
          g.lineStyle(f.w * (1 - p * 0.5), f.color, 0.8 * (1 - p));
          g.lineBetween(f.x, f.y, f.x2, f.y2);
          break;
        case 'warn':
          g.lineStyle(2, f.color, 0.8);
          g.strokeCircle(f.x, f.y, f.r);
          g.fillStyle(f.color, 0.15 + 0.25 * p);
          g.fillCircle(f.x, f.y, f.r * p);
          break;
        case 'warnLine':
          g.lineStyle(f.w, f.color, 0.15 + 0.35 * p);
          g.lineBetween(f.x, f.y, f.x2, f.y2);
          break;
      }
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
