import { h } from '../dom';
import { fmt, fmtTime } from '../../utils/format';
import type { RewardSummary } from '../../systems/progression';
import { itemColor, itemName, itemRankLabel } from '../../config/items';
import { getSave } from '../../systems/progression';
import { MAX_TIER } from '../../config/realms';
import type { StageDef } from '../../config/worlds';

/** Bảng kết quả sau màn chơi + phần thưởng */
export function buildResult(r: RewardSummary, stage: StageDef, onAgain: () => void, onBack: () => void): HTMLElement {
  const row = (a: string, b: string): HTMLElement => h('div', null, h('span', { class: 'dim', text: a }), h('b', { text: b }));
  const list = h('div', { class: 'list card' },
    row('Thời gian', fmtTime(r.time)),
    row('Cấp đạt được', String(r.level)),
    row('Quái hạ gục', fmt(r.kills)),
    row('Linh thạch', '+' + fmt(r.linh) + (r.victory ? '' : ' (giữ 30%)')),
  );
  if (r.victory) {
    if (getSave().tier < MAX_TIER) list.append(row('Tu vi', '+' + fmt(r.tuVi)));
    if (r.herb) list.append(row('Thảo dược', '+' + r.herb));
    if (r.core) list.append(row('Yêu đan', '+' + r.core));
    if (r.ore) list.append(row('Khoáng thạch', '+' + r.ore));
  }
  const items = r.items.map((it) =>
    h('div', { class: 'card item', style: { borderLeftColor: itemColor(it) } }, h('span', { class: 'gold', text: 'Nhận được: ' }), h('span', { style: { color: itemColor(it) }, text: `${itemName(it)} (${itemRankLabel(it)})` })),
  );
  return h('div', { class: 'screen overlay result' },
    h('h2', { text: r.victory ? 'Chiến thắng!' : 'Bại trận' }),
    h('div', { class: 'dim', text: `${stage.name} · ${stage.event}` + (r.firstClear ? ' · Lần đầu vượt màn' : '') }),
    list,
    ...items,
    r.inboxed ? h('div', { class: 'card', style: 'border-color:#e8c96a;max-width:420px;text-align:center', text: `Túi đồ đầy: ${r.inboxed} món đang nằm trong Hòm thưởng (tab Trang Bị). Dọn chỗ rồi nhận nhé.` }) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', text: r.victory ? 'Về Lịch Luyện' : 'Về Lịch Luyện', onclick: onBack }),
      h('button', { class: 'btn', text: 'Chơi lại màn này', onclick: onAgain }),
    ),
  );
}
