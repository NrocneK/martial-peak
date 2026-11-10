import { bar, css, h } from '../dom';
import { fmt, fmtTime } from '../../utils/format';
import type { GameScene } from '../../scenes/GameScene';
import type { Card } from '../../systems/CardPicker';
import { skillInfo } from '../skillInfo';

/**
 * HUD trong màn chơi (máu, XP, đồng hồ, thanh boss, ô kỹ năng) + lớp phủ thẻ lên cấp + tạm dừng.
 * Đọc trạng thái từ GameScene.hudState() mỗi khung hình bằng requestAnimationFrame.
 */
export class GameHud {
  readonly root = h('div', { class: 'screen hud', style: 'overflow:hidden;pointer-events:none' });
  private readonly hp = bar('hp');
  private readonly xp = bar('xp');
  private readonly timer = h('div', { class: 'timer' });
  private readonly stg = h('div', { class: 'stg' });
  private readonly info = h('div');
  private readonly bossName = h('div', { class: 'nm' });
  private readonly boss = bar('boss');
  private readonly bossBox = h('div', { class: 'bossbar hidden' }, this.bossName, this.boss.root);
  private readonly slots = h('div', { class: 'slots' });
  private slotKey = '';
  private readonly speedBtn = h('button', { class: 'btn small' });
  private raf = 0;
  private overlay: HTMLElement | null = null;

  constructor(private readonly scene: GameScene) {
    const pauseBtn = h('button', { class: 'btn small', text: 'Tạm dừng ⏸', onclick: () => this.togglePause() });
    this.speedBtn.addEventListener('click', () => this.cycleSpeed());
    this.syncSpeed();
    this.root.append(
      h('div', { class: 'top' },
        h('div', { class: 'left' }, this.hp.root, this.xp.root),
        h('div', { class: 'mid' }, this.timer, this.stg),
        h('div', { class: 'right' }, this.info, h('div', { class: 'row', style: 'justify-content:flex-end;gap:6px' }, this.speedBtn, pauseBtn)),
      ),
      this.bossBox,
      this.slots,
    );
    window.addEventListener('keydown', this.onKey);
    const loop = (): void => {
      this.update();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.togglePause();
    if (e.key === 'x' || e.key === 'X') this.cycleSpeed();
    if (this.scene.status === 'levelup' && ['1', '2', '3', '4'].includes(e.key)) this.scene.pickCard(Number(e.key) - 1);
  };

  /** Đổi tốc độ game: x1 → x2 → x4 → x1 (phím X hoặc nút) */
  private cycleSpeed(): void {
    const cur = this.scene.timeScale;
    this.scene.timeScale = cur >= 4 ? 1 : cur >= 2 ? 4 : 2;
    this.syncSpeed();
  }

  private syncSpeed(): void {
    const v = this.scene.timeScale;
    this.speedBtn.textContent = `Tốc độ x${v}`;
    this.speedBtn.classList.toggle('primary', v > 1);
  }

  private togglePause(): void {
    const st = this.scene.status;
    if (st === 'running') {
      this.scene.pause();
      this.showPause();
    } else if (st === 'paused') {
      this.scene.resume();
      this.clearOverlay();
    }
  }

  private clearOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private showPause(): void {
    this.clearOverlay();
    this.overlay = h('div', { class: 'screen overlay' },
      h('h2', { text: 'Tạm dừng' }),
      h('button', { class: 'btn primary', text: 'Tiếp tục', onclick: () => this.togglePause() }),
      h('button', {
        class: 'btn danger',
        text: 'Bỏ cuộc (giữ 30% linh thạch)',
        onclick: () => {
          this.clearOverlay();
          this.scene.abandon();
        },
      }),
    );
    this.root.append(this.overlay);
  }

  /** Hiện 3 thẻ để chọn */
  showCards(cards: Card[], level: number): void {
    this.clearOverlay();
    const list = h('div', { class: 'cards' });
    cards.forEach((c, i) => {
      list.append(
        h('div', { class: 'pick' + (c.kind === 'awaken' ? ' awaken' : ''), onclick: () => this.scene.pickCard(i) },
          h('div', { class: 'lv', text: c.tag + (c.level > 0 ? (c.isNew ? ' · Mới' : ` · Cấp ${c.level}`) : '') }),
          h('div', { class: 'ico', style: { background: css(c.color) } }),
          h('div', { class: 'nm', text: c.name }),
          h('div', { class: 'ds', text: c.desc }),
          ...(c.stats.length ? [h('div', { class: 'st' }, ...c.stats.map((t) => h('div', { text: t })))] : []),
          ...(c.links.length ? [h('div', { class: 'lk' }, ...c.links.map((t) => h('div', { text: t })))] : []),
          h('div', { class: 'key', text: `Phím ${i + 1}` }),
        ),
      );
    });
    this.overlay = h('div', { class: 'screen overlay' }, h('h2', { text: `Lên cấp ${level}!` }), list);
    this.root.append(this.overlay);
  }

  hideCards(): void {
    this.clearOverlay();
  }

  private update(): void {
    const s = this.scene.hudState();
    this.hp.fill.style.width = `${Math.max(0, (s.hp / s.maxHp) * 100)}%`;
    this.hp.label.textContent = `${Math.ceil(s.hp)} / ${Math.ceil(s.maxHp)}`;
    this.xp.fill.style.width = `${(s.xp / s.xpNeed) * 100}%`;
    this.xp.label.textContent = `Cấp ${s.level}`;
    const left = s.duration - s.time;
    this.timer.textContent = left > 0 ? fmtTime(left) : 'BOSS';
    this.stg.textContent = s.stageName;
    this.info.textContent = `Hạ gục ${fmt(s.kills)} · Linh thạch ${fmt(s.linh)}`;
    if (s.bossName) {
      this.bossBox.classList.remove('hidden');
      this.bossName.textContent = s.bossName + (s.bossPhase2 ? ' · Cuồng bạo' : '');
      this.boss.fill.style.width = `${Math.max(0, (s.bossHp / s.bossMax) * 100)}%`;
      this.boss.label.textContent = `${fmt(s.bossHp)} / ${fmt(s.bossMax)}`;
    } else this.bossBox.classList.add('hidden');

    const key = s.skills.map((k) => `${k.id}${k.level}${k.awakened}`).join('|');
    if (key !== this.slotKey) {
      this.slotKey = key;
      this.slots.replaceChildren(
        ...s.skills.map((k) => {
          const inf = skillInfo(k.id);
          return h('div', { class: 'slot ' + k.kind + (k.awakened ? ' awk' : ''), style: { background: css(inf.color) }, title: inf.name },
            [...inf.name].filter((c) => c !== ' ').slice(0, 1).join(''),
            h('small', { text: String(k.level) }),
          );
        }),
      );
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
