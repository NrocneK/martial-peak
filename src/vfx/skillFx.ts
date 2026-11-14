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
  /** Mục tiêu có phải boss không (trang demo: không có boss) */
  isBoss?(t: Pt): boolean;
  /** Kỹ năng đang chọn (trang demo) — hiệu ứng duy trì vĩnh viễn tự tắt khi chọn kỹ năng khác */
  current?(): string | undefined;
  /** Thông số theo cấp kỹ năng trong game (bỏ trống = giá trị mặc định của trang xem thử):
   *  dur = thời gian tồn tại (ms), r = bán kính (px), range = tầm bắn (px) */
  opt?: { dur?: number; r?: number; range?: number };
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
/** phối cảnh mặt đất ảnh đao khí bay dựng sẵn (tools/art/ba_dao_wave.py: K) */
const BA_DAO_WAVE_K = 0.7;

/** đao khí (tools/art/ba_dao_qi.py: giữ dáng thanh đao mẫu) + vết đao quét (tools/art/ba_dao_trail.py) */
export const BA_DAO_QI = { core: 'vx_badao_qi_core', rim: 'vx_badao_qi_rim', trail: 'vx_badao_trail', w: 564, hilt: 26, tip: 538 } as const;

/** BÁ ĐAO TRẢM — đại trùng tu: XOAY ĐAO (ghi chú: docs/skill-redesign-pending.md)
 *  Nhân vật vung đao xoay tròn liên tục ~3s, VỪA XOAY VỪA DI CHUYỂN; ĐAO KHÍ bay tròn quanh thân trên mặt đất (chuôi gần
 *  người, mũi hướng ra ngoài), VẾT ĐAO quét thành vòng tròn khép kín — càng gần thanh đao càng đậm;
 *  mỗi vòng xoay chém mọi quái trong bán kính, quái GẦN NHẤT nhận thêm sát thương; quái trúng 6 lần
 *  bị PHÁ GIÁP. Thức tỉnh: vòng to hơn, cứ 3 vòng xoay văng 1 đao khí bay xuyên về phía quái gần nhất. */
const baDao: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene;
  const ADD = Phaser.BlendModes.ADD;
  const DUR = s.opt?.dur ?? (aw ? 3600 : 3000);
  const R = s.opt?.r ?? (aw ? 120 : 95);                               // bán kính chém
  const SPIN = 300;                                                    // ms mỗi vòng xoay
  const KY = 0.55;
  const foot = () => pt(s.hero.x, s.hero.y + 14);
  const COL = 0xb070ff;
  // 2 lớp mặt đất (container ép dẹt KY, đơn vị = px mặt đất): vết đao luôn dưới nhân vật; thanh đao đổi lớp theo vị trí
  // (nửa phía sau → sau lưng nhân vật, nửa phía trước → đè lên nhân vật)
  const ctT = sc.add.container(0, 0).setDepth(9).setScale(0.5, 0.5 * KY).setAlpha(0);
  const ctB = sc.add.container(0, 0).setDepth(11).setScale(0.5, 0.5 * KY).setAlpha(0);
  const trail = sc.add.image(0, 0, BA_DAO_QI.trail).setBlendMode(ADD).setTint(COL).setScale(R / (0.92 * 256));
  ctT.add(trail);
  const R0 = R * 0.12;                                                 // chuôi đao cách tâm
  const sb = (R - R0) / (BA_DAO_QI.tip - BA_DAO_QI.hilt);
  const bl = [
    sc.add.image(0, 0, BA_DAO_QI.rim).setBlendMode(ADD).setTint(COL),
    sc.add.image(0, 0, BA_DAO_QI.core).setBlendMode(ADD),
  ];
  for (const b of bl) b.setOrigin(BA_DAO_QI.hilt / BA_DAO_QI.w, 0.5).setScale(sb, sb * 2.2);   // thân đao dày hơn cho rõ dáng
  ctB.add(bl);
  sc.tweens.add({ targets: [ctT, ctB], scaleX: 1, scaleY: KY, alpha: 1, duration: 160, ease: 'Back.easeOut' });
  const a0 = (() => { const t = s.targets()[0]; const h = H(s); return t ? ang(h, t) : 0; })();
  const hits = new Map<Pt, number>();
  const broken = new Set<Pt>();
  let t = 0, spins = 0;
  const slash = () => {
    const h = H(s);
    const inR = s.targets().filter((o) => Math.hypot(o.x - h.x, (o.y - h.y) / KY) < R + 8);
    const nearest = inR.slice().sort((p1, p2) => dist(p1, h) - dist(p2, h))[0];
    for (const o of inR) {
      s.hit(o, o === nearest ? 0xffffff : 0xe080ff);
      const n = (hits.get(o) ?? 0) + 1;
      hits.set(o, n);
      if (n === 6 && !broken.has(o)) {                                 // PHÁ GIÁP: vụn giáp vỡ + vòng tím dưới chân
        broken.add(o);
        k.burst(o.x, o.y - 14, [0xb040ff, 0xffffff, 0xf08aff], 12, { tex: VT.SHARD, speed: [60, 180], scale: [0.5, 0.15], rotate: true, life: 420 });
        k.ring(o.x, o.y + 2, 0xb040ff, 8, 40, 420, true, { ky: KY });
      }
    }
    if (nearest) {                                                     // quái gần nhất: nhát chém đậm hơn
      k.glow(nearest.x, nearest.y - 12, 0xf0a0ff, 34, 200);
      k.burst(nearest.x, nearest.y - 12, [0xffffff, 0xf08aff], 6, { tex: VT.SPARK, speed: [80, 200], scale: [0.35, 0], life: 240 });
    }
    // THỨC TỈNH: cứ 3 vòng văng 1 đao khí — cung lưỡi liềm ĐỒNG TÂM với vòng đao xoáy: tâm ảnh đặt đúng tâm vòng,
    // bắt đầu ở đúng mép vòng rồi NỞ RỘNG ra (không trượt lệch tâm). Ảnh dựng sẵn 8 hướng (ba_dao_wave.py: mép trước bán
    // kính 300 đơn vị mặt đất, khung ±380 → 151,6px/ảnh 384; phối cảnh K=0,7) → ép thêm dọc để khớp KY của vòng xoáy.
    if (aw && spins % 3 === 0) {
      const tg = s.targets().slice().sort((p1, p2) => dist(p1, h) - dist(p2, h))[0];
      const f = foot();
      // so trên MẶT ĐẤT (bỏ ép dẹt): hướng tới quái ↔ hướng mặt đất của từng ảnh (ảnh dựng theo góc màn hình với K=0,7)
      const want = tg ? Math.atan2((tg.y - f.y) / KY, tg.x - f.x) : a0;
      const gA = (i: number) => Math.atan2(Math.sin((i * Math.PI) / 4) / BA_DAO_WAVE_K, Math.cos((i * Math.PI) / 4));
      let bi = 0;
      for (let i = 1; i < 8; i++) if (Math.abs(Phaser.Math.Angle.Wrap(gA(i) - want)) < Math.abs(Phaser.Math.Angle.Wrap(gA(bi) - want))) bi = i;
      const d8 = BA_DAO_DIRS[bi], a = gA(bi);
      const R_IMG = 157, FLY = 320;                     // 157: bán kính mép trước đo thật trên ảnh (tools/art/ba_dao_wave.py)
      const w = sc.add.image(f.x, f.y, baDaoWaveKey(d8)).setDepth(9).setAlpha(0);
      const sz = { r: R };
      const put = () => w.setScale(sz.r / R_IMG, (sz.r / R_IMG) * (KY / BA_DAO_WAVE_K));
      put();
      sc.tweens.add({ targets: w, alpha: BA_DAO_ALPHA, duration: 80 });
      sc.tweens.add({ targets: sz, r: FLY, duration: 460, ease: 'Sine.easeIn', onUpdate: put });
      sc.tweens.add({ targets: w, alpha: 0, delay: 320, duration: 160, onComplete: () => w.destroy() });
      for (const o of s.targets()) {
        const od = Math.hypot(o.x - f.x, (o.y - f.y) / KY);
        if (od > R && od < FLY && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2((o.y - f.y) / KY, o.x - f.x) - a)) < 0.45)
          k.later(((od - R) / (FLY - R)) * 400, () => s.hit(o, 0xf0a0ff));
      }
    }
  };
  const ev = sc.time.addEvent({
    delay: 16, loop: true, callback: () => {
      t += 16;
      const f = foot();
      ctT.setPosition(f.x, f.y); ctB.setPosition(f.x, f.y);
      const phi = a0 + (t / SPIN) * Math.PI * 2;                        // xoay THEO chiều kim đồng hồ trên màn hình
      trail.setRotation(phi);                                           // vết đao: đậm nhất ngay sau lưỡi
      for (const b of bl) b.setPosition(Math.cos(phi) * R0, Math.sin(phi) * R0).setRotation(phi);
      ctB.setDepth(Math.sin(phi) < 0 ? 9.5 : 11);                       // phía sau / phía trước nhân vật
      s.pose?.('ba_dao', 0, phi);                                       // nhân vật xoay theo thanh đao
      if (Math.floor(t / SPIN) > spins) { spins++; slash(); }
      if (t >= DUR) {
        ev.remove();
        s.pose?.('ba_dao', 0, a0);
        for (const c of [ctT, ctB]) sc.tweens.add({ targets: c, alpha: 0, scaleX: 1.15, scaleY: 1.15 * KY, duration: 220, onComplete: () => c.destroy(true) });
      }
    },
  });
  slash();
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

/** Tay khí vàng (tools/art/qi_arm.py, từ ảnh mẫu pháp tướng nhiều tay) + luồng KIẾM KHÍ bọc nắm tay vuốt thành lưỡi
 *  (ảnh riêng cùng khung) — dựng đứng, mũi luồng khí ở trên */
export const QI_ARM = 'vx_qi_arm';
export const QI_AURA = 'vx_qi_aura';
/** Vệt chém lửa (tools/art/fire_slash.py): tâm cung theo tỉ lệ ảnh, bán kính MÉP NGOÀI ở đầu cung (px ảnh), góc đầu cung (rad) */
export const FIRE_SLASH = { key: 'vx_fire_slash', ox: 0.595, oy: 0.426, rOut: 160, head: (92 * Math.PI) / 180 } as const;
const QI_ARM_PIVOT: [number, number] = [0.724, 0.956];                    // khuỷu tay (điểm xoay khi chém)
const QI_ARM_REACH = 675;                                                  // khuỷu → mũi kiếm khí (px ảnh)
const QI_ARM_TIP_OFF = -0.3953;                                           // mũi kiếm khí lệch so với phương đứng qua khuỷu (rad) — lưỡi nghiêng hướng 11h

/**
 * THẦN THỨC TRẢM — thần thức hoá thành TAY KHÍ, nắm tay bọc LUỒNG KIẾM KHÍ vuốt nhọn thành lưỡi: hiện ra trên đầu
 * nhân vật, mỗi tay bay tới một kẻ địch gần đó, vung luồng kiếm khí bổ xuống (vệt chém vàng theo mũi), xong bay về và tan.
 *   thường: 2 tay (trái/phải) · thức tỉnh: 6 tay xếp như pháp tướng (3 tầng mỗi bên), chém 6 mục tiêu so le.
 */
const thanThuc: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene, hero = s.hero;
  const N = aw ? 6 : 2;
  const SC = aw ? 0.15 : 0.145;                                            // tay+kiếm cao ≈ 110px
  const SWORD = QI_ARM_REACH * SC;                                         // cổ tay → mũi luồng kiếm khí (px)
  // chỗ tay hiện ra quanh đầu nhân vật: [dx, dy, nghiêng]
  const SLOTS: [number, number, number][] = aw
    ? [[-34, -78, -0.25], [34, -78, 0.25], [-62, -52, -0.6], [62, -52, 0.6], [-52, -18, -1.0], [52, -18, 1.0]]
    : [[-30, -74, -0.3], [30, -74, 0.3]];
  const pool = s.targets().filter((t) => Math.hypot(t.x - hero.x, t.y - hero.y) < 260);
  for (let i = 0; i < N; i++) {
    const [dx, dy, tilt] = SLOTS[i];
    const side = dx < 0 ? -1 : 1;
    const home = () => ({ x: hero.x + dx, y: hero.y + dy });
    // mỗi tay một mục tiêu; tay bên trái ưu tiên mục tiêu bên trái
    const cand = pool.filter((t) => Math.sign(t.x - hero.x || side) === side);
    const t = cand[Math.floor(i / 2)] ?? pool[i % Math.max(1, pool.length)];
    const h0 = home();
    const arm = sc.add.image(h0.x, h0.y, QI_ARM).setOrigin(side < 0 ? 1 - QI_ARM_PIVOT[0] : QI_ARM_PIVOT[0], QI_ARM_PIVOT[1]).setDepth(21)
      .setScale(SC * 0.5).setAlpha(0).setRotation(tilt).setFlipX(side < 0);
    // luồng kiếm khí: chồng khít lên tay (cộng sáng), chớp nháy + phập phồng như lửa
    const aura = sc.add.image(h0.x, h0.y, QI_AURA).setOrigin(side < 0 ? 1 - QI_ARM_PIVOT[0] : QI_ARM_PIVOT[0], QI_ARM_PIVOT[1]).setDepth(21.1)
      .setBlendMode(Phaser.BlendModes.ADD).setFlipX(side < 0).setAlpha(0);
    const ph = Math.random() * 10;
    const follow = (time: number) => {
      if (!arm.active) { sc.events.off('update', follow); if (aura.active) aura.destroy(); return; }
      const fl = 1 + 0.06 * Math.sin(time / 45 + ph) + 0.04 * Math.sin(time / 23 + ph * 2);
      aura.setPosition(arm.x, arm.y).setRotation(arm.rotation)
        .setScale(arm.scaleX * (0.96 + 0.08 * Math.sin(time / 60 + ph)), arm.scaleY * fl)
        .setAlpha(arm.alpha * 1.1 * (0.85 + 0.15 * Math.sin(time / 37 + ph)));
    };
    sc.events.on('update', follow);
    const delay = aw ? i * 90 : i * 180;
    // hiện ra
    k.later(delay, () => k.glow(h0.x, h0.y - 20, 0xffc850, 50, 300, { alpha: 0.6 }));
    sc.tweens.add({ targets: arm, alpha: 0.65, scale: SC, delay, duration: 220, ease: 'Back.easeOut' });
    if (!t) {                                                               // không có địch gần: giơ kiếm rồi tan
      sc.tweens.add({ targets: arm, alpha: 0, delay: delay + 700, duration: 300, onComplete: () => arm.destroy() });
      continue;
    }
    const sd = t.x >= h0.x ? 1 : -1;                                        // chém từ trên bổ xuống về phía mục tiêu
    // chỗ đứng chém: cổ tay lệch lên trên + ra sau mục tiêu để cung mũi kiếm đi qua mục tiêu
    const px = t.x - sd * SWORD * 0.55, py = t.y - 10 - SWORD * 0.62;
    const rRaise = -sd * 0.55, rEnd = sd * 2.25;                            // góc giơ kiếm → góc bổ xong
    k.later(delay + 240, () => {
      sc.tweens.add({ targets: arm, x: px, y: py, rotation: rRaise - QI_ARM_TIP_OFF * side, duration: 200, ease: 'Cubic.easeOut' });   // bù góc lệch để MŨI KIẾM theo cung chém
      // bổ xuống
      k.later(250, () => {
        // VỆT CHÉM LỬA (tools/art/fire_slash.py, lấy từ ảnh mẫu): tâm cung đặt ở khuỷu (tâm xoay), đầu cung bám mũi kiếm,
        // giữ nguyên màu mẫu (cả vệt khói tối); hiện dần theo cú quét, chém xong cháy tiếp một nhịp rồi tan.
        // Thân lửa đặc của mẫu dài ≈ 130° sau đầu cung ≈ cung quét của cú chém → không cần mặt nạ (không có mép cắt cứng)
        const fs = sc.add.image(px, py, FIRE_SLASH.key).setOrigin(sd < 0 ? 1 - FIRE_SLASH.ox : FIRE_SLASH.ox, FIRE_SLASH.oy).setDepth(20.5)
          .setScale(SWORD / FIRE_SLASH.rOut).setFlipX(sd < 0).setAlpha(0);
        const head = sd > 0 ? FIRE_SLASH.head : Math.PI - FIRE_SLASH.head;   // góc đầu cung (lật ảnh thì soi gương)
        const st = { r: rRaise };
        let hitDone = false;
        const draw = (fade: number, extra = 0) => {
          const a1 = st.r - Math.PI / 2 + sd * extra, swept = Math.max(0, (st.r - rRaise) * sd);
          fs.setRotation(a1 - head).setAlpha(Math.min(1, swept / 1.1) * fade * 0.6);
        };
        sc.tweens.add({
          targets: [st], r: rEnd, duration: 150, ease: 'Quad.easeIn',
          onUpdate: () => {
            arm.setRotation(st.r - QI_ARM_TIP_OFF * side);
            draw(1);
            if (!hitDone && (st.r - rRaise) * sd > 1.25) {                    // mũi kiếm qua mục tiêu
              hitDone = true;
              s.hit(t, 0xffd070);
              k.glow(t.x, t.y - 12, 0xffc850, 70, 260);
              k.burst(t.x, t.y - 12, [0xffe090, 0xffffff], 10, { tex: VT.SPARK, speed: [80, 220], scale: [0.3, 0], life: 300 });
              if (aw) k.shake(60, 0.002);
            }
          },
          onComplete: () => {
            const ff = { v: 1, x: 0 };
            sc.tweens.add({ targets: ff, v: 0, x: 0.35, duration: 280, ease: 'Quad.easeOut', onUpdate: () => draw(ff.v, ff.x), onComplete: () => fs.destroy() });
            // bay về trên đầu rồi tan
            const hb = home();
            sc.tweens.add({ targets: arm, x: hb.x, y: hb.y, rotation: tilt, delay: 120, duration: 260, ease: 'Cubic.easeInOut' });
            sc.tweens.add({ targets: arm, alpha: 0, scale: SC * 1.15, delay: 380, duration: 260, onComplete: () => arm.destroy() });
          },
        });
      });
    });
  }
};

/** Hố đen xoáy (tools/art/black_hole.py, lấy từ video mẫu): bảng khung 8 cột, 59 khung 264×204, 15 khung/s (vòng 4s);
 *  ảnh cộng sáng — tâm hố ở giữa khung, bán kính xoáy sáng ≈ 105px khung, lõi đen ≈ 20px khung (game vẽ riêng) */
export const BLACK_HOLE = { key: 'vx_black_hole', fw: 264, fh: 204, frames: 59, swirlR: 105, coreR: 20 } as const;
/** Vụ nổ hố đen (tools/art/black_hole_blast.py, từ video mẫu): 2 bảng khung cùng nhịp — glow (cộng sáng) + dark (phủ đen);
 *  64 khung 210×280, 20 khung/s; tâm nổ trên mặt đất ở (0.5, oy); bán kính hoa văn tím trên đất ≈ decalR px khung */
export const BH_BLAST = { glow: 'vx_bh_blast_glow', dark: 'vx_bh_blast_dark', fw: 210, fh: 280, frames: 64, oy: 0.695, decalR: 75 } as const;

/**
 * HƯ KHÔNG LIỆT PHÙNG — hố đen (theo video mẫu) mở ra giữa cụm quái: xoáy tím sáng + lõi đen, hút quái xoắn ốc vào tâm,
 * gây sát thương theo nhịp; hết giờ hố co sụp lại rồi nổ một vòng sóng. Thức tỉnh: hố to hơn, hút mạnh + nổ lớn hơn.
 */
const huKhong: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene, h = H(s);
  const c = s.targets()[2] ?? pt(h.x + 150, h.y);
  const R = aw ? 170 : 115;                                                // bán kính xoáy (px game)
  const LIFE = aw ? 3600 : 2600;
  const S = R / BLACK_HOLE.swirlR;
  if (!sc.anims.exists('vx_black_hole_loop')) {
    sc.anims.create({ key: 'vx_black_hole_loop', frames: sc.anims.generateFrameNumbers(BLACK_HOLE.key, { start: 0, end: BLACK_HOLE.frames - 1 }), frameRate: 15, repeat: -1 });
  }
  // lõi đen (cộng sáng không vẽ được màu đen): đĩa đen mềm, nằm dưới lớp xoáy
  const core = sc.add.image(c.x, c.y, VT.SOFT).setTint(0x000000).setDepth(17.9).setScale(0).setAlpha(0.95);
  const coreS = (BLACK_HOLE.coreR * S * 2.6) / 128;
  const bh = sc.add.sprite(c.x, c.y, BLACK_HOLE.key, 0).setDepth(18).setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0);
  bh.play({ key: 'vx_black_hole_loop', startFrame: Math.floor(Math.random() * BLACK_HOLE.frames) });
  // mở ra: xoáy nở từ tâm + xoay nhẹ
  sc.tweens.add({ targets: bh, scale: S, alpha: 1, angle: { from: -40, to: 0 }, duration: 380, ease: 'Back.easeOut' });
  sc.tweens.add({ targets: core, scaleX: coreS, scaleY: coreS * 0.8, duration: 300, ease: 'Quad.easeOut' });
  k.glow(c.x, c.y, 0x8060ff, R * 1.2, 400, { alpha: 0.6 });
  // hút quái: xoắn ốc vào tâm (càng gần càng nhanh), sát thương theo nhịp
  let el = 0, tick = 0.2;
  const pull = aw ? 2 : 1;
  const step = (_t: number, dms: number) => {
    const dt = (dms * sc.time.timeScale) / 1000;
    el += dt * 1000;
    if (el < LIFE) {
      for (const o of s.targets()) {
        const d = dist(o, c);
        if (d > R * 1.35 || d < 2) continue;
        const a0 = ang(c, o) + dt * (1.6 + 90 / Math.max(d, 20)) * pull;   // xoáy quanh tâm
        const r0 = Math.max(R * 0.12, d - (40 + 3000 / Math.max(d, 25)) * dt * pull);
        s.drag?.(o, c.x + Math.cos(a0) * r0, c.y + Math.sin(a0) * r0);
      }
      if ((tick -= dt) <= 0) {
        tick = 0.45;
        for (const o of near(s, c, R)) s.hit(o, 0xa080ff);
      }
    }
  };
  sc.events.on('update', step);
  // co sụp + nổ
  k.later(LIFE, () => {
    sc.events.off('update', step);
    sc.tweens.add({ targets: bh, scale: S * 0.15, angle: 160, duration: 260, ease: 'Quad.easeIn' });
    sc.tweens.add({ targets: core, scale: 0, duration: 260, ease: 'Quad.easeIn' });
    k.later(260, () => {
      bh.destroy(); core.destroy();
      // VỤ NỔ theo video mẫu (tools/art/black_hole_blast.py): lớp bóng tối (khối vật chất đen) + lớp phát sáng (tím,
      // xanh ngọc, tia sáng, vòng xung kích, hoa văn tím trên đất) chạy cùng nhịp 20 khung/s
      for (const [key, anim] of [[BH_BLAST.dark, 'vx_bh_blast_dark'], [BH_BLAST.glow, 'vx_bh_blast_glow']] as const) {
        if (!sc.anims.exists(anim)) sc.anims.create({ key: anim, frames: sc.anims.generateFrameNumbers(key, { start: 0, end: BH_BLAST.frames - 1 }), frameRate: 20, repeat: 0 });
      }
      const bs = (R * 1.15) / BH_BLAST.decalR;
      const dark = sc.add.sprite(c.x, c.y, BH_BLAST.dark, 0).setOrigin(0.5, BH_BLAST.oy).setScale(bs).setDepth(18);
      const glow = sc.add.sprite(c.x, c.y, BH_BLAST.glow, 0).setOrigin(0.5, BH_BLAST.oy).setScale(bs).setDepth(18.1).setBlendMode(Phaser.BlendModes.ADD);
      dark.play('vx_bh_blast_dark'); glow.play('vx_bh_blast_glow');
      glow.once('animationcomplete', () => { glow.destroy(); dark.destroy(); });
      k.shake(aw ? 260 : 180, aw ? 0.009 : 0.006);
      for (const o of near(s, c, R * 1.2)) s.hit(o, 0xc0a0ff);
    });
  });
};

/** Pháp tướng (tools/art/phap_tuong.py): nhân vật hoá thân khí vàng (ảnh cộng sáng, chân ở `foot` theo tỉ lệ ảnh;
 *  thân cao ≈ bodyH px ảnh) + bàn tay chưởng = mu bàn tay úp xuống (điểm chạm đất `cx, cy` = trọng tâm bàn tay, rộng palmW) */
export const PHAP_TUONG = { avatar: 'vx_phap_tuong_avatar', avW: 312, avH: 547, palm: 'vx_phap_tuong_palm', foot: 0.945, bodyH: 408, cx: 0.531, cy: 0.533, palmW: 710 } as const;

/**
 * PHÁP TƯỚNG THIÊN ĐỊA — pháp tướng khí vàng khổng lồ (chính nhân vật hoá thân, như ảnh mẫu) hiện sau lưng trên một pháp
 * trận vàng, rồi một BÀN TAY CHƯỞNG khổng lồ từ trời giáng xuống cụm địch: bóng tay lớn dần trên đất → chưởng ập xuống
 * → sóng chấn + bụi + rung, để lại dấu chưởng vàng trên đất mờ dần.
 * Thức tỉnh: pháp tướng to hơn, ở lâu hơn, giáng 3 chưởng liên tiếp rồi giậm chân chấn cả màn hình.
 */
const phapTuong: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene, hero = s.hero, h = H(s);
  const ts = s.targets();
  const KY = 0.55;
  const LIFE = aw ? 3400 : 1900;
  // --- pháp trận vàng dưới chân
  const circ = sc.add.graphics({ x: hero.x, y: hero.y + 4 }).setDepth(2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const RC = aw ? 95 : 75;
  circ.lineStyle(2.5, 0xffc850, 0.9).strokeCircle(0, 0, RC);
  circ.lineStyle(1.2, 0xffe6a0, 0.8).strokeCircle(0, 0, RC * 0.82);
  circ.lineStyle(1, 0xffc850, 0.6).strokeCircle(0, 0, RC * 0.45);
  for (let i = 0; i < 24; i++) {                                           // vạch phù văn giữa 2 vòng
    const a0 = (i / 24) * Math.PI * 2;
    const r0 = RC * 0.84, r1 = RC * (i % 3 ? 0.92 : 0.98);
    circ.lineStyle(i % 3 ? 1 : 2, 0xffd880, 0.85).lineBetween(Math.cos(a0) * r0, Math.sin(a0) * r0, Math.cos(a0) * r1, Math.sin(a0) * r1);
  }
  for (let i = 0; i < 6; i++) {                                            // lục giác trong
    const a0 = (i / 6) * Math.PI * 2, a1 = ((i + 2) / 6) * Math.PI * 2;
    circ.lineStyle(1, 0xffc850, 0.55).lineBetween(Math.cos(a0) * RC * 0.8, Math.sin(a0) * RC * 0.8, Math.cos(a1) * RC * 0.8, Math.sin(a1) * RC * 0.8);
  }
  circ.setScale(0.3, 0.3 * KY);
  sc.tweens.add({ targets: circ, alpha: 1, scaleX: 1, scaleY: KY, duration: 320, ease: 'Back.easeOut' });
  // --- pháp tướng khí vàng sau lưng
  const AS = ((aw ? 3.6 : 3.0) * 68) / PHAP_TUONG.bodyH;                   // cao gấp ~3 nhân vật
  // pháp tướng quay cùng hướng nhân vật: bảng 8 khung, khung i = hàng i của sprite nhân vật (S, SW, W, NW, N, NE, E, SE)
  const PT_LEG_X = [0.508, 0.541, 0.501, 0.496, 0.495, 0.514, 0.516, 0.466];   // điểm giữa 2 chân theo tỉ lệ khung
  const HERO_LEG_X = [0.497, 0.53, 0.496, 0.494, 0.497, 0.506, 0.508, 0.466];   // giữa 2 chân trong khung nhân vật
  const av_s = () => AS;
  const facing = () => (hero.texture.key === 'hero' ? Math.floor(Number(hero.frame.name) / 7) % 8 : 0);
  // đứng SAU LƯNG nhân vật: lệch về phía sau theo hướng nhìn, luôn vẽ DƯỚI nhân vật (nhân vật đứng trước pháp tướng
  // như ảnh mẫu); khi nhân vật nhìn lên, pháp tướng không lấn xuống trước mặt mà đứng sát sau lưng
  const FACE_A = [90, 135, 180, 225, 270, 315, 0, 45].map((d) => (d * Math.PI) / 180);
  const spot = () => {
    const a = FACE_A[facing()];
    // nhân vật LUÔN đứng giữa 2 chân pháp tướng (thẳng trục với điểm giữa 2 chân của từng khung).
    // Hướng thấy mặt (S, SW, SE): pháp tướng lùi sát sau lưng, nhân vật đứng trước.
    // Hướng thấy lưng (W, NW, N, NE, E): pháp tướng phủ lên nhân vật — càng thấy lưng nhiều càng bị che nhiều.
    const f = facing();
    const back = -Math.sin(a);                                             // 1 = quay lưng hẳn (N), 0 = ngang (E/W)
    // pháp tướng là bản phóng to của chính khung nhân vật → đặt sao cho điểm giữa 2 chân của pháp tướng TRÙNG điểm giữa
    // 2 chân nhân vật (cả ngang lẫn dọc). Hướng chéo: 2 chân so le trên dưới nên phải khớp cả chiều dọc mới đứng giữa.
    const legX = (PT_LEG_X[f] - 0.5) * PHAP_TUONG.avW * av_s() - (HERO_LEG_X[f] - 0.5) * 52;
    const diag = f % 2 === 1;                                              // SW, NW, NE, SE
    const FOOT = 23 - 8;                                                   // chân nhân vật (y + 23) − chỗ neo (+8)
    if (back < -0.1) {
      // SW / SE: đo trên ảnh phóng to — điểm giữa bàn chân trước và bàn chân sau của pháp tướng phải trùng chân nhân vật
      // (toạ độ chỗ neo so với nhân vật, đo ở cỡ thường, nhân theo tỉ lệ khi thức tỉnh)
      const k = AS / ((3.0 * 68) / PHAP_TUONG.bodyH);
      if (f === 1) return { x: hero.x + 7.8 * k, y: hero.y + (31.4 - 23) * k + 23 - 8, front: false, cover: 1 };
      if (f === 7) return { x: hero.x - 2.5 * k, y: hero.y + (30 - 23) * k + 23 - 8, front: false, cover: 1 };
      return { x: hero.x - legX, y: hero.y - 10 * KY, front: false, cover: 1 };
    }
    const c = Math.max(0, back);                                           // E/W 0 · NE/NW 0.71 · N 1
    return { x: hero.x - legX, y: diag ? hero.y + FOOT : hero.y + 3, front: true, cover: 0.72 + 0.13 * c };
  };
  const sp0 = spot();
  const av = sc.add.image(sp0.x, sp0.y + 8, PHAP_TUONG.avatar, facing()).setOrigin(0.5, PHAP_TUONG.foot).setDepth(sp0.front ? 11 : 9)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(AS * 0.7);
  sc.tweens.add({ targets: av, alpha: 0.85, scale: AS, duration: 420, ease: 'Cubic.easeOut' });
  k.glow(sp0.x, sp0.y - 60, 0xffc850, 120, 500, { alpha: 0.7 });
  const flick = (time: number) => {
    if (!av.active) return;
    const spn = spot();
    av.setPosition(spn.x, spn.y + 8).setDepth(spn.front ? 11 : 9).setData('cover', spn.cover);
    if (Number(av.frame.name) !== facing()) av.setFrame(facing());
    circ.setPosition(hero.x, hero.y + 4);
    const g = av.getData('fade') ?? 1;
    av.setAlpha(g * (av.getData('cover') ?? 1) * (0.78 + 0.1 * Math.sin(time / 90) + 0.05 * Math.sin(time / 37)));
  };
  av.setData('fade', 0);
  sc.tweens.add({ targets: { v: 0 }, v: 1, duration: 420, onUpdate: (tw) => av.setData('fade', tw.getValue()) });
  sc.events.on('update', flick);
  // --- bàn tay chưởng (ảnh mẫu): úp xuống từ trời, ngón tay hướng ra xa nhân vật
  const RP = aw ? 120 : 95;                                                // bán kính chưởng (px game)
  const PS = (RP * 2.6) / PHAP_TUONG.palmW;
  const palm = (p: Pt, delay: number) => k.later(delay, () => {
    const fl = false;                                                      // dùng 1 góc (SW) cho mọi hướng
    const sh = k.img(VT.SOFT, p.x, p.y, { tint: 0x000000, add: false, alpha: 0, scale: 0.3, depth: 4 });
    sh.setScale(0.6, 0.6 * KY);
    sc.tweens.add({ targets: sh, alpha: 0.5, scaleX: (RP * 2.4) / 128, scaleY: ((RP * 2.4) / 128) * KY, duration: 600, ease: 'Quad.easeIn' });
    const im = sc.add.image(p.x, p.y - 340, PHAP_TUONG.palm).setOrigin(fl ? 1 - PHAP_TUONG.cx : PHAP_TUONG.cx, PHAP_TUONG.cy).setDepth(23)
      .setScale(PS * 0.8).setFlipX(fl).setAlpha(0).setAngle(fl ? 6 : -6).setBlendMode(Phaser.BlendModes.ADD);   // năng lượng thuần: cộng sáng
    k.glow(p.x, p.y - 360, 0xffc850, 180, 420, { alpha: 0.6 });
    sc.tweens.add({ targets: im, alpha: 1, duration: 160 });
    sc.tweens.add({
      targets: im, y: p.y - 4, scale: PS, angle: 0, duration: 600, ease: 'Quad.easeIn',
      onComplete: () => {
        // chạm đất: tay đè bẹp xuống một nhịp rồi tan
        sc.tweens.add({ targets: im, scaleY: PS * 0.88, scaleX: PS * 1.05, duration: 90, yoyo: true });
        sc.tweens.add({ targets: im, alpha: 0, delay: 180, duration: 320, onComplete: () => im.destroy() });
        sc.tweens.add({ targets: sh, alpha: 0, duration: 500, onComplete: () => sh.destroy() });
        const R = RP;
        k.glow(p.x, p.y, 0xfff0c0, R * 1.6, 300);
        k.glow(p.x, p.y, 0xffc850, R * 2.6, 520, { alpha: 0.7 });
        const ring = sc.add.graphics().setDepth(4.5).setBlendMode(Phaser.BlendModes.ADD);
        const e = { v: 0 };
        sc.tweens.add({
          targets: e, v: 1, duration: 520, ease: 'Cubic.easeOut',
          onUpdate: () => {
            ring.clear();
            const rr = R * (0.3 + 1.5 * e.v), al = 1 - e.v;
            ring.lineStyle(12 * al + 2, 0xffb840, 0.45 * al).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * KY);
            ring.lineStyle(3, 0xfff2c8, 0.9 * al).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * KY);
          },
          onComplete: () => ring.destroy(),
        });
        // vết chưởng cháy vàng trên đất, mờ dần
        const mark = k.img(VT.SOFT, p.x, p.y, { tint: 0xffb030, alpha: 0.5, depth: 1.5 });
        mark.setScale((R * 2.2) / 128, ((R * 2.2) / 128) * KY);
        sc.tweens.add({ targets: mark, alpha: 0, delay: 700, duration: 1400, onComplete: () => mark.destroy() });
        k.debris(p.x, p.y, 18);
        k.burst(p.x, p.y, [0xffe090, 0xffc850, 0xffffff], 16, { tex: VT.SPARK, speed: [120, 320], scale: [0.4, 0] });
        k.shake(240, 0.011);
        for (const o of near(s, p, R)) s.hit(o, 0xffc860);
      },
    });
  });
  if (aw) {
    palm(ts[2] ?? pt(h.x + 140, h.y), 380);
    palm(ts[5] ?? pt(h.x - 140, h.y), 1100);
    palm(ts[9] ?? pt(h.x, h.y + 140), 1820);
    k.later(2700, () => {                                                  // giậm chân: chấn cả màn hình
      const g = sc.add.graphics().setDepth(4.5).setBlendMode(Phaser.BlendModes.ADD);
      const e = { v: 0 };
      sc.tweens.add({
        targets: e, v: 1, duration: 650, ease: 'Cubic.easeOut',
        onUpdate: () => { g.clear(); const rr = 40 + 420 * e.v, al = 1 - e.v; g.lineStyle(14 * al + 2, 0xffc850, 0.5 * al).strokeEllipse(h.x, h.y + 6, rr * 2, rr * 2 * KY); },
        onComplete: () => g.destroy(),
      });
      k.shake(320, 0.013);
      for (const o of s.targets()) s.hit(o, 0xffc860);
    });
  } else {
    palm(ts[2] ?? pt(h.x + 140, h.y), 380);
  }
  // tan
  k.later(LIFE, () => {
    sc.tweens.add({ targets: { v: 1 }, v: 0, duration: 420, onUpdate: (tw) => av.setData('fade', tw.getValue()), onComplete: () => { sc.events.off('update', flick); av.destroy(); } });
    sc.tweens.add({ targets: circ, alpha: 0, duration: 420, onComplete: () => circ.destroy() });
  });
};

/** Kiếm khí Ngự Kiếm đổi màu (tools/art/qi_blade.py): 2 lớp cùng khung 344×72, mũi hướng phải ở (QI_BLADE_TIP, 0.5) */
export const QI_BLADE = { core: 'vx_qi_blade_core', rim: 'vx_qi_blade_rim' } as const;
const QI_BLADE_TIP = 0.971;
/** Trận pháp dưới chân (tools/art/sword_array.py): 512×512, cộng sáng */
export const SWORD_ARRAY = { n: 'vx_sword_array', aw: 'vx_sword_array_aw',
  /** tâm 4 vòng tròn Phong Lâm Hoả Sơn (px ảnh, so với tâm trận) */
  circles: [[-91, -91], [93, -93], [-93, 92], [94, 92]] as [number, number][] } as const;
/** 9 màu viền: 7 màu cầu vồng + đen + trắng */
const QI_BLADE_COLORS = [0xff3232, 0xff961e, 0xffeb28, 0x3ce650, 0x3c8cff, 0x463ce6, 0xaa46ff, 0x000000, 0xffffff];

const vanKiem: Fx = (s, aw) => {
  const k = s.kit;
  const R = aw ? 220 : 180;
  const drop = (p: Pt, big = 1, track?: () => Pt, stay = 0, color?: number) => {
    // kiếm khí NGỰ KIẾM (tools/art/qi_blade.py tách từ qi_sword_light.png): lõi trắng giữ nguyên (cộng sáng) + quầng đổi
    // sang 1 trong 9 màu ngẫu nhiên (vẽ thường để màu đen vẫn thấy)
    const col = color ?? QI_BLADE_COLORS[Math.floor(Math.random() * QI_BLADE_COLORS.length)];
    const sc_ = 0.26 * big;
    const parts: Phaser.GameObjects.Image[] = [
      k.scene.add.image(0, 0, QI_BLADE.rim).setTint(col),
      k.scene.add.image(0, 0, QI_BLADE.core).setBlendMode(Phaser.BlendModes.ADD),
    ];
    for (const im of parts) im.setOrigin(QI_BLADE_TIP, 0.5);
    const sw = k.scene.add.container(p.x, p.y - 220, parts).setScale(sc_).setRotation(Math.PI / 2).setDepth(22);   // mũi chỉ xuống
    k.streak(p.x, p.y - 220, p.x, p.y, col === 0x000000 ? 0xffffff : col, 6 * big, 160);
    k.scene.tweens.add({
      targets: sw, y: p.y - (track ? 4 : 30 * big), duration: 160, ease: 'Quad.easeIn', onComplete: () => {
        const gc = col === 0x000000 ? 0xffffff : col;
        k.glow(p.x, p.y, gc, 50 * big, 220);
        k.burst(p.x, p.y, [gc, 0xffffff], 5, { tex: VT.SPARK, scale: [0.25, 0], speed: [60, 160], life: 220 });
        for (const o of near(s, p, 34 * big)) s.hit(o, 0xd8e8ff);
        if (track) {                                                       // cự kiếm cắm trong vòng tròn của trận → xoay theo trận
          const fol = () => { if (!sw.active) { k.scene.events.off('update', fol); return; } const q = track(); sw.setPosition(q.x, q.y - 4); };   // mũi kiếm cắm đúng tâm vòng tròn
          k.scene.events.on('update', fol);
        }
        k.later(stay || (big > 1.5 ? 1600 : 700), () => { k.tw(sw, { alpha: 0 }, 300); k.later(320, () => sw.destroy()); });
      },
    });
  };
  // TRẬN PHÁP dưới chân (tools/art/sword_array.py, lấy nguyên ảnh mẫu): thường trắng · thức tỉnh vàng.
  // Ảnh nằm trong container nén dọc (mặt đất) → xoay ảnh bên trong = trận xoay trên mặt đất.
  const LIFE = aw ? 3000 : 2700;
  const arr = k.scene.add.image(0, 0, aw ? SWORD_ARRAY.aw : SWORD_ARRAY.n).setBlendMode(Phaser.BlendModes.ADD);
  const ground = k.scene.add.container(s.hero.x, s.hero.y + 20, [arr]).setDepth(2).setAlpha(0);
  const ARR_R = (R + 30) * 1.35;                                           // bán kính trận (to hơn 35%)
  const AR = (ARR_R * 2) / 512;
  ground.setScale(AR * 0.4, AR * 0.4 * 0.58);
  k.scene.tweens.add({ targets: ground, alpha: 0.85, scaleX: AR, scaleY: AR * 0.58, duration: 380, ease: 'Back.easeOut' });
  k.scene.tweens.add({ targets: arr, rotation: aw ? 1.2 : 0.8, duration: LIFE + 400 });
  k.glow(s.hero.x, s.hero.y + 20, aw ? 0xffd870 : 0xffffff, ARR_R * 1.1, 500, { alpha: 0.5 });
  const follow = () => { if (!ground.active) { k.scene.events.off('update', follow); return; } ground.setPosition(s.hero.x, s.hero.y + 20); };   // trận đi theo nhân vật
  k.scene.events.on('update', follow);
  k.later(LIFE, () => k.scene.tweens.add({ targets: ground, alpha: 0, duration: 400, onComplete: () => ground.destroy() }));
  if (aw) {
    // 4 cự kiếm cắm đúng tâm 4 vòng tròn Phong · Lâm · Hoả · Sơn của trận đồ (toạ độ trong ảnh 512, so với tâm),
    // bám theo trận khi trận xoay trên mặt đất
    const circle = (i: number) => () => {
      const [cx, cy] = SWORD_ARRAY.circles[i];
      const r = arr.rotation, c = Math.cos(r), sn = Math.sin(r);
      return { x: ground.x + (cx * c - cy * sn) * ground.scaleX, y: ground.y + (cx * sn + cy * c) * ground.scaleY };
    };
    // màu cố định, đối xứng qua tâm trận: đen ↔ trắng, tím ↔ lá (vòng 0↔3, 1↔2 là 2 cặp đối nhau)
    const GIANT_COL = [0x000000, 0xaa46ff, 0x3ce650, 0xffffff];
    for (let i = 0; i < 4; i++) k.later(420 + i * 120, () => drop(circle(i)(), 2.2, circle(i), LIFE - 420 - i * 120 - 300, GIANT_COL[i]));
  }
  const n = aw ? 26 : 16;
  for (let i = 0; i < n; i++) {
    // rơi TRONG trận pháp: elip mặt đất cùng tâm + cùng độ nén với trận (bán kính ngang ≈ 85% bán kính trận)
    const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * ARR_R * 0.85;
    k.later(200 + i * (2000 / n), () => drop({ x: ground.x + Math.cos(a) * d, y: ground.y + Math.sin(a) * d * 0.58 }));
  }
};

/** Sét (tools/art/lightning.py, từ ảnh mẫu): tia giáng 5 khung 147×389 (chạm đất ở gx, gy) · tia lan 5 kiểu 320×64 (ngang,
 *  đầu trái) · vụ nổ kiếp lôi 512×512 (chạm đất 0.5, 0.842). Thức tỉnh dùng bản tím (_aw). */
export const THUNDER = { strike: 'vx_thunder_strike', arc: 'vx_thunder_arc', residue: 'vx_thunder_residue', rw: 240, rh: 215, rn: 41, rgy: 0.895, sw: 147, sh: 389, gx: 0.573, gy: 0.961, aw: 320, ah: 64 } as const;

const thanLoi: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene;
  const sf = aw ? '_aw' : '';
  const COL = aw ? 0xc890ff : 0x70b8ff;
  const ak = 'vx_thunder_strike_anim' + sf;
  if (!sc.anims.exists(ak)) sc.anims.create({ key: ak, frames: sc.anims.generateFrameNumbers(THUNDER.strike + sf, { start: 0, end: 4 }), frameRate: 14, repeat: 0 });
  // tia sét giáng xuống mục tiêu (hoạt ảnh 5 khung của mẫu)
  const strike = (t: Pt, big = 1, onDone?: () => void) => {
    const im = sc.add.sprite(t.x + Phaser.Math.Between(-6, 6), t.y + 4, THUNDER.strike + sf, 0).setOrigin(THUNDER.gx, THUNDER.gy)
      .setScale(0.62 * big).setFlipX(Math.random() < 0.5).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    im.play(ak);
    im.once('animationcomplete', () => { im.destroy(); onDone?.(); });
    k.glow(t.x, t.y, COL, 70 * big, 300);
  };
  // tia sét lan giữa 2 mục tiêu (hình tia của mẫu, kéo dài theo khoảng cách, chớp tắt)
  const arc = (a: Pt, b: Pt) => {
    const L = dist(a, b);
    const im = sc.add.image(a.x, a.y - 14, THUNDER.arc + sf, Phaser.Math.Between(0, 4)).setOrigin(8 / THUNDER.aw, 0.5)
      .setRotation(Math.atan2(b.y - a.y, b.x - a.x)).setScale(L / (THUNDER.aw - 16), (Math.random() < 0.5 ? -1 : 1) * 0.55)
      .setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    sc.tweens.add({ targets: im, alpha: { from: 1, to: 0 }, duration: 260, ease: 'Stepped', easeParams: [4], onComplete: () => im.destroy() });
  };
  const ts = s.targets();
  const n = aw ? 9 : 3;
  for (let i = 0; i < n; i++)
    k.later(i * (aw ? 90 : 140), () => {
      const t = ts[Math.floor(Math.random() * ts.length)];
      if (!t) return;
      strike(t);
      s.hit(t, COL);
      let cur = t;
      const done = [t];
      for (let j = 0; j < 3; j++) {
        const nx = s.targets().filter((o) => !done.includes(o)).sort((p1, p2) => dist(p1, cur) - dist(p2, cur))[0];
        if (!nx || dist(nx, cur) > 200) break;
        const from = cur;
        k.later(110 + 70 * j, () => { arc(from, nx); s.hit(nx, COL); k.glow(nx.x, nx.y - 10, COL, 40, 200); });
        done.push(nx);
        cur = nx;
      }
    });
  k.flash(aw ? 0x9a60ff : 0x5a90ff, 120, 0.15);
  if (aw)
    k.later(1000, () => {
      // KIẾP LÔI: vụ nổ sét lớn (ảnh mẫu cầu sét + nứt đất), bản tím
      const t = ts[Math.floor(ts.length / 2)];
      if (!t) return;
      // nhịp 1: tia kiếp lôi giáng xuống (chạy hết hoạt ảnh) → nhịp 2: mới nổ
      k.flash(0xc0a0ff, 120, 0.2);
      strike(t, 1.8, () => k.later(80, () => {
        // NỔ TÀN DƯ (41 khung lấy từ video mẫu): cầu nổ trắng → lõi vàng + vòng sét → nhạt dần → khói tàn rồi tắt
        k.flash(0xc0a0ff, 200, 0.35);
        const rk = 'vx_thunder_residue_anim' + sf;
        if (!sc.anims.exists(rk)) sc.anims.create({ key: rk, frames: sc.anims.generateFrameNumbers(THUNDER.residue + sf, { start: 0, end: THUNDER.rn - 1 }), frameRate: 15, repeat: 0 });
        const bl = sc.add.sprite(t.x, t.y + 6, THUNDER.residue + sf, 0).setOrigin(0.5, THUNDER.rgy).setScale(1.1).setDepth(21);
        bl.play(rk);
        bl.once('animationcomplete', () => bl.destroy());
        k.shake(300, 0.012);
        for (const o of near(s, t, 140)) s.hit(o, COL);
      }));
    });
};

export const LOTUS = { tex: 'vx_lotus_top', petal: 'vx_lotus_petal', size: 512, fill: 0.8, front: 0.4, ky: 0.58, spin: 9000 } as const;
const lienHoa: Fx = (s, aw) => {
  // hoa sen NHÌN TỪ TRÊN XUỐNG lấy nguyên từ ảnh mẫu (tools/art/lotus.py → lotus_top.png), nằm trên mặt đất dưới chân,
  // nhân vật đứng ngay lõi sáng giữa hoa; ảnh xoay bên trong container nén dọc = hoa xoay tròn chậm trên mặt đất.
  // nở từ một điểm, tàn = khép lại về lõi
  const k = s.kit, sc = k.scene, h0 = H(s);
  const c = pt(h0.x, h0.y + 20);
  const R = aw ? 150 : 120;
  const S = (R * 2.2) / (LOTUS.size * LOTUS.fill);                         // fill: bán kính hoa / nửa khung ảnh
  // cánh sen bán trong suốt (ảnh mẫu) bay tỏa trên mặt đất, mũi theo hướng bay; ĐUÔI cánh kéo vệt sáng hồng + bụi sáng
  // cánh sen bán trong suốt (ảnh mẫu) bay ra theo ĐƯỜNG XOẮN ỐC trên mặt đất, mũi theo hướng bay;
  // ĐUÔI cánh kéo vệt sáng hồng + bụi sáng
  const petalFly = (ang: number) => {
    const PS = 0.36, tail = 64 * PS, RMAX = 260, TURN = Math.PI * 1.3, DUR = 950;
    const im = sc.add.image(c.x, c.y, LOTUS.petal).setScale(PS).setDepth(20);
    const glowTrail = sc.add.particles(c.x, c.y, VT.SOFT, {
      lifespan: 320, speed: 0, scale: { start: 0.2, end: 0.03 },
      alpha: { start: 0.28, end: 0 }, tint: 0xff9ccc, blendMode: Phaser.BlendModes.ADD, frequency: 16,
    }).setDepth(19);
    const dust = sc.add.particles(c.x, c.y, VT.DOT, {
      lifespan: { min: 300, max: 600 }, speed: { min: 8, max: 30 },
      angle: { min: 0, max: 360 }, scale: { start: 0.35, end: 0 }, alpha: { start: 0.8, end: 0 },
      tint: [0xffd0e6, 0xffffff, 0xff8cc0], blendMode: Phaser.BlendModes.ADD, frequency: 22,
    }).setDepth(19);
    const at = (t: number) => {
      const r = RMAX * Math.pow(t, 0.85), th = ang + TURN * t;
      return pt(c.x + Math.cos(th) * r, c.y + Math.sin(th) * r * LOTUS.ky);
    };
    sc.tweens.addCounter({
      from: 0, to: 1, duration: DUR, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const p = at(t), q = at(Math.min(1, t + 0.02));
        const dir = Math.atan2(q.y - p.y, q.x - p.x);
        im.setPosition(p.x, p.y).setRotation(dir).setAlpha(t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
        const tx = p.x - Math.cos(dir) * tail, ty = p.y - Math.sin(dir) * tail;
        glowTrail.setPosition(tx, ty); dust.setPosition(tx, ty);
      },
      onComplete: () => { im.destroy(); glowTrail.stop(); dust.stop(); k.later(650, () => { glowTrail.destroy(); dust.destroy(); }); },
    });
  };
  const layer = (depth: number) => {
    const im = sc.add.image(0, 0, LOTUS.tex);
    const ct = sc.add.container(c.x, c.y, [im]).setDepth(depth);
    return { im, ct };
  };
  // lớp hoa thứ 2 phủ mờ lên nhân vật → nhân vật như được hoa sen bao bọc
  const L = [layer(3), layer(11)];
  const lo = L[0].ct, fr = L[1].ct;
  lo.setAlpha(0.2); fr.setAlpha(0);
  const st = { fx: 0.05, fy: 0.05, rot: -0.6 };
  let mimg: Phaser.GameObjects.Image | null = null;
  const apply = () => {
    const h = H(s);                                                      // hoa đi theo nhân vật
    c.x = h.x; c.y = h.y + 20;
    for (const l of L) { l.ct.setPosition(c.x, c.y).setScale(S * st.fx, S * st.fy * LOTUS.ky); l.im.setRotation(st.rot); }
    glow?.setPosition(c.x, c.y); motes?.setPosition(c.x, c.y); mimg?.setPosition(c.x, c.y);
  };
  let glow: Phaser.GameObjects.Image | null = null;
  let motes: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  apply();
  sc.events.on('update', apply);
  sc.tweens.add({ targets: st, fx: 1, fy: 1, duration: 650, ease: 'Back.easeOut' });
  sc.tweens.add({ targets: st, rot: -0.6 + Math.PI * 2, duration: LOTUS.spin, repeat: -1 });
  sc.tweens.add({ targets: lo, alpha: 1, duration: 650 });
  sc.tweens.add({ targets: fr, alpha: LOTUS.front, duration: 650 });
  glow = k.img(VT.SOFT, c.x, c.y, { tint: aw ? 0xffe0a0 : 0xc8a0ff, scale: 0.2, alpha: 0, depth: 2 });
  k.tw(glow, { scale: (R / 64) * 1.2, alpha: 0.35 }, 650);
  motes = sc.add.particles(c.x, c.y, VT.DOT, {
    lifespan: 1300, speedY: { min: -60, max: -20 }, speedX: { min: -10, max: 10 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 },
    tint: aw ? [0xffe6a0, 0xd8b8ff, 0xffffff] : [0xc8a8ff, 0xffffff], blendMode: Phaser.BlendModes.ADD, frequency: 45,
    emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, R * 1.6, R * 0.9) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
  }).setDepth(19);
  // nhịp thở nhẹ khi nở
  const gl = glow, mo = motes;
  k.later(650, () => sc.tweens.add({ targets: st, fx: 1.03, fy: 1.03, duration: 700, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' }));
  for (const o of near(s, c, R)) k.later(350, () => s.hit(o, aw ? 0xffe0a0 : 0xd8b0ff));
  k.later(2400, () => {
    mo.stop();
    // TAN BIẾN TỪ NGOÀI VÀO TRONG: mặt nạ tròn mềm (nằm trên mặt đất) co dần về lõi, mép tan rắc bụi sáng
    const MK = 'vx_radial_mask';
    if (!sc.textures.exists(MK)) {
      const cv = sc.textures.createCanvas(MK, 256, 256)!;
      const g2 = cv.context.createRadialGradient(128, 128, 0, 128, 128, 128);
      g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.78, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      cv.context.fillStyle = g2; cv.context.fillRect(0, 0, 256, 256); cv.refresh();
    }
    const mi = sc.make.image({ x: c.x, y: c.y, key: MK }, false);
    mimg = mi;
    const mask = mi.createBitmapMask();
    lo.setMask(mask); fr.setMask(mask);
    const flowerR = 256 * LOTUS.fill * S * st.fx;                            // bán kính hoa trên màn hình (trục ngang)
    const ms = { m: (flowerR * 1.06) / (128 * 0.78) };
    const DISS = 1000;
    const edge = sc.add.particles(0, 0, VT.DOT, {
      lifespan: { min: 350, max: 700 }, speedY: { min: -40, max: -10 }, speedX: { min: -12, max: 12 }, scale: { start: 0.45, end: 0 },
      alpha: { start: 0.9, end: 0 }, tint: aw ? [0xffe6a0, 0xe0c8ff, 0xffffff] : [0xd8b8ff, 0xff9ccc, 0xffffff],
      blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(19);
    sc.tweens.add({
      targets: ms, m: 0, duration: DISS, ease: 'Sine.easeIn',
      onUpdate: () => {
        mi.setScale(ms.m, ms.m * LOTUS.ky);
        const er = ms.m * 128 * 0.88;                                       // giữa dải mép đang tan
        for (let i = 0; i < 3; i++) {
          const a2 = Math.random() * Math.PI * 2;
          edge.emitParticleAt(c.x + Math.cos(a2) * er, c.y + Math.sin(a2) * er * LOTUS.ky, 1);
        }
      },
      onComplete: () => {
        sc.events.off('update', apply); sc.tweens.killTweensOf(st);
        lo.clearMask(); fr.clearMask(); mask.destroy(); mi.destroy(); mimg = null; lo.destroy(); fr.destroy();
        k.later(800, () => edge.destroy());
        if (aw) for (let i = 0; i < 9; i++) petalFly((i / 9) * Math.PI * 2);   // hoa tan hết rồi cánh mới bay ra
      },
    });
    k.tw(gl, { alpha: 0, scale: 0.3 }, DISS);
    k.later(1400, () => mo.destroy());
  });
};

/** Ngân Hà Hàn Lưu — VẼ MỚI theo ảnh mẫu (tools/art/ngan_ha_draw.py): tia nằm ngang, game xoay theo hướng bắn.
 *  core/strand 256×64 lặp ngang liền mạch → TileSprite (dài theo khoảng cách, KHÔNG kéo giãn); ring = cổng phát (tâm = điểm phát);
 *  hit = điểm chạm (tâm) */
export const NGAN_HA = { core: 'vx_ngan_ha_core', strand: 'vx_ngan_ha_strand', ring: 'vx_ngan_ha_ring', hit: 'vx_ngan_ha_hit', ringS: 'vx_ngan_ha_ring_s', missile: 'vx_ngan_ha_missile', snow: 'vx_ngan_ha_snow', ice: ['a', 'b', 'c', 'd', 'e'].map((v) => `vx_ngan_ha_ice_${v}`), th: 64, front: 46 } as const;
/** THƯỜNG: khoá mục tiêu XA NHẤT trong tầm (có boss thì ưu tiên boss), bắn tới khi mục tiêu chết hoặc hết giờ;
 *  quái khác nằm trên tia cũng trúng; trúng → làm chậm (sương băng dưới chân), trúng 5 lần → ĐÓNG BĂNG (boss chỉ chậm).
 *  THỨC TỈNH: tia to + mạnh hơn, định kỳ bắn thêm 3 TIA TRUY KÍCH vào quái khác. (Ghi chú: docs/skill-redesign-pending.md) */
const nganHa: Fx = (s, aw) => {
  const k = s.kit, sc = k.scene;
  const RANGE = s.opt?.range ?? (aw ? 360 : 300);
  const DUR = s.opt?.dur ?? (aw ? 3000 : 2600);
  const BIG = aw ? 1.5 : 1;
  const COL = 0x9fe8ff;
  const TICK = 300;
  const src = () => pt(s.hero.x, s.hero.y - 18);
  type TS = Phaser.GameObjects.TileSprite;
  type Beam = { core: TS; str: TS; coreS: TS; strS: TS; ring: Phaser.GameObjects.Image; hit: Phaser.GameObjects.Image; tp: number; ts: number };
  const ts = (tex: string) => sc.add.tileSprite(0, 0, 10, NGAN_HA.th, tex).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(20).setAlpha(0);
  const mkBeam = (big: number, ring = true): Beam => ({
    core: ts(NGAN_HA.core), str: ts(NGAN_HA.strand), coreS: ts(NGAN_HA.core), strS: ts(NGAN_HA.strand), tp: 0, ts: 0,
    ring: sc.add.image(0, 0, NGAN_HA.ring).setBlendMode(Phaser.BlendModes.ADD).setDepth(21).setAlpha(0).setVisible(ring),
    hit: sc.add.image(0, 0, NGAN_HA.hit).setBlendMode(Phaser.BlendModes.ADD).setDepth(21).setAlpha(0).setScale(0.6 * big),
  });
  const killBeam = (b: Beam) => { for (const o of [b.core, b.str, b.coreS, b.strS, b.ring, b.hit]) o.destroy(); };
  // vẽ tia từ a (cổng) tới e, dày theo big
  const drawBeam = (b: Beam, a: Pt, e: Pt, big: number, alpha: number, flow: number) => {
    const rot = Math.atan2(e.y - a.y, e.x - a.x), L = Math.max(4, dist(a, e));
    const C = Math.min(56 * big, L * 0.45);                              // đoạn đầu hoà vào cổng phát
    const bx = a.x + Math.cos(rot) * C, by = a.y + Math.sin(rot) * C;
    const sy = 0.8 * big * (1 + Math.sin(flow / 50) * 0.06);
    b.tp -= 1.5; b.ts -= 6;                                              // sợi khí xoắn chảy dọc tia
    for (const [head, rest, tp, sY] of [[b.coreS, b.core, b.tp, sy], [b.strS, b.str, b.ts, 0.8 * big]] as const) {
      head.setPosition(a.x, a.y).setRotation(rot).setSize(Math.max(1, C), NGAN_HA.th).setScale(1, sY).setAlpha(1).setAlpha(0, alpha, 0, alpha);   // alpha tổng = 1, độ đục 4 góc tăng dần
      head.tilePositionX = tp;
      rest.setPosition(bx, by).setRotation(rot).setSize(Math.max(1, L - C), NGAN_HA.th).setScale(1, sY).setAlpha(alpha);
      rest.tilePositionX = tp + C;                                       // hoa văn nối tiếp, không lệch
    }
    b.ring.setPosition(a.x, a.y).setRotation(rot).setScale(0.42 * big * (1 + Math.sin(flow / 90) * 0.04)).setAlpha(alpha);
    b.hit.setPosition(e.x, e.y).setRotation(Math.random() * Math.PI * 2).setAlpha(alpha);
  };
  // làm chậm / đóng băng
  const count = new Map<Pt, number>();
  const frost = new Map<Pt, Phaser.GameObjects.Image>();
  const frozen = new Set<Pt>();
  const damage = (o: Pt) => {
    s.hit(o, COL);
    k.burst(o.x, o.y - 14, [0xffffff, 0xcff4ff], 3, { tex: NGAN_HA.snow, speed: [40, 120], scale: [0.35, 0.1], rotate: true, life: 360 });
    const boss = s.isBoss?.(o) ?? false;
    if (!frost.has(o)) {                                                 // làm chậm: sương băng dưới chân
      const f = k.img(VT.SOFT, o.x, o.y + 2, { tint: COL, scale: 0.55, alpha: 0.55, depth: 2 }).setScale(0.55, 0.3);
      frost.set(o, f);
      if (boss) k.later(700, () => { k.tw(f, { alpha: 0 }, 250); });     // boss: chậm ngắn, chỉ chậm lại khi thi triển lại
    }
    const c = (count.get(o) ?? 0) + 1;
    count.set(o, c);
    if (c === 5 && !boss && !frozen.has(o)) {                            // ĐÓNG BĂNG
      frozen.add(o);
      const ice = sc.add.image(o.x, o.y + 21, Phaser.Utils.Array.GetRandom(NGAN_HA.ice)).setOrigin(0.5, 0.97).setDepth(12).setScale(0.48, 0.05).setFlipX(Math.random() < 0.5);   // 5 mẫu băng (ảnh mẫu của bạn), chọn ngẫu nhiên
      sc.tweens.add({ targets: ice, scaleY: 0.48, duration: 180, ease: 'Back.easeOut' });
      k.burst(o.x, o.y - 18, [0xffffff, 0xcff4ff], 6, { tex: NGAN_HA.snow, speed: [30, 90], scale: [0.45, 0.2], rotate: true, life: 500 });
      k.later(1600, () => {
        k.burst(o.x, o.y - 24, [0xffffff, 0xcff4ff, 0x9fe8ff], 16, { tex: NGAN_HA.snow, speed: [60, 190], scale: [0.6, 0.15], rotate: true, life: 650 });   // băng vỡ → hoa tuyết bay ra
        ice.destroy();
        frozen.delete(o);
      });
    }
  };
  const pickMain = (): Pt | null => {
    const h = src();
    const inR = s.targets().filter((o) => dist(o, h) < RANGE);
    const boss = inR.find((o) => s.isBoss?.(o));
    if (boss) return boss;
    return inR.sort((p1, p2) => dist(p2, h) - dist(p1, h))[0] ?? null;     // xa nhất trong tầm
  };
  const main = mkBeam(BIG);
  // vòng nhỏ: sinh ở cổng phát, trôi theo tia chính, to dần nhẹ rồi mờ dần khi xa cổng
  const rings: { im: Phaser.GameObjects.Image; age: number }[] = [];
  let lastRing = -999;
  const stepRings = (st0: Pt, rot: number, len: number, fade: number, spawn: boolean) => {
    if (spawn && t - lastRing >= 240) {
      lastRing = t;
      rings.push({ im: sc.add.image(st0.x, st0.y, NGAN_HA.ringS).setBlendMode(Phaser.BlendModes.ADD).setDepth(21).setAlpha(0), age: 0 });
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += 16;
      const u = r.age / 620;
      if (u >= 1) { r.im.destroy(); rings.splice(i, 1); continue; }
      const d = len * 0.3 * (1 - (1 - u) ** 1.4);                          // từ cổng phát → ~30% tia chính thì tan
      r.im.setPosition(st0.x + Math.cos(rot) * d, st0.y + Math.sin(rot) * d).setRotation(rot)
        .setScale(0.5 * BIG * (0.9 + 0.2 * u)).setAlpha(fade * Math.min(1, u * 8) * (1 - u) * 0.9);
    }
  };
  let tgt = pickMain();
  let lastTick = -TICK;
  const hitT = new Map<Pt, number>();
  // THỨC TỈNH: tên lửa băng truy kích (homing) — toả trong quạt phía trước, lượn cong bám mục tiêu, không vòng ngược
  type Missile = { head: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; trail: Phaser.GameObjects.Particles.ParticleEmitter; x: number; y: number; vx: number; vy: number; t: Pt | null; age: number; ax: number; o: Pt };
  const missiles: Missile[] = [];
  const wrap = (a: number) => Phaser.Math.Angle.Wrap(a);
  const CONE = Math.PI / 4;                                              // quạt 90° quanh trục tia chính
  const inCone = (o: Pt, from: Pt, ax: number) => Math.abs(wrap(Math.atan2(o.y - from.y, o.x - from.x) - ax)) <= CONE;
  const nearest = (x: number, y: number, from: Pt, ax: number) => s.targets().filter((o) => inCone(o, from, ax)).sort((p1, p2) => Math.hypot(p1.x - x, p1.y - y) - Math.hypot(p2.x - x, p2.y - y))[0] ?? null;
  const launch = (from: Pt, ang: number, target: Pt | null, ax: number) => {
    const sp = 260;
    const glow = sc.add.image(from.x, from.y, VT.SOFT).setBlendMode(Phaser.BlendModes.ADD).setTint(COL).setDepth(21).setScale(0.14 * BIG).setAlpha(0.6);
    const head = sc.add.image(from.x, from.y, NGAN_HA.missile).setOrigin(0.78, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(22).setScale(0.4 * BIG);
    const trail = sc.add.particles(0, 0, VT.SOFT, {                      // vệt mờ rất mảnh để đường cong liền mạch
      follow: head, lifespan: 300, speed: 2, scale: { start: 0.06 * BIG, end: 0 }, alpha: { start: 0.45, end: 0 },
      tint: [0x9fe8ff, 0x5aa8ff], blendMode: Phaser.BlendModes.ADD, frequency: 8,
    }).setDepth(20);
    k.glow(from.x, from.y, COL, 18, 160, { alpha: 0.6 });
    missiles.push({ head, glow, trail, x: from.x, y: from.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: target, age: 0, ax, o: from });
  };
  const killMissile = (m: Missile, boom: boolean) => {
    if (boom) {
      k.glow(m.x, m.y, COL, 30 * BIG, 220, { alpha: 0.8 });
      k.burst(m.x, m.y, [0xffffff, 0xcff4ff], 5, { tex: NGAN_HA.snow, speed: [40, 130], scale: [0.45, 0.15], rotate: true, life: 420 });
    }
    m.head.destroy(); m.glow.destroy();
    m.trail.stop(); k.later(420, () => m.trail.destroy());
  };
  const stepMissiles = (dt: number) => {
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.age += dt;
      if (m.t && !s.targets().includes(m.t)) m.t = nearest(m.x, m.y, m.o, m.ax);   // mục tiêu chết → bám quái gần nhất trong quạt
      const sp = Math.min(620, 260 + m.age * 0.55);                             // tăng tốc dần
      if (m.t) {
        const ex = m.t.x, ey = m.t.y - 14;
        const want = Math.atan2(ey - m.y, ex - m.x), cur = Math.atan2(m.vy, m.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const turn = (6 + m.age * 0.01) * dt / 1000;                            // lượn cong mềm về mục tiêu
        const lim = Math.PI * 0.4;                                              // hướng bay luôn trong ±72° quanh trục → không bao giờ vòng ngược
        const a = m.ax + Phaser.Math.Clamp(wrap(cur + Math.max(-turn, Math.min(turn, d)) - m.ax), -lim, lim);
        m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        if (Math.hypot(ex - m.x, ey - m.y) < 22) { damage(m.t); killMissile(m, true); missiles.splice(i, 1); continue; }
      }
      m.x += m.vx * dt / 1000; m.y += m.vy * dt / 1000;
      const rot = Math.atan2(m.vy, m.vx);
      m.head.setPosition(m.x, m.y).setRotation(rot);
      m.glow.setPosition(m.x, m.y).setScale(0.16 * BIG * (1 + Math.sin(m.age / 40) * 0.12));
      if (m.age > 2200 || (!m.t && m.age > 500)) { killMissile(m, true); missiles.splice(i, 1); }
    }
  };
  let t = 0;
  let ended = false;
  const ev = sc.time.addEvent({
    delay: 16, loop: true, callback: () => {
      if (ended) { stepMissiles(16); if (!missiles.length) ev.remove(); return; }
      t += 16;
      const h = src();
      const fade = Math.min(1, t / 150, Math.max(0, (DUR - t) / 250));
      if (!tgt || !s.targets().includes(tgt) || dist(tgt, h) > RANGE * 1.25) tgt = pickMain();   // mục tiêu chết → chọn lại
      if (!tgt) { drawBeam(main, h, h, BIG, 0, t); } else {
        const e = pt(tgt.x, tgt.y - 14);
        const rot = Math.atan2(e.y - h.y, e.x - h.x);
        const st0 = pt(h.x + Math.cos(rot) * NGAN_HA.front * BIG, h.y + Math.sin(rot) * NGAN_HA.front * BIG);
        const grow = Math.min(1, t / 180);
        const tip = pt(st0.x + (e.x - st0.x) * grow, st0.y + (e.y - st0.y) * grow);
        drawBeam(main, st0, tip, BIG, fade, t);
        stepRings(st0, rot, dist(st0, tip), fade, grow >= 1 && t < DUR - 300);
        if (grow >= 1 && fade > 0.5 && t - lastTick >= TICK) {
          lastTick = t;
          damage(tgt);
          // quái khác nằm trên tia cũng trúng
          const L = dist(st0, e);
          for (const o of s.targets()) {
            if (o === tgt) continue;
            const ox = o.x - st0.x, oy = o.y - 14 - st0.y;
            const along = ox * Math.cos(rot) + oy * Math.sin(rot), off = Math.abs(-ox * Math.sin(rot) + oy * Math.cos(rot));
            if (along > 0 && along < L && off < 16 * BIG && t - (hitT.get(o) ?? -999) >= TICK) { hitT.set(o, t); damage(o); }
          }
        }
        // THỨC TỈNH: định kỳ phóng 3 tên lửa băng truy kích từ cổng phát — chỉ nhắm quái trong quạt 90° phía trước (trục = tia chính)
        if (aw && t > 300 && t < DUR - 400 && t % 704 < 16) {
          const pool = s.targets().filter((o) => o !== tgt && inCone(o, st0, rot) && dist(o, h) < RANGE * 1.4).sort(() => Math.random() - 0.5);
          for (let n = 0; n < 3; n++) {
            const o = pool[n % Math.max(1, pool.length)] ?? tgt;
            const toO = o ? wrap(Math.atan2(o.y - 14 - st0.y, o.x - st0.x) - rot) : 0;
            launch(st0, rot + Phaser.Math.Clamp(toO + (n - 1) * 0.35, -CONE, CONE), o, rot);   // toả trong quạt phía trước, hơi lệch để lượn
          }
        }
      }
      stepMissiles(16);
      if (t >= DUR) {
        ended = true; killBeam(main); for (const r of rings) r.im.destroy();                                    // tên lửa đang bay vẫn bay nốt tới mục tiêu
        for (const f of frost.values()) k.tw(f, { alpha: 0 }, 400);
        k.later(450, () => { for (const f of frost.values()) f.destroy(); });
      }
    },
  });
};

export const HOANG_CHUNG = { bell: 'vx_hc_energy', array: 'vx_hc_array', ground: 'vx_hc_ground', ky: 0.5, bellH: 135 } as const;

const hoangChung: Fx = (s, aw) => {
  // chuông năng lượng vàng trong suốt úp lên nhân vật (tools/art/hoang_chung.py → hoang_chung_energy.png),
  // trận đồ (ảnh mẫu, tools/art/hoang_chung_array.py) nằm trên mặt đất dưới chân, xoay chậm;
  // mỗi lần chuông rung: chuông nảy, trận đồ loé, sóng vàng lan trên mặt đất gây sát thương
  const k = s.kit, sc = k.scene;
  const ADD = Phaser.BlendModes.ADD;
  const DUR = s.opt?.dur ?? 2400;
  const R = s.opt?.r ?? (aw ? 190 : 160);                                            // bán kính sóng chuông
  const foot = () => pt(s.hero.x, s.hero.y + 20);
  const BS = HOANG_CHUNG.bellH / 300;
  // trận đồ: ảnh xoay trong container nén dọc = xoay trên mặt đất
  const AR = aw ? 120 : 100;
  const arr = sc.add.container(0, 0).setDepth(3).setScale(0.2, 0.2 * HOANG_CHUNG.ky).setAlpha(0);
  const arrIm = sc.add.image(0, 0, HOANG_CHUNG.array).setBlendMode(ADD).setScale((AR * 2) / 512);
  arr.add(arrIm);
  sc.tweens.add({ targets: arr, scaleX: 1, scaleY: HOANG_CHUNG.ky, alpha: 1, duration: 420, ease: 'Back.easeOut' });
  sc.tweens.add({ targets: arrIm, angle: 360, duration: 12000, repeat: -1 });
  // chuông: rơi từ trên xuống úp lên người
  const bell = sc.add.image(0, 0, HOANG_CHUNG.bell).setOrigin(0.5, 0.93).setBlendMode(ADD).setDepth(11).setScale(BS * 0.8).setAlpha(0);
  let drop = 70;
  sc.tweens.add({ targets: bell, alpha: 0.95, scale: BS, duration: 260, ease: 'Quad.easeIn' });
  sc.tweens.add({ targets: { v: 70 }, v: 0, duration: 260, ease: 'Quad.easeIn', onUpdate: (tw) => { drop = tw.getValue() ?? 0; } });
  let t = 0;
  const ev = sc.time.addEvent({
    delay: 16, loop: true, callback: () => {
      t += 16;
      const f = foot();
      arr.setPosition(f.x, f.y);
      bell.setPosition(f.x, f.y + 2 - drop);
      if (t > 300) bell.setAlpha(0.82 + Math.sin(t / 70) * 0.06 + Math.sin(t / 23) * 0.04);   // lửa chập chờn
    },
  });
  const toll = (big: boolean) => {
    const f = foot();
    sc.tweens.add({ targets: bell, scaleX: BS * 1.08, scaleY: BS * 0.94, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    sc.tweens.add({ targets: arrIm, alpha: { from: 1, to: 0.6 }, duration: 260, yoyo: true });
    // sóng vàng lan trên mặt đất (ảnh vòng sáng elip)
    for (const [d, s0] of [[0, 0.35], [90, 0.25]] as const) {
      const g = sc.add.image(f.x, f.y, HOANG_CHUNG.ground).setBlendMode(ADD).setDepth(4).setScale(s0, s0 * 1.5).setAlpha(0.95);
      const sx = R / 115;                                                // vòng sáng trong ảnh: bán kính ngang 115px, dọc = 1/3
      sc.tweens.add({ targets: g, scaleX: sx, scaleY: sx * 1.5, alpha: 0, duration: 520, delay: d, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
    }
    k.glow(f.x, f.y - HOANG_CHUNG.bellH * 0.45, 0xffd060, 70, 260, { alpha: big ? 0.9 : 0.7 });
    k.burst(f.x, f.y - HOANG_CHUNG.bellH * 0.5, [0xffe080, 0xffb030, 0xffffff], big ? 22 : 12, { tex: VT.DOT, speed: [60, 220], scale: [0.5, 0], life: 520 });
    k.shake(big ? 180 : 120, big ? 0.007 : 0.004);
    for (const o of near(s, f, R)) s.hit(o, 0xf0c040);
  };
  if (aw) { k.later(560, () => toll(false)); k.later(1180, () => toll(false)); k.later(1800, () => toll(false)); }
  k.later(DUR - 300, () => toll(true));
  k.later(DUR, () => {
    ev.remove();
    sc.tweens.add({ targets: bell, alpha: 0, scale: BS * 1.15, duration: 320, onComplete: () => bell.destroy() });
    sc.tweens.add({ targets: arr, alpha: 0, scaleX: 0.3, scaleY: 0.3 * HOANG_CHUNG.ky, duration: 380, ease: 'Back.easeIn', onComplete: () => arr.destroy(true) });
  });
};

export const LINH_VUC = { gold: 'vx_lv_gold', red: 'vx_lv_red', ring: 'vx_lv_ring', ky: 0.5 } as const;

// lĩnh vực đang bật (duy trì VĨNH VIỄN): thi triển lại cùng loại thì giữ nguyên, đổi loại thì thay
let lvActive: { aw: boolean; r: number; scene: Phaser.Scene; stop: () => void } | null = null;
/** Tắt lĩnh vực đang bật (game: hết màn / bỏ kỹ năng) */
export function stopLinhVuc(): void { lvActive?.stop(); }

const linhVuc: Fx = (s, aw) => {
  // trận đồ dưới chân (ảnh mẫu, tools/art/linh_vuc.py): thường = trận đồ VÀNG; thức tỉnh = trận đồ ĐỎ
  // + vòng gai đỏ bao ngoài, 2 lớp xoay NGƯỢC chiều nhau. Ảnh xoay trong container nén dọc = xoay trên mặt đất.
  // DUY TRÌ VĨNH VIỄN quanh nhân vật (không hết giờ); trang demo: tắt khi chọn kỹ năng khác
  const R = s.opt?.r ?? (aw ? 240 : 170);
  if (lvActive?.aw === aw && lvActive.r === R && lvActive.scene === s.kit.scene) return;
  lvActive?.stop();
  const k = s.kit, sc = k.scene;
  const ADD = Phaser.BlendModes.ADD;
  const foot = () => pt(s.hero.x, s.hero.y + 20);
  const layers: { c: Phaser.GameObjects.Container; im: Phaser.GameObjects.Image; spin: number }[] = [];
  const layer = (tex: string, half: number, spin: number, depth: number) => {
    const c = sc.add.container(0, 0).setDepth(depth).setScale(0.2, 0.2 * LINH_VUC.ky).setAlpha(0);
    const im = sc.add.image(0, 0, tex).setBlendMode(ADD).setScale(half / 256);
    c.add(im);
    sc.tweens.add({ targets: c, scaleX: 1, scaleY: LINH_VUC.ky, alpha: 1, duration: 450, ease: 'Back.easeOut' });
    layers.push({ c, im, spin });
  };
  if (aw) {
    layer(LINH_VUC.red, (R * 0.7) / 0.76, 1, 3);                         // trận đồ đỏ (vòng ngoài của trận đồ ≈ 0.76 nửa ảnh)
    layer(LINH_VUC.ring, R / 0.8, -1, 2);                                // vòng gai đỏ bao ngoài, xoay ngược
  } else layer(LINH_VUC.gold, R / 0.76, 1, 3);
  const mist = sc.add.particles(0, 0, VT.DOT, {
    lifespan: 1200, speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 }, scale: { start: 0.4, end: 0 }, alpha: { start: 0.8, end: 0 },
    tint: aw ? [0xff3a3a, 0xff8a6a] : [0xffe060, 0xfff0a0], blendMode: ADD, frequency: 40,
    emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, R * 2, R * 2 * LINH_VUC.ky) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
  }).setDepth(4);
  let t = 0;
  const ev = sc.time.addEvent({
    delay: 16, loop: true, callback: () => {
      t += 16;
      if (s.current && s.current() !== 'linh_vuc') { stop(); return; }   // trang demo: đã chọn kỹ năng khác
      const h = H(s), f = foot();
      for (const L of layers) { L.c.setPosition(f.x, f.y); L.im.setRotation((L.spin * t) / 2600); }
      mist.setPosition(f.x, f.y);
      if (t % 600 < 16) for (const o of near(s, h, R)) s.hit(o, aw ? 0xff4a5a : 0xffd040);
    },
  });
  const me = { aw, r: R, scene: sc, stop: () => {} };
  const stop = () => {
    if (lvActive === me) lvActive = null;
    ev.remove();
    if (!mist.scene) return;                                           // scene đã đóng (hết màn): hình đã bị huỷ theo
    mist.stop();
    for (const L of layers) sc.tweens.add({ targets: L.c, alpha: 0, scaleX: 0.3, scaleY: 0.3 * LINH_VUC.ky, duration: 400, ease: 'Back.easeIn', onComplete: () => L.c.destroy(true) });
    k.later(1300, () => mist.destroy());
  };
  me.stop = stop;
  lvActive = me;
};

export const DAI_DAO = { layers: 'vx_dd_layers', cell: 512, n: 13, ky: 0.5 } as const;

const daiDao: Fx = (s, aw) => {
  // TRẬN ÂM DƯƠNG BÁT QUÁI lấy nguyên từ video mẫu (tools/art/dai_dao.py), nằm trên MẶT ĐẤT dưới chân, rất to:
  // 1) ngưng đọng thời gian: nền tối lại, trận thêm dần TỪNG VÒNG (13 lớp tách từ video, đã căn cỡ trùng khít;
  //    lớp mới hoà mờ dần đè lên lớp trước → chỉ thấy vòng mới mọc thêm ra ngoài, không giật, không to nhỏ bất thường)
  // 2) quy nhất: trận xoay nhanh dần rồi thu về 1 điểm sáng ở tâm âm dương
  // 3) nổ toàn màn hình. Thức tỉnh: trận vàng kim, to hơn, linh khí hút về tâm, nổ mạnh hơn
  const k = s.kit, sc = k.scene;
  const ADD = Phaser.BlendModes.ADD;
  const cam = sc.cameras.main;
  const R = aw ? 400 : 330;                                            // bán kính trận trên mặt đất
  const COL = aw ? 0xffe7a0 : 0xe8e0ff;
  const BLOOM = 2000, HOLD = 250, GATHER = 450;
  const c0 = pt(s.hero.x, s.hero.y + 20);                              // tâm trận: cập nhật theo chân nhân vật mỗi khung
  // ngưng đọng: phủ tối nền (dưới nhân vật/quái), trận nằm trên lớp phủ
  const veil = sc.add.rectangle(cam.worldView.centerX, cam.worldView.centerY, cam.width * 4, cam.height * 4, aw ? 0x1a1206 : 0x0c0a1c, 0).setDepth(1);
  sc.tweens.add({ targets: veil, fillAlpha: 0.6, duration: 300 });
  const arr = sc.add.container(c0.x, c0.y).setDepth(2).setScale(1, DAI_DAO.ky);
  const SCL = (R * 2) / (DAI_DAO.cell * 0.96);                         // mép ngoài lớp cuối = 0,96 nửa ô
  const im = sc.add.image(0, 0, DAI_DAO.layers, 0).setBlendMode(ADD).setTint(COL).setScale(SCL);
  const nx = sc.add.image(0, 0, DAI_DAO.layers, 1).setBlendMode(ADD).setTint(COL).setScale(SCL).setAlpha(0);
  arr.add([im, nx]);
  const core = sc.add.image(c0.x, c0.y, VT.SOFT).setBlendMode(ADD).setTint(COL).setDepth(3).setScale(0).setAlpha(0.9);
  let em: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  if (aw) {
    em = sc.add.particles(c0.x, c0.y, VT.DOT, {
      lifespan: 700, speed: 0, scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd860, 0xffffff], blendMode: ADD, frequency: 8,
      emitCallback: (p: Phaser.GameObjects.Particles.Particle) => { const a = Math.random() * 6.28, r = R; p.x = Math.cos(a) * r; p.y = Math.sin(a) * r * DAI_DAO.ky; p.velocityX = -p.x * 1.4; p.velocityY = -p.y * 1.4; },
    }).setDepth(4);
  }
  let t = 0, spin = 0, spd = 0.02;
  const ev = sc.time.addEvent({
    delay: 16, loop: true, callback: () => {
      t += 16;
      c0.x = s.hero.x; c0.y = s.hero.y + 20;                           // trận đi theo nhân vật
      arr.setPosition(c0.x, c0.y); core.setPosition(c0.x, c0.y); em?.setPosition(c0.x, c0.y);
      // thêm vòng: lớp i đang hiện, lớp i+1 hoà mờ vào trong 60% cuối của nhịp
      const u = Math.min(1, t / BLOOM) * (DAI_DAO.n - 1);
      const i = Math.min(DAI_DAO.n - 1, Math.floor(u));
      if (+im.frame.name !== i) im.setFrame(i);
      if (i < DAI_DAO.n - 1) nx.setFrame(i + 1).setAlpha(Phaser.Math.Clamp((u - i - 0.4) / 0.6, 0, 1));
      else nx.setAlpha(0);
      if (t > BLOOM + HOLD) spd = Math.min(0.5, spd * 1.12 + 0.004);        // quy nhất: xoay nhanh dần
      spin += spd;
      im.setRotation(spin);
      nx.setRotation(spin);
    },
  });
  // quy nhất: thu về 1 điểm, lõi sáng phình lên
  k.later(BLOOM + HOLD, () => {
    sc.tweens.add({ targets: arr, scaleX: 0.02, scaleY: 0.02 * DAI_DAO.ky, duration: GATHER, ease: 'Cubic.easeIn' });
    sc.tweens.add({ targets: core, scale: aw ? 2.2 : 1.6, duration: GATHER, ease: 'Cubic.easeIn' });
    em?.stop();
  });
  // nổ toàn màn hình
  k.later(BLOOM + HOLD + GATHER, () => {
    ev.remove(); arr.destroy(true); em?.destroy();
    sc.tweens.add({ targets: core, scale: aw ? 9 : 7, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
    sc.tweens.add({ targets: veil, fillAlpha: 0, duration: 500, onComplete: () => veil.destroy() });
    k.flash(0xffffff, 260, aw ? 0.8 : 0.7);
    // quầng sáng + sóng nổ nằm trên MẶT ĐẤT (cùng góc nhìn với trận đồ)
    const gl = sc.add.image(c0.x, c0.y, VT.SOFT).setBlendMode(ADD).setTint(COL).setDepth(3).setScale(0.5, 0.5 * DAI_DAO.ky);
    const gs = (aw ? 800 : 650) / 64;
    sc.tweens.add({ targets: gl, scaleX: gs, scaleY: gs * DAI_DAO.ky, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => gl.destroy() });
    for (let i = 0; i < (aw ? 4 : 3); i++) k.later(i * 90, () => k.ring(c0.x, c0.y, i % 2 ? COL : 0xffffff, 30, aw ? 640 : 520, 600, true, { depth: 3, ky: DAI_DAO.ky }));
    k.burst(c0.x, c0.y - 20, [0xffffff, aw ? 0xffd860 : 0xc8b8ff], aw ? 50 : 36, { tex: VT.SPARK, speed: [160, 460], scale: [0.5, 0], life: 600, depth: 84 });
    k.shake(aw ? 260 : 200, aw ? 0.007 : 0.005);                       // rung nhẹ
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
  // LẬT MÌNH THEO ĐƯỜNG BAY: bay sang trái thì phải lật ảnh để bụng/hàm ở dưới. Không lật cả con một lúc (giật / thấy
  // "đường ranh"), mà mỗi đốt tự lật đúng lúc nó đi qua chỗ đường bay dựng đứng — chỗ thân thẳng đứng trên màn hình thì
  // trên/dưới khó phân biệt nên không lộ. Lật bằng cách hoà 2 bản (thường + lật) trên vài đốt quanh chỗ đó, thân KHÔNG mỏng đi.
  const ropeF = sc.add.rope(0, 0, DRAGON_TEX.rope + (aw ? '_aw' : ''), undefined, ropePts, true).setScale(ROPE_S).setDepth(16).setAlpha(0).setFlipY(true);
  ropeF.setColors(0xffffff);
  const ropeFA = new Array<number>(SEG).fill(0);
  const segF = new Array<number>(SEG).fill(-1);                            // trạng thái lật từng đốt (0/1, -1 = chưa có)
  const segW = new Array<number>(SEG).fill(0);
  const HJ = Math.round(SEG * 0.22);                                       // số đốt thuộc phần đầu (lật cùng nhau)
  let headW = 0;
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
    if (portal.active) {                                                 // cổng xoáy đi theo nhân vật; khúc đuôi chưa ra hết vẫn chui từ cổng
      portal.setPosition(hero.x, hero.y + 2);
      if (realN < SEG) { const o = trail[trail.length - 1]; o.x = hero.x; o.y = hero.y; }
    }
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
    const hp = body[0], hq = body[3];
    const hrot = Math.atan2(hp.y - hp.z - (hq.y - hq.z), hp.x - hq.x) || head.a;
    ropeF.setPoints(ropePts);
    for (let j = 0; j < SEG; j++) {                                         // hướng bay tại từng đốt (không tính sóng uốn)
      const pa = body[Math.max(0, j - 2)], pb = body[Math.min(SEG - 1, j + 2)];
      const dx = pa.x - pb.x, dl = Math.hypot(dx, (pa.y - pa.z) - (pb.y - pb.z));
      if (dl < 0.5) { if (segF[j] < 0) segF[j] = 0; continue; }
      const cs = dx / dl;
      if (segF[j] < 0) segF[j] = cs < 0 ? 1 : 0;
      else if (cs < -0.2) segF[j] = 1; else if (cs > 0.2) segF[j] = 0;      // ngưỡng trễ: không lật qua lại khi đi dọc
    }
    headW += Phaser.Math.Clamp(segF[0] - headW, -dt / 0.16, dt / 0.16);    // đầu lật cùng lúc, hoà nhanh
    for (let j = 0; j < SEG; j++) {
      if (j < HJ) { segW[j] = headW; continue; }
      let sm = 0, n = 0;
      for (let q = j - 3; q <= j + 3; q++) if (q >= HJ && q < SEG) { sm += segF[q]; n++; }
      segW[j] = sm / n;
    }
    for (let j = HJ; j < Math.min(SEG, HJ + 4); j++) {                      // cổ: nối mượt giữa đầu và thân
      const t = (j - HJ + 1) / 5;
      segW[j] = headW * (1 - t) + segW[j] * t;
    }
    rope.setAlpha(fade); ropeF.setAlpha(fade);
    let anyN = false, anyF = false;
    for (let i = 0; i < SEG; i++) {
      const j = SEG - 1 - i;                                                // j: 0 = đầu … SEG-1 = đuôi
      const a = Phaser.Math.Clamp((realN - 1 - j) / 6, 0, 1);
      const w = segW[j] * segW[j] * (3 - 2 * segW[j]);
      ropeA[i] = a * Math.min(1, 2 * (1 - w));                              // chỗ hoà: cả 2 bản đều đậm → thân không nhạt đi
      ropeFA[i] = a * Math.min(1, 2 * w);
      if (ropeA[i] > 0.001) anyN = true;
      if (ropeFA[i] > 0.001) anyF = true;
    }
    rope.setAlphas(ropeA); ropeF.setAlphas(ropeFA);
    rope.setVisible(anyN); ropeF.setVisible(anyF);
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
  ho_khieu: hoKhieu, linh_dan: linhDan, hoa_phu: hoaPhu, khi_long: khiLong, than_thuc: thanThuc,
  hu_khong: huKhong, phap_tuong: phapTuong, van_kiem: vanKiem, than_loi: thanLoi, lien_hoa: lienHoa, ngan_ha: nganHa,
  hoang_chung: hoangChung, linh_vuc: linhVuc, dai_dao: daiDao,
};
