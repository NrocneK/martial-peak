// =====================================================================
// HIỆU ỨNG HÌNH ẢNH 23 KỸ NĂNG (bản thường + bản thức tỉnh).
// Mỗi hàm nhận "sân khấu" (vị trí nhân vật, danh sách mục tiêu, hàm báo trúng đòn) và diễn một lượt thi triển.
// Dùng cho trang demo vfx-lab.html; khi đưa vào game, các kỹ năng gọi lại đúng các khối hiệu ứng này.
// =====================================================================
import Phaser from 'phaser';
import { VT } from './textures';
import { VfxKit, type Pt } from './VfxKit';

export interface Stage {
  kit: VfxKit;
  hero: Phaser.GameObjects.Sprite;
  /** Mục tiêu sắp theo khoảng cách tới nhân vật */
  targets(): Pt[];
  /** Báo trúng đòn (trang demo cho hình nhân chớp + rung) */
  hit(t: Pt, color?: number): void;
  /** Kéo mục tiêu tới vị trí (x, y) — dùng cho lốc xoáy kéo quái (trang demo: hình nhân bị kéo rồi tự trôi về chỗ cũ) */
  drag?(t: Pt, x: number, y: number): void;
  /** Đổi tư thế thi triển (0 = đứng gốc; 1, 2 = khung tư thế của kỹ năng) quay về hướng góc `a` */
  pose?(skill: string, n: 0 | 1 | 2, a: number): void;
}

type Fx = (s: Stage, aw: boolean) => void;

const ang = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const near = (s: Stage, c: Pt, r: number) => s.targets().filter((t) => dist(t, c) < r);
const pt = (x: number, y: number): Pt => ({ x, y });
const polar = (c: Pt, a: number, r: number): Pt => ({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
const H = (s: Stage): Pt => ({ x: s.hero.x, y: s.hero.y - 6 });

// ---------------------------------------------------------------- VŨ KHÍ
/** Ảnh kiếm khí ánh sáng (public/vfx/qi_sword_light.png, vẽ bằng tools/art/qi_sword_light.py) — nạp ở preload */
export const QI_SWORD = 'vx_qisword';
const QS = 0.24;            // cỡ kiếm khí trong trận
const QA = 0.62;            // độ đậm kiếm khí (mờ bớt để không che quái / hiệu ứng khác)

/** Một thanh kiếm khí: hiện ra (ngưng tụ), có bóng kiếm + vệt sáng lavender bám theo */
function qiSword(k: Stage['kit'], x: number, y: number, rot: number, delayIn = 0): { im: Phaser.GameObjects.Image; trail: Phaser.GameObjects.Particles.ParticleEmitter } {
  const im = k.img(QI_SWORD, x, y, { scale: QS * 0.55, alpha: 0, rot, depth: 22 });
  k.scene.tweens.add({ targets: im, scale: QS, alpha: QA, duration: 140, delay: delayIn, ease: 'Back.easeOut' });
  // ngưng tụ: hạt sáng hút vào thân kiếm
  k.later(delayIn, () => {
    k.glow(x, y, 0xc8c4ff, 50, 240, { alpha: 0.6 });
    k.burst(x, y, [0xffffff, 0xd8d4ff], 10, { speed: [-160, -60], life: 220, scale: [0.5, 0] });
  });
  const trail = k.scene.add.particles(0, 0, VT.SOFT, {
    follow: im, lifespan: 360, speed: 6, scale: { start: 0.14, end: 0 }, alpha: { start: 0.35, end: 0 },
    tint: [0xc8c4ff, 0xffffff], blendMode: Phaser.BlendModes.ADD, frequency: 14, emitting: false,
  }).setDepth(21);
  return { im, trail };
}

/** Bay kiếm khí theo đường cong bậc 2 từ A tới B */
function flyQi(k: Stage['kit'], q: ReturnType<typeof qiSword>, from: Pt, to: Pt, dur: number, arc: number, onDone: () => void, ease = 'Sine.easeIn'): void {
  const mx = (from.x + to.x) / 2 - (to.y - from.y) * arc, my = (from.y + to.y) / 2 + (to.x - from.x) * arc;
  let px = from.x, py = from.y;
  let lastGhost = 0;
  q.trail.start();
  k.scene.tweens.addCounter({
    from: 0, to: 1, duration: dur, ease,
    onUpdate: (t) => {
      const v = t.getValue() ?? 0, u = 1 - v;
      const x = u * u * from.x + 2 * u * v * mx + v * v * to.x, y = u * u * from.y + 2 * u * v * my + v * v * to.y;
      if (Math.hypot(x - px, y - py) > 0.5) q.im.setRotation(Math.atan2(y - py, x - px));
      px = x;
      py = y;
      q.im.setPosition(x, y);
      // bóng kiếm (dư ảnh) đúng góc, mờ dần
      const now = k.scene.time.now;
      if (now - lastGhost > 30) {
        lastGhost = now;
        const g = k.img(QI_SWORD, x, y, { scale: QS, rot: q.im.rotation, alpha: 0.16, depth: 21 });
        k.tw(g, { alpha: 0 }, 170, 'Linear');
      }
    },
    onComplete: onDone,
  });
}

function endQi(k: Stage['kit'], q: ReturnType<typeof qiSword>): void {
  q.trail.stop();
  k.glow(q.im.x, q.im.y, 0xd8d4ff, 40, 240, { alpha: 0.6 });
  k.burst(q.im.x, q.im.y, [0xffffff, 0xc8c4ff], 12, { tex: VT.DOT, speed: [30, 120], life: 420, scale: [0.5, 0] });
  k.tw(q.im, { alpha: 0, scale: QS * 1.15 }, 160);
  k.later(450, () => q.trail.destroy());
}

function qiHit(s: Stage, t: Pt, a: number): void {
  const k = s.kit;
  s.hit(t, 0xd8d4ff);
  k.glow(t.x, t.y, 0xffffff, 44, 180, { alpha: 0.7 });
  k.ring(t.x, t.y, 0xc8c4ff, 6, 34, 240, false, { alpha: 0.6 });
  k.burst(t.x, t.y, [0xffffff, 0xc8c4ff], 7, { tex: VT.SPARK, speed: [100, 240], life: 240, scale: [0.25, 0], alpha: [0.8, 0], angle: [(a * 180) / Math.PI - 35, (a * 180) / Math.PI + 35] });
}

const nguKiem: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const t0 = s.targets()[0];
  const fa = t0 ? ang(h, t0) : 0;
  // tư thế: kết kiếm ấn trước miệng (ngưng kiếm) → duỗi tay chỉ ra trước (phóng kiếm) → về dáng đứng
  s.pose?.('ngu_kiem', 1, fa);
  k.later(aw ? 600 : 140, () => s.pose?.('ngu_kiem', 2, fa));
  k.later(aw ? 1500 : 900, () => s.pose?.('ngu_kiem', 0, fa));
  if (!aw) {
    // bản thường: kiếm ngưng tụ cạnh tay → lao vào mục tiêu, xuyên qua → vòng về tay rồi tan
    s.targets().slice(0, 3).forEach((t, i) =>
      k.later(i * 130, () => {
        const a = ang(h, t);
        const start = polar(h, a, 26);
        const q = qiSword(k, start.x, start.y, a);
        k.later(150, () => {
          const end = polar(h, a, dist(h, t) + 80);
          flyQi(k, q, start, end, 260, 0, () => {
            const back = H(s);
            flyQi(k, q, end, back, 380, 0.35, () => endQi(k, q), 'Sine.easeInOut');
          }, 'Quad.easeIn');
          k.later(260 * Math.min(1, dist(start, t) / dist(start, end)), () => qiHit(s, t, a));
        });
      }),
    );
    return;
  }
  // bản thức tỉnh: 6 kiếm xòe nan quạt sau lưng, khói khí, lơ lửng → lần lượt lao đi đuổi mục tiêu kế tiếp
  const ts = s.targets();
  const smoke = k.scene.add.particles(h.x, h.y - 10, VT.SMOKE, {
    lifespan: 1200, speed: { min: 10, max: 40 }, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.3, end: 0 }, tint: [0xc8c4ff, 0xe8e6ff],
    blendMode: Phaser.BlendModes.ADD, frequency: 40, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 60) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
  }).setDepth(9);
  k.later(900, () => smoke.stop());
  k.later(2200, () => smoke.destroy());
  for (let i = 0; i < 6; i++) {
    const fa = -Math.PI / 2 + (i - 2.5) * 0.42;                 // xòe phía trên / sau lưng
    const p = polar(h, fa, 78);
    const q = qiSword(k, p.x, p.y, fa, i * 50);
    k.scene.tweens.add({ targets: q.im, y: p.y - 6, duration: 300, yoyo: true, delay: 300, ease: 'Sine.easeInOut' });
    k.later(650 + i * 90, () => {
      const t1 = ts[i % ts.length];
      if (!t1) return endQi(k, q);
      const a1 = ang(p, t1);
      flyQi(k, q, pt(q.im.x, q.im.y), t1, 220, 0.12, () => {
        qiHit(s, t1, a1);
        // tự đuổi sang mục tiêu kế tiếp chưa bị đánh gần đó
        const t2 = s.targets().filter((o) => o !== t1).sort((x, y) => dist(x, t1) - dist(y, t1))[i % 3] ?? t1;
        flyQi(k, q, t1, t2, 240, (i % 2 ? 1 : -1) * 0.35, () => { qiHit(s, t2, ang(t1, t2)); endQi(k, q); }, 'Sine.easeInOut');
      });
    });
  }
};

/** vết chém vòng đao khí Bá Đao (ảnh gốc, 8 hướng — tools/art/ba_dao_hd.py): khóa ảnh theo hướng */
export const BA_DAO_DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export const baDaoKey = (d: string): string => `vx_badao_${d}`;
/** đao khí bay (thức tỉnh) — lưỡi liềm đổi màu từ mẫu, dựng sẵn 8 hướng đúng phối cảnh mặt đất
 *  (tools/art/ba_dao_wave.py); tâm ảnh = chỗ nhân vật đứng → đặt ảnh tại nhân vật rồi cho trượt thẳng theo hướng bay */
export const baDaoWaveKey = (d: string): string => `vx_badao_wave_${d}`;
/** độ đục tối đa của vòng đao khí + đao khí bay (làm mờ bớt để không che quái / nhân vật) */
const BA_DAO_ALPHA = 0.72;
const baDaoDir = (a: number): string => BA_DAO_DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];

/** hiện vết chém vòng theo hướng `aa`, vòng rộng ~2r quanh nhân vật: bung nhanh → giữ → loãng dần */
function baDaoRing(k: Stage['kit'], h: Pt, aa: number, r: number, dur = 380): void {
  const key = baDaoKey(baDaoDir(aa));
  if (!k.scene.textures.exists(key)) return;
  const im = k.scene.add.image(h.x, h.y + 4, key).setDepth(9).setAlpha(0);
  // ảnh cắt khung cố định quanh tâm vòng: bề ngang vòng ≈ 69% bề ngang ảnh (phần còn lại là chỗ cho quầng sáng)
  const w = (r * 2.2) / (im.width * 0.69);
  im.setScale(w * 0.72);
  k.scene.tweens.add({ targets: im, scale: w, alpha: BA_DAO_ALPHA, duration: 90, ease: 'Quad.easeOut' });
  k.scene.tweens.add({ targets: im, scale: w * 1.08, alpha: 0, delay: 90 + dur * 0.35, duration: dur * 0.65, ease: 'Quad.easeIn', onComplete: () => im.destroy() });
}

const baDao: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const t = s.targets()[0] ?? pt(h.x + 100, h.y);
  const a = ang(h, t);
  const cut = (aa: number, r: number) => {
    baDaoRing(k, h, aa, r);
    k.burst(h.x + Math.cos(aa) * r * 0.8, h.y + Math.sin(aa) * r * 0.55, [0xf08aff, 0xb040ff, 0xffffff], 14, { speed: [60, 260], life: 420, scale: [0.5, 0] });
    for (const o of s.targets()) if (dist(h, o) < r + 10 && Math.abs(Phaser.Math.Angle.Wrap(ang(h, o) - aa)) < 1.2) s.hit(o, 0xe080ff);
  };
  if (aw) {
    // Tu La Bá Đao: xoay một vòng 8 hướng thật nhanh (chém 360°) rồi phóng đao khí thẳng phía trước
    for (let i = 0; i < 8; i++) k.later(i * 35, () => cut(a + (i * Math.PI) / 4, 120));
    k.later(120, () => {
      const end = polar(h, a, 300);
      // lưỡi liềm đao khí (ảnh đúng hướng, không xoay) bung ra trước mặt rồi trượt thẳng 300px theo hướng bay
      const w = k.scene.add.image(h.x, h.y, baDaoWaveKey(baDaoDir(a))).setDepth(9).setAlpha(0);
      const sc = 0.8;
      w.setScale(sc * 0.75);
      k.scene.tweens.add({ targets: w, alpha: BA_DAO_ALPHA, scale: sc, duration: 90, ease: 'Quad.easeOut' });
      k.scene.tweens.add({ targets: w, x: end.x, y: end.y, duration: 480, ease: 'Sine.easeIn' });
      k.scene.tweens.add({ targets: w, alpha: 0, delay: 320, duration: 160, onComplete: () => w.destroy() });
      for (const o of s.targets()) if (Math.abs(Phaser.Math.Angle.Wrap(ang(h, o) - a)) < 0.25) k.later((dist(h, o) / 300) * 420, () => s.hit(o, 0xf0a0ff));
    });
    k.shake(160, 0.005);
  } else {
    cut(a, 105);
    k.later(220, () => cut(a + Math.PI, 105));
  }
};

/** Phá Trận Thương — ảnh hiệu ứng đòn đâm (tools/art/spear_fx.py, dựng theo đòn đâm đầu trong video mẫu) */
export const SPEAR_TEX = { lance: 'vx_spear_lance', flash: 'vx_spear_flash', wind: 'vx_spear_wind', ring: 'vx_spear_ring' } as const;
const SPEAR_COL = 0x3cf0c8;

/** 1 đòn đâm theo góc `a`, dài `L`: tụ lực (2 vệt gió hút về mũi) → bung khối thoi → mũi giáo năng lượng vụt ra
 *  + vòng sóng ở gốc → thuôn mảnh rồi tắt. Trả về thời điểm (ms) mũi giáo chạm tới để tính trúng đòn. */
function spearThrust(k: Stage['kit'], h: Pt, a: number, L: number): number {
  const sc = k.scene;
  const add = (key: string, x: number, y: number) => sc.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setRotation(a);
  const tip0 = polar(h, a, 22);
  const nx = -Math.sin(a), ny = Math.cos(a);
  // 1) tụ lực: 2 vệt gió cong từ sau lưng hai bên hút dồn về mũi thương
  for (const side of [-1, 1]) {
    const st = polar(h, a, -26);
    const wnd = add(SPEAR_TEX.wind, st.x + nx * side * 30, st.y + ny * side * 30).setAlpha(0).setScale(0.9, side * 0.9);
    sc.tweens.add({ targets: wnd, x: tip0.x + nx * side * 6, y: tip0.y + ny * side * 6, alpha: { from: 0, to: 1 }, duration: 160, ease: 'Quad.easeIn', onComplete: () => wnd.destroy() });
  }
  k.glow(tip0.x, tip0.y, SPEAR_COL, 30, 220);
  // 2) bung khối thoi ở mũi thương
  k.later(160, () => {
    const f = add(SPEAR_TEX.flash, tip0.x, tip0.y).setScale(0.35);
    sc.tweens.add({ targets: f, scale: 0.85, duration: 70, ease: 'Quad.easeOut' });
    sc.tweens.add({ targets: f, alpha: 0, delay: 70, duration: 120, onComplete: () => f.destroy() });
  });
  // 3) mũi giáo năng lượng vụt ra + vòng sóng ở gốc
  k.later(190, () => {
    const st = polar(h, a, 6);
    const ln = add(SPEAR_TEX.lance, st.x, st.y).setOrigin(0.02, 0.5);
    const full = (L * 1.05) / ln.width;
    ln.setScale(0.12, 1);
    sc.tweens.add({ targets: ln, scaleX: full, duration: 90, ease: 'Expo.easeOut' });
    // 4) thuôn mảnh rồi tắt
    sc.tweens.add({ targets: ln, scaleY: 0.35, delay: 110, duration: 200, ease: 'Quad.easeIn' });
    sc.tweens.add({ targets: ln, alpha: 0, delay: 200, duration: 160, onComplete: () => ln.destroy() });
    const rp = polar(h, a, 16);
    const rg = add(SPEAR_TEX.ring, rp.x, rp.y).setScale(0.12, 0.3).setAlpha(0.9);
    sc.tweens.add({ targets: rg, scaleX: 0.2, scaleY: 0.62, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => rg.destroy() });
    const e = polar(h, a, L);
    k.later(80, () => {
      k.burst(e.x, e.y, [SPEAR_COL, 0xb0ffe8, 0xffffff], 10, { tex: VT.SPARK, angle: [((a * 180) / Math.PI) - 35, ((a * 180) / Math.PI) + 35], speed: [80, 260], scale: [0.35, 0], life: 320 });
    });
  });
  return 230;
}

/** quầng sáng xoáy: một ĐOẠN XOẮN ỐC liền mạch (2 sợi sáng quấn quanh trục đâm, như mũi khoan) vừa quay vừa
 *  tiến từ nhân vật tới mũi thương rồi nổ. Sợi ở nửa phía trước (gần người xem) dày + sáng, nửa phía sau mờ + mảnh. */
function spearVortex(s: Stage, h: Pt, a: number, L: number): void {
  const k = s.kit, sc = k.scene;
  const dur = 620;            // ms đi hết trục
  const R = 25;               // bán kính xoắn
  const SEG = 92;             // chiều dài đoạn xoắn
  const PITCH = 52;           // mỗi vòng xoắn dài 52px theo trục
  const SPIN = 5.5;           // vòng quay / giây
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const g = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(10);
  const core = sc.add.image(h.x, h.y, VT.SOFT).setBlendMode(Phaser.BlendModes.ADD).setTint(0xc8fff0).setDepth(10).setScale(0.7, 0.45).setRotation(a);
  let el = 0;
  const pt3 = (cx: number, cy: number, s0: number, th: number) => ({
    x: cx + ux * s0 + nx * Math.cos(th) * R,
    y: cy + uy * s0 + ny * Math.cos(th) * R - Math.sin(th) * R * 0.55,
    front: Math.sin(th),
  });
  const step = (_t: number, dms: number) => {
    el += dms * sc.time.timeScale;
    const u = Math.min(1, el / dur);
    const e = u < 0.15 ? u / 0.15 * 0.15 * 0.6 : 0.09 + (u - 0.15) / 0.85 * 0.91;   // bung chậm ở đầu rồi tiến đều
    const c = polar(h, a, 10 + (L - 10) * e);
    const grow = Math.min(1, el / 120);                                    // lớn dần lúc vừa bung
    const spin = (el / 1000) * SPIN * Math.PI * 2;
    g.clear();
    core.setPosition(c.x, c.y).setAlpha(0.75);
    for (const pass of [0, 1]) {                                           // vẽ nửa sau trước, nửa trước sau
      for (let i = 0; i < 2; i++) {
        let prev: { x: number; y: number; front: number } | null = null;
        for (let j = 0; j <= 28; j++) {
          const s0 = (j / 28 - 0.5) * SEG * grow;
          const th = spin + i * Math.PI + (s0 / PITCH) * Math.PI * 2;
          const q = pt3(c.x, c.y, s0, th);
          if (prev && (q.front > 0) === (pass === 1)) {
            const tail = 1 - Math.abs(j / 28 - 0.5) * 1.6;                 // hai đầu đoạn xoắn mờ dần
            const lw = pass ? 5 : 2.5;
            g.lineStyle(lw + 5, SPEAR_COL, 0.18 * tail).lineBetween(prev.x, prev.y, q.x, q.y);     // quầng
            g.lineStyle(lw, pass ? 0xd8fff4 : SPEAR_COL, (pass ? 0.95 : 0.5) * tail).lineBetween(prev.x, prev.y, q.x, q.y);
          }
          prev = q;
        }
      }
    }
    if (u >= 1) {
      sc.events.off('update', step);
      g.destroy();
      core.destroy();
      // nổ ở mũi thương
      const tip = polar(h, a, L);
      const f = sc.add.image(tip.x, tip.y, SPEAR_TEX.flash).setBlendMode(Phaser.BlendModes.ADD).setDepth(11).setRotation(a).setScale(0.6);
      sc.tweens.add({ targets: f, scale: 1.6, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => f.destroy() });
      const rg = sc.add.image(tip.x, tip.y, SPEAR_TEX.ring).setBlendMode(Phaser.BlendModes.ADD).setDepth(10).setScale(0.3, 0.21);
      sc.tweens.add({ targets: rg, scaleX: 1.3, scaleY: 0.9, alpha: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => rg.destroy() });
      k.glow(tip.x, tip.y, SPEAR_COL, 90, 300);
      k.burst(tip.x, tip.y, [SPEAR_COL, 0xb0ffe8, 0xffffff], 26, { tex: VT.SPARK, speed: [120, 380], scale: [0.45, 0], life: 420 });
      k.shake(120, 0.004);
      for (const o of s.targets()) if (dist(o, tip) < 60) s.hit(o, 0xb0ffe8);
    }
  };
  sc.events.on('update', step);
}

const phaThuong: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const t = s.targets()[0] ?? pt(h.x + 100, h.y);
  const a = ang(h, t);
  const thrust = (i: number) =>
    k.later(i * 240, () => {
      const L = aw ? 260 : 190;
      const hitAt = spearThrust(k, h, a, L);
      k.later(hitAt, () => {
        for (const o of s.targets()) {
          const d = dist(h, o), da = Math.abs(Phaser.Math.Angle.Wrap(ang(h, o) - a));
          if (d < L + 10 && Math.cos(da) > 0 && Math.sin(da) * d < 22) s.hit(o, SPEAR_COL);   // chỉ phía trước mũi thương
        }
      });
    });
  if (aw) {
    // Du Long Phá Trận: đâm 1 đòn dài; lúc mũi giáo vừa vụt ra (trước khi tan) từ chỗ nhân vật bung một quầng sáng
    // XOÁY nhanh quanh trục đâm, tiến về trước tới mũi thương thì NỔ thêm 1 lần (không còn vệt sáng dưới đất)
    const L = 260;
    thrust(0);
    k.later(240, () => spearVortex(s, h, a, L));
    // lướt theo mũi thương 120px (miễn sát thương khi lướt) — giữ như thiết kế, chỉ bỏ vệt sáng dưới đất
    const hero = s.hero;
    const sx = hero.x, sy = hero.y;
    k.later(190, () => {
      for (let i = 0; i < 4; i++) k.later(i * 30, () => { const g = k.img(hero.texture.key, hero.x, hero.y, { add: true, tint: SPEAR_COL, alpha: 0.6, depth: 9 }); g.setFrame(hero.frame.name); k.tw(g, { alpha: 0 }, 300); });
      k.scene.tweens.add({ targets: hero, x: sx + Math.cos(a) * 120, y: sy + Math.sin(a) * 120, duration: 150, yoyo: true, hold: 500, ease: 'Quad.easeOut' });
    });
  } else {
    thrust(0);
    thrust(1);
    thrust(2);
  }
};

/** Băng Sơn Quyền — ảnh hiệu ứng (tools/art/fist_fx.py, dựng theo 2 ảnh mẫu); đối xứng quanh tâm nên dùng mọi hướng */
export const FIST_TEX = { disc: 'vx_fist_disc', dust: 'vx_fist_dust', crack: 'vx_fist_crack', pillar: 'vx_fist_pillar', mask: 'vx_fist_mask' } as const;
const FIST_COL = 0xffb040;
const DISC_R = 512 / 2 / 1.08;     // bán kính đĩa trong ảnh (px)
const CRACK_R = 560 / 2 / 1.08;

/** cho hiệu ứng mặt đất LAN TỪ NHÂN VẬT RA: phủ mặt nạ mép mềm, phóng to dần từ tâm (không có đường tròn cứng) */
function spreadOut(k: Stage['kit'], im: Phaser.GameObjects.Image, grow: number): void {
  const sc = k.scene;
  if (!sc.textures.exists(FIST_TEX.mask) || sc.game.renderer.type !== Phaser.WEBGL) return;
  const m = sc.make.image({ x: im.x, y: im.y, key: FIST_TEX.mask, add: false });
  const full = (im.displayWidth / m.width) * 1.3;
  m.setScale(full * 0.04);
  im.setMask(m.createBitmapMask());
  sc.tweens.add({ targets: m, scale: full, duration: grow, ease: 'Sine.easeOut' });
  im.once('destroy', () => m.destroy());
}

/** chấn động ra xung quanh (mẫu 1): đĩa sáng có vân nứt bung ra trên mặt đất + bụi xòe + tia sáng dựng ở tâm */
function fistShock(s: Stage, c: Pt, R: number): void {
  const k = s.kit, sc = k.scene;
  const add = (key: string, x: number, y: number) => sc.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD);
  const d = add(FIST_TEX.disc, c.x, c.y).setDepth(3).setScale(R / DISC_R);
  spreadOut(k, d, 260);                                                   // sóng chấn động lan từ chân nhân vật ra
  sc.tweens.add({ targets: d, alpha: 0, delay: 300, duration: 260, onComplete: () => d.destroy() });
  const du = add(FIST_TEX.dust, c.x, c.y).setOrigin(0.5, 1).setDepth(11).setScale(0.35 * (R / 110), 0.15 * (R / 110)).setAlpha(0.9);
  sc.tweens.add({ targets: du, scaleX: 0.7 * (R / 110), scaleY: 0.62 * (R / 110), alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => du.destroy() });
  const pl = add(FIST_TEX.pillar, c.x, c.y + 4).setOrigin(0.5, 1).setDepth(12).setScale(0.35, 0.05);
  sc.tweens.add({ targets: pl, scaleY: 0.55, duration: 80, ease: 'Quad.easeOut' });
  sc.tweens.add({ targets: pl, alpha: 0, scaleX: 0.15, delay: 90, duration: 240, onComplete: () => pl.destroy() });
  k.glow(c.x, c.y, FIST_COL, 70, 260);
  k.burst(c.x, c.y - 6, [0xffd070, 0xff9a30], 14, { tex: VT.SPARK, speed: [60, 220], angle: [200, 340], scale: [0.4, 0], life: 420 });
  k.debris(c.x, c.y, 8, 0x6a4a2a);
  k.shake(140, 0.006);
  for (const o of near(s, c, R)) s.hit(o, FIST_COL);
}

/** đợt địa chấn nứt vỡ (mẫu 2, thức tỉnh): mạng vết nứt phát sáng loang rộng + cột sáng lửa bốc lên + đá vỡ bay */
function fistQuake(s: Stage, c: Pt, R: number): void {
  const k = s.kit, sc = k.scene;
  const cr = sc.add.image(c.x, c.y, FIST_TEX.crack).setBlendMode(Phaser.BlendModes.ADD).setDepth(2).setScale(R / CRACK_R);
  spreadOut(k, cr, 420);                                                  // vết nứt lan dần từ chân nhân vật ra
  sc.tweens.add({ targets: cr, alpha: { from: 1, to: 0.55 }, duration: 160, delay: 280, yoyo: true, repeat: 1 });
  sc.tweens.add({ targets: cr, alpha: 0, delay: 900, duration: 500, onComplete: () => cr.destroy() });
  const pl = sc.add.image(c.x, c.y + 6, FIST_TEX.pillar).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 1).setDepth(12).setScale(0.9, 0.1);
  sc.tweens.add({ targets: pl, scaleY: 1.1, duration: 160, ease: 'Quad.easeOut' });
  sc.tweens.add({ targets: pl, alpha: 0, scaleX: 0.5, delay: 300, duration: 500, onComplete: () => pl.destroy() });
  k.glow(c.x, c.y, FIST_COL, 140, 500);
  for (let i = 0; i < 3; i++) k.later(i * 90, () => k.debris(c.x + (Math.random() - 0.5) * R, c.y + (Math.random() - 0.5) * R * 0.5, 7, 0x4a3420));
  k.burst(c.x, c.y - 10, [0xffe090, 0xffa040, 0xffffff], 30, { tex: VT.SPARK, speed: [80, 300], angle: [200, 340], scale: [0.5, 0], life: 700 });
  k.shake(260, 0.01);
  for (const o of near(s, c, R)) s.hit(o, 0xffe090);
}

const bangQuyen: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const t = s.targets()[0] ?? pt(h.x + 60, h.y);
  const a = ang(h, t);
  // 3 cú đấm nhanh (đốm sáng + tia văng) rồi đòn thứ 3 chấn động
  for (let i = 0; i < 3; i++)
    k.later(i * 120, () => {
      const p = polar(h, a + (i - 1) * 0.25, 40);
      k.glow(p.x, p.y, FIST_COL, 60, 180);
      k.ring(p.x, p.y, 0xffe0a0, 6, 34, 200, true);
      k.burst(p.x, p.y, [0xffe0a0, FIST_COL], 8, { tex: VT.SPARK, scale: [0.35, 0], speed: [80, 220], life: 220, angle: [(a * 180) / Math.PI - 40, (a * 180) / Math.PI + 40] });
      s.hit(t, FIST_COL);
    });
  const foot = pt(h.x, h.y + 14);
  k.later(360, () => fistShock(s, foot, 110));
  if (aw) k.later(480, () => fistQuake(s, foot, 200));
};

/** Truy Tinh Tiễn — mũi tên năng lượng đỏ (đầu: tools/art/arrow_fx.py theo ảnh mẫu; đuôi vẽ theo đường bay thật) */
export const ARROW_HEAD = 'vx_arrow_head';
const ARROW_COL = 0xff4058;

/** bắn 1 mũi tên năng lượng bay theo đường CONG (bezier, lệch sang bên `bend`) từ `from` tới `to`.
 *  Đuôi là dải sáng vẽ lại mỗi khung theo chính quãng đường vừa bay → uốn cong theo đường bay; 2 sợi khí đỏ sẫm
 *  xoắn quanh đuôi. `big` = tinh tiễn (to + sáng hơn). */
function arrowBolt(k: Stage['kit'], from: Pt, to: Pt, bend: number, big: boolean, onArrive: () => void): void {
  const sc = k.scene;
  const D = dist(from, to);
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  const nx = -(to.y - from.y) / (D || 1), ny = (to.x - from.x) / (D || 1);
  const cx = mx + nx * bend * D, cy = my + ny * bend * D;
  const dur = (D / 760) * 1000;
  const sz = big ? 1.25 : 0.9;
  const head = sc.add.image(from.x, from.y, ARROW_HEAD).setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setScale(0.5 * sz).setOrigin(0.62, 0.5);
  const glow = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(11);
  const smoke = sc.add.graphics().setDepth(10);
  const hist: Pt[] = [];
  const N = big ? 26 : 20;
  let el = 0, done = false, fade = 1;
  const at = (u: number): Pt => ({ x: (1 - u) ** 2 * from.x + 2 * (1 - u) * u * cx + u * u * to.x, y: (1 - u) ** 2 * from.y + 2 * (1 - u) * u * cy + u * u * to.y });
  const step = (_t: number, dms: number) => {
    el += dms * sc.time.timeScale;
    const u = Math.min(1, el / dur);
    if (!done) {
      const p = at(u), q = at(Math.min(1, u + 0.02));
      head.setPosition(p.x, p.y).setRotation(Math.atan2(q.y - p.y, q.x - p.x) || head.rotation);
      hist.push(p);
      if (hist.length > N) hist.shift();
      if (u >= 1) {
        done = true;
        head.destroy();
        onArrive();
      }
    } else {
      fade -= dms * sc.time.timeScale / 160;                             // đuôi rút ngắn + tắt sau khi trúng
      if (hist.length > 1) hist.shift();
      if (fade <= 0) { sc.events.off('update', step); glow.destroy(); smoke.destroy(); return; }
    }
    glow.clear();
    smoke.clear();
    const n = hist.length;
    for (let i = 1; i < n; i++) {
      const f = i / (N - 1);                                            // 0 ở đuôi → 1 sát đầu
      const p0 = hist[i - 1], p1 = hist[i];
      const w = (big ? 9 : 6) * f ** 1.3;
      glow.lineStyle(w + 7, ARROW_COL, 0.16 * f * fade).lineBetween(p0.x, p0.y, p1.x, p1.y);
      glow.lineStyle(w, f > 0.75 ? 0xff9aa6 : ARROW_COL, 0.75 * f * fade).lineBetween(p0.x, p0.y, p1.x, p1.y);
      // 2 sợi khí đỏ sẫm xoắn quanh đuôi (biên độ lớn dần về phía đuôi)
      const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
      const ox = -dy / L, oy = dx / L;
      for (const sgn of [1, -1]) {
        const ph0 = (i - 1) * 0.55 + el * 0.02 * sgn, ph1 = i * 0.55 + el * 0.02 * sgn;
        const amp0 = 7 * (1 - (i - 1) / (N - 1)) * sz, amp1 = 7 * (1 - f) * sz;
        smoke.lineStyle(1.6, 0x7a0c1c, 0.75 * fade * Math.min(1, f * 3))
          .lineBetween(p0.x + ox * Math.sin(ph0) * amp0 * sgn, p0.y + oy * Math.sin(ph0) * amp0 * sgn, p1.x + ox * Math.sin(ph1) * amp1 * sgn, p1.y + oy * Math.sin(ph1) * amp1 * sgn);
      }
    }
  };
  sc.events.on('update', step);
}

const truyTien: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const ts = s.targets();
  const t = ts[ts.length - 1] ?? pt(h.x + 300, h.y);
  let side = 1;
  const shoot = (to: Pt, star: boolean, delay: number) =>
    k.later(delay, () => {
      side = -side;
      arrowBolt(k, h, to, side * (0.12 + Math.random() * 0.12), star, () => {
        s.hit(to, ARROW_COL);
        if (star) {
          k.glow(to.x, to.y, ARROW_COL, 90, 300);
          k.ring(to.x, to.y, 0xff8090, 10, 70, 300);
          k.burst(to.x, to.y, [ARROW_COL, 0xffc0c8, 0xffffff], 16, { tex: VT.SPARK, scale: [0.4, 0], speed: [100, 260] });
          for (const o of near(s, to, 70)) s.hit(o, ARROW_COL);
        } else k.burst(to.x, to.y, [ARROW_COL, 0xffb0b8], 7, { tex: VT.SPARK, speed: [60, 180], scale: [0.3, 0], life: 240 });
      });
    });
  if (aw) {
    const a = ang(h, t);
    for (let i = 0; i < 5; i++) shoot(polar(h, a + (i - 2) * 0.18, dist(h, t)), true, i * 30);
    k.later(500, () => {
      const c = ts[Math.floor(ts.length / 2)] ?? t;
      k.ring(c.x, c.y, ARROW_COL, 90, 70, 500, false, { alpha: 0.6 });
      k.later(500, () => {
        k.streak(c.x - 160, c.y - 320, c.x, c.y, ARROW_COL, 40, 260);
        k.glow(c.x, c.y, 0xff3048, 220, 500);
        k.ring(c.x, c.y, 0xff8090, 20, 140, 500, true);
        k.burst(c.x, c.y, [ARROW_COL, 0xffffff, 0xff9040], 30, { tex: VT.SPARK, speed: [120, 380], scale: [0.5, 0] });
        k.shake(220, 0.008);
        for (const o of near(s, c, 120)) s.hit(o, ARROW_COL);
      });
    });
  } else {
    shoot(t, false, 0);
    shoot(ts[1] ?? t, false, 100);
    shoot(ts[2] ?? t, true, 200);
  }
};

/** Thanh Phong Phiến — LỐC XOÁY (theo ảnh mẫu): nhiều vòng xoắn sáng trắng xanh chồng lên nhau, dưới hẹp trên loe,
 *  xoay liên tục; vòng phía trước sáng, phía sau mờ; bụi đá cuốn quanh chân. Lốc tự đi tìm quái, HÚT quái nhỏ trong
 *  vòng hút vào rồi KÉO đi theo, gây sát thương mỗi nhịp. */
const WIND_COL = 0x9fdcff;
function tornado(s: Stage, start: Pt, size: number, life: number): void {
  const k = s.kit, sc = k.scene;
  const pos = { x: start.x, y: start.y };
  const g = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(14);
  const base = sc.add.image(start.x, start.y, VT.SOFT).setBlendMode(Phaser.BlendModes.ADD).setTint(WIND_COL).setDepth(2).setScale(0.9 * size, 0.35 * size).setAlpha(0.5);
  const dust = sc.add.particles(0, 0, VT.ROCK, {
    lifespan: 650, speed: 0, scale: { start: 0.45 * size, end: 0.2 * size }, alpha: { start: 0.8, end: 0 }, tint: [0xc8d4e0, 0x8a96a6], frequency: 45, rotate: { min: 0, max: 360 },
    emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { const th = Math.random() * 6.28, r = (14 + Math.random() * 26) * size; p.x = pos.x + Math.cos(th) * r; p.y = pos.y + Math.sin(th) * r * 0.4 - Math.random() * 30 * size; p.velocityX = -Math.sin(th) * 120 * size; p.velocityY = -30 - Math.random() * 40; },
  }).setDepth(13);
  const caught = new Set<Pt>();
  let el = 0, tick = 0, wander = Math.random() * 6.28;
  const H0 = 96 * size, RB = 6 * size, RT = 36 * size, RINGS = 12;
  const step = (_t: number, dms: number) => {
    const dt = (dms * sc.time.timeScale) / 1000;
    el += dt * 1000;
    const appear = Math.min(1, el / 220), vanish = Math.min(1, Math.max(0, (life - el) / 300));
    const vis = appear * vanish;
    // di chuyển: hướng về quái gần nhất chưa bị cuốn (hoặc lang thang), tốc độ chậm
    const tgt = s.targets().filter((o) => !caught.has(o)).sort((p1, p2) => dist(p1, pos) - dist(p2, pos))[0];
    wander += dt * 1.3;
    const aim = tgt && dist(tgt, pos) < 260 ? ang(pos, tgt) + Math.sin(wander) * 0.4 : wander;
    pos.x += Math.cos(aim) * 70 * dt;
    pos.y += Math.sin(aim) * 70 * dt;
    base.setPosition(pos.x, pos.y + 2).setAlpha(0.45 * vis);
    // hút + kéo quái nhỏ: trong 60px bị hút dần vào sát chân lốc rồi đi theo
    for (const o of s.targets()) {
      const d = dist(o, pos);
      if (d < 60 * size || caught.has(o)) {
        caught.add(o);
        const a0 = ang(pos, o) + dt * 3;                                   // xoay quanh chân lốc
        const r0 = Math.max(10 * size, d - 90 * dt);
        s.drag?.(o, pos.x + Math.cos(a0) * r0, pos.y + Math.sin(a0) * r0 * 0.5);
      }
    }
    if ((tick -= dt) <= 0) {
      tick = 0.35;
      for (const o of caught) s.hit(o, WIND_COL);
    }
    // vẽ phễu: các vòng xoắn (cung elip) từ chân lên đỉnh, mỗi vòng xoay lệch pha, độ dài cung + độ nghiêng + bán kính
    // khác nhau một chút (như mẫu, không đều tăm tắp như lò xo); quầng sáng rộng + lõi trắng
    g.clear();
    const spin = el / 1000 * 9;
    for (let i = 0; i < RINGS; i++) {
      const f = (i + 0.35 * Math.sin(i * 2.3)) / (RINGS - 1);
      const rr = (RB + (RT - RB) * Math.max(0, f) ** 1.35) * (0.9 + 0.2 * Math.sin(i * 1.7 + el / 400));
      const cy = pos.y - H0 * Math.max(0, f) * appear;
      const cx = pos.x + Math.sin(el / 260 + f * 3) * 6 * size * f;     // thân lốc uốn lượn nhẹ
      const tilt = 0.18 * Math.sin(i * 1.3 + el / 500);                  // vòng hơi nghiêng
      const ph = spin * (1.2 - f * 0.5) + i * 0.9;
      const span = Math.PI * (1.25 + 0.55 * (0.5 + 0.5 * Math.sin(i * 2.9)));
      const segs = 22;
      for (let j = 0; j < segs; j++) {
        const t0 = ph + (j / segs) * span, t1 = ph + ((j + 1) / segs) * span;
        const front = Math.sin((t0 + t1) / 2);                              // > 0: nửa phía trước
        const head = j / segs;                                              // đầu vệt sáng hơn đuôi
        const al = (0.2 + 0.8 * head) * (front > 0 ? 1 : 0.35) * vis;
        const x0 = cx + Math.cos(t0) * rr, y0 = cy + Math.sin(t0) * rr * 0.32 + Math.cos(t0) * rr * tilt;
        const x1 = cx + Math.cos(t1) * rr, y1 = cy + Math.sin(t1) * rr * 0.32 + Math.cos(t1) * rr * tilt;
        g.lineStyle((front > 0 ? 10 : 6) * size, WIND_COL, 0.12 * al).lineBetween(x0, y0, x1, y1);
        g.lineStyle((front > 0 ? 5 : 3) * size, WIND_COL, 0.3 * al).lineBetween(x0, y0, x1, y1);
        g.lineStyle((front > 0 ? 2 : 1.1) * size, front > 0 ? 0xffffff : 0xcfeaff, 0.95 * al).lineBetween(x0, y0, x1, y1);
      }
    }
    if (el >= life) {
      sc.events.off('update', step);
      g.destroy();
      base.destroy();
      dust.stop();
      k.later(700, () => dust.destroy());
    }
  };
  sc.events.on('update', step);
}

const thanhPhien: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const t = s.targets()[0] ?? pt(h.x + 100, h.y);
  const a = ang(h, t);
  // phất quạt gọi gió: vài lá + luồng gió nhỏ trước mặt, rồi lốc xoáy bốc lên
  k.burst(h.x, h.y, 0xd8f0ff, 8, { tex: VT.LEAF, speed: [80, 200], life: 600, add: false, rotate: true, scale: [0.8, 0.4], angle: [(a * 180) / Math.PI - 50, (a * 180) / Math.PI + 50] });
  if (aw) for (let i = 0; i < 3; i++) tornado(s, polar(h, a + (i - 1) * 0.9, 70), 1.25, 3200);
  else tornado(s, polar(h, a, 50), 1, 2600);
};

// ---------------------------------------------------------------- CẢNH GIỚI
/** Hổ Khiếu Chấn — hư ảnh đầu hổ (tools/art/tiger_fx.py, tách từ ảnh mẫu) hiện trên đầu nhân vật gầm lên,
 *  rồi sóng âm xung kích lan quanh thân: sát thương + đẩy lùi. Thức tỉnh: phạm vi lớn hơn + choáng. */
export const TIGER_HEAD = 'vx_tiger_head';
/** dải khung sóng xung kích (256×159 mỗi khung, 17 khung, 30 khung/giây) */
export const SHOCK_T3 = 'vx_shock_t3';
export const SHOCK_T6 = 'vx_shock_t6';
const SHOCK_RING = 0.44;      // bán kính vòng sóng to nhất / bề ngang khung
const TIGER_COL = 0xf4ecdc;
const hoKhieu: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene, h = H(s);
  const R = aw ? 190 : 125;
  // 1) hư ảnh đầu hổ hiện trên đầu nhân vật: bung lên, rung khi gầm, rồi tan
  const top = pt(h.x, h.y - 105);                                  // cao hẳn trên đầu, không che nhân vật
  const tg = sc.add.image(top.x, top.y + 12, TIGER_HEAD).setBlendMode(Phaser.BlendModes.ADD).setDepth(15).setAlpha(0).setScale(0.12);
  const S0 = aw ? 0.36 : 0.3;
  sc.tweens.add({ targets: tg, alpha: 0.85, scale: S0, y: top.y, duration: 220, ease: 'Back.easeOut' });
  k.later(240, () => {
    sc.tweens.add({ targets: tg, scale: S0 * 1.12, duration: 70, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });   // gầm
    sc.tweens.add({ targets: tg, angle: { from: -3, to: 3 }, duration: 45, yoyo: true, repeat: 4 });
  });
  sc.tweens.add({ targets: tg, alpha: 0, scale: S0 * 1.25, delay: 760, duration: 260, onComplete: () => tg.destroy() });
  // 2) sóng âm xung kích — hoạt ảnh lấy từ video mẫu (tools/art/shock_fx.py; đã ép dẹt về góc nhìn chéo):
  //    mẫu số 3 cho đòn thường, mẫu số 6 cho thức tỉnh. Lan từ chân nhân vật, trúng đòn khi vòng sóng bung ra.
  k.later(300, () => {
    const key = aw ? SHOCK_T6 : SHOCK_T3;
    const animKey = key + '_play';
    if (!sc.anims.exists(animKey) && sc.textures.exists(key)) sc.anims.create({ key: animKey, frames: sc.anims.generateFrameNumbers(key, {}), frameRate: 30 });
    if (sc.textures.exists(key)) {
      const sp = sc.add.sprite(h.x, h.y + 10, key, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
      sp.setScale(R / (SHOCK_RING * 256));                               // bán kính vòng sóng to nhất ≈ R
      sp.play(animKey);
      sp.once('animationcomplete', () => sp.destroy());
    }
    k.shake(180, aw ? 0.01 : 0.006);
    k.later(120, () => {
      for (const o of near(s, h, R)) {
        s.hit(o, TIGER_COL);
        const aa = ang(h, o);
        s.drag?.(o, o.x + Math.cos(aa) * 34, o.y + Math.sin(aa) * 34);  // đẩy lùi
        if (aw) {
          const st = sc.add.image(o.x, o.y - 30, VT.SPARK).setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(16).setScale(0.4);
          sc.tweens.add({ targets: st, angle: 360, duration: 600, repeat: 1, onComplete: () => st.destroy() });
        }
      }
    });
  });
};

/** Linh Khí Đạn (lột xác) — LINH CHÂU HỘ THỂ: các quả cầu linh khí xoáy (tools/art/spirit_orb.py) lơ lửng xoay quanh
 *  người; lần lượt phóng vào quái gần nhất, nổ xoáy khi trúng rồi bay về chỗ. Thức tỉnh: vòng cầu lớn liên tục bắn tia. */
export const SPIRIT_ORB = 'vx_spirit_orb';
export const ORB_BOLT = 'vx_orb_bolt';
const ORB_COL = 0x6cc8ff;
function orbBurst(s: Stage, p: Pt, R: number): void {
  const k = s.kit, sc = k.scene;
  k.glow(p.x, p.y, ORB_COL, R * 1.4, 240);
  const g = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
  let el = 0;
  const step = (_t: number, dms: number) => {
    el += dms * sc.time.timeScale;
    const u = Math.min(1, el / 300);
    g.clear();
    for (let i = 0; i < 4; i++) {                                    // xoáy xé tan: 4 nhánh cong bung ra
      const a0 = (i * Math.PI) / 2 + u * 3;
      g.lineStyle(3, 0xd8f6ff, 0.9 * (1 - u)).beginPath();
      for (let j = 0; j <= 12; j++) {
        const f = j / 12, r = R * (0.2 + 0.8 * u) * f;
        const a = a0 + f * 2.2;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.75;
        if (j) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokePath();
    }
    g.lineStyle(2, ORB_COL, 0.8 * (1 - u)).strokeEllipse(p.x, p.y, R * 2 * u, R * 1.5 * u);
    if (u >= 1) { sc.events.off('update', step); g.destroy(); }
  };
  sc.events.on('update', step);
  for (const o of near(s, p, R)) s.hit(o, ORB_COL);
}

type Orb = { sp: Phaser.GameObjects.Sprite; slot: number; state: 'orbit' | 'fly' | 'back'; t: number; tgt?: Pt; from?: Pt };

const linhDan: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene;
  const n = aw ? 8 : 4;
  const orbitR = aw ? 62 : 44;
  const life = aw ? 3600 : 2600;
  if (!sc.anims.exists('vx_spirit_orb_spin')) sc.anims.create({ key: 'vx_spirit_orb_spin', frames: sc.anims.generateFrameNumbers(SPIRIT_ORB, {}), frameRate: 24, repeat: -1 });
  const orbs: Orb[] = [];
  for (let i = 0; i < n; i++) {
    const sp = sc.add.sprite(0, 0, SPIRIT_ORB, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(14).setScale(0).setAlpha(0.95);
    sp.play({ key: 'vx_spirit_orb_spin', startFrame: (i * 3) % 12 });
    sc.tweens.add({ targets: sp, scale: aw ? 0.36 : 0.32, duration: 260, delay: i * 50, ease: 'Back.easeOut' });
    orbs.push({ sp, slot: i, state: 'orbit', t: 0 });
  }
  let el = 0, nextShot = 450, shotIdx = 0, beamT = 0;
  const slotPos = (i: number): Pt => {
    const h = H(s);
    const a = (el / 1000) * 1.6 + (i / n) * Math.PI * 2;
    return { x: h.x + Math.cos(a) * orbitR, y: h.y - 4 + Math.sin(a) * orbitR * 0.55 };
  };
  const step = (_t: number, dms: number) => {
    const dt = dms * sc.time.timeScale;
    el += dt;
    for (const o of orbs) {
      const home = slotPos(o.slot);
      if (o.state === 'orbit') {
        o.sp.setPosition(home.x, home.y).setDepth(home.y > H(s).y - 4 ? 14 : 9);       // nửa sau vòng nằm sau nhân vật
      } else if (o.state === 'fly' && o.tgt && o.from) {
        o.t += dt / 260;
        const u = Math.min(1, o.t), e = u * u;
        o.sp.setPosition(o.from.x + (o.tgt.x - o.from.x) * e, o.from.y + (o.tgt.y - o.from.y) * e - Math.sin(u * Math.PI) * 18).setDepth(15);
        if (u >= 1) { orbBurst(s, o.tgt, aw ? 60 : 46); o.state = 'back'; o.t = 0; o.from = { x: o.tgt.x, y: o.tgt.y }; }
      } else if (o.state === 'back' && o.from) {
        o.t += dt / 360;
        const u = Math.min(1, o.t), e = 1 - (1 - u) ** 2;
        o.sp.setPosition(o.from.x + (home.x - o.from.x) * e, o.from.y + (home.y - o.from.y) * e);
        if (u >= 1) o.state = 'orbit';
      }
    }
    if (!aw && el >= nextShot && el < life - 700) {
      // bản thường: lần lượt phóng từng linh châu đang chờ vào quái gần nhất
      const o = orbs[shotIdx % n];
      const ts = s.targets();
      if (o.state === 'orbit' && ts.length) {
        const t = ts[shotIdx % Math.min(4, ts.length)];
        o.state = 'fly'; o.t = 0; o.from = { x: o.sp.x, y: o.sp.y }; o.tgt = { x: t.x, y: t.y - 6 };
      }
      shotIdx++;
      nextShot += 240;
    }
    if (aw && el > 500 && el < life - 600 && (beamT -= dt) <= 0) {
      // thức tỉnh: vòng linh châu liên tục bắn tia linh khí vào quái gần
      beamT = 110;
      const o = orbs[shotIdx++ % n];
      const t = s.targets()[shotIdx % 5];
      if (t) {
        // tia linh khí (tools/art/orb_bolt.py): vòng hào quang mỏng bung ở linh châu → vệt sáng thon vụt tới mục tiêu
        const from = { x: o.sp.x, y: o.sp.y }, to = { x: t.x, y: t.y - 6 };
        const a = ang(from, to), D = dist(from, to);
        const halo = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
        const hs = { r: 4 };
        sc.tweens.add({
          targets: hs, r: 22, duration: 220, ease: 'Quad.easeOut',
          onUpdate: () => { halo.clear(); halo.lineStyle(2, 0x9fe0ff, 1 - hs.r / 22).strokeEllipse(from.x, from.y, hs.r * 2, hs.r * 0.7); },
          onComplete: () => halo.destroy(),
        });
        const b = sc.add.image(from.x, from.y, ORB_BOLT).setBlendMode(Phaser.BlendModes.ADD).setDepth(15).setRotation(a).setOrigin(1, 0.5);
        const L = Math.min(150, D * 0.75) / b.width;
        b.setScale(L * 0.4, 0.55);
        sc.tweens.add({ targets: b, x: to.x, y: to.y, scaleX: L, duration: 120, ease: 'Quad.easeIn' });
        sc.tweens.add({ targets: b, alpha: 0, scaleY: 0.2, delay: 120, duration: 110, onComplete: () => b.destroy() });
        k.later(120, () => {
          k.glow(to.x, to.y, ORB_COL, 34, 160);
          k.burst(to.x, to.y, [0x9fe0ff, 0xffffff], 5, { tex: VT.SPARK, speed: [60, 160], scale: [0.3, 0], life: 220 });
        });
        k.later(120, () => s.hit(t, ORB_COL));
      }
    }
    if (el >= life) {
      sc.events.off('update', step);
      for (const o of orbs) sc.tweens.add({ targets: o.sp, scale: 0, alpha: 0, duration: 220, onComplete: () => o.sp.destroy() });
    }
  };
  sc.events.on('update', step);
};

/** Liệt Hỏa Phù — lá bùa nhỏ vẽ mới + vụ nổ cầu lửa cuộn khói + vòng sóng lửa sát đất + biển lửa (tools/art/fire_fx.py) */
export const FIRE_TEX = { talisman: 'vx_fire_talisman', blast: 'vx_fire_blast', ring: 'vx_fire_ring' } as const;
export const BURN_TEX = { in: 'vx_burn_in', loop: 'vx_burn_loop', out: 'vx_burn_out' } as const;
export const FIRE_SWIRL = 'vx_fire_swirl_blue';
/** số khung có hình của từng đoạn (theo tools/art/burn_ground.py) */
const BURN_FRAMES = { in: 27, loop: 30, out: 23 };
function fireBlast(s: Stage, p: Pt, R: number, burn: number, blue = false): void {
  const k = s.kit, sc = k.scene;
  const B = (key: string) => (blue ? key + '_blue' : key);
  // lóe sáng + vòng sóng lửa loang sát đất
  k.glow(p.x, p.y, blue ? 0x50a0ff : 0xffb040, R * 1.6, 260);
  const rg = sc.add.image(p.x, p.y + 4, B(FIRE_TEX.ring)).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setScale(0.15);
  sc.tweens.add({ targets: rg, scale: (R * 2.3) / 256, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => rg.destroy() });
  // cầu lửa cuộn bốc khói
  const blk = B(FIRE_TEX.blast);
  if (!sc.anims.exists(blk + '_play')) sc.anims.create({ key: blk + '_play', frames: sc.anims.generateFrameNumbers(blk, {}), frameRate: 28 });
  const sphere = () => {
    const bl = sc.add.sprite(p.x, p.y - R * 0.35, blk, 0).setDepth(18).setScale((R * 2.2) / 192);
    bl.play(blk + '_play');
    bl.once('animationcomplete', () => bl.destroy());
  };
  if (!blue) sphere();                                                    // thức tỉnh: cầu lửa dời xuống cuối kỹ năng
  // tàn lửa văng lên + rơi
  k.burst(p.x, p.y - 10, blue ? [0xc8f0ff, 0x60b0ff, 0x2060ff] : [0xffe080, 0xff8a20, 0xff4a10], 22, { tex: VT.SPARK, speed: [120, 340], angle: [200, 340], gravity: 420, scale: [0.4, 0], life: 700 });
  k.shake(140, 0.005);
  for (const o of near(s, p, R)) s.hit(o, blue ? 0x60b0ff : 0xff7a30);
  // biển lửa — mặt đất cháy lấy từ video mẫu (tools/art/burn_ground.py): bùng cháy → vòng lửa cuộn LẶP tới hết
  // thời gian cháy → tàn dần. Vòng lửa trong khung rộng ≈ 78% bề ngang khung.
  // CHỈ lấy đúng số khung có hình — lưới 8 cột còn ô trống ở cuối, đọc cả ô trống làm vùng cháy tắt một nhịp
  const mk = (key: string, count: number, rep: number) => {
    const ak = key + '_play';
    if (!sc.anims.exists(ak)) sc.anims.create({ key: ak, frames: sc.anims.generateFrameNumbers(key, { start: 0, end: count - 1 }), frameRate: 15, repeat: rep });
    return ak;
  };
  const aIn = mk(B(BURN_TEX.in), BURN_FRAMES.in, 0), aLoop = mk(B(BURN_TEX.loop), BURN_FRAMES.loop, -1), aOut = mk(B(BURN_TEX.out), BURN_FRAMES.out, 0);
  const bg = sc.add.sprite(p.x, p.y - R * 0.22, B(BURN_TEX.in), 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setScale((R * 2.3) / (256 * 0.78));
  bg.play(aIn);
  bg.once('animationcomplete', () => bg.play(aLoop));
  k.later(burn, () => {
    if (blue) {
      // thức tỉnh: NỔ XOÁY ở cuối kỹ năng, lửa tắt ngay theo vụ nổ (nổ xong là hết kỹ năng, không còn lửa tàn)
      sphere();
      fireSwirl(s, p, R * 1.25);
      sc.tweens.add({ targets: bg, alpha: 0, duration: 160, onComplete: () => bg.destroy() });
      return;
    }
    bg.play(aOut);
    bg.once('animationcomplete', () => bg.destroy());
  });
}

/** vụ nổ xoáy lửa xanh (tools/art/fire_blue.py, theo ảnh mẫu): khối lửa cuộn xoáy dẹt trên mặt đất + vòng sóng + tia */
function fireSwirl(s: Stage, p: Pt, R: number): void {
  const k = s.kit, sc = k.scene;
  if (!sc.anims.exists('vx_fire_swirl_play')) sc.anims.create({ key: 'vx_fire_swirl_play', frames: sc.anims.generateFrameNumbers(FIRE_SWIRL, {}), frameRate: 24 });
  const sw = sc.add.sprite(p.x, p.y - R * 0.12, FIRE_SWIRL, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(18).setScale((R * 2.1) / (256 * 0.84));
  sw.play('vx_fire_swirl_play');
  sw.once('animationcomplete', () => sw.destroy());
  k.glow(p.x, p.y, 0x60b0ff, R * 1.8, 320);
  k.burst(p.x, p.y - 8, [0xe0f8ff, 0x70c0ff, 0x3070ff], 24, { tex: VT.SPARK, speed: [140, 380], angle: [190, 350], gravity: 380, scale: [0.4, 0], life: 600 });
  k.shake(200, 0.008);
  for (const o of near(s, p, R)) s.hit(o, 0x9fd8ff);
}

/** ném 1 lá bùa nhỏ: bay vòng cung, xoay lật, có vệt tàn lửa; tới nơi bùa bùng cháy rồi nổ */
function throwTalisman(s: Stage, from: Pt, to: Pt, delay: number, R: number, burn: number, blue = false): void {
  const k = s.kit, sc = k.scene;
  k.later(delay, () => {
    const tl = sc.add.image(from.x, from.y - 10, FIRE_TEX.talisman).setDepth(19).setScale(0.45);
    const trail = sc.add.particles(0, 0, VT.SPARK, { follow: tl, lifespan: 260, speed: 10, scale: { start: 0.22, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: blue ? [0xa0e0ff, 0x4090ff] : [0xffc060, 0xff6a20], blendMode: Phaser.BlendModes.ADD, frequency: 18 }).setDepth(18);
    const D = dist(from, to);
    const dur = 300 + D * 0.9;
    const st = { u: 0 };
    sc.tweens.add({
      targets: st, u: 1, duration: dur, ease: 'Sine.easeIn',
      onUpdate: () => {
        const x = from.x + (to.x - from.x) * st.u, y = from.y + (to.y - from.y) * st.u - Math.sin(st.u * Math.PI) * (40 + D * 0.15) - 10 * (1 - st.u);
        tl.setPosition(x, y).setRotation(st.u * Math.PI * 3).setScale(0.45, 0.45 * Math.cos(st.u * Math.PI * 5));
      },
      onComplete: () => {
        trail.stop();
        k.later(300, () => trail.destroy());
        // bùa bùng cháy chớp sáng rồi nổ
        tl.setRotation(0).setScale(0.5).setTint(0xffd080);
        sc.tweens.add({ targets: tl, scale: 0.7, alpha: 0, duration: 120, onComplete: () => tl.destroy() });
        k.glow(to.x, to.y - 6, 0xffd060, 40, 120);
        k.later(90, () => fireBlast(s, to, R, burn, blue));
      },
    });
  });
}

const hoaPhu: Fx = (s, aw) => {
  const h = H(s);
  if (aw) {
    // Phần Thiên: 5 bùa LỬA XANH rơi ĐỀU trên vòng elip quanh thân (đúng phối cảnh mặt đất), cùng kích thước;
    // cháy 3s rồi nổ xoáy trước khi tắt
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      throwTalisman(s, h, { x: h.x + Math.cos(a) * 140, y: h.y + 8 + Math.sin(a) * 140 * 0.58 }, i * 70, 72, 3000, true);
    }
  } else {
    // bản thường: mỗi cấp +1 bùa (demo thể hiện cấp 5 = 5 bùa), rải ĐỀU trên vòng elip quanh nhân vật
    // (đúng phối cảnh mặt đất); vòng xoay ngẫu nhiên mỗi lần ném cho đỡ lặp
    const n = 5, rot = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      throwTalisman(s, h, { x: h.x + Math.cos(a) * 140, y: h.y + 8 + Math.sin(a) * 140 * 0.58 }, i * 90, 66, 1800);
    }
  }
};

const kimDan: Fx = (s, aw) => {
  const k = s.kit;
  const rings = aw ? [{ n: 4, r: 70, d: 1 }, { n: 5, r: 120, d: -1 }] : [{ n: 3, r: 80, d: 1 }];
  const orbs: { im: Phaser.GameObjects.Image; r: number; d: number; a0: number }[] = [];
  for (const rg of rings) for (let i = 0; i < rg.n; i++) {
    const im = k.img(VT.ORB, 0, 0, { tint: 0xffd040, scale: 0.9 });
    orbs.push({ im, r: rg.r, d: rg.d, a0: (i / rg.n) * Math.PI * 2 });
  }
  const em = k.scene.add.particles(0, 0, VT.DOT, { lifespan: 260, speed: 0, scale: { start: 0.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: 0xffd040, blendMode: Phaser.BlendModes.ADD, frequency: -1 }).setDepth(19);
  let t = 0;
  const dur = 2200;
  const ev = k.scene.time.addEvent({
    delay: 16, repeat: dur / 16, callback: () => {
      t += 16;
      const h = H(s);
      for (const o of orbs) {
        const a = o.a0 + (t / 1000) * 3 * o.d;
        o.im.setPosition(h.x + Math.cos(a) * o.r, h.y + Math.sin(a) * o.r).setAlpha(Math.min(1, (dur - t) / 300));
        em.emitParticleAt(o.im.x, o.im.y, 1);
        for (const tg of s.targets()) if (dist(tg, o.im) < 16 && Math.random() < 0.1) { s.hit(tg, 0xffd040); k.burst(tg.x, tg.y, 0xffe080, 5, { tex: VT.SPARK, scale: [0.25, 0], life: 200 }); }
      }
    },
  });
  k.later(dur + 50, () => { ev.remove(); for (const o of orbs) o.im.destroy(); em.destroy(); });
};

const nguyenAnh: Fx = (s, aw) => {
  const k = s.kit;
  const n = aw ? 2 : 1;
  const sp: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < n; i++) {
    const im = k.img(VT.SPIRIT, 0, 0, { tint: aw ? 0xffe6a0 : 0xffffff, scale: 1, alpha: 0, add: true });
    k.scene.tweens.add({ targets: im, alpha: 0.95, duration: 300 });
    sp.push(im);
  }
  const halo = sp.map(() => k.img(VT.RING, 0, 0, { tint: aw ? 0xffe6a0 : 0x70ffd8, scale: 0.18, alpha: 0.8 }));
  let t = 0;
  const dur = 2400;
  const ev = k.scene.time.addEvent({
    delay: 16, repeat: dur / 16, callback: () => {
      t += 16;
      const h = H(s);
      sp.forEach((im, i) => {
        const a = (t / 1000) * 1.6 + i * Math.PI;
        im.setPosition(h.x + Math.cos(a) * 50, h.y - 40 + Math.sin(a) * 12 + Math.sin(t / 200) * 3);
        halo[i].setPosition(im.x, im.y - 14).setRotation(t / 300);
        if (t > dur - 300) { im.setAlpha((dur - t) / 300); halo[i].setAlpha((dur - t) / 300); }
      });
      if (t % 400 < 16)
        sp.forEach((im) => {
          const tg = s.targets()[Math.floor(Math.random() * Math.min(5, s.targets().length))];
          if (!tg) return;
          k.fly(VT.ORB, pt(im.x, im.y), tg, { dur: 260, tint: aw ? 0xffe6a0 : 0x70ffd8, scale: 0.6, trail: aw ? 0xffe6a0 : 0x70ffd8, trailScale: 0.5, onArrive: () => { s.hit(tg, 0x70ffd8); k.glow(tg.x, tg.y, 0x70ffd8, 40, 200); } });
        });
    },
  });
  k.later(dur + 50, () => { ev.remove(); sp.forEach((i) => i.destroy()); halo.forEach((i) => i.destroy()); });
};

const thanThuc: Fx = (s, aw) => {
  const k = s.kit;
  const ts = s.targets().slice(-3);
  ts.forEach((t, i) =>
    k.later(i * 150, () => {
      const eye = k.img(VT.EYE, t.x, t.y - 46, { scale: 0.1, alpha: 0, add: false, depth: 22 });
      k.scene.tweens.add({ targets: eye, scale: 0.5, alpha: 1, duration: 180, ease: 'Back.easeOut' });
      k.later(260, () => {
        k.tw(eye, { alpha: 0, scale: 0.7 }, 200);
        k.slash(t.x, t.y, -0.8, 50, 0xc8a0ff, 220, { sweep: 0.15, width: 0.4 });
        k.slash(t.x, t.y, 2.3, 50, 0xc8a0ff, 220, { sweep: 0.15, width: 0.4 });
        k.streak(t.x - 46, t.y - 46, t.x + 46, t.y + 46, 0xd8b0ff, 10, 220);
        k.streak(t.x + 46, t.y - 46, t.x - 46, t.y + 46, 0xd8b0ff, 10, 220);
        k.glow(t.x, t.y, 0xa070ff, 90, 300);
        s.hit(t, 0xc8a0ff);
        if (aw) k.later(200, () => { k.ring(t.x, t.y, 0xc8a0ff, 10, 120, 420, true); k.burst(t.x, t.y, [0xc8a0ff, 0xffffff], 20, { tex: VT.SPARK, speed: [100, 300], scale: [0.4, 0] }); for (const o of near(s, t, 120)) s.hit(o, 0xc8a0ff); });
      });
    }),
  );
};

const huKhong: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const c = s.targets()[2] ?? pt(h.x + 150, h.y);
  const R = aw ? 170 : 110;
  const core = k.img(VT.SOFT, c.x, c.y, { tint: 0x000000, add: false, scale: 0.05, depth: 18 });
  const rim = k.img(VT.RING_THICK, c.x, c.y, { tint: 0xa060ff, scale: 0.05, depth: 19 });
  k.scene.tweens.add({ targets: core, scale: aw ? 1.3 : 0.6, duration: 300 });
  k.scene.tweens.add({ targets: rim, scale: aw ? 0.5 : 0.28, duration: 300 });
  k.scene.tweens.add({ targets: rim, rotation: 12, duration: 2400 });
  const sw = k.scene.add.particles(c.x, c.y, VT.DOT, {
    lifespan: 700, speed: 0, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0, end: 1 }, tint: [0xa060ff, 0xe0c0ff, 0x6030c0], blendMode: Phaser.BlendModes.ADD, frequency: 8,
    emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { const a = Math.random() * 6.28, r = R; p.x = Math.cos(a) * r; p.y = Math.sin(a) * r; p.velocityX = -p.x * 1.3 - Math.sin(a) * 120; p.velocityY = -p.y * 1.3 + Math.cos(a) * 120; },
  }).setDepth(19);
  k.ring(c.x, c.y, 0xa060ff, R, R * 0.9, 2200, false, { alpha: 0.35 });
  k.later(2200, () => {
    sw.stop();
    k.tw(core, { scale: 0 }, 160);
    k.tw(rim, { scale: 0 }, 160);
    k.later(160, () => {
      k.glow(c.x, c.y, 0xc080ff, R * 2, 420);
      k.ring(c.x, c.y, 0xe0c0ff, 10, R * 1.1, 420, true);
      k.burst(c.x, c.y, [0xa060ff, 0xffffff], 30, { tex: VT.SPARK, speed: [120, 380], scale: [0.4, 0] });
      k.shake(200, 0.007);
      for (const o of near(s, c, R)) s.hit(o, 0xa060ff);
    });
    k.later(900, () => sw.destroy());
  });
};

const phapTuong: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const ts = s.targets();
  const palm = (p: Pt, big: number, delay: number) =>
    k.later(delay, () => {
      const sh = k.img(VT.SOFT, p.x, p.y, { tint: 0x000000, add: false, alpha: 0.0, scale: 1.4 * big, depth: 4 });
      k.scene.tweens.add({ targets: sh, alpha: 0.45, duration: 550 });
      k.ring(p.x, p.y, 0xffc860, 100 * big, 90 * big, 600, false, { alpha: 0.6 });
      const im = k.img(VT.PALM, p.x, p.y - 260, { scale: 1.2 * big, add: false, alpha: 0.92, depth: 23, origin: [0.5, 0.8] });
      k.scene.tweens.add({
        targets: im, y: p.y, duration: 560, ease: 'Quad.easeIn', onComplete: () => {
          k.tw(im, { alpha: 0, scale: 1.4 * big }, 320);
          k.tw(sh, { alpha: 0 }, 300);
          k.glow(p.x, p.y, 0xffc860, 220 * big, 420);
          k.ring(p.x, p.y, 0xfff0c0, 20, 140 * big, 460, true);
          k.debris(p.x, p.y, 16);
          k.shake(240, 0.01);
          for (const o of near(s, p, 110 * big)) s.hit(o, 0xffc860);
        },
      });
    });
  if (aw) {
    const av = k.img(VT.SPIRIT, h.x, h.y - 70, { tint: 0xffc860, scale: 0.2, alpha: 0, depth: 3 });
    k.scene.tweens.add({ targets: av, scale: 3.4, alpha: 0.55, duration: 400 });
    k.later(2400, () => k.tw(av, { alpha: 0 }, 400));
    palm(ts[2] ?? pt(h.x + 140, h.y), 1.3, 300);
    palm(ts[5] ?? pt(h.x - 140, h.y), 1.3, 1100);
    k.later(1800, () => { k.ring(h.x, h.y, 0xffc860, 40, 420, 600, true); k.shake(300, 0.012); for (const o of s.targets()) s.hit(o, 0xffc860); });
  } else {
    const c = ts[2] ?? pt(h.x + 140, h.y);
    palm(pt(c.x - 50, c.y), 1, 0);
    palm(pt(c.x + 50, c.y), 1, 300);
  }
};

const vanKiem: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const R = aw ? 220 : 180;
  const drop = (p: Pt, big = 1) => {
    const sw = k.img(VT.SWORD, p.x, p.y - 220, { add: false, rot: Math.PI / 2, scale: 0.7 * big, depth: 22 });
    k.streak(p.x, p.y - 220, p.x, p.y, 0xd8e8ff, 8 * big, 160);
    k.scene.tweens.add({
      targets: sw, y: p.y - 30 * big, duration: 160, ease: 'Quad.easeIn', onComplete: () => {
        k.glow(p.x, p.y, 0xd8e8ff, 50 * big, 220);
        k.burst(p.x, p.y, 0xd8e8ff, 5, { tex: VT.SPARK, scale: [0.25, 0], speed: [60, 160], life: 220 });
        for (const o of near(s, p, 34 * big)) s.hit(o, 0xd8e8ff);
        k.later(big > 1.5 ? 1600 : 700, () => k.tw(sw, { alpha: 0 }, 300));
      },
    });
  };
  if (aw) {
    const rr = k.img(VT.RUNES, h.x, h.y, { tint: 0xd8e8ff, scale: (R + 30) / 124, alpha: 0, depth: 3 });
    k.scene.tweens.add({ targets: rr, alpha: 0.6, rotation: 1.5, duration: 2600 });
    k.later(2600, () => k.tw(rr, { alpha: 0 }, 300));
    for (let i = 0; i < 4; i++) drop(polar(h, (i / 4) * Math.PI * 2 + Math.PI / 4, R), 2.2);
  }
  const n = aw ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * R;
    k.later(200 + i * (2000 / n), () => drop(polar(h, a, d)));
  }
};

const thanLoi: Fx = (s, aw) => {
  const k = s.kit;
  const ts = s.targets();
  const n = aw ? 6 : 3;
  for (let i = 0; i < n; i++)
    k.later(i * 120, () => {
      const t = ts[Math.floor(Math.random() * ts.length)];
      if (!t) return;
      k.lightning(t.x + 30, t.y - 340, t.x, t.y, aw ? 0xc890ff : 0xb090ff, 3.2, 300, { branches: 3 });
      k.glow(t.x, t.y, 0xb090ff, 80, 300);
      k.ring(t.x, t.y, 0xd0c0ff, 6, 50, 260);
      s.hit(t, 0xb090ff);
      let cur = t;
      const done = [t];
      for (let j = 0; j < 3; j++) {
        const nx = s.targets().filter((o) => !done.includes(o)).sort((a, b) => dist(a, cur) - dist(b, cur))[0];
        if (!nx || dist(nx, cur) > 200) break;
        const from = cur;
        k.later(60 * (j + 1), () => { k.lightning(from.x, from.y, nx.x, nx.y, 0xd0c0ff, 1.8, 220, { branches: 0, rough: 0.3 }); s.hit(nx, 0xd0c0ff); });
        done.push(nx);
        cur = nx;
      }
    });
  k.flash(0x8a70ff, 120, 0.15);
  if (aw)
    k.later(800, () => {
      const t = ts[Math.floor(ts.length / 2)];
      if (!t) return;
      k.flash(0xc0a0ff, 200, 0.35);
      k.lightning(t.x, t.y - 420, t.x, t.y, 0xe0c0ff, 9, 500, { branches: 5 });
      k.glow(t.x, t.y, 0xc0a0ff, 260, 500);
      k.ring(t.x, t.y, 0xffffff, 20, 160, 500, true);
      k.shake(300, 0.012);
      for (const o of near(s, t, 140)) s.hit(o, 0xc0a0ff);
    });
};

const lienHoa: Fx = (s, aw) => {
  const k = s.kit, h0 = H(s);
  const c = pt(h0.x, h0.y + 8);
  const R = aw ? 150 : 120;
  const petals: Phaser.GameObjects.Image[] = [];
  const layers = aw ? [[8, 0.75, 0], [8, 0.55, Math.PI / 8], [6, 0.38, 0]] : [[8, 0.6, 0], [6, 0.4, Math.PI / 6]];
  for (const [n, sc, off] of layers)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      const p = k.img(VT.PETAL, c.x, c.y, { add: false, scale: 0.05, rot: a + Math.PI / 2, origin: [0.5, 1], alpha: 0.9, depth: 3 });
      k.scene.tweens.add({ targets: p, scale: sc * (R / 120) * 1.6, duration: 600, ease: 'Back.easeOut', delay: i * 20 });
      petals.push(p);
    }
  const area = k.img(VT.SOFT, c.x, c.y, { tint: 0xff9ad0, scale: (R / 64) * 1.1, alpha: 0.25, depth: 2 });
  const motes = k.scene.add.particles(c.x, c.y, VT.DOT, {
    lifespan: 1200, speedY: { min: -60, max: -20 }, speedX: { min: -10, max: 10 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 },
    tint: [0x9affc0, 0xff9ad0, 0xffffff], blendMode: Phaser.BlendModes.ADD, frequency: 40,
    emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, R) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
  }).setDepth(19);
  k.later(2400, () => {
    motes.stop();
    for (const p of petals) k.tw(p, { alpha: 0, scale: p.scale * 1.1 }, 400);
    k.tw(area, { alpha: 0 }, 400);
    if (aw) for (let i = 0; i < 9; i++) k.fly(VT.PETAL, c, polar(c, (i / 9) * Math.PI * 2, 260), { dur: 500, add: false, scale: 0.7, trail: 0xff9ad0, trailScale: 0.5, spin: 0.3, faceDir: false });
    k.later(1300, () => motes.destroy());
  });
  for (const o of near(s, c, R)) k.later(300, () => s.hit(o, 0xff9ad0));
};

const nganHa: Fx = (s, aw) => {
  const k = s.kit;
  const n = aw ? 4 : 2;
  const L = aw ? 300 : 230;
  const g = k.scene.add.graphics().setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
  const stars = k.scene.add.particles(0, 0, VT.SPARK, { lifespan: 500, speed: { min: 10, max: 40 }, scale: { start: 0.25, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xcff4ff, 0xffffff, 0x9fe8ff], blendMode: Phaser.BlendModes.ADD, frequency: -1 }).setDepth(20);
  let t = 0;
  const dur = 2400;
  const hitT = new Map<Pt, number>();
  const ev = k.scene.time.addEvent({
    delay: 16, repeat: dur / 16, callback: () => {
      t += 16;
      const h = H(s);
      const a0 = (t / 1000) * Math.PI;
      g.clear();
      const fade = Math.min(1, (dur - t) / 300, t / 200);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const e = polar(h, a, L);
        for (const [w, c, al] of [[22, 0x3a8ae8, 0.25], [10, 0x9fe8ff, 0.6], [3, 0xffffff, 0.95]] as [number, number, number][]) {
          g.lineStyle(w, c, al * fade);
          g.lineBetween(h.x, h.y, e.x, e.y);
        }
        const p = polar(h, a, Math.random() * L);
        stars.emitParticleAt(p.x, p.y, 1);
        for (const o of s.targets()) {
          const d = dist(h, o);
          if (d < L && Math.abs(Phaser.Math.Angle.Wrap(ang(h, o) - a)) < 0.12 && (hitT.get(o) ?? 0) < t - 400) {
            hitT.set(o, t);
            s.hit(o, 0x9fe8ff);
            k.burst(o.x, o.y, 0xcff4ff, 6, { tex: VT.SHARD, speed: [60, 160], scale: [0.5, 0.2], rotate: true, life: 400 });
          }
        }
      }
    },
  });
  k.later(dur + 40, () => { ev.remove(); g.destroy(); stars.destroy(); });
};

const hoangChung: Fx = (s, aw) => {
  const k = s.kit;
  const bell = k.img(VT.BELL, 0, 0, { add: false, scale: 0.2, alpha: 0, depth: 24, origin: [0.5, 0.9] });
  const dome = k.img(VT.SOFT, 0, 0, { tint: 0xf0c040, scale: 1.2, alpha: 0, depth: 21 });
  const rim = k.img(VT.RING, 0, 0, { tint: 0xffe080, scale: 0.42, alpha: 0, depth: 21 });
  k.scene.tweens.add({ targets: bell, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
  k.scene.tweens.add({ targets: [dome, rim], alpha: 0.5, duration: 300 });
  const ring = () => {
    const h = H(s);
    k.ring(h.x, h.y, 0xf0c040, 30, 170, 500, true);
    k.ring(h.x, h.y, 0xfff0c0, 20, 130, 420);
    k.scene.tweens.add({ targets: bell, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2 });
    k.shake(140, 0.005);
    for (const o of near(s, h, 170)) s.hit(o, 0xf0c040);
  };
  let t = 0;
  const ev = k.scene.time.addEvent({ delay: 16, repeat: 2400 / 16, callback: () => { t += 16; const h = H(s); bell.setPosition(h.x, h.y - 30); dome.setPosition(h.x, h.y); rim.setPosition(h.x, h.y); } });
  if (aw) { k.later(500, ring); k.later(1200, ring); k.later(1900, ring); }
  k.later(2300, () => {
    ring();
    k.burst(H(s).x, H(s).y - 30, 0xffe080, 20, { tex: VT.SPARK, speed: [100, 300], scale: [0.4, 0] });
    ev.remove();
    k.tw(bell, { alpha: 0, scale: 1.3 }, 300);
    k.tw(dome, { alpha: 0 }, 300);
    k.tw(rim, { alpha: 0 }, 300);
  });
};

const kimThan: Fx = (s, aw) => {
  const k = s.kit, hero = s.hero;
  hero.setTint(0xffe080);
  const aura = k.img(VT.SOFT, 0, 0, { tint: 0xffd860, scale: 1.6, alpha: 0.55, depth: 9 });
  const rr = k.img(VT.RUNES, 0, 0, { tint: 0xffd860, scale: (aw ? 120 : 90) / 124, alpha: 0.6, depth: 3 });
  const rise = k.scene.add.particles(0, 0, VT.SPARK, { lifespan: 800, speedY: { min: -120, max: -60 }, speedX: { min: -20, max: 20 }, scale: { start: 0.3, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd860, 0xffffff], blendMode: Phaser.BlendModes.ADD, frequency: 30, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 26) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource } }).setDepth(21);
  k.ring(hero.x, hero.y, 0xffd860, 10, 100, 400, true);
  let t = 0;
  const ev = k.scene.time.addEvent({
    delay: 16, repeat: 2400 / 16, callback: () => {
      t += 16;
      const h = H(s);
      aura.setPosition(h.x, h.y).setScale(1.5 + Math.sin(t / 120) * 0.1);
      rr.setPosition(h.x, h.y + 8).setRotation(t / 900);
      rise.setPosition(h.x, h.y);
      if (t % 500 < 16) for (const o of near(s, h, aw ? 120 : 90)) s.hit(o, 0xffd860);
    },
  });
  k.later(2400, () => { ev.remove(); hero.clearTint(); rise.stop(); k.tw(aura, { alpha: 0 }, 300); k.tw(rr, { alpha: 0 }, 300); k.later(900, () => rise.destroy()); });
};

const linhVuc: Fx = (s, aw) => {
  const k = s.kit;
  const R = aw ? 240 : 170;
  const base = k.img(VT.SOFT, 0, 0, { tint: aw ? 0xff1a3a : 0xc8203a, scale: (R / 64) * 1.15, alpha: 0, depth: 2 });
  const r1 = k.img(VT.RUNES, 0, 0, { tint: 0xff4a5a, scale: R / 124, alpha: 0, depth: 3 });
  const r2 = k.img(VT.RUNES, 0, 0, { tint: 0xff8a6a, scale: (R * 0.62) / 124, alpha: 0, depth: 3 });
  k.scene.tweens.add({ targets: base, alpha: 0.32, duration: 400 });
  k.scene.tweens.add({ targets: [r1, r2], alpha: 0.7, duration: 400 });
  const mist = k.scene.add.particles(0, 0, VT.SMOKE, { lifespan: 1400, speed: { min: 5, max: 20 }, scale: { start: 0.6, end: 1.4 }, alpha: { start: 0.35, end: 0 }, tint: [0x8a0a1a, 0xc8203a], frequency: 70, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, R) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource } }).setDepth(2);
  let t = 0;
  const ev = k.scene.time.addEvent({
    delay: 16, repeat: 2400 / 16, callback: () => {
      t += 16;
      const h = H(s);
      base.setPosition(h.x, h.y);
      r1.setPosition(h.x, h.y).setRotation(t / 1500);
      r2.setPosition(h.x, h.y).setRotation(-t / 1000);
      mist.setPosition(h.x, h.y);
      if (t % 600 < 16) for (const o of near(s, h, R)) s.hit(o, 0xff4a5a);
    },
  });
  if (aw) k.later(1200, () => { const tg = s.targets()[s.targets().length - 1]; if (tg) { const h = H(s); k.fly(VT.SWORD, h, tg, { dur: 260, tint: 0xff3a4a, scale: 1.1, trail: 0xff3a4a, trailScale: 0.8, onArrive: () => { s.hit(tg, 0xff3a4a); k.glow(tg.x, tg.y, 0xff3a4a, 120, 300); k.burst(tg.x, tg.y, 0xff5a5a, 16, { tex: VT.SPARK, scale: [0.4, 0] }); } }); } });
  k.later(2400, () => { ev.remove(); mist.stop(); k.tw(base, { alpha: 0 }, 400); k.tw(r1, { alpha: 0 }, 400); k.tw(r2, { alpha: 0 }, 400); k.later(1500, () => mist.destroy()); });
};

const deAn: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const c = s.targets()[3] ?? pt(h.x + 150, h.y);
  const big = aw ? 2.2 : 1.4;
  const sh = k.img(VT.SOFT, c.x, c.y, { tint: 0x000000, add: false, alpha: 0, scale: 1.6 * big, depth: 4 });
  k.scene.tweens.add({ targets: sh, alpha: 0.5, duration: 900 });
  k.ring(c.x, c.y, 0xffd040, 120 * big, 110 * big, 900, false, { alpha: 0.7 });
  const seal = k.img(VT.SEAL, c.x, c.y - 320, { add: false, scale: 0.9 * big, depth: 24, alpha: 0.95 });
  k.scene.tweens.add({ targets: seal, rotation: 0.15, duration: 900 });
  k.scene.tweens.add({
    targets: seal, y: c.y - 20, duration: 900, ease: 'Cubic.easeIn', onComplete: () => {
      k.flash(0xffe080, 160, 0.3);
      k.glow(c.x, c.y, 0xffd040, 260 * big, 500);
      k.ring(c.x, c.y, 0xfff0a0, 30, 170 * big, 500, true);
      k.ring(c.x, c.y, 0xffd040, 20, 220 * big, 700);
      k.debris(c.x, c.y, 22);
      k.shake(320, 0.014);
      for (const o of near(s, c, 120 * big)) s.hit(o, 0xffd040);
      k.later(500, () => { k.tw(seal, { alpha: 0 }, 400); k.tw(sh, { alpha: 0 }, 400); });
      if (aw)
        s.targets().slice(0, 9).forEach((tg, i) =>
          k.later(200 + i * 60, () => k.fly(VT.DRAGON, c, tg, { dur: 520, add: false, scale: 1, arc: (i % 2 ? 1 : -1) * 0.5, trail: 0xffd040, trailTex: VT.SOFT, trailScale: 0.25, onArrive: () => { s.hit(tg, 0xffd040); k.glow(tg.x, tg.y, 0xffd040, 70, 240); } })),
        );
    },
  });
};

const daiDao: Fx = (s, aw) => {
  const k = s.kit, h = H(s);
  const cam = k.scene.cameras.main;
  // ngưng đọng thời gian: phủ màu tím xám + vòng đồng hồ
  const veil = k.scene.add.rectangle(cam.worldView.centerX, cam.worldView.centerY, cam.width * 2, cam.height * 2, aw ? 0x2a1a08 : 0x14102a, 0).setDepth(80);
  k.scene.tweens.add({ targets: veil, fillAlpha: 0.55, duration: 300 });
  const clock = k.img(VT.RUNES, h.x, h.y, { tint: aw ? 0xffd860 : 0xe8e0ff, scale: 0.3, alpha: 0, depth: 81 });
  k.scene.tweens.add({ targets: clock, scale: 2.4, alpha: 0.9, rotation: -2, duration: 1600, ease: 'Sine.easeInOut' });
  const tj = k.img(VT.TAIJI, h.x, h.y - 10, { add: false, scale: 0.1, alpha: 0, depth: 82 });
  k.scene.tweens.add({ targets: tj, scale: aw ? 1.6 : 0.9, alpha: 0.95, rotation: 6, duration: 1600, ease: 'Sine.easeIn' });
  if (aw) {
    const em = k.scene.add.particles(h.x, h.y, VT.DOT, {
      lifespan: 700, speed: 0, scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd860, 0xffffff], blendMode: Phaser.BlendModes.ADD, frequency: 6,
      emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { const a = Math.random() * 6.28, r = 300; p.x = Math.cos(a) * r; p.y = Math.sin(a) * r; p.velocityX = -p.x * 1.4; p.velocityY = -p.y * 1.4; },
    }).setDepth(83);
    k.later(1600, () => em.stop());
    k.later(2400, () => em.destroy());
  }
  k.later(1700, () => {
    k.tw(veil, { alpha: 0 }, 400);
    k.tw(clock, { alpha: 0, scale: 3 }, 300);
    k.tw(tj, { alpha: 0, scale: 0.1 }, 160);
    k.flash(0xffffff, 300, 0.85);
    k.glow(h.x, h.y, aw ? 0xffd860 : 0xe8e0ff, 700, 700, { depth: 84 });
    for (let i = 0; i < 3; i++) k.later(i * 90, () => k.ring(h.x, h.y, aw ? 0xffd860 : 0xffffff, 30, 520, 600, true, { depth: 84 }));
    k.burst(h.x, h.y, [0xffffff, aw ? 0xffd860 : 0xc8b8ff], 60, { tex: VT.SPARK, speed: [200, 600], scale: [0.6, 0], life: 700, depth: 84 });
    k.shake(400, 0.016);
    for (const o of s.targets()) s.hit(o, 0xffffff);
  });
};

/** Kỹ năng thay Nguyên Anh — KHÍ LONG (rồng khí): rồng bay từ nhân vật ra, lượn ngẫu nhiên quanh nhân vật trong một
 *  phạm vi, chạm quái trên đường bay thì gây sát thương. Thức tỉnh: huyết long; gần hết kỹ năng lượn tại chỗ 1 vòng
 *  rồi đâm thẳng xuống đất nổ. Rồng dựng dạng CHUỖI ĐỐT: đầu bay trước, các đốt thân bám đúng đường đầu đã đi.
 *  Bay ở độ cao z (vẽ lệch lên trên), có bóng mờ dưới đất. Đầu rồng cách điệu bằng ánh sáng (sẽ thay ảnh nếu có). */
const DRAGON_PAL = {
  normal: { edge: 0x8ac8ff, hot: 0xe0f2ff, glow: 0x4a8cff },
  awaken: { edge: 0xc890ff, hot: 0xf0e0ff, glow: 0x9a40ff },
};
export const DRAGON_TEX = { rope: 'vx_dragon_rope' } as const;
function dragonFx(s: Stage, aw: boolean): void {
  const k = s.kit, sc = k.scene;
  const P = aw ? DRAGON_PAL.awaken : DRAGON_PAL.normal;
  const life = aw ? 5200 : 4200;
  const RANGE = aw ? 195 : 175;
  const SEG = 56, SP = 7;                                                // số đốt, khoảng cách đốt (px quãng đường)
  const shadow = sc.add.graphics().setDepth(2);
  const glow = sc.add.image(0, 0, VT.SOFT).setTint(P.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(15.8).setScale(1.1).setAlpha(0);
  const h0 = H(s);
  // rồng nguyên khối: Rope kéo ảnh dọc theo chuỗi đốt; ROPE_S = tỉ lệ thu (ảnh 1024px → thân dài ≈ SEG*SP px)
  const ROPE_S = (SEG * SP) / 1024;
  const ropePts = Array.from({ length: SEG }, () => new Phaser.Math.Vector2(h0.x / ROPE_S, h0.y / ROPE_S));
  const rope = sc.add.rope(0, 0, DRAGON_TEX.rope + (aw ? '_aw' : ''), undefined, ropePts, true).setScale(ROPE_S).setDepth(16).setAlpha(0);
  const ropeA = new Array<number>(SEG).fill(0);
  // bản lật dọc (bay sang trái thì bụng/hàm phải ở dưới): KHÔNG lật tức thì (giật) mà hoà dần 2 bản trong ~0.2s,
  // có ngưỡng trễ để không lật qua lật lại khi rồng bay gần thẳng đứng
  const ropeF = sc.add.rope(0, 0, DRAGON_TEX.rope + (aw ? '_aw' : ''), undefined, ropePts, true).setScale(ROPE_S).setDepth(16).setAlpha(0).setFlipY(true);
  ropeF.setColors(0xffffff);
  const ropeFA = new Array<number>(SEG).fill(0);
  let flipT = 0, flipW = 0;
  // xoáy mực nơi rồng chui ra (vẽ bằng các cung mực + lõi sáng)
  const portal = sc.add.graphics({ x: h0.x, y: h0.y - 4 }).setDepth(15.9).setAlpha(0);
  portal.setBlendMode(Phaser.BlendModes.ADD);
  for (let r = 0; r < 4; r++) {
    portal.lineStyle(3 - r * 0.5, P.glow, 0.7 - r * 0.12);
    portal.beginPath();
    portal.arc(0, 0, 10 + r * 9, r * 1.4, r * 1.4 + Math.PI * 1.3);
    portal.strokePath();
  }
  portal.fillStyle(P.edge, 0.5).fillCircle(0, 0, 8);
  portal.setScale(1, 0.55);
  rope.setColors(0xffffff);
  const head = { x: h0.x, y: h0.y, z: 6, a: -Math.PI / 2 };
  const trail: { x: number; y: number; z: number }[] = [{ x: h0.x, y: h0.y, z: 6 }];
  /** vị trí các đốt: đi ngược đường đầu rồng đã bay, mỗi đốt cách nhau SP px quãng đường (thân liền mạch) */
  const segs = (): { x: number; y: number; z: number }[] => {
    const out = [trail[0]];
    let need = SP, j = 0, cur = trail[0];
    while (out.length < SEG && j < trail.length - 1) {
      const nx = trail[j + 1], d = Math.hypot(nx.x - cur.x, nx.y - cur.y - (nx.z - cur.z));
      if (d >= need) {
        const f = need / d;
        cur = { x: cur.x + (nx.x - cur.x) * f, y: cur.y + (nx.y - cur.y) * f, z: cur.z + (nx.z - cur.z) * f };
        out.push(cur);
        need = SP;
      } else { need -= d; cur = nx; j++; }
    }
    realN = out.length;
    const a = out[Math.max(0, out.length - 2)], b = out[out.length - 1];
    let dx = b.x - a.x, dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1;
    if (out.length < 2) { dx = 0; dy = 1; } else { dx /= dl; dy /= dl; }
    while (out.length < SEG) { const q = out[out.length - 1]; out.push({ x: q.x + dx * SP, y: q.y + dy * SP, z: q.z }); }
    return out;
  };
  let realN = 1;
  let goal = { x: h0.x + (Math.random() - 0.5) * RANGE, y: h0.y - RANGE * 0.5 };
  const hitCd = new Map<Pt, number>();
  let el = 0, phase: 'roam' | 'circle' | 'dive' | 'done' = 'roam';
  let circleC: Pt = { x: 0, y: 0 }, circleT = 0, diveFrom = { x: 0, y: 0, z: 0 }, diveT = 0;
  const step = (_t: number, dms: number) => {
    const dt = (dms * sc.time.timeScale) / 1000;
    el += dt * 1000;
    const hero = H(s);
    if (phase === 'roam') {
      // bay về điểm đích; tới gần thì chọn điểm mới ngẫu nhiên trong phạm vi quanh nhân vật (elip mặt đất)
      if (Math.hypot(goal.x - head.x, goal.y - head.y) < 30) {
        const a = Math.atan2(head.y - hero.y, head.x - hero.x) + Math.PI * (0.55 + 0.5 * Math.random()), r = RANGE * (0.7 + 0.3 * Math.random());   // điểm đích ở phía đối diện → lượn vòng rộng
        goal = { x: hero.x + Math.cos(a) * r, y: hero.y + Math.sin(a) * r * 0.62 };
      }
      const want = Math.atan2(goal.y - head.y, goal.x - head.x);
      const turn = Phaser.Math.Angle.Wrap(want - head.a);
      head.a += Phaser.Math.Clamp(turn, -2.3 * dt, 2.3 * dt);             // xoay chậm → bán kính lượn lớn, thân không gập dồn
      const sp = el < 350 ? 160 + el : 330;
      head.x += Math.cos(head.a) * sp * dt;
      head.y += Math.sin(head.a) * sp * dt;
      head.z += (30 + 8 * Math.sin(el / 300) - head.z) * Math.min(1, dt * 4);
      if (aw && el > life - 1500) { phase = 'circle'; circleC = { x: head.x + Math.cos(head.a + Math.PI / 2) * 46, y: head.y + Math.sin(head.a + Math.PI / 2) * 46 * 0.62 }; circleT = 0; }
      if (!aw && el > life) phase = 'done';
    } else if (phase === 'circle') {
      // thức tỉnh: lượn tại chỗ đúng 1 vòng, vừa lượn vừa bốc cao
      circleT += dt / 0.9;
      const a0 = Math.atan2((head.y - circleC.y) / 0.62, head.x - circleC.x);
      const a1 = a0 + dt / 0.9 * Math.PI * 2;
      const nx = circleC.x + Math.cos(a1) * 46, ny = circleC.y + Math.sin(a1) * 46 * 0.62;
      head.a = Math.atan2(ny - head.y, nx - head.x);
      head.x = nx; head.y = ny;
      head.z += (95 - head.z) * Math.min(1, dt * 3);
      if (circleT >= 1) { phase = 'dive'; diveFrom = { x: head.x, y: head.y, z: head.z }; diveT = 0; }
    } else if (phase === 'dive') {
      // đâm thẳng xuống đất ở giữa vòng lượn
      diveT += dt / 0.22;
      const u = Math.min(1, diveT), e = u * u;
      head.x = diveFrom.x + (circleC.x - diveFrom.x) * e;
      head.y = diveFrom.y + (circleC.y - diveFrom.y) * e;
      head.z = diveFrom.z * (1 - e);
      head.a = Math.atan2(circleC.y - diveFrom.y - diveFrom.z, circleC.x - diveFrom.x);
      if (u >= 1) { phase = 'done'; dragonBlast(s, circleC); }
    }
    trail.unshift({ x: head.x, y: head.y, z: head.z });
    if (trail.length > 400) trail.length = 400;
    const body = segs();
    // chạm quái trên đường bay (đầu + nửa thân trước), mỗi quái chờ 0,45s mới bị trúng lại
    for (const o of s.targets()) {
      const cd = hitCd.get(o) ?? 0;
      if (el < cd) continue;
      for (let i = 0; i < SEG * 0.5; i++) {
        const p = body[i];
        if (Math.hypot(p.x - o.x, (p.y - (o.y - 6)) / 0.8) < 22) { s.hit(o, P.edge); hitCd.set(o, el + 450); break; }
      }
    }
    // vẽ rồng THUỶ MẶC NGUYÊN KHỐI (tools/art/dragon_rope.py): cả con rồng lấy từ ảnh mẫu rồng nhìn ngang (đầu + thân là
    // một bức vẽ liền) kéo dọc theo chuỗi đốt bằng Phaser Rope → thân uốn theo đường bay, KHÔNG có chỗ nối đầu/thân.
    const fade = phase === 'done' ? 0 : Math.min(1, el / 200) * (aw ? 1 : Math.min(1, (life - el) / 400 + 0.0001));
    shadow.clear();
    for (let i = 0; i < SEG; i += 3) {
      const p = body[i], f = 1 - i / SEG;
      shadow.fillStyle(0x000000, 0.1 * fade * f).fillEllipse(p.x, p.y + 10, 40 * f + 8, 12 * f + 3);
    }
    // điểm rope: đuôi → đầu (texture: đuôi bên trái, đầu bên phải); toạ độ chia cho tỉ lệ vì rope bị scale
    // + sóng uốn lượn chạy dọc thân (đầu đứng yên, biên độ lớn dần về đuôi) → thân thướt tha như mẫu
    for (let i = 0; i < SEG; i++) {
      const j = SEG - 1 - i, p = body[j];
      const q = body[Math.min(SEG - 1, j + 1)], pp = body[Math.max(0, j - 1)];
      const tx = pp.x - q.x, ty = (pp.y - pp.z) - (q.y - q.z), tl = Math.hypot(tx, ty) || 1;
      const amp = 9 * Math.min(1, j / (SEG * 0.35));
      const wv = Math.sin(j * 0.32 - el / 170) * amp;
      ropePts[i].x = (p.x - (ty / tl) * wv) / ROPE_S;
      ropePts[i].y = (p.y - p.z + (tx / tl) * wv) / ROPE_S;
    }
    rope.setPoints(ropePts);
    ropeF.setPoints(ropePts);
    const hp = body[0], hq = body[3];
    const hrot = Math.atan2(hp.y - hp.z - (hq.y - hq.z), hp.x - hq.x) || head.a;
    const c = Math.cos(hrot);
    if (c < -0.3) flipT = 1; else if (c > 0.3) flipT = 0;                    // ngưỡng trễ
    flipW += Phaser.Math.Clamp(flipT - flipW, -dt / 0.22, dt / 0.22);
    const wF = flipW * flipW * (3 - 2 * flipW);                              // smoothstep
    rope.setAlpha(fade); ropeF.setAlpha(fade);
    for (let i = 0; i < SEG; i++) {
      const j = SEG - 1 - i;                                                // j: 0 = đầu … SEG-1 = đuôi
      const a = Phaser.Math.Clamp((realN - 1 - j) / 6, 0, 1);
      ropeA[i] = a * (1 - wF);
      ropeFA[i] = a * wF;
    }
    rope.setAlphas(ropeA);
    ropeF.setAlphas(ropeFA);
    rope.setVisible(wF < 0.999); ropeF.setVisible(wF > 0.001);
    glow.setPosition(hp.x - Math.cos(hrot) * 20, hp.y - hp.z - Math.sin(hrot) * 20).setAlpha(0.3 * fade);
    if (fade > 0 && Math.random() < 0.5) {                                   // mực văng / tia sét nhỏ tách khỏi thân
      const d = body[2 + Math.floor(Math.random() * (SEG - 4))];
      const sp = sc.add.image(d.x + (Math.random() - 0.5) * 26, d.y - d.z + (Math.random() - 0.5) * 20, VT.DOT).setTint(P.edge).setBlendMode(Phaser.BlendModes.ADD).setDepth(15).setScale(0.1 + Math.random() * 0.12).setAlpha(0.9);
      sc.tweens.add({ targets: sp, x: sp.x + (Math.random() - 0.5) * 20, y: sp.y - 6 - Math.random() * 10, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => sp.destroy() });
    }
    if (phase === 'done' && (aw || el > life + 400)) {
      sc.events.off('update', step);
      shadow.destroy(); glow.destroy(); rope.destroy(); ropeF.destroy(); if (portal.active) portal.destroy();
    }
  };
  // xuất chiêu: lóe sáng ở nhân vật rồi rồng bay ra
  k.glow(h0.x, h0.y - 6, P.glow, 50, 420);
  sc.tweens.add({ targets: portal, scaleX: { from: 0.2, to: 1 }, scaleY: { from: 0.11, to: 0.55 }, alpha: { from: 0, to: 1 }, duration: 220, ease: 'Quad.easeOut' });
  sc.tweens.add({ targets: portal, angle: -720, duration: 2200 });
  sc.tweens.add({ targets: portal, alpha: 0, scaleX: 1.4, scaleY: 0.77, delay: 1500, duration: 600, onComplete: () => portal.destroy() });

  sc.events.on('update', step);
}

/** thức tỉnh: rồng đâm xuống đất — cột sáng, sóng xung kích đỏ, đá vụn, nổ trúng quái quanh điểm đâm */
function dragonBlast(s: Stage, c: Pt): void {
  const k = s.kit, sc = k.scene;
  const R = 150;
  k.glow(c.x, c.y, 0x9a40ff, R * 1.6, 420);
  if (sc.textures.exists(SHOCK_T6)) {
    const key = SHOCK_T6 + '_play';
    if (!sc.anims.exists(key)) sc.anims.create({ key, frames: sc.anims.generateFrameNumbers(SHOCK_T6, {}), frameRate: 30 });
    const sp = sc.add.sprite(c.x, c.y + 6, SHOCK_T6, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setTint(0xc890ff).setScale(R / (SHOCK_RING * 256));
    sp.play(key);
    sp.once('animationcomplete', () => sp.destroy());
  }
  const BL = FIRE_TEX.blast + '_purple';                                  // cầu nổ tím (tools/art/dragon_rope.py)
  if (sc.textures.exists(BL)) {
    const key = BL + '_play';
    if (!sc.anims.exists(key)) sc.anims.create({ key, frames: sc.anims.generateFrameNumbers(BL, {}), frameRate: 28 });
    const bl = sc.add.sprite(c.x, c.y - 40, BL, 0).setDepth(18).setScale(1.3);
    bl.play(key);
    bl.once('animationcomplete', () => bl.destroy());
  }
  k.burst(c.x, c.y - 6, [0xe0c8ff, 0x9a40ff, 0xffffff], 36, { tex: VT.SPARK, speed: [160, 460], angle: [190, 350], gravity: 520, scale: [0.5, 0], life: 800 });
  k.debris(c.x, c.y, 14, 0x2a2440);
  k.shake(320, 0.014);
  for (const o of near(s, c, R)) {
    s.hit(o, 0xffd0a0);
    const aa = ang(c, o);
    s.drag?.(o, o.x + Math.cos(aa) * 30, o.y + Math.sin(aa) * 30);
  }
}

const khiLong: Fx = (s, aw) => dragonFx(s, aw);

export const SKILL_FX: Record<string, Fx> = {
  ngu_kiem: nguKiem, ba_dao: baDao, pha_thuong: phaThuong, bang_quyen: bangQuyen, truy_tien: truyTien, thanh_phien: thanhPhien,
  ho_khieu: hoKhieu, linh_dan: linhDan, hoa_phu: hoaPhu, kim_dan: kimDan, nguyen_anh: nguyenAnh, khi_long: khiLong, than_thuc: thanThuc,
  hu_khong: huKhong, phap_tuong: phapTuong, van_kiem: vanKiem, than_loi: thanLoi, lien_hoa: lienHoa, ngan_ha: nganHa,
  hoang_chung: hoangChung, kim_than: kimThan, linh_vuc: linhVuc, de_an: deAn, dai_dao: daiDao,
};
