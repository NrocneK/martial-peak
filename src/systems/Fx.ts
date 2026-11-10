import Phaser from 'phaser';

type FxType = 'ring' | 'burst' | 'arc' | 'line' | 'warn' | 'warnLine'
  // hiệu ứng đòn đánh vũ khí (vẽ ở lớp CỘNG SÁNG)
  | 'sweep' | 'thrust' | 'shock' | 'spark' | 'trail';

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
  /** Lớp cộng sáng (ADD): màu chồng lên nhau sáng dần → trông như phát quang trên nền tối */
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly items: FxItem[] = [];
  private readonly MAX = 420;

  constructor(private readonly scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(9);
    this.glow = scene.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Gọi đầu mỗi khung hình: xóa nét vẽ cũ. Sau đó các hàm vẽ tức thời (frame*) mới có tác dụng. */
  begin(): void {
    this.gfx.clear();
    this.glow.clear();
  }

  // --- Hiệu ứng đòn đánh vũ khí ---
  /** Đao: nhát chém QUÉT — dải hình quạt hiện dần từ mép này sang mép kia (35% thời gian đầu) rồi mờ */
  sweep(x: number, y: number, r: number, ang: number, arcRad: number, color: number, life = 0.26): void {
    this.add({ type: 'sweep', x, y, r, ang, arc: arcRad, color, life });
  }
  /** Thương: thương khí phóng thẳng tới (x2, y2) — lõi trắng + quầng màu + mũi thương ở đầu, cuối đường nổ sóng nhỏ */
  thrust(x: number, y: number, x2: number, y2: number, w: number, color: number, life = 0.3): void {
    this.add({ type: 'thrust', x, y, x2, y2, w, color, life });
  }
  /** Quyền: sóng chấn hai lớp + tia tỏa quanh, rung màn hình nhẹ */
  shock(x: number, y: number, r: number, color: number, life = 0.4): void {
    this.add({ type: 'shock', x, y, r, color, life, ang: Math.random() * Math.PI });
    this.scene.cameras.main.shake(90, 0.0025);
  }
  /** Tia tóe khi trúng (ang = hướng đòn) */
  spark(x: number, y: number, ang: number, color: number, life = 0.16): void {
    this.add({ type: 'spark', x, y, ang, color, life, r: 10 + Math.random() * 6 });
  }
  /** Vệt bay theo đạn (từ điểm cũ tới điểm mới) */
  trail(x: number, y: number, x2: number, y2: number, w: number, color: number, life = 0.14): void {
    this.add({ type: 'trail', x, y, x2, y2, w, color, life });
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
        default:
          this.drawGlow(f, p);
      }
    }
  }

  /** Các hiệu ứng đòn đánh trên lớp cộng sáng */
  private drawGlow(f: FxItem, p: number): void {
    const g = this.glow;
    const fade = 1 - p;
    switch (f.type) {
      case 'sweep': {
        // dải quạt hiện dần theo góc, bán kính trong 55%; mép ngoài sáng; 3 vệt chém mảnh
        const reveal = Math.min(1, p / 0.35);
        const a0 = f.ang - f.arc / 2, a1 = a0 + f.arc * reveal;
        const alpha = p < 0.35 ? 0.85 : 0.85 * (1 - (p - 0.35) / 0.65);
        const steps = 18;
        g.fillStyle(f.color, alpha * 0.62);
        g.beginPath();
        for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; g.lineTo(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r); }
        for (let i = steps; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / steps; g.lineTo(f.x + Math.cos(a) * f.r * 0.55, f.y + Math.sin(a) * f.r * 0.55); }
        g.closePath();
        g.fillPath();
        g.lineStyle(4, 0xffffff, alpha);
        g.beginPath();
        g.arc(f.x, f.y, f.r * 0.97, a0, a1, false);
        g.strokePath();
        g.lineStyle(2, f.color, alpha * 0.9);
        for (const k of [0.72, 0.84]) { g.beginPath(); g.arc(f.x, f.y, f.r * k, a0 + f.arc * 0.12, a1, false); g.strokePath(); }
        // đầu nhát chém: chớp sáng
        if (p < 0.4) { const a = a1; g.fillStyle(0xffffff, 0.9 * fade); g.fillCircle(f.x + Math.cos(a) * f.r * 0.92, f.y + Math.sin(a) * f.r * 0.92, 5); }
        break;
      }
      case 'thrust': {
        const reach = Math.min(1, p / 0.3);                                    // mũi lao tới hết đường trong 30% đầu
        const tx = f.x + (f.x2 - f.x) * reach, ty = f.y + (f.y2 - f.y) * reach;
        const ang = Math.atan2(f.y2 - f.y, f.x2 - f.x), cs = Math.cos(ang), sn = Math.sin(ang);
        // luồng khí THUÔN: gốc mảnh → phình dần về phía mũi
        const w0 = f.w * 0.12, w1 = f.w * 0.55 * (1 + p * 0.4);
        g.fillStyle(f.color, 0.42 * fade);
        g.fillPoints([
          { x: f.x - sn * w0, y: f.y + cs * w0 }, { x: tx - sn * w1, y: ty + cs * w1 },
          { x: tx + sn * w1, y: ty - cs * w1 }, { x: f.x + sn * w0, y: f.y - cs * w0 },
        ], true);
        g.lineStyle(2.5, 0xffffff, 0.95 * fade);
        g.lineBetween(f.x + cs * 10, f.y + sn * 10, tx, ty);
        // mũi thương sáng ở đầu
        const L = f.w * 0.9, W2 = f.w * 0.42;
        g.fillStyle(0xffffff, 0.95 * fade);
        g.fillTriangle(tx + cs * L, ty + sn * L, tx - sn * W2, ty + cs * W2, tx + sn * W2, ty - cs * W2);
        // chạm hết đường: sóng nhỏ
        if (reach >= 1) { g.lineStyle(3, f.color, fade); g.strokeCircle(f.x2, f.y2, 8 + 34 * (p - 0.3)); }
        // vệt tốc độ hai bên
        g.lineStyle(1, 0xffffff, 0.5 * fade);
        for (const s of [-1, 1]) { const o = w1 * 1.4 * s; g.lineBetween(tx - cs * 40 - sn * o, ty - sn * 40 + cs * o, tx - cs * 120 - sn * o * 0.6, ty - sn * 120 + cs * o * 0.6); }
        break;
      }
      case 'shock': {
        const e = 1 - (1 - p) ** 2;                                           // nở nhanh rồi chậm
        g.fillStyle(0xffffff, 0.5 * (1 - p) ** 2);
        g.fillCircle(f.x, f.y, f.r * 0.35 * (1 - p * 0.5));
        g.lineStyle(6 * fade + 1, f.color, 0.9 * fade);
        g.strokeCircle(f.x, f.y, f.r * e);
        g.lineStyle(2, 0xffffff, 0.8 * fade);
        g.strokeCircle(f.x, f.y, f.r * e * 0.72);
        g.lineStyle(2, f.color, 0.8 * fade);
        for (let i = 0; i < 12; i++) {
          const a = f.ang + (i * Math.PI * 2) / 12;
          const r0 = f.r * (0.25 + 0.6 * e), r1 = r0 + f.r * 0.22;
          g.lineBetween(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
        }
        break;
      }
      case 'spark': {
        g.lineStyle(2, 0xffffff, fade);
        for (let i = -2; i <= 2; i++) {
          const a = f.ang + i * 0.45, r0 = f.r * p * 0.6, r1 = f.r * (0.4 + p);
          g.lineBetween(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
        }
        g.fillStyle(f.color, 0.8 * fade);
        g.fillCircle(f.x, f.y, 4 * fade + 1);
        break;
      }
      case 'trail':
        g.lineStyle(f.w * fade, f.color, 0.55 * fade);
        g.lineBetween(f.x, f.y, f.x2, f.y2);
        break;
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  destroy(): void {
    this.gfx.destroy();
    this.glow.destroy();
  }
}
