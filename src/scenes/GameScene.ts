import Phaser from 'phaser';
import { CAMERA } from '../config/game';
import { SCENES, TEX } from '../config/assets';
import { RUN } from '../config/balance';
import { WORLD_COLORS } from '../config/enemies';
import { stageById, type StageDef } from '../config/worlds';
import { Player } from '../entities/Player';
import { InputManager } from '../input/InputManager';
import { EnemyManager } from '../systems/EnemyManager';
import { Projectiles } from '../systems/Projectiles';
import { Pickups } from '../systems/Pickups';
import { Fx } from '../systems/Fx';
import { FloatingText } from '../systems/FloatingText';
import { RunState } from '../systems/RunState';
import { SkillSystem } from '../systems/SkillSystem';
import { Spawner } from '../systems/Spawner';
import { generateCards, type Card } from '../systems/CardPicker';
import { RARITIES } from '../config/items';
import { computeMeta, currentLoadout, equippedItem, type StageResult } from '../systems/progression';
import { WORLD_FIRST_TIER } from '../config/realms';
import { econScale } from '../config/balance';
import { mixColor } from '../utils/format';
import { audio } from '../systems/Audio';
import { ArtifactSystem } from '../systems/ArtifactSystem';

export type RunStatus = 'running' | 'levelup' | 'paused' | 'ended';

/** Ảnh chụp trạng thái cho giao diện HTML (HUD) đọc mỗi khung hình */
export interface HudState {
  status: RunStatus;
  hp: number;
  maxHp: number;
  xp: number;
  xpNeed: number;
  level: number;
  time: number;
  duration: number;
  kills: number;
  linh: number;
  bossName: string | null;
  bossHp: number;
  bossMax: number;
  bossPhase2: boolean;
  skills: { id: string; kind: string; level: number; awakened: boolean }[];
  stageName: string;
}

/**
 * GameScene: một lượt chơi (một màn). Toàn bộ logic chạy trong `step(dt)` theo thứ tự cố định,
 * nên có thể gọi tay để kiểm thử tự động (xem debug API trong GameFlow).
 * Giao diện (HUD, thẻ lên cấp, bảng kết quả) là HTML nằm ngoài canvas, giao tiếp qua `game.events`.
 */
export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies!: EnemyManager;
  proj!: Projectiles;
  pickups!: Pickups;
  fx!: Fx;
  texts!: FloatingText;
  run!: RunState;
  skills!: SkillSystem;
  spawner!: Spawner;
  artifact!: ArtifactSystem;
  stage!: StageDef;
  status: RunStatus = 'ended';
  cards: Card[] = [];
  /** Hệ số thời gian (gỡ lỗi / thử nghiệm) */
  timeScale = 1;
  /** Hàm điều khiển thay bàn phím (bot tự chơi). Trả về vector hướng -1..1 */
  botInput: ((s: GameScene) => Phaser.Math.Vector2) | null = null;
  /** Bật = không nhận sát thương (gỡ lỗi) */
  private inputManager!: InputManager;
  private ground!: Phaser.GameObjects.TileSprite;
  private readonly zero = new Phaser.Math.Vector2();
  private stageId = 'w1s1';
  private ended = false;

  constructor() {
    super(SCENES.GAME);
  }

  init(data: { stageId?: string }): void {
    this.stageId = data?.stageId ?? 'w1s1';
  }

  create(): void {
    this.stage = stageById(this.stageId);
    this.ended = false;
    const { width, height } = this.scale;

    // Nền vô tận theo thế giới: tileSprite cỡ màn hình, trượt họa tiết theo camera
    this.ground = this.add.tileSprite(0, 0, width, height, TEX.GROUND).setOrigin(0, 0).setScrollFactor(0).setDepth(-10);
    this.ground.setTint(mixColor(0xffffff, WORLD_COLORS[this.stage.world], 0.45));

    // --- Dữ liệu lượt chơi ---
    const meta = computeMeta();
    this.run = new RunState(meta, currentLoadout());
    this.run.add(meta.weaponId, 'weapon');

    // --- Thực thể và hệ thống ---
    this.player = new Player(this, 0, 0);
    this.fx = new Fx(this);
    this.texts = new FloatingText(this);
    this.enemies = new EnemyManager(this, this.player);
    this.proj = new Projectiles(this, this.player, this.enemies);
    this.pickups = new Pickups(this, this.player, this.run);
    this.enemies.setLinks({ proj: this.proj, pickups: this.pickups, fx: this.fx, texts: this.texts, run: this.run });
    this.enemies.coinValue = Math.max(1, Math.round(2 * econScale(WORLD_FIRST_TIER[this.stage.world])));
    this.skills = new SkillSystem(this, this.player, this.enemies, this.proj, this.fx, this.run);
    this.spawner = new Spawner(this.stage, this.enemies, this.player, () => this.viewRadius());

    // Ngoại hình vũ khí đang cầm (màu theo phẩm chất)
    const wItem = equippedItem('weapon');
    if (wItem?.weaponId) this.player.setWeaponLook(wItem.weaponId, parseInt(RARITIES[wItem.rarity].color.slice(1), 16));
    // Hiệu ứng riêng của bí bảo đang trang bị
    this.artifact = new ArtifactSystem(equippedItem('bibao')?.bibaoId ?? null, this.player, this.enemies, this.pickups, this.fx, this.run);
    this.enemies.onKillHook = (e) => this.artifact.onKill(e);
    this.player.onHit = () => this.artifact.onHit();

    this.refreshStats();
    this.player.hp = this.player.stats.maxHp;

    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    this.inputManager = new InputManager(this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.inputManager.destroy();
    });

    this.status = 'running';
    this.game.events.emit('stage-start', this);
  }

  /** Bán kính vùng nhìn thấy (để sinh quái ngay ngoài mép màn hình) */
  viewRadius(): number {
    const c = this.cameras.main;
    return Math.hypot(c.width, c.height) / 2 / c.zoom;
  }

  /** Tính lại chỉ số nhân vật sau khi nhặt thẻ */
  refreshStats(): void {
    const st = this.run.recompute();
    // Cộng buff tạm thời của bí bảo (xóa sạch khi hết màn)
    const b = this.artifact.buff;
    st.damage *= 1 + b.damage;
    st.attackSpeed *= 1 + b.atk;
    st.armor += b.armor;
    st.pickupRange *= b.pickup;
    this.player.applyStats(st);
    this.enemies.crit = st.crit;
  }

  // ------------------------------------------------------------------ vòng lặp
  update(_t: number, delta: number): void {
    // Cập nhật nền theo camera luôn (kể cả khi tạm dừng)
    const cam = this.cameras.main;
    this.ground.tilePositionX = cam.scrollX;
    this.ground.tilePositionY = cam.scrollY;
    if (this.status !== 'running') return;
    // Tăng tốc (x2, x4): chạy nhiều bước nhỏ liên tiếp thay vì một bước dài,
    // để va chạm và đạn vẫn chính xác như tốc độ thường.
    const dt = Math.min(delta / 1000, RUN.maxStep);
    const n = Math.max(1, Math.round(this.timeScale));
    for (let i = 0; i < n && this.status === 'running'; i++) this.step(dt);
  }

  /** Một bước mô phỏng. Gọi trực tiếp được để chạy nhanh khi kiểm thử. */
  step(dt: number): void {
    if (this.status !== 'running') return;
    const pl = this.player;
    const dir = this.botInput ? this.botInput(this) : this.inputManager.getMoveVector();
    pl.move(dir ?? this.zero, dt);
    pl.tick(dt);
    // Vũ khí chĩa về quái gần nhất (không có thì theo hướng nhìn)
    const tgt = this.enemies.nearest(pl.x, pl.y, 500);
    pl.syncWeapon(tgt ? Math.atan2(tgt.y - pl.y, tgt.x - pl.x) : pl.heading);
    this.run.time += dt;

    this.artifact.update(dt);
    if (this.artifact.dirty) {
      this.artifact.dirty = false;
      this.refreshStats();
    }
    this.spawner.update(dt, this.run.time);
    this.enemies.update(dt);
    this.skills.update(dt);
    this.proj.update(dt);
    this.pickups.update(dt);

    this.fx.begin();
    this.fx.draw(dt);
    this.texts.update(dt);

    if (pl.dead) return this.end(false);
    if (this.enemies.bossDead) {
      this.pickups.collectCoins(); // gom linh thạch boss rơi trước khi tổng kết
      return this.end(true);
    }
    if (this.run.pendingLevels > 0) this.openLevelUp();
  }

  // ------------------------------------------------------------------ lên cấp
  private openLevelUp(): void {
    this.cards = generateCards(this.run);
    this.status = 'levelup';
    audio.play('levelup');
    this.game.events.emit('levelup', this.cards, this.run.level);
  }

  /** Người chơi chọn thẻ thứ i */
  pickCard(i: number): void {
    if (this.status !== 'levelup') return;
    const c = this.cards[i];
    if (!c) return;
    const run = this.run;
    switch (c.kind) {
      case 'weapon':
      case 'active':
      case 'passive': {
        const own = run.find(c.id) ?? run.add(c.id, c.kind);
        if (!c.isNew) own.level = Math.min(RUN.maxLevel, own.level + 1);
        if (c.kind === 'active') run.lastActive = c.id;
        break;
      }
      case 'awaken': {
        const own = run.find(c.id);
        if (own) own.awakened = true;
        if (c.id.startsWith('ac_')) run.lastActive = c.id;
        break;
      }
      case 'heal':
        this.player.heal(this.player.stats.maxHp * 0.35);
        break;
      case 'linh':
        run.linh += this.enemies.coinValue * 8 * this.player.stats.linhGain;
        break;
    }
    audio.play('click');
    this.refreshStats();
    run.pendingLevels--;
    this.cards = [];
    this.status = 'running';
    this.game.events.emit('levelup-done');
    if (run.pendingLevels > 0) this.openLevelUp();
  }

  // ------------------------------------------------------------------ tạm dừng / kết thúc
  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.game.events.emit('paused', true);
    }
  }
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.game.events.emit('paused', false);
    }
  }

  /** Bỏ cuộc giữa chừng: tính như thua */
  abandon(): void {
    if (this.status === 'ended') return;
    this.status = 'running';
    this.end(false);
  }

  private end(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.status = 'ended';
    audio.play(victory ? 'win' : 'lose');
    if (victory) this.enemies.killAll();
    const res: StageResult = {
      stageId: this.stage.id,
      victory,
      kills: this.run.kills,
      linh: Math.floor(this.run.linh),
      level: this.run.level,
      time: Math.floor(this.run.time),
    };
    this.game.events.emit('stage-end', res);
  }

  /** Dọn sạch khi rời màn */
  cleanup(): void {
    this.enemies?.clear();
    this.proj?.clear();
    this.pickups?.clear();
    this.skills?.clear();
    this.fx?.clear();
    this.texts?.clear();
  }

  // ------------------------------------------------------------------ giao diện đọc
  hudState(): HudState {
    const b = this.enemies.boss;
    return {
      status: this.status,
      hp: this.player.hp,
      maxHp: this.player.stats.maxHp,
      xp: this.run.xp,
      xpNeed: this.run.xpNeed,
      level: this.run.level,
      time: this.run.time,
      duration: this.stage.duration,
      kills: this.run.kills,
      linh: Math.floor(this.run.linh),
      bossName: b ? this.stage.boss.name : null,
      bossHp: b ? b.hp : 0,
      bossMax: b ? b.maxHp : 1,
      bossPhase2: !!this.enemies.bossAI?.phase2,
      skills: this.run.skills.map((s) => ({ id: s.id, kind: s.kind, level: s.level, awakened: s.awakened })),
      stageName: `${this.stage.name} · ${this.stage.event}`,
    };
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.ground.setSize(gameSize.width, gameSize.height);
  }
}
