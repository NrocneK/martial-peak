import type { BossDef, BossPattern } from '../config/bosses';
import { BOSS_BASE } from '../config/bosses';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager, Scale } from './EnemyManager';
import type { Projectiles } from './Projectiles';
import type { Fx } from './Fx';
import { audio } from './Audio';

type State = 'walk' | 'telegraph' | 'attack';

/**
 * Điều khiển một boss: lần lượt dùng các chiêu (pattern) trong BossDef.
 * Mỗi chiêu có "báo trước" (vùng đỏ) → "tung chiêu". Dưới 50% máu: vào giai đoạn 2 (nhanh hơn, nhiều đạn hơn).
 * Chiêu viết một lần theo `pattern`, boss khác nhau chỉ khác tập chiêu + chỉ số.
 */
export class BossAI {
  private state: State = 'walk';
  private timer = 1.5;
  private idx = 0;
  private cur: BossPattern = 'radial';
  phase2 = false;
  private ang = 0;
  private dash = { vx: 0, vy: 0, t: 0 };
  private spiralT = 0;
  private slamAt = { x: 0, y: 0 };
  private volleyLeft = 0;
  private bulletDmg: number;

  constructor(
    private readonly mgr: EnemyManager,
    private readonly e: Enemy,
    private readonly def: BossDef,
    sc: Scale,
    private readonly player: Player,
    private readonly proj: Projectiles,
    private readonly fx: Fx,
  ) {
    this.bulletDmg = BOSS_BASE.bulletDmg * sc.dmg;
  }

  get hpRatio(): number {
    return this.e.hp / this.e.maxHp;
  }

  update(dt: number): void {
    const e = this.e;
    const pl = this.player;
    if (!this.phase2 && this.hpRatio < 0.5) {
      this.phase2 = true;
      this.fx.ring(e.x, e.y, 220, 0xff4040, 0.6);
      audio.play('boss');
    }
    const k = this.phase2 ? 1.35 : 1;
    const dx = pl.x - e.x;
    const dy = pl.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const slow = e.slow > 0 ? 1 - e.slow * 0.5 : 1;

    this.timer -= dt;
    switch (this.state) {
      case 'walk':
        if (dist > 200) {
          e.x += (dx / dist) * e.speed * slow * k * dt;
          e.y += (dy / dist) * e.speed * slow * k * dt;
        }
        if (this.timer <= 0) this.beginPattern();
        break;
      case 'telegraph':
        if (this.timer <= 0) this.fire();
        break;
      case 'attack':
        this.attack(dt, k);
        break;
    }
    // Chạm người chơi (khi lao tới gây nhiều hơn)
    const rr = e.r + pl.r * 0.8;
    const hit = this.cur === 'charge' && this.state === 'attack' ? e.dmg * 1.6 : e.dmg;
    if (dist < rr) pl.takeDamage(hit);
  }

  private beginPattern(): void {
    const pats = this.def.patterns;
    this.cur = pats[this.idx++ % pats.length];
    const e = this.e;
    const pl = this.player;
    this.state = 'telegraph';
    switch (this.cur) {
      case 'charge': {
        this.timer = 0.9;
        const a = Math.atan2(pl.y - e.y, pl.x - e.x);
        this.ang = a;
        this.fx.warnLine(e.x, e.y, e.x + Math.cos(a) * 700, e.y + Math.sin(a) * 700, e.r * 1.6, 0.9);
        break;
      }
      case 'slam':
        this.timer = 1.0;
        this.slamAt = { x: pl.x, y: pl.y };
        this.fx.warn(pl.x, pl.y, 140, 1.0);
        break;
      case 'radial':
        this.timer = 0.6;
        this.fx.warn(e.x, e.y, e.r + 60, 0.6);
        break;
      case 'volley':
        this.timer = 0.5;
        this.fx.warn(e.x, e.y, e.r + 30, 0.5);
        break;
      case 'summon':
        this.timer = 0.7;
        this.fx.warn(e.x, e.y, e.r + 80, 0.7, 0x60c040);
        break;
      case 'spiral':
        this.timer = 0.6;
        this.fx.warn(e.x, e.y, e.r + 40, 0.6);
        break;
    }
  }

  private fire(): void {
    const e = this.e;
    const pl = this.player;
    const p2 = this.phase2;
    this.state = 'attack';
    switch (this.cur) {
      case 'charge':
        this.dash = { vx: Math.cos(this.ang) * 560, vy: Math.sin(this.ang) * 560, t: 0.75 };
        break;
      case 'slam': {
        this.fx.burst(this.slamAt.x, this.slamAt.y, 140, 0xff5030, 0.35);
        audio.play('explode');
        if (Math.hypot(pl.x - this.slamAt.x, pl.y - this.slamAt.y) < 140 + pl.r) pl.takeDamage(this.bulletDmg * 2.2);
        if (p2) for (let i = 0; i < 10; i++) this.proj.fireEnemy(this.slamAt.x, this.slamAt.y, (i / 10) * 6.28, 200, this.bulletDmg, 0xff8040, 9);
        this.endAttack(1.4);
        break;
      }
      case 'radial': {
        const n = p2 ? 26 : 16;
        const off = Math.random() * 6.28;
        for (let i = 0; i < n; i++) this.proj.fireEnemy(e.x, e.y, off + (i / n) * 6.28, 190, this.bulletDmg, this.def.color, 9);
        this.endAttack(1.6);
        break;
      }
      case 'volley':
        this.volleyLeft = p2 ? 4 : 3;
        this.spiralT = 0;
        break;
      case 'summon': {
        const n = p2 ? 10 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.28;
          this.mgr.spawnMinion(e.x + Math.cos(a) * (e.r + 40), e.y + Math.sin(a) * (e.r + 40), i % 3 === 0 ? 'chaser' : 'swarm');
        }
        this.endAttack(1.4);
        break;
      }
      case 'spiral':
        this.spiralT = p2 ? 3.2 : 2.5;
        this.ang = 0;
        break;
    }
  }

  private attack(dt: number, k: number): void {
    const e = this.e;
    const pl = this.player;
    switch (this.cur) {
      case 'charge':
        this.dash.t -= dt;
        e.x += this.dash.vx * dt;
        e.y += this.dash.vy * dt;
        if (this.dash.t <= 0) this.endAttack(1.2);
        break;
      case 'volley': {
        this.spiralT -= dt;
        if (this.spiralT <= 0 && this.volleyLeft > 0) {
          this.volleyLeft--;
          this.spiralT = 0.45 / k;
          const a = Math.atan2(pl.y - e.y, pl.x - e.x);
          const n = this.phase2 ? 7 : 5;
          for (let i = 0; i < n; i++) this.proj.fireEnemy(e.x, e.y, a + (i - (n - 1) / 2) * 0.16, 260, this.bulletDmg, 0xffb060, 8);
        }
        if (this.volleyLeft <= 0 && this.spiralT <= 0) this.endAttack(1.3);
        break;
      }
      case 'spiral': {
        this.spiralT -= dt;
        this.timer -= 0; // giữ nguyên
        this.ang += dt * 3.2;
        // ~14 viên/giây (phase 2: nhiều hơn)
        const rate = this.phase2 ? 18 : 12;
        if (Math.random() < rate * dt) {
          this.proj.fireEnemy(e.x, e.y, this.ang, 210, this.bulletDmg, this.def.color, 8);
          this.proj.fireEnemy(e.x, e.y, this.ang + Math.PI, 210, this.bulletDmg, this.def.color, 8);
        }
        if (this.spiralT <= 0) this.endAttack(1.2);
        break;
      }
      default:
        this.endAttack(1.2);
    }
  }

  private endAttack(rest: number): void {
    this.state = 'walk';
    this.timer = this.phase2 ? rest * 0.65 : rest;
  }
}
