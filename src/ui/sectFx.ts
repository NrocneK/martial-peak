import { SECT_FX, SECT_FX_V, type SectFxDef, type SectRect } from '../config/sectFx';

/**
 * HOẠT ẢNH NỀN TÔNG MÔN — 1 canvas trong suốt phủ lên ảnh nền `.sect` (không chặn bấm):
 *   mây trôi chậm → đảo bay nhấp nhô → vệt nước chảy trên thác → sóng sáng trôi dọc dòng linh khí → cánh hoa đào bay.
 * Toạ độ theo điểm ảnh ảnh nền, quy đổi giống background-size: cover + background-position.
 * Chỉ vẽ khi `.sect` đang hiện và tab đang mở (~30 khung/giây). Máy bật "giảm chuyển động": vẽ 1 khung tĩnh
 * (đảo đã tách khỏi ảnh nền nên vẫn phải vẽ).
 */
const TALL_MQ = '(max-aspect-ratio: 1/1)';
const FRAME_MS = 1000 / 30;
const PETAL_COLORS = ['#ffb7d5', '#ff9cc6', '#ffd1e4', '#f58bb8'];

interface Petal { x: number; y: number; vx: number; vy: number; ph: number; spin: number; s: number; c: string }

function loadImg(name: string): HTMLImageElement {
  const im = new Image();
  im.src = `/ui/sect/${name}.png?v=${SECT_FX_V}`;
  return im;
}

/** Vệt nước: ô 48×96 với các vạch sáng dọc ngắn ngẫu nhiên — lặp + trượt xuống tạo cảm giác nước chảy */
function streakTile(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 96;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(Math.random() * 48), y = Math.random() * 96, len = 10 + Math.random() * 26;
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, `rgba(255,255,255,${0.45 + Math.random() * 0.45})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(x, y, 1 + (Math.random() < 0.3 ? 1 : 0), len);
    if (y + len > 96) g.fillRect(x, y - 96, 1, len);                     // nối liền khi lặp
  }
  return c;
}

export class SectFx {
  private readonly cv = document.createElement('canvas');
  private readonly ctx = this.cv.getContext('2d')!;
  /** canvas phụ để "tô" mặt nạ (thác / linh khí) bằng hoạ tiết chuyển động */
  private readonly tmp = document.createElement('canvas');
  private readonly tctx = this.tmp.getContext('2d')!;
  private readonly streaks = streakTile();
  private def: SectFxDef | null = null;
  private imgs = new Map<string, HTMLImageElement>();
  private petals: Petal[] = [];
  private raf = 0;
  private last = 0;
  private k = 1; private ox = 0; private oy = 0;
  private readonly still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly host: HTMLElement, private readonly kind: 'lobby' | 'menu') {
    this.cv.className = 'sect-fx';
    this.cv.setAttribute('aria-hidden', 'true');
    host.prepend(this.cv);
    new ResizeObserver(() => this.layout()).observe(host);
    document.addEventListener('visibilitychange', () => this.kick());
    this.layout();
  }

  private pick(): SectFxDef | null {
    return SECT_FX[`${this.kind}_${window.matchMedia(TALL_MQ).matches ? 'tall' : 'wide'}`] ?? null;
  }

  private layout(): void {
    const W = this.host.clientWidth, H = this.host.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const d = this.pick();
    if (d !== this.def) {
      this.def = d;
      this.imgs.clear();
      if (d) {
        for (const r of [...d.islands, d.fall, d.qi]) if (r) this.imgs.set(r.src, loadImg(r.src));
        for (const im of this.imgs.values()) im.onload = () => this.kick(true);
      }
    }
    if (!d) { this.ctx.clearRect(0, 0, W, H); return; }
    this.k = Math.max(W / d.w, H / d.h);
    this.ox = (W - d.w * this.k) * d.posX;
    this.oy = (H - d.h * this.k) * d.posY;
    const n = Math.round(Math.min(26, Math.max(10, (W * H) / 52000)));
    while (this.petals.length < n) this.petals.push(this.newPetal(W, H, true));
    this.petals.length = n;
    this.kick(true);
  }

  /** chạy vòng vẽ nếu cần (hoặc vẽ 1 khung khi giảm chuyển động / khi vừa đổi cỡ) */
  private kick(force = false): void {
    if (this.still) { if (force) this.draw(0); return; }
    if (!this.raf && !document.hidden) this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(t: number): void {
    this.raf = 0;
    if (!this.host.isConnected || document.hidden) return;              // dừng hẳn; mở lại tab / gắn lại sẽ kick
    if (this.host.offsetParent !== null && t - this.last >= FRAME_MS) {
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.step(dt);
      this.draw(t / 1000);
    }
    this.raf = requestAnimationFrame((tt) => this.tick(tt));
  }

  /** gọi lại khi .sect được gắn vào trang (màn hình đổi qua lại) */
  resume(): void { this.layout(); }

  private newPetal(W: number, H: number, anywhere: boolean): Petal {
    // gió nhẹ từ trái sang phải, rơi chéo xuống
    return {
      x: anywhere ? Math.random() * W : -20 - Math.random() * W * 0.3,
      y: anywhere ? Math.random() * H : Math.random() * H * 0.7 - 30,
      vx: 18 + Math.random() * 22, vy: 14 + Math.random() * 16,
      ph: Math.random() * Math.PI * 2, spin: 1.5 + Math.random() * 2.5,
      s: 3 + Math.round(Math.random() * 1.5), c: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
    };
  }

  private step(dt: number): void {
    const W = this.host.clientWidth, H = this.host.clientHeight;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.ph += dt * p.spin;
      p.x += (p.vx + Math.sin(p.ph * 0.7) * 14) * dt;
      p.y += (p.vy + Math.cos(p.ph * 0.5) * 6) * dt;
      if (p.x > W + 20 || p.y > H + 20) this.petals[i] = this.newPetal(W, H, false);
    }
  }

  private img(r: SectRect | undefined): HTMLImageElement | null {
    const im = r && this.imgs.get(r.src);
    return im && im.complete && im.naturalWidth ? im : null;
  }

  private draw(sec: number): void {
    const d = this.def;
    const W = this.host.clientWidth, H = this.host.clientHeight;
    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    if (!d) return;
    const { k, ox, oy } = this;
    const X = (x: number): number => ox + x * k, Y = (y: number): number => oy + y * k;

    // 1) mây: cụm bông mờ trôi ngang rất chậm (làn đi hết ~90 giây), mờ dần ở 2 đầu làn
    for (const [li, [cy, x0, x1, r]] of d.clouds.entries()) {
      for (let j = 0; j < 3; j++) {
        const u = ((sec / 90 + j / 3 + li * 0.17) % 1);
        const cx = x0 + (x1 - x0) * u;
        const a = Math.sin(u * Math.PI) * 0.22;
        for (const [dx, dy, rr] of [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [0.35, -0.35, 0.65]]) {
          const px = X(cx + dx * r), py = Y(cy + dy * r), R = rr * r * k;
          const g = c.createRadialGradient(px, py, 0, px, py, R);
          g.addColorStop(0, `rgba(255,255,255,${a})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.fillRect(px - R, py - R, R * 2, R * 2);
        }
      }
    }

    // 2) thác: vệt sáng trượt xuống, chỉ hiện trên điểm ảnh nước
    const fall = this.img(d.fall);
    if (fall && d.fall) this.maskFill(fall, d.fall, (g, w, h) => {
      const s = 1.6;                                                     // 1 ô vệt = 48×96 điểm ảnh nền × s
      g.save();
      g.scale(s * k, s * k);
      g.translate(0, (sec * 70) % 96);
      g.fillStyle = g.createPattern(this.streaks, 'repeat')!;
      g.fillRect(0, -96, w / (s * k), h / (s * k) + 192);
      g.restore();
    }, 0.55);

    // 3) linh khí: dải sáng chéo trôi qua dòng suối
    const qi = this.img(d.qi);
    if (qi && d.qi) this.maskFill(qi, d.qi, (g, w, h) => {
      const P = 160 * k, off = ((sec * 55 * k) % P);
      const gr = g.createLinearGradient(off - P, 0, off, P * 0.4);
      for (let i = 0; i <= 4; i++) {
        gr.addColorStop(i / 4, i % 2 ? 'rgba(220,255,255,0.95)' : 'rgba(120,240,255,0)');
      }
      g.fillStyle = gr;
      g.save();
      for (let x = -P; x < w + P; x += P) { g.setTransform(1, 0, 0, 1, x, 0); g.fillRect(-P, 0, P * 2, h); }
      g.restore();
    }, 0.7);

    // 4) đảo bay: nhấp nhô 3 điểm ảnh, mỗi đảo một nhịp
    c.imageSmoothingEnabled = true;
    d.islands.forEach((r, i) => {
      const im = this.img(r);
      if (!im) return;
      const per = 4 + (i % 3) * 1.3, dy = this.still ? 0 : Math.sin((sec / per) * Math.PI * 2 + i * 1.7) * 3;
      c.drawImage(im, X(r.x), Y(r.y + dy), r.w * k, r.h * k);
    });

    // 5) cánh hoa đào (pixel: hình thoi nhỏ lật như đang xoay)
    if (!this.still) {
      for (const p of this.petals) {
        const sx = Math.max(0.25, Math.abs(Math.cos(p.ph)));
        c.save();
        c.translate(p.x, p.y);
        c.rotate(Math.sin(p.ph * 0.6) * 0.8);
        c.scale(sx, 1);
        c.fillStyle = p.c;
        c.fillRect(-p.s, -p.s / 2, p.s * 2, p.s);
        c.fillRect(-p.s / 2, -p.s, p.s, p.s * 2);
        c.restore();
      }
    }
  }

  /** vẽ hoạ tiết `paint` chỉ trong mặt nạ `mask` (vùng r), cộng sáng lên nền */
  private maskFill(mask: HTMLImageElement, r: SectRect, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void, alpha: number): void {
    const { k } = this;
    const w = Math.ceil(r.w * k), h = Math.ceil(r.h * k);
    if (this.tmp.width !== w || this.tmp.height !== h) { this.tmp.width = w; this.tmp.height = h; }
    const g = this.tctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    paint(g, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0, w, h);
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.globalCompositeOperation = 'lighter';
    c.drawImage(this.tmp, this.ox + r.x * k, this.oy + r.y * k);
    c.restore();
  }
}
