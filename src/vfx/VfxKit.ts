// =====================================================================
// BỘ CÔNG CỤ VFX: các khối hiệu ứng nhỏ (quầng sáng, vòng sóng, vệt chém, tia sét, hạt nổ, đạn có vệt...)
// ghép thành hiệu ứng kỹ năng (skillFx.ts). Chỉ lo HÌNH ẢNH — không gây sát thương.
// Hòa trộn cộng (ADD) cho phần phát sáng; tự hủy đối tượng khi hiệu ứng kết thúc.
// =====================================================================
import Phaser from 'phaser';
import { VT } from './textures';

export interface Pt {
  x: number;
  y: number;
}

const ADD = Phaser.BlendModes.ADD;

export class VfxKit {
  /** Độ sâu vẽ mặc định (trên nhân vật 10, quái 5) */
  depth = 20;

  constructor(readonly scene: Phaser.Scene) {}

  /** Ảnh hiệu ứng: mặc định hòa trộn cộng */
  img(tex: string, x: number, y: number, o: { tint?: number; scale?: number; sx?: number; sy?: number; alpha?: number; rot?: number; add?: boolean; depth?: number; origin?: [number, number] } = {}): Phaser.GameObjects.Image {
    const im = this.scene.add.image(x, y, tex).setDepth(o.depth ?? this.depth);
    if (o.add !== false) im.setBlendMode(ADD);
    if (o.tint !== undefined) im.setTint(o.tint);
    if (o.scale !== undefined) im.setScale(o.scale);
    if (o.sx !== undefined || o.sy !== undefined) im.setScale(o.sx ?? im.scaleX, o.sy ?? im.scaleY);
    if (o.alpha !== undefined) im.setAlpha(o.alpha);
    if (o.rot !== undefined) im.setRotation(o.rot);
    if (o.origin) im.setOrigin(o.origin[0], o.origin[1]);
    return im;
  }

  /** Tween rồi tự hủy */
  tw(target: Phaser.GameObjects.GameObject, props: Record<string, unknown>, dur: number, ease = 'Cubic.easeOut', delay = 0): Phaser.Tweens.Tween {
    return this.scene.tweens.add({ targets: target, ...props, duration: dur, ease, delay, onComplete: () => target.destroy() });
  }

  later(ms: number, f: () => void): void {
    this.scene.time.delayedCall(ms, f);
  }

  // ------------------------------------------------------------ khối cơ bản
  /** Quầng sáng bùng lên rồi tắt */
  glow(x: number, y: number, color: number, size: number, dur = 300, o: { alpha?: number; grow?: number; depth?: number } = {}): void {
    const im = this.img(VT.SOFT, x, y, { tint: color, scale: (size / 64) * 0.6, alpha: o.alpha ?? 1, depth: o.depth });
    this.tw(im, { scale: (size / 64) * (o.grow ?? 1.2), alpha: 0 }, dur);
  }

  /** Vòng sóng nở ra. `ky` < 1: vòng nằm trên MẶT ĐẤT (ép dẹt theo góc nhìn) */
  ring(x: number, y: number, color: number, r0: number, r1: number, dur = 400, thick = false, o: { alpha?: number; depth?: number; ease?: string; ky?: number } = {}): void {
    const ky = o.ky ?? 1;
    const im = this.img(thick ? VT.RING_THICK : VT.RING, x, y, { tint: color, scale: r0 / 124, alpha: o.alpha ?? 1, depth: o.depth }).setScale(r0 / 124, (r0 / 124) * ky);
    this.tw(im, { scaleX: r1 / 124, scaleY: (r1 / 124) * ky, alpha: 0 }, dur, o.ease ?? 'Cubic.easeOut');
    // viền sáng trắng bên trong vòng
    const core = this.img(VT.RING, x, y, { tint: 0xffffff, scale: r0 / 124, alpha: (o.alpha ?? 1) * (thick ? 0.9 : 0.6), depth: o.depth }).setScale(r0 / 124, (r0 / 124) * ky);
    this.tw(core, { scaleX: (r1 / 124) * 0.98, scaleY: (r1 / 124) * 0.98 * ky, alpha: 0 }, dur * 0.85, o.ease ?? 'Cubic.easeOut');
  }

  /** Hạt bắn tung (một lần) */
  burst(x: number, y: number, color: number | number[], n: number, o: { speed?: [number, number]; life?: number; scale?: [number, number]; tex?: string; gravity?: number; angle?: [number, number]; add?: boolean; rotate?: boolean; alpha?: [number, number]; depth?: number } = {}): void {
    const em = this.scene.add.particles(x, y, o.tex ?? VT.DOT, {
      speed: { min: o.speed?.[0] ?? 60, max: o.speed?.[1] ?? 220 },
      angle: { min: o.angle?.[0] ?? 0, max: o.angle?.[1] ?? 360 },
      lifespan: o.life ?? 450,
      scale: { start: o.scale?.[0] ?? 0.6, end: o.scale?.[1] ?? 0 },
      alpha: { start: o.alpha?.[0] ?? 1, end: o.alpha?.[1] ?? 0 },
      gravityY: o.gravity ?? 0,
      tint: color,
      rotate: o.rotate ? { min: 0, max: 360 } : 0,
      blendMode: o.add === false ? Phaser.BlendModes.NORMAL : ADD,
      emitting: false,
    }).setDepth(o.depth ?? this.depth);
    em.explode(n, 0, 0);
    this.scene.time.delayedCall((o.life ?? 450) + 100, () => em.destroy());
  }

  /** Vệt chém trăng khuyết: tâm (x,y), hướng ang, bán kính r; quét nhẹ theo chiều chém */
  slash(x: number, y: number, ang: number, r: number, color: number, dur = 260, o: { sweep?: number; width?: number; depth?: number; core?: number } = {}): void {
    const s = r / 124;
    const sw = o.sweep ?? 0.6;
    // 3 lớp: quầng màu rộng, thân màu, lõi trắng mảnh ở mép ngoài
    for (const [c, k, a, wk] of [[color, 1.06, 0.55, 1.5], [color, 1, 1, 1], [o.core ?? 0xffffff, 0.97, 1, 0.55]] as [number, number, number, number][]) {
      const im = this.img(VT.CRESCENT, x, y, { tint: c, sx: s * k, sy: s * k * (o.width ?? 1), rot: ang - sw / 2, alpha: a, depth: o.depth });
      im.setScale(s * k * (1 - (1 - wk) * 0.12), s * k * (o.width ?? 1));
      this.tw(im, { rotation: ang + sw / 2, alpha: 0, scaleX: im.scaleX * 1.1 }, dur * 1.3, 'Quad.easeOut');
    }
    // vệt sáng dọc cung chém
    for (let i = -2; i <= 2; i++) {
      const a = ang + (i / 2) * (sw / 2 + 0.5);
      this.glow(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, color, r * 0.5, dur * 1.2, { alpha: 0.5 });
    }
  }

  /** Vệt sáng thẳng từ A tới B */
  streak(x1: number, y1: number, x2: number, y2: number, color: number, w = 14, dur = 220, o: { depth?: number } = {}): void {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const a = Math.atan2(y2 - y1, x2 - x1);
    const im = this.img(VT.STREAK, x1, y1, { tint: color, origin: [0, 0.5], sx: L / 256, sy: w / 16, rot: a, depth: o.depth });
    this.tw(im, { scaleY: 0, alpha: 0 }, dur, 'Quad.easeIn');
    const core = this.img(VT.STREAK, x1, y1, { tint: 0xffffff, origin: [0, 0.5], sx: L / 256, sy: (w / 16) * 0.35, rot: a, depth: o.depth });
    this.tw(core, { scaleY: 0, alpha: 0 }, dur * 0.8, 'Quad.easeIn');
  }

  /** Đường gãy khúc phân dạng (tia sét) */
  boltPts(x1: number, y1: number, x2: number, y2: number, rough = 0.22, depth = 5): Pt[] {
    let pts: Pt[] = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    for (let d = 0; d < depth; d++) {
      const n: Pt[] = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        const nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
        const o = (Math.random() - 0.5) * 2 * L * rough;
        n.push({ x: (a.x + b.x) / 2 + nx * o, y: (a.y + b.y) / 2 + ny * o }, b);
      }
      pts = n;
    }
    return pts;
  }

  /** Tia sét: 3 lớp (quầng màu dày, màu, lõi trắng), chớp tắt 2 lần */
  lightning(x1: number, y1: number, x2: number, y2: number, color: number, w = 3, dur = 260, o: { rough?: number; branches?: number } = {}): void {
    const g = this.scene.add.graphics().setDepth(this.depth + 1).setBlendMode(ADD);
    const pts = this.boltPts(x1, y1, x2, y2, o.rough ?? 0.22);
    const branches: Pt[][] = [];
    for (let i = 0; i < (o.branches ?? 2); i++) {
      const s = pts[Math.floor(pts.length * (0.25 + Math.random() * 0.5))];
      const a = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.6;
      const L = Math.hypot(x2 - x1, y2 - y1) * (0.2 + Math.random() * 0.25);
      branches.push(this.boltPts(s.x, s.y, s.x + Math.cos(a) * L, s.y + Math.sin(a) * L, 0.3, 3));
    }
    const draw = (k: number) => {
      g.clear();
      for (const [lw, c, al] of [[w * 4, color, 0.25 * k], [w * 1.8, color, 0.8 * k], [w * 0.7, 0xffffff, k]] as [number, number, number][]) {
        g.lineStyle(lw, c, al);
        g.strokePoints(pts);
        for (const b of branches) {
          g.lineStyle(lw * 0.5, c, al * 0.8);
          g.strokePoints(b);
        }
      }
    };
    draw(1);
    this.scene.tweens.addCounter({ from: 1, to: 0, duration: dur, onUpdate: (t) => { const v = t.getValue() ?? 0; draw(v > 0.55 && v < 0.65 ? 0.3 : v); }, onComplete: () => g.destroy() });
  }

  /** Bay một vật từ A tới B (thẳng hoặc vòng cung), có vệt hạt; gọi onArrive khi tới */
  fly(tex: string, from: Pt, to: Pt, o: { dur?: number; tint?: number; scale?: number; trail?: number; trailTex?: string; trailScale?: number; arc?: number; spin?: number; add?: boolean; onArrive?: () => void; ease?: string; faceDir?: boolean; depth?: number }): Phaser.GameObjects.Image {
    const im = this.img(tex, from.x, from.y, { tint: o.tint, scale: o.scale ?? 1, add: o.add ?? true, depth: o.depth });
    let em: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    if (o.trail !== undefined) {
      em = this.scene.add.particles(0, 0, o.trailTex ?? VT.DOT, {
        follow: im, lifespan: 260, speed: 10, scale: { start: o.trailScale ?? 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: o.trail, blendMode: ADD, frequency: 12,
      }).setDepth((o.depth ?? this.depth) - 1);
    }
    const dur = o.dur ?? 300;
    const arc = o.arc ?? 0;
    const mx = (from.x + to.x) / 2 - (to.y - from.y) * arc, my = (from.y + to.y) / 2 + (to.x - from.x) * arc;
    let px = from.x, py = from.y;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: o.ease ?? 'Linear',
      onUpdate: (t) => {
        const k = t.getValue() ?? 0, u = 1 - k;
        const x = u * u * from.x + 2 * u * k * mx + k * k * to.x, y = u * u * from.y + 2 * u * k * my + k * k * to.y;
        if (o.faceDir !== false) im.setRotation(Math.atan2(y - py, x - px) + (o.spin ? 0 : 0));
        if (o.spin) im.rotation += o.spin;
        px = x;
        py = y;
        im.setPosition(x, y);
      },
      onComplete: () => {
        o.onArrive?.();
        im.destroy();
        if (em) { em.stop(); this.scene.time.delayedCall(300, () => em?.destroy()); }
      },
    });
    return im;
  }

  /** Rung màn hình */
  shake(ms = 140, k = 0.004): void {
    this.scene.cameras.main.shake(ms, k);
  }

  /** Chớp màu toàn màn hình */
  flash(color: number, ms = 160, alpha = 0.5): void {
    const cam = this.scene.cameras.main;
    const r = this.scene.add.rectangle(cam.worldView.centerX, cam.worldView.centerY, cam.width * 2, cam.height * 2, color, alpha).setDepth(90).setBlendMode(ADD);
    this.tw(r, { alpha: 0 }, ms);
  }

  /** Bụi / đá văng (rơi theo trọng lực) */
  debris(x: number, y: number, n = 10, color = 0xb89a7a): void {
    this.burst(x, y, color, n, { tex: VT.ROCK, speed: [120, 280], angle: [200, 340], gravity: 700, life: 600, scale: [0.9, 0.6], add: false, rotate: true });
    this.burst(x, y, 0x6a5e52, 4, { tex: VT.SMOKE, speed: [15, 50], life: 600, scale: [0.4, 0.9], add: false, alpha: [0.3, 0] });
  }
}
