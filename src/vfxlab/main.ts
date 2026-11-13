// =====================================================================
// TRANG XEM THỬ VFX KỸ NĂNG (vfx-lab.html) — tách khỏi game.
// Nhân vật đứng giữa sân tập, hình nhân gỗ quanh người; chọn kỹ năng để diễn hiệu ứng (src/vfx/skillFx.ts).
// =====================================================================
import Phaser from 'phaser';
import { SKILLS, skillIcon, type SkillDef } from '../config/skills';
import { makeVfxTextures, VT } from '../vfx/textures';
import { VfxKit, type Pt } from '../vfx/VfxKit';
import { SKILL_FX, QI_SWORD, BA_DAO_DIRS, SPEAR_TEX, FIST_TEX, ARROW_HEAD, TIGER_HEAD, SHOCK_T3, SHOCK_T6, FIRE_TEX, BURN_TEX, FIRE_SWIRL, DRAGON_TEX, QI_ARM, QI_AURA, FIRE_SLASH, BLACK_HOLE, BH_BLAST, PHAP_TUONG, SPIRIT_ORB, ORB_BOLT, baDaoKey, baDaoWaveKey, type Stage } from '../vfx/skillFx';

interface Dummy extends Pt {
  img: Phaser.GameObjects.Image;
  hitT: number;
  hx: number;   // chỗ đứng gốc (bị lốc kéo đi thì tự trôi về)
  hy: number;
  dragT: number;
}

class LabScene extends Phaser.Scene {
  kit!: VfxKit;
  hero!: Phaser.GameObjects.Sprite;
  dummies: Dummy[] = [];
  stage!: Stage;
  current: { id: string; aw: boolean } | null = null;
  loop = true;
  walk = false;
  /** hướng nhìn cố định (góc, 0 = Đông) — null = tự quay về mục tiêu gần nhất */
  dir: number | null = null;
  private timer = 0;
  private t = 0;

  constructor() {
    super('lab');
  }

  preload(): void {
    this.load.spritesheet('hero', '/ui/hero_b_walk.png', { frameWidth: 52, frameHeight: 68 });
    this.load.image(QI_SWORD, '/vfx/qi_sword_light.png');
    for (const [key, f] of [[SHOCK_T3, 'shock_t3'], [SHOCK_T6, 'shock_t6']]) this.load.spritesheet(key, `/vfx/${f}.png?v=1`, { frameWidth: 256, frameHeight: 159 });
    for (const [n, key] of Object.entries(DRAGON_TEX)) for (const sf of ['', '_aw']) this.load.image(key + sf, `/vfx/dragon_${n}${sf}.png?v=4`);
    this.load.image(ORB_BOLT, '/vfx/orb_bolt.png?v=1');
    this.load.image(QI_ARM, '/vfx/qi_arm.png?v=9');
    this.load.image(QI_AURA, '/vfx/qi_aura.png?v=8');
    for (const k of ['glow', 'dark'] as const) this.load.spritesheet(BH_BLAST[k], `/vfx/bh_blast_${k}.png?v=1`, { frameWidth: BH_BLAST.fw, frameHeight: BH_BLAST.fh });
    this.load.spritesheet(BLACK_HOLE.key, '/vfx/black_hole.png?v=1', { frameWidth: BLACK_HOLE.fw, frameHeight: BLACK_HOLE.fh });
    this.load.spritesheet(PHAP_TUONG.avatar, '/vfx/phap_tuong_avatar.png?v=2', { frameWidth: PHAP_TUONG.avW, frameHeight: PHAP_TUONG.avH });
    this.load.image(PHAP_TUONG.palm, '/vfx/phap_tuong_palm.png?v=5');
    this.load.image(FIRE_SLASH.key, '/vfx/fire_slash.png?v=5');
    this.load.spritesheet(SPIRIT_ORB, '/vfx/spirit_orb.png?v=1', { frameWidth: 96, frameHeight: 96 });
    for (const [n, key] of Object.entries(BURN_TEX)) this.load.spritesheet(key, `/vfx/burn_${n}.png?v=2`, { frameWidth: 256, frameHeight: 201 });
    for (const [n, key] of Object.entries(BURN_TEX)) this.load.spritesheet(key + '_blue', `/vfx/burn_${n}_blue.png?v=1`, { frameWidth: 256, frameHeight: 201 });
    this.load.spritesheet(FIRE_TEX.blast + '_purple', '/vfx/fire_blast_purple.png?v=1', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet(FIRE_TEX.blast + '_blue', '/vfx/fire_blast_blue.png?v=1', { frameWidth: 192, frameHeight: 192 });
    this.load.image(FIRE_TEX.ring + '_blue', '/vfx/fire_ring_blue.png?v=1');
    this.load.spritesheet(FIRE_SWIRL, '/vfx/fire_swirl_blue.png?v=1', { frameWidth: 256, frameHeight: 200 });
    this.load.image(FIRE_TEX.talisman, '/vfx/fire_talisman.png?v=1');
    this.load.image(FIRE_TEX.ring, '/vfx/fire_ring.png?v=1');
    this.load.spritesheet(FIRE_TEX.blast, '/vfx/fire_blast.png?v=1', { frameWidth: 192, frameHeight: 192 });
    this.load.image(TIGER_HEAD, '/vfx/tiger_head.png?v=6');
    this.load.image(ARROW_HEAD, '/vfx/arrow_head.png?v=1');
    for (const [n, key] of Object.entries(FIST_TEX)) this.load.image(key, `/vfx/fist_${n}.png?v=3`);
    for (const [n, key] of Object.entries(SPEAR_TEX)) this.load.image(key, `/vfx/spear_${n}.png?v=1`);
    for (const d of BA_DAO_DIRS) this.load.image(baDaoKey(d), `/vfx/ba_dao_slash_${d}.png?v=2`), this.load.image(baDaoWaveKey(d), `/vfx/ba_dao_wave_${d}.png?v=2`);
    // tư thế thi triển: hàng = hướng (s,sw,w,nw,n,ne,e,se), cột = tư thế 1, 2
    this.load.spritesheet('cast_ngu_kiem', '/ui/hero_cast_ngukiem.png?v=0.15.1', { frameWidth: 52, frameHeight: 68 });
  }

  create(): void {
    makeVfxTextures(this);
    this.kit = new VfxKit(this);
    // nền sân tập: ô gạch tối + vòng sân
    const g = this.add.graphics().setDepth(-10);
    for (let y = -600; y < 600; y += 48) for (let x = -900; x < 900; x += 48) {
      g.fillStyle(((x + y) / 48) % 2 === 0 ? 0x1a1828 : 0x1d1b2e, 1);
      g.fillRect(x, y, 48, 48);
    }
    g.lineStyle(2, 0x2c2a4a, 1).strokeCircle(0, 0, 300);
    this.hero = this.add.sprite(0, 0, 'hero', 6).setDepth(10).setOrigin(0.5, 0.62);
    this.textures.get('hero').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('cast_ngu_kiem').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.ellipse(0, 18, 40, 12, 0x000000, 0.35).setDepth(1);
    const spots: Pt[] = [];
    for (let i = 0; i < 8; i++) spots.push({ x: Math.cos((i / 8) * Math.PI * 2 + 0.2) * 130, y: Math.sin((i / 8) * Math.PI * 2 + 0.2) * 100 });
    for (let i = 0; i < 6; i++) spots.push({ x: Math.cos((i / 6) * Math.PI * 2 + 0.5) * 230, y: Math.sin((i / 6) * Math.PI * 2 + 0.5) * 170 });
    for (const p of spots) {
      this.add.ellipse(p.x, p.y + 20, 26, 8, 0x000000, 0.35).setDepth(1);
      const img = this.add.image(p.x, p.y, VT.DUMMY).setDepth(5).setOrigin(0.5, 0.6);
      this.dummies.push({ x: p.x, y: p.y, img, hitT: 0, hx: p.x, hy: p.y, dragT: 0 });
    }
    this.cameras.main.centerOn(0, 0);
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());
    this.stage = {
      kit: this.kit,
      hero: this.hero,
      targets: () => {
        const h = this.hero;
        const d = (t: Pt) => Math.hypot(t.x - h.x, t.y - h.y);
        // có chọn hướng: ưu tiên mục tiêu nằm gần hướng đó (lệch góc), rồi mới tới khoảng cách
        const off = (t: Pt) => (this.dir === null ? 0 : Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - h.y, t.x - h.x) - this.dir)));
        return [...this.dummies].sort((a, b) => off(a) * 400 + d(a) - (off(b) * 400 + d(b)));
      },
      hit: (t: Pt, color = 0xffffff) => {
        const d = t as Dummy;
        if (!d.img) return;
        d.img.setTintFill(color);
        d.hitT = 0.09;
        this.tweens.add({ targets: d.img, angle: { from: -10, to: 0 }, duration: 160, ease: 'Back.easeOut' });
      },
      drag: (t, x, y) => {
        const d = t as Dummy;
        if (!d.img) return;
        d.x = x;
        d.y = y;
        d.img.setPosition(x, y);
        d.dragT = 0.25;
      },
      pose: (skill, n, a0) => {
        const a = this.dir ?? a0;
        // góc → hàng hướng của sprite (0 = Đông, chiều kim đồng hồ vì trục y hướng xuống)
        const oct = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
        const row = [6, 7, 0, 1, 2, 3, 4, 5][oct];
        const key = 'cast_' + skill;
        if (n === 0 || !this.textures.exists(key)) this.hero.setTexture('hero', this.idleFrame(a));
        else this.hero.setTexture(key, row * 2 + (n - 1));
      },
    };
  }

  /** khung đứng của hướng gần góc `a` nhất (hero_b_walk.png: 8 hàng × 7 khung, khung 6 = đứng) */
  idleFrame(a: number): number {
    const oct = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    return [6, 7, 0, 1, 2, 3, 4, 5][oct] * 7 + 6;
  }

  setDir(a: number | null): void {
    this.dir = a;
    this.hero.setTexture('hero', this.idleFrame(a ?? Math.PI / 2));
    if (this.current) this.play(this.current.id, this.current.aw);
  }

  private fitZoom(): void {
    const cam = this.cameras.main;
    cam.setZoom(Math.min(cam.width / 600, cam.height / 480, 2.2));
    cam.centerOn(0, 0);
  }

  play(id: string, aw: boolean): void {
    this.current = { id, aw };
    this.hero.setTexture('hero', this.idleFrame(this.dir ?? Math.PI / 2));
    this.timer = 3.4;
    SKILL_FX[id]?.(this.stage, aw);
  }

  update(_t: number, dms: number): void {
    const dt = dms / 1000;
    this.t += dt;
    for (const d of this.dummies) {
      if (d.hitT > 0 && (d.hitT -= dt) <= 0) d.img.clearTint();
      if (d.dragT > 0) d.dragT -= dt;
      else if (d.x !== d.hx || d.y !== d.hy) {                             // hết bị kéo → trôi về chỗ cũ
        const k = Math.min(1, dt * 3);
        d.x += (d.hx - d.x) * k;
        d.y += (d.hy - d.y) * k;
        if (Math.hypot(d.hx - d.x, d.hy - d.y) < 0.5) { d.x = d.hx; d.y = d.hy; }
        d.img.setPosition(d.x, d.y);
      }
    }
    if (this.walk) {
      this.hero.setPosition(Math.cos(this.t * 0.6) * 60, Math.sin(this.t * 0.6) * 40);
    } else this.hero.setPosition(0, 0);
    if (this.current && this.loop && (this.timer -= dt) <= 0) this.play(this.current.id, this.current.aw);
  }
}

const scene = new LabScene();
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  backgroundColor: '#100e1a',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [scene],
});

// ---- bảng chọn
/** kỹ năng đã quyết định BỎ (chưa gỡ khỏi game — gỡ khi đưa toàn bộ kỹ năng mới vào game một lượt):
 *  kim_dan — muốn đột phá Nguyên Anh phải phá đan, nên từ Nguyên Anh trở đi không còn Kim Đan để dùng;
 *  nguyen_anh — Nguyên Anh là sinh mạng thứ hai, không ai đem ra tấn công thay bản thân. */
const REMOVED = new Set(['kim_dan', 'nguyen_anh']);
/** kỹ năng mới đang thiết kế, CHƯA có trong dữ liệu game (thêm khi tích hợp) — chèn vào chỗ kỹ năng bị bỏ */
const EXTRA: Record<string, SkillDef> = {
  nguyen_anh: {
    ...(SKILLS.find((x) => x.id === 'nguyen_anh') as SkillDef),
    id: 'khi_long', name: 'Khí Long (thay Nguyên Anh)', type: 'Rồng khí lượn quanh thân',
    awaken: { name: 'Huyết Long Trấn Địa', damage: '', effect: '' },
  },
};
const list = document.getElementById('list')!;
const cap = document.getElementById('cap')!;
const rows = new Map<string, HTMLElement>();
function select(s: SkillDef, aw: boolean): void {
  for (const [id, r] of rows) r.classList.toggle('on', id === s.id);
  cap.innerHTML = `<b>${aw ? s.awaken.name : s.name}</b> · ${aw ? 'Thức tỉnh' : s.type}`;
  scene.play(s.id, aw);
}
for (const [label, src] of [['Kỹ năng vũ khí', 'weapon'], ['Kỹ năng cảnh giới', 'realm']] as const) {
  const grp = document.createElement('div');
  grp.className = 'grp';
  grp.textContent = label;
  list.append(grp);
  for (const s of SKILLS.filter((x) => x.source === src).flatMap((x) => (REMOVED.has(x.id) ? (EXTRA[x.id] ? [EXTRA[x.id]] : []) : [x]))) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<img src="${skillIcon(s.id === "khi_long" ? "nguyen_anh" : s.id)}" alt="" /><div><div class="nm">${s.name}</div><div class="ty">${s.type}</div></div>`;
    const bt = document.createElement('div');
    bt.className = 'bt';
    const b1 = document.createElement('button');
    b1.textContent = 'Thường';
    b1.onclick = () => select(s, false);
    const b2 = document.createElement('button');
    b2.textContent = 'Thức tỉnh';
    b2.className = 'aw';
    b2.onclick = () => select(s, true);
    bt.append(b1, b2);
    row.append(bt);
    list.append(row);
    rows.set(s.id, row);
  }
}
// ---- chọn hướng nhìn
const dirBox = document.getElementById('dirs')!;
const dirBtns: HTMLButtonElement[] = [];
for (const [label, a] of [['Tự động', null], ['↓', Math.PI / 2], ['↙', (3 * Math.PI) / 4], ['←', Math.PI], ['↖', (-3 * Math.PI) / 4],
  ['↑', -Math.PI / 2], ['↗', -Math.PI / 4], ['→', 0], ['↘', Math.PI / 4]] as [string, number | null][]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = a === null ? 'on' : '';
  b.onclick = () => {
    for (const x of dirBtns) x.classList.toggle('on', x === b);
    scene.setDir(a);
  };
  dirBtns.push(b);
  dirBox.append(b);
}
(document.getElementById('loop') as HTMLInputElement).onchange = (e) => (scene.loop = (e.target as HTMLInputElement).checked);
(document.getElementById('walk') as HTMLInputElement).onchange = (e) => (scene.walk = (e.target as HTMLInputElement).checked);
document.getElementById('all')!.onclick = () => {
  let i = 0;
  const seq = SKILLS.flatMap((x) => (REMOVED.has(x.id) ? (EXTRA[x.id] ? [EXTRA[x.id]] : []) : [x])).flatMap((s) => [[s, false], [s, true]] as [SkillDef, boolean][]);
  const next = () => {
    if (i >= seq.length) return;
    select(seq[i][0], seq[i][1]);
    i++;
    setTimeout(next, 3400);
  };
  scene.loop = false;
  (document.getElementById('loop') as HTMLInputElement).checked = false;
  next();
};
(window as unknown as { __lab: LabScene }).__lab = scene;
