import Phaser from 'phaser';
import { SCENES } from '../config/assets';
import { DAO_TO_ENDING, getDialogue } from '../config/story';
import { stageById, type StageDef } from '../config/worlds';
import type { GameScene } from '../scenes/GameScene';
import type { Card } from '../systems/CardPicker';
import { finishStage, getSave, type StageResult } from '../systems/progression';
import { audio } from '../systems/Audio';
import { h } from '../ui/dom';
import { buildMainMenu } from '../ui/screens/MainMenu';
import { Hub } from '../ui/screens/Hub';
import { showDialogue } from '../ui/screens/Dialogue';
import { GameHud } from '../ui/screens/GameHud';
import { buildResult } from '../ui/screens/Result';
import { randomTip } from '../ui/tips';

/**
 * GameFlow: "đạo diễn" điều phối luồng màn hình:
 *   Menu → Hub → (hội thoại trước) → Màn chơi (HUD) → (hội thoại sau nếu thắng) → Kết quả → Hub.
 * GameScene chỉ lo chiến đấu và báo sự kiện qua game.events ('stage-start', 'levelup', 'stage-end'...).
 */
export class GameFlow {
  private readonly ui = document.getElementById('ui') as HTMLElement;
  private readonly hub: Hub;
  private menu: HTMLElement | null = null;
  private hud: GameHud | null = null;
  private screens: HTMLElement[] = [];

  constructor(private readonly game: Phaser.Game) {
    audio.enabled = getSave().sound;
    this.hub = new Hub(
      (st) => this.startStage(st),
      () => this.showMenu(),
      (m) => this.toast(m),
      () => this.showEnding(),
    );
    const bootEl = document.getElementById('boot');
    const tip = document.getElementById('boot-tip');
    if (tip) tip.textContent = randomTip();
    const bootStart = performance.now();
    game.events.on('boot-done', () => {
      this.showMenu();
      // Giữ màn nạp tối thiểu ~1,1s để kịp đọc mẹo và không bị chớp
      setTimeout(() => {
        bootEl?.classList.add('done');
        setTimeout(() => bootEl?.remove(), 700);
      }, Math.max(0, 1100 - (performance.now() - bootStart)));
    });
    game.events.on('stage-start', (s: GameScene) => this.onStageStart(s));
    game.events.on('levelup', (cards: Card[], level: number) => this.hud?.showCards(cards, level));
    game.events.on('levelup-done', () => this.hud?.hideCards());
    game.events.on('stage-end', (r: StageResult) => this.onStageEnd(r));
  }

  private clearScreens(): void {
    for (const s of this.screens) s.remove();
    this.screens = [];
    this.menu?.remove();
    this.menu = null;
    this.hub.root.remove();
  }

  private put(el: HTMLElement): HTMLElement {
    this.ui.append(el);
    this.screens.push(el);
    return el;
  }

  toast(msg: string): void {
    // Chỉ giữ một thông báo: cái mới thay cái cũ
    document.querySelectorAll('.toast').forEach((el) => el.remove());
    const t = h('div', { class: 'toast', role: 'status', text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  showMenu(): void {
    this.clearScreens();
    this.menu = buildMainMenu(() => this.showHub());
    this.ui.append(this.menu);
  }

  showHub(world?: number): void {
    this.clearScreens();
    this.ui.append(this.hub.root);
    this.hub.open(world);
  }

  /** Đoạn kết khi lên Đạo Tổ; xong quay lại Hub */
  showEnding(): void {
    this.clearScreens();
    this.put(showDialogue(DAO_TO_ENDING, () => this.showHub()));
  }

  /** Bắt đầu một màn: hội thoại trước (bỏ qua được) rồi vào trận */
  startStage(stage: StageDef): void {
    this.clearScreens();
    this.put(showDialogue(getDialogue(stage.id, 'pre'), () => this.launch(stage.id)));
  }

  private launch(stageId: string): void {
    this.clearScreens();
    if (this.game.scene.isActive(SCENES.GAME) || this.game.scene.isPaused(SCENES.GAME)) this.game.scene.stop(SCENES.GAME);
    this.game.scene.start(SCENES.GAME, { stageId });
  }

  private onStageStart(scene: GameScene): void {
    this.clearScreens();
    this.hud?.destroy();
    this.hud = new GameHud(scene);
    this.ui.append(this.hud.root);
  }

  private onStageEnd(res: StageResult): void {
    const scene = this.game.scene.getScene(SCENES.GAME) as GameScene;
    this.hud?.destroy();
    this.hud = null;
    const reward = finishStage(res);
    const stage = stageById(res.stageId);
    // Dừng scene sau khi vòng cập nhật hiện tại kết thúc để tránh dừng giữa chừng
    setTimeout(() => {
      scene.cleanup();
      if (this.game.scene.isActive(SCENES.GAME)) this.game.scene.stop(SCENES.GAME);
      const showResult = (): void => {
        this.clearScreens();
        this.put(buildResult(reward, stage, () => this.launch(stage.id), () => this.showHub(stage.world)));
      };
      if (res.victory) {
        this.clearScreens();
        this.put(showDialogue(getDialogue(stage.id, 'post'), showResult));
      } else showResult();
    }, 0);
  }
}
