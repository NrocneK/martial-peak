import { h, heroSprite } from '../dom';
import { getSave, progressCount, gameCompleted } from '../../systems/progression';
import { tierLabel } from '../../config/realms';
import { audio } from '../../systems/Audio';
import { openSettings } from './Settings';

/**
 * Menu chính: nền Vân Hạc Tông (dùng chung với Lobby), tiêu đề vàng, Cố Trường Ca đứng trước cổng,
 * hai nút gọn: Bắt đầu / Tiếp tục và Cài Đặt (âm thanh, save, xóa tiến trình nằm trong bảng Cài Đặt).
 */
export function buildMainMenu(onPlay: () => void): HTMLElement {
  const root = h('div', { class: 'screen menu' });
  const nav = h('nav', { class: 'menu-nav' });

  const render = (): void => {
    const p = progressCount();
    const s = getSave();
    nav.replaceChildren(
      h('button', { class: 'go', onclick: () => { audio.play('click'); onPlay(); } },
        h('img', { src: '/ui/seal.png', alt: '', class: 'seal' }),
        h('span', { class: 'go-t' }, h('b', { text: s.stats.runs > 0 ? 'Tiếp Tục' : 'Bắt Đầu' }), h('small', { text: tierLabel(s.tier, s.tuVi) })),
        h('span', { class: 'go-arrow', text: '▶' }),
      ),
      h('div', { class: 'lit' },
        h('div', { class: 'lit-bar' }, h('i', { style: { width: `${(p.cleared / p.total) * 100}%` } })),
        h('span', { text: gameCompleted() ? 'Đã thông quan' : `Đã vượt ${p.cleared} / ${p.total} màn` }),
      ),
      h('button', { class: 'mi', onclick: () => { audio.play('click'); openSettings(render); } },
        h('img', { src: '/ui/ic_settings.png', alt: '', class: 'ic' }), h('span', { class: 'lb', text: 'Cài Đặt' })),
    );
  };
  render();

  root.append(
    h('div', { class: 'sect' }),
    h('div', { class: 'menu-shade' }),
    h('header', { class: 'menu-head' },
      h('h1', { class: 'menu-title' }, h('span', { text: 'VẠN GIỚI' }), h('span', { text: 'TẦM QUANG' })),
      h('p', { class: 'menu-tag', text: 'Cố Trường Ca và con đường tu tiên' }),
    ),
    heroSprite(3, 'menu-hero'),
    nav,
  );
  return root;
}
