import { DIFFICULTY, RUN, WORLD_DMG, WORLD_HP } from '../config/balance';
import { enemiesOfWorld, type EnemyDef } from '../config/enemies';
import type { StageDef } from '../config/worlds';
import type { Player } from '../entities/Player';
import type { EnemyManager, Scale } from './EnemyManager';
import { audio } from './Audio';

const WEIGHT: Record<string, number> = {
  chaser: 3, swift: 2, tank: 1.5, ranged: 1.5, phantom: 1, exploder: 1, support: 0.7, summoner: 0.5,
};

/**
 * Điều phối quái xuất hiện trong màn: nhịp sinh quái tăng dần theo thời gian,
 * quái mới mở theo mốc thời gian (tier 1/2/3), tinh anh định kỳ, đợt vây hãm, và boss khi hết giờ.
 */
export class Spawner {
  private acc = 0;
  private nextElite = 60;
  private nextSwarm = 45;
  bossSpawned = false;
  private readonly roster: EnemyDef[];
  private readonly elites: EnemyDef[];
  private readonly swarm: EnemyDef[];

  constructor(
    private readonly stage: StageDef,
    private readonly enemies: EnemyManager,
    private readonly player: Player,
    private readonly viewRadius: () => number,
  ) {
    const all = enemiesOfWorld(stage.world);
    this.roster = all.filter((d) => d.behavior !== 'elite' && d.behavior !== 'swarm');
    this.elites = all.filter((d) => d.behavior === 'elite');
    this.swarm = all.filter((d) => d.behavior === 'swarm');
    enemies.worldEnemies = all;
  }

  /** Hệ số sức mạnh quái tại thời điểm t (giây) */
  scale(t: number): Scale {
    const p = Math.min(1, t / this.stage.duration);
    const stageMul = 1 + DIFFICULTY.perStage * this.stage.index;
    return {
      hp: WORLD_HP[this.stage.world] * stageMul * (1 + DIFFICULTY.hpOverTime * p),
      dmg: WORLD_DMG[this.stage.world] * stageMul * (1 + DIFFICULTY.dmgOverTime * p),
      speed: 1 + DIFFICULTY.speedOverTime * p,
    };
  }

  private ringPos(r: number): { x: number; y: number } {
    const a = Math.random() * Math.PI * 2;
    return { x: this.player.x + Math.cos(a) * r, y: this.player.y + Math.sin(a) * r };
  }

  private pickNormal(p: number): EnemyDef | null {
    const maxTier = p >= 0.55 ? 3 : p >= 0.25 ? 2 : 1;
    const pool = this.roster.filter((d) => d.tier <= maxTier);
    if (pool.length === 0) return null;
    const total = pool.reduce((a, d) => a + (weightOf(d)), 0);
    let r = Math.random() * total;
    for (const d of pool) {
      r -= weightOf(d);
      if (r <= 0) return d;
    }
    return pool[pool.length - 1];
  }

  update(dt: number, t: number): void {
    const dur = this.stage.duration;
    const sc = this.scale(t);
    this.enemies.curScale = sc;
    if (t >= dur) {
      if (!this.bossSpawned) {
        this.bossSpawned = true;
        const pos = this.ringPos(this.viewRadius() * 0.8);
        const main = this.stage.boss.final ? 1.5 : this.stage.boss.main ? 1.2 : 1;
        this.enemies.spawnBoss(this.stage.boss, sc, main, pos.x, pos.y);
        audio.play('boss');
      }
      return;
    }
    const p = t / dur;
    const rate = DIFFICULTY.baseSpawnRate * (1 + (DIFFICULTY.spawnGrowth - 1) * p) * (1 + DIFFICULTY.perStage * this.stage.index);
    this.acc += rate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      const d = this.pickNormal(p);
      if (!d) break;
      const pos = this.ringPos(this.viewRadius() + 40 + Math.random() * 60);
      this.enemies.spawn(d, pos.x, pos.y, sc);
    }
    if (t >= this.nextElite) {
      this.nextElite += DIFFICULTY.eliteEvery;
      const d = this.elites[Math.floor(Math.random() * this.elites.length)];
      if (d) {
        const pos = this.ringPos(this.viewRadius() + 60);
        this.enemies.spawn(d, pos.x, pos.y, sc, true);
      }
    }
    if (t >= this.nextSwarm) {
      this.nextSwarm += DIFFICULTY.swarmEvery;
      const d = this.swarm[0];
      if (d) {
        // Vây hãm: vòng tròn quái nhỏ khép lại quanh người chơi
        const n = 22 + Math.floor(p * 18);
        const R = this.viewRadius() * 0.75;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.enemies.spawn(d, this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R, sc, true);
        }
      }
    }
  }
}

function weightOf(d: EnemyDef): number {
  return WEIGHT[d.behavior] ?? 1;
}

void RUN;
