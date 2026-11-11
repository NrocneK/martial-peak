import Phaser from 'phaser';
import { TEX } from '../config/assets';
import { BEHAVIORS, type EnemyDef } from '../config/enemies';
import { BOSS_BASE, type BossDef } from '../config/bosses';
import { DIFFICULTY, RUN } from '../config/balance';
import { Enemy, MAX_TICK_SLOTS } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { SpatialGrid } from './SpatialGrid';
import type { Projectiles } from './Projectiles';
import type { Pickups } from './Pickups';
import type { Fx } from './Fx';
import type { FloatingText } from './FloatingText';
import type { RunState } from './RunState';
import { BossAI } from './BossAI';
import { audio } from './Audio';
import { fmt } from '../utils/format';

/** Hệ số sức mạnh áp lên quái lúc sinh ra (đã gồm thế giới, màn, thời gian) */
export interface Scale {
  hp: number;
  dmg: number;
  speed: number;
}

/**
 * Quản lý toàn bộ quái: sinh, di chuyển theo hành vi, va chạm với người chơi, nhận sát thương, rơi đồ.
 * Mỗi kiểu hành vi (Behavior) được viết MỘT lần ở hàm `think`, dữ liệu quái chỉ chọn kiểu + số liệu.
 */
export class EnemyManager {
  readonly list: Enemy[] = [];
  readonly grid = new SpatialGrid<Enemy>(96);
  private readonly near: Enemy[] = [];
  boss: Enemy | null = null;
  bossAI: BossAI | null = null;
  bossDead = false;
  /** Quái gần đây chết (cho thống kê) */
  coinValue = 1;
  /** Tỉ lệ chí mạng hiện tại (cập nhật khi chỉ số đổi) */
  crit = 0.05;
  /** Số quái đang sống */
  alive = 0;
  /** Hệ số sát thương lên quái đang bị làm chậm (bí bảo Băng Phách Châu) */
  slowBonus = 1;
  /** Hook khi quái bị hạ (bí bảo) */
  onKillHook: ((e: Enemy) => void) | null = null;
  /** Các kỹ năng lắng nghe sự kiện quái bị hạ (nổ lan, cộng tầng...) */
  readonly killListeners: ((e: Enemy) => void)[] = [];
  /** Hệ số sát thương bạo kích (2 = gấp đôi) */
  critMul = 2;
  /** Quái đang bị chậm nhận thêm sát thương từ mọi nguồn (Thanh Phong Phiến cấp 5) */
  slowVuln = 0;
  /** Ngưng đọng thời gian (Đại Đạo Quy Nhất): quái + đạn quái đứng im */
  timeStop = 0;
  /** Tổng sát thương người chơi đã gây (Đại Đạo tích sát thương lúc ngưng đọng) */
  dealt = 0;

  // Các hệ thống phụ thuộc lẫn nhau → gán sau khi tạo (setLinks)
  proj!: Projectiles;
  pickups!: Pickups;
  fx!: Fx;
  texts!: FloatingText;
  run!: RunState;
  /** Hệ số hiện hành dùng cho quái được triệu hồi giữa trận */
  curScale: Scale = { hp: 1, dmg: 1, speed: 1 };
  worldEnemies: EnemyDef[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
  ) {}

  setLinks(l: { proj: Projectiles; pickups: Pickups; fx: Fx; texts: FloatingText; run: RunState }): void {
    Object.assign(this, l);
  }

  // ------------------------------------------------------------------ sinh quái
  private take(): Enemy | null {
    let e = this.list.find((x) => !x.active);
    if (!e) {
      if (this.list.length >= RUN.maxEnemies + 10) return null;
      e = new Enemy(this.scene.add.image(0, 0, TEX.SHAPE + 'circle').setDepth(5));
      this.list.push(e);
    }
    return e;
  }

  /** Sinh một quái thường / tinh anh tại (x, y). Trả về null nếu đã quá giới hạn. */
  spawn(def: EnemyDef, x: number, y: number, sc: Scale, force = false): Enemy | null {
    if (!force && this.alive >= RUN.maxEnemies) return null;
    const e = this.take();
    if (!e) return null;
    const b = BEHAVIORS[def.behavior];
    e.active = true;
    e.isBoss = false;
    e.boss = null;
    e.behavior = def.behavior;
    e.defId = def.id;
    e.x = x;
    e.y = y;
    e.kx = e.ky = 0;
    e.maxHp = e.hp = Math.max(1, b.hp * sc.hp);
    e.speed = b.speed * sc.speed;
    // Quái tự bạo không gây sát thương chạm; sát thương nổ lấy từ hệ số dmg
    e.dmg = def.behavior === 'exploder' ? 16 * sc.dmg : b.dmg * sc.dmg;
    e.r = b.r;
    e.xp = b.xp;
    e.color = def.color;
    e.slow = e.slowT = 0;
    e.cd = 1 + Math.random() * 2;
    e.life = 0;
    e.fuse = -1;
    e.flash = 0;
    e.phase = Math.random() * 6.28;
    e.tick.fill(0);
    this.resetStatus(e);
    const sz = (b.r * 2) / 58;
    e.img
      .setTexture(TEX.SHAPE + b.shape)
      .setTint(def.color)
      .setScale(sz)
      .setAlpha(def.behavior === 'phantom' ? 0.6 : 1)
      .setPosition(x, y)
      .setVisible(true)
      .setActive(true);
    this.alive++;
    return e;
  }

  /** Sinh boss của màn */
  spawnBoss(def: BossDef, sc: Scale, bossHpMul: number, x: number, y: number): Enemy {
    const e = this.take() ?? this.list[0];
    e.active = true;
    e.isBoss = true;
    e.boss = def;
    e.behavior = 'elite';
    e.defId = def.id;
    e.x = x;
    e.y = y;
    e.kx = e.ky = 0;
    e.maxHp = e.hp = BOSS_BASE.hp * sc.hp * bossHpMul;
    e.speed = BOSS_BASE.speed * Math.min(1.4, sc.speed);
    e.dmg = BOSS_BASE.contactDmg * sc.dmg;
    e.r = def.r;
    e.xp = BOSS_BASE.xpGem;
    e.color = def.color;
    e.slow = e.slowT = 0;
    e.cd = 0;
    e.life = 0;
    e.fuse = -1;
    e.flash = 0;
    e.tick.fill(0);
    this.resetStatus(e);
    e.img
      .setTexture(TEX.SHAPE + 'hex')
      .setTint(def.color)
      .setScale((def.r * 2) / 58)
      .setAlpha(1)
      .setPosition(x, y)
      .setVisible(true)
      .setActive(true);
    this.alive++;
    this.boss = e;
    this.bossDead = false;
    this.bossAI = new BossAI(this, e, def, sc, this.player, this.proj, this.fx);
    return e;
  }

  /** Sinh quái nhỏ do boss / quái triệu hồi */
  spawnMinion(x: number, y: number, behaviorOnly: 'swarm' | 'chaser' = 'swarm'): void {
    const pool = this.worldEnemies.filter((d) => d.behavior === behaviorOnly);
    if (pool.length === 0) return;
    this.spawn(pool[Math.floor(Math.random() * pool.length)], x, y, this.curScale);
  }

  // ------------------------------------------------------------------ truy vấn
  /** Quái sống gần nhất (trong bán kính maxDist), bỏ qua các quái trong `exclude` */
  nearest(x: number, y: number, maxDist: number, exclude?: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.list) {
      if (!e.active) continue;
      if (exclude && exclude.includes(e)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Các quái trong bán kính (r + bán kính quái) quanh (x,y) */
  inRadius(x: number, y: number, r: number, out: Enemy[]): Enemy[] {
    this.grid.query(x, y, r + 40, this.near);
    out.length = 0;
    for (const e of this.near) {
      if (!e.active) continue;
      const rr = r + e.r;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= rr * rr) out.push(e);
    }
    return out;
  }

  // ------------------------------------------------------------------ sát thương
  /** Xóa mọi trạng thái do kỹ năng gây ra (khi quái được tái sử dụng) */
  private resetStatus(e: Enemy): void {
    e.burnT = e.burnDps = e.burnStacks = e.bleedT = e.bleedDps = e.dotTick = 0;
    e.markKiem = e.markKiemT = e.shockAmt = e.shockT = e.weakAmt = e.weakT = 0;
    e.domainT = e.domainVuln = e.domainWeak = e.suppressT = e.chillHits = e.chillT = e.frozenT = 0;
    e.lastSrc = '';
  }

  /** Hệ số sát thương quái nhận (dấu ấn, lĩnh vực, bị chậm...) */
  vulnOf(e: Enemy): number {
    return 1 + e.markKiem * 0.1 + (e.shockT > 0 ? e.shockAmt : 0) + (e.domainT > 0 ? e.domainVuln : 0) + (e.slow > 0 ? this.slowVuln : 0);
  }

  /** Hệ số sát thương quái gây ra (Chấn Nhiếp, lĩnh vực) */
  dmgOutOf(e: Enemy): number {
    return 1 - Math.max(e.weakT > 0 ? e.weakAmt : 0, e.domainT > 0 ? e.domainWeak : 0);
  }

  /** Sát thương cũ (bí bảo, đạn đơn giản): tự tung bạo kích */
  hurt(e: Enemy, raw: number, slow = 0, noText = false, slowTime = 2): void {
    this.strike(e, raw * (e.slow > 0 ? this.slowBonus : 1), { slow, slowTime, noText });
  }

  /**
   * Gây sát thương lên quái. amount = sát thương gốc (đã nhân lực đánh). Trả về sát thương thực gây ra.
   * crit: undefined = tung theo tỉ lệ bạo kích; true = luôn bạo kích; false = không bạo kích.
   * slow: 0..1 (1 = đứng yên / choáng); boss chỉ nhận một nửa (BossAI).
   */
  strike(e: Enemy, amount: number, o: { crit?: boolean; slow?: number; slowTime?: number; noText?: boolean; src?: string } = {}): number {
    if (!e.active) return 0;
    let dmg = amount * this.vulnOf(e);
    const crit = o.crit ?? Math.random() < this.crit;
    if (crit) dmg *= this.critMul;
    e.hp -= dmg;
    this.dealt += dmg;
    e.flash = 0.08;
    if (o.src) e.lastSrc = o.src;
    const slow = o.slow ?? 0;
    if (slow > 0) this.applySlow(e, slow, o.slowTime ?? 2);
    if (!o.noText) this.texts.show(e.x, e.y - e.r, fmt(dmg), crit ? '#ffd24a' : '#ffffff', crit ? 18 : 14);
    audio.play('hit');
    if (e.hp <= 0) this.kill(e, true);
    return dmg;
  }

  /** Làm chậm / choáng: khống chế mạnh hơn thì thay; cùng mức giữ thời gian dài hơn */
  applySlow(e: Enemy, slow: number, time: number): void {
    if (slow >= e.slow) e.slowT = slow > e.slow ? time : Math.max(e.slowT, time);
    e.slow = Math.max(e.slow, slow);
  }

  kill(e: Enemy, drops: boolean): void {
    if (!e.active) return;
    e.active = false;
    e.img.setVisible(false).setActive(false);
    this.alive--;
    if (drops) {
      this.run.kills++;
      this.onKillHook?.(e);
      for (const f of this.killListeners) f(e);
      this.pickups.spawn('xp', e.x, e.y, e.xp);
      const isElite = e.behavior === 'elite' && !e.isBoss;
      if (e.isBoss) {
        // Boss: mưa XP + linh thạch
        for (let i = 0; i < 8; i++) this.pickups.spawn('xp', e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, e.xp / 8);
        for (let i = 0; i < 6; i++) this.pickups.spawn('coin', e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, this.coinValue * 5);
      } else if (isElite) {
        this.pickups.spawn('coin', e.x, e.y, this.coinValue * 5);
        this.pickups.spawn('heal', e.x + 10, e.y, 1);
      } else {
        const r = Math.random();
        if (r < DIFFICULTY.coinChance) this.pickups.spawn('coin', e.x, e.y, this.coinValue);
        else if (r < DIFFICULTY.coinChance + DIFFICULTY.healChance) this.pickups.spawn('heal', e.x, e.y, 1);
      }
      this.fx.burst(e.x, e.y, e.r * 1.6, e.color, 0.2);
      audio.play(e.isBoss ? 'explode' : 'kill');
    }
    if (e.isBoss) {
      this.bossDead = true;
      this.boss = null;
      this.bossAI = null;
    }
  }

  /** Xóa mọi quái (không rơi đồ): dùng khi thắng màn */
  killAll(): void {
    for (const e of this.list) if (e.active) this.kill(e, false);
  }

  // ------------------------------------------------------------------ cập nhật mỗi bước
  update(dt: number): void {
    const pl = this.player;
    // Dựng lưới
    this.grid.clear();
    for (const e of this.list) if (e.active) this.grid.insert(e);

    const frozen = this.timeStop > 0;
    if (frozen) this.timeStop -= dt;
    if (this.bossAI && !frozen) this.bossAI.update(dt);

    const px = pl.x;
    const py = pl.y;
    for (const e of this.list) {
      if (!e.active) continue;
      e.life += dt;
      for (let i = 0; i < MAX_TICK_SLOTS; i++) if (e.tick[i] > 0) e.tick[i] -= dt;
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slow = 0;
      }
      this.updateStatus(e, dt);
      if (!e.active) continue;
      if (frozen) {
        e.img.setPosition(e.x, e.y).setTint(0xb8b0ff);
        continue;
      }
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (!e.isBoss) {
        // Quái quá xa: đưa về vòng quanh người chơi để không bị bỏ rơi ngoài màn hình
        if (dist > 1000) {
          this.recycle(e);
          continue;
        }
        this.think(e, dt, dx / dist, dy / dist, dist);
      }
      // Đẩy lùi / dạt (giảm dần)
      if (e.kx !== 0 || e.ky !== 0) {
        e.x += e.kx * dt;
        e.y += e.ky * dt;
        const k = Math.max(0, 1 - 6 * dt);
        e.kx *= k;
        e.ky *= k;
        if (Math.abs(e.kx) < 1 && Math.abs(e.ky) < 1) e.kx = e.ky = 0;
      }
      // Tách nhau: tránh dồn thành một cục
      if (!e.isBoss && e.behavior !== 'phantom') this.separate(e, dt);

      // Chạm người chơi
      const rr = e.r + pl.r * 0.8;
      if (e.behavior !== 'exploder' && dist < rr) {
        const got = pl.takeDamage(e.dmg * this.dmgOutOf(e));
        if (got > 0 && pl.reflect > 0) this.strike(e, got * pl.reflect, { crit: false, src: 'reflect' });   // phản sát thương cận chiến
      }

      e.img.setPosition(e.x, e.y);
      if (e.flash > 0) {
        e.flash -= dt;
        e.img.setTintFill(0xffffff);
      } else if (e.slow > 0) {
        e.img.setTint(0x9fdcff);
      } else {
        e.img.setTint(e.color);
      }
    }
  }

  /** Đếm ngược trạng thái + sát thương theo thời gian (đốt, chảy máu) mỗi 0.5 giây */
  private updateStatus(e: Enemy, dt: number): void {
    if (e.markKiemT > 0 && (e.markKiemT -= dt) <= 0) e.markKiem = 0;
    if (e.shockT > 0) e.shockT -= dt;
    if (e.weakT > 0) e.weakT -= dt;
    if (e.domainT > 0) e.domainT -= dt;
    if (e.suppressT > 0) e.suppressT -= dt;
    if (e.chillT > 0 && (e.chillT -= dt) <= 0) e.chillHits = 0;
    if (e.frozenT > 0) e.frozenT -= dt;
    if (e.burnT <= 0 && e.bleedT <= 0) return;
    e.dotTick -= dt;
    if (e.burnT > 0 && (e.burnT -= dt) <= 0) e.burnStacks = 0;
    if (e.bleedT > 0) e.bleedT -= dt;
    if (e.dotTick > 0) return;
    e.dotTick = 0.5;
    const d = (e.burnT > 0 ? e.burnDps * Math.max(1, e.burnStacks) : 0) + (e.bleedT > 0 ? e.bleedDps : 0);
    if (d > 0) {
      this.strike(e, d * 0.5, { crit: false, noText: true, src: e.burnT > 0 ? 'burn' : 'bleed' });
      if (e.active) this.texts.show(e.x, e.y - e.r, fmt(d * 0.5 * this.vulnOf(e)), e.burnT > 0 ? '#ff9a40' : '#ff5a5a', 12);
    }
  }

  private recycle(e: Enemy): void {
    const a = Math.random() * Math.PI * 2;
    const d = 560 + Math.random() * 80;
    e.x = this.player.x + Math.cos(a) * d;
    e.y = this.player.y + Math.sin(a) * d;
  }

  private separate(e: Enemy, dt: number): void {
    this.grid.query(e.x, e.y, e.r + 20, this.near);
    let n = 0;
    for (let i = 0; i < this.near.length && n < 6; i++) {
      const o = this.near[i];
      if (o === e || !o.active || o.isBoss) continue;
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const min = (e.r + o.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((min - d) / min) * 90 * dt;
      e.x += (dx / d) * push;
      e.y += (dy / d) * push;
      n++;
    }
  }

  /** Hành vi của từng kiểu quái */
  private think(e: Enemy, dt: number, nx: number, ny: number, dist: number): void {
    const slow = e.slow > 0 ? 1 - e.slow : 1;
    const sp = e.speed * slow;
    switch (e.behavior) {
      case 'ranged': {
        // Tiến lại gần tới ~300px rồi đứng bắn
        if (dist > 300) this.step(e, nx, ny, sp, dt);
        else if (dist < 200) this.step(e, -nx, -ny, sp * 0.6, dt);
        e.cd -= dt;
        if (e.cd <= 0 && dist < 520) {
          e.cd = 2.4;
          this.proj.fireEnemy(e.x, e.y, Math.atan2(ny, nx), 200, e.dmg * 1.1 * this.dmgOutOf(e), 0xd070ff, 7);
        }
        break;
      }
      case 'phantom': {
        // Lắc lư uốn lượn khi lao tới
        const side = Math.sin(e.life * 3 + e.phase);
        this.step(e, nx - ny * side * 0.9, ny + nx * side * 0.9, sp, dt);
        e.img.setAlpha(0.45 + 0.25 * Math.sin(e.life * 5));
        break;
      }
      case 'exploder': {
        if (e.fuse < 0) {
          this.step(e, nx, ny, sp, dt);
          if (dist < 60) {
            e.fuse = 0.7;
            this.fx.warn(e.x, e.y, 80, 0.7);
          }
        } else {
          e.fuse -= dt;
          if (e.fuse <= 0) {
            this.fx.burst(e.x, e.y, 80, 0xff6030, 0.3);
            audio.play('explode');
            if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 80 + this.player.r) this.player.takeDamage(e.dmg);
            this.kill(e, false);
          }
        }
        break;
      }
      case 'support': {
        if (dist > 260) this.step(e, nx, ny, sp, dt);
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 3.5;
          // Hồi máu cho quái xung quanh
          this.grid.query(e.x, e.y, 160, this.near);
          for (const o of this.near) {
            if (!o.active || o === e) continue;
            if (o.suppressT <= 0 && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 160 * 160) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15);
          }
          this.fx.ring(e.x, e.y, 160, 0x50d080, 0.4);
        }
        break;
      }
      case 'summoner': {
        if (dist > 340) this.step(e, nx, ny, sp, dt);
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 6;
          for (let i = 0; i < 3; i++) this.spawnMinion(e.x + (Math.random() - 0.5) * 50, e.y + (Math.random() - 0.5) * 50);
          this.fx.ring(e.x, e.y, 50, 0x60a040, 0.4);
        }
        break;
      }
      case 'elite': {
        this.step(e, nx, ny, sp, dt);
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 4;
          const n = 10;
          const off = Math.random() * 6.28;
          for (let i = 0; i < n; i++) this.proj.fireEnemy(e.x, e.y, off + (i / n) * 6.28, 170, e.dmg * 0.5 * this.dmgOutOf(e), 0xffc040, 8);
        }
        break;
      }
      default:
        this.step(e, nx, ny, sp, dt);
    }
  }

  private step(e: Enemy, nx: number, ny: number, sp: number, dt: number): void {
    e.x += nx * sp * dt;
    e.y += ny * sp * dt;
  }

  clear(): void {
    for (const e of this.list) {
      e.active = false;
      e.img.setVisible(false).setActive(false);
    }
    this.alive = 0;
    this.boss = null;
    this.bossAI = null;
    this.bossDead = false;
  }
}
