import { h } from '../dom';
import { getSave, progressCount, resetAll, setSound, gameCompleted } from '../../systems/Progression';
import { audio } from '../../systems/Audio';

/** Menu chính: Tiếp tục / Cài đặt (âm thanh, xóa tiến trình). */
export function buildMainMenu(onPlay: () => void): HTMLElement {
  const root = h('div', { class: 'screen menu' });
  const render = (): void => {
    root.replaceChildren();
    const p = progressCount();
    const s = getSave();
    root.append(
      h('h1', { text: 'VÕ LUYỆN' }),
      h('div', { class: 'sub' }, 'Survival · Dương Khai con đường tu luyện', h('br'), `Đã vượt ${p.cleared}/${p.total} màn` + (gameCompleted() ? ' · Đã thông quan!' : '')),
      h('button', { class: 'btn primary', text: s.stats.runs > 0 ? 'Tiếp tục' : 'Bắt đầu', onclick: () => { audio.play('click'); onPlay(); } }),
      h('button', {
        class: 'btn',
        text: s.sound ? 'Âm thanh: Bật' : 'Âm thanh: Tắt',
        onclick: () => { setSound(!getSave().sound); audio.enabled = getSave().sound; render(); },
      }),
      h('button', {
        class: 'btn danger',
        text: 'Xóa toàn bộ tiến trình',
        onclick: () => {
          if (window.confirm('Xóa toàn bộ tiến trình và bắt đầu lại từ đầu?')) {
            resetAll();
            render();
          }
        },
      }),
      h('div', { class: 'dim', style: 'font-size:12px;margin-top:16px;text-align:center' }, 'Di chuyển: WASD / phím mũi tên / chạm kéo · Tạm dừng: Esc'),
    );
  };
  render();
  return root;
}
