import { bar, css, h } from '../dom';
import { fmt, fmtTime } from '../../utils/format';
import { MAT_IDS, MAT_NAMES, SLOT_IDS, SLOT_NAMES, type SlotId } from '../../config/types';
import { MAX_TIER, TIERS, nextTierNeed, tierName } from '../../config/realms';
import { WORLDS, worldById, type StageDef } from '../../config/worlds';
import { ACTIVES } from '../../config/activeSkills';
import { weaponById } from '../../config/weapons';
import { MAX_ITEM_LEVEL, PILLS, RARITIES, itemName, itemStatLines, type ItemInst } from '../../config/items';
import * as P from '../../systems/Progression';
import { audio } from '../../systems/Audio';

type Tab = 'stage' | 'cultivate' | 'alchemy' | 'forge' | 'gear' | 'skill';
const TABS: [Tab, string][] = [
  ['stage', 'Lịch Luyện'],
  ['cultivate', 'Tu Luyện'],
  ['alchemy', 'Luyện Đan'],
  ['forge', 'Luyện Khí'],
  ['gear', 'Trang Bị'],
  ['skill', 'Kỹ Năng'],
];

/** Căn cứ của người chơi giữa các màn: chọn màn, tu luyện, luyện đan, luyện khí, trang bị, kỹ năng. */
export class Hub {
  readonly root = h('div', { class: 'screen hub' });
  private tab: Tab = 'stage';
  private world = 1;
  private readonly head = h('div', { class: 'hub-head' });
  private readonly tabs = h('div', { class: 'tabs' });
  private readonly body = h('div', { class: 'tab-body' });

  constructor(
    private readonly onStage: (s: StageDef) => void,
    private readonly onBack: () => void,
    private readonly toast: (m: string) => void,
  ) {
    this.root.append(this.head, this.tabs, this.body);
  }

  /** Mở hub; `world` chọn sẵn thế giới (dùng khi quay về sau màn chơi) */
  open(world?: number): void {
    this.world = world ?? Math.min(P.highestWorld(), this.world || 1);
    this.render();
  }

  private act(r: P.Result): void {
    audio.play(r.ok ? 'click' : 'hurt');
    this.toast(r.msg);
    this.render();
  }

  private render(): void {
    const s = P.getSave();
    // --- Đầu trang ---
    const need = nextTierNeed(s.tier);
    const t = bar('tuvi');
    const base = TIERS[s.tier].cumTuVi;
    t.fill.style.width = need === null ? '100%' : `${Math.min(100, ((s.tuVi - base) / (need - base)) * 100)}%`;
    t.label.textContent = need === null ? 'Đỉnh cao' : `Tu vi ${fmt(s.tuVi)} / ${fmt(need)}`;
    t.root.style.width = '200px';
    this.head.replaceChildren(
      h('button', { class: 'btn small', text: '◀ Menu', onclick: this.onBack }),
      h('div', { class: 'realm', text: tierName(s.tier) }),
      t.root,
      h('div', { class: 'res' },
        h('span', { class: 'gold', text: `Linh thạch ${fmt(s.linh)}` }),
        ...MAT_IDS.map((m) => h('span', { text: `${MAT_NAMES[m]} ${s.mats[m]}` })),
      ),
    );
    this.tabs.replaceChildren(
      ...TABS.map(([id, name]) => h('div', { class: 'tab' + (id === this.tab ? ' on' : ''), text: name, onclick: () => { this.tab = id; this.render(); } })),
    );
    const view = { stage: this.vStage, cultivate: this.vCultivate, alchemy: this.vAlchemy, forge: this.vForge, gear: this.vGear, skill: this.vSkill }[this.tab];
    const scroll = this.body.scrollTop;
    this.body.replaceChildren(view.call(this));
    this.body.scrollTop = scroll;
  }

  // ------------------------------------------------------------------ Lịch Luyện
  private vStage(): HTMLElement {
    const root = h('div');
    const ws = h('div', { class: 'worlds' });
    for (const w of WORLDS) {
      const ok = P.isWorldUnlocked(w.id);
      ws.append(h('div', { class: 'wbtn' + (w.id === this.world ? ' on' : '') + (ok ? '' : ' lock'), text: `${ok ? '' : '🔒 '}${w.id}. ${w.name}`, onclick: () => { this.world = w.id; this.render(); } }));
    }
    root.append(ws);
    const w = worldById(this.world);
    root.append(h('div', { class: 'dim', style: 'margin-bottom:8px', text: w.desc }));
    if (!P.isWorldUnlocked(w.id)) {
      root.append(h('div', { class: 'card', text: '🔒 ' + P.worldGateText(w.id) }));
      return root;
    }
    const grid = h('div', { class: 'grid' });
    for (const st of w.stages) {
      const unlocked = P.isStageUnlocked(st);
      const done = P.isCleared(st.id);
      grid.append(
        h('div', { class: 'card stage' + (done ? ' done' : '') + (unlocked ? '' : ' lock') },
          h('div', { class: 'no', text: done ? '✓' : String(st.index + 1) }),
          h('div', { class: 'grow' },
            h('div', null, st.name, st.boss.main ? h('span', { class: 'tag boss', text: 'Boss chính' }) : null, st.fixed ? h('span', { class: 'tag fixed', text: 'Bí bảo' }) : null),
            h('div', { class: 'dim', style: 'font-size:13px', text: `${st.event} · ${fmtTime(st.duration)}` }),
          ),
          h('button', { class: 'btn small primary', text: unlocked ? 'Khiêu chiến' : '🔒', disabled: unlocked ? null : 'disabled', onclick: () => this.onStage(st) }),
        ),
      );
    }
    root.append(grid);
    return root;
  }

  // ------------------------------------------------------------------ Tu Luyện
  private vCultivate(): HTMLElement {
    const s = P.getSave();
    const root = h('div');
    const need = nextTierNeed(s.tier);
    const pk = P.packInfo();
    root.append(
      h('div', { class: 'card' },
        h('div', { class: 'gold', style: 'font-size:20px', text: tierName(s.tier) }),
        h('div', { class: 'dim', text: need === null ? 'Đã đạt cảnh giới cao nhất.' : `Đột phá lên ${tierName(s.tier + 1)}: cần ${fmt(need)} tu vi (đang có ${fmt(s.tuVi)}).` }),
        h('div', { class: 'dim', style: 'margin-top:6px', text: `Tu vi nhận từ việc vượt màn. Cảnh giới càng cao, máu và sát thương càng lớn, mở khóa kỹ năng chủ động mới (${s.tier}/${MAX_TIER}).` }),
        h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn primary', text: 'Đột phá', disabled: P.canBreakthrough() ? null : 'disabled', onclick: () => this.act(P.breakthrough()) })),
      ),
      h('div', { class: 'card', style: 'margin-top:10px' },
        h('div', { class: 'gold', text: 'Cắn linh thạch' }),
        h('div', { class: 'dim', text: `Mỗi gói: ${fmt(pk.cost)} linh thạch → ${fmt(pk.gain)} tu vi.` }),
        h('div', { class: 'row', style: 'margin-top:8px' },
          h('button', { class: 'btn', text: '×1', onclick: () => this.act(P.buyPack(1)) }),
          h('button', { class: 'btn', text: '×10', onclick: () => this.act(P.buyPack(10)) }),
          h('button', { class: 'btn', text: 'Tối đa', onclick: () => this.act(P.buyPack(1e9)) }),
        ),
      ),
    );
    return root;
  }

  // ------------------------------------------------------------------ Luyện Đan
  private vAlchemy(): HTMLElement {
    const grid = h('div', { class: 'grid' });
    for (const p of PILLS) {
      const cnt = P.pillCount(p.id);
      grid.append(
        h('div', { class: 'card' },
          h('div', { class: 'gold', text: p.name + (p.cap ? ` (${cnt}/${p.cap})` : '') }),
          h('div', { class: 'dim', text: p.desc }),
          h('div', { style: 'margin:6px 0', text: `Cần: ${p.herb} thảo dược${p.core ? `, ${p.core} yêu đan` : ''}, ${fmt(P.pillLinhCost(p.id))} linh thạch` }),
          h('button', { class: 'btn small', text: 'Luyện đan', onclick: () => this.act(P.craftPill(p.id)) }),
        ),
      );
    }
    return grid;
  }

  // ------------------------------------------------------------------ Luyện Khí
  private vForge(): HTMLElement {
    const fc = P.forgeCost();
    const grid = h('div', { class: 'grid' });
    for (const slot of SLOT_IDS.filter((x) => x !== 'bibao')) {
      grid.append(
        h('div', { class: 'card' },
          h('div', { class: 'gold', text: 'Chế tạo ' + SLOT_NAMES[slot] }),
          h('div', { class: 'dim', text: 'Phẩm chất ngẫu nhiên, thế giới càng cao càng dễ ra phẩm tốt.' }),
          h('div', { style: 'margin:6px 0', text: `Cần: ${fc.ore} khoáng thạch, ${fmt(fc.linh)} linh thạch` }),
          h('button', {
            class: 'btn small',
            text: 'Luyện khí',
            onclick: () => {
              const r = P.forge(slot);
              this.act(r.ok && r.item ? { ok: true, msg: `Chế tạo được: ${itemName(r.item)} (${RARITIES[r.item.rarity].name})` } : r);
            },
          }),
        ),
      );
    }
    return h('div', null, grid, h('div', { class: 'dim', style: 'margin-top:10px', text: 'Bí bảo không chế tạo được: nhận khi vượt màn 5 và màn 10 của mỗi thế giới lần đầu.' }));
  }

  // ------------------------------------------------------------------ Trang Bị
  private itemCard(it: ItemInst, equipped: boolean): HTMLElement {
    const upg = P.upgradeCost(it);
    const color = RARITIES[it.rarity].color;
    return h('div', { class: 'card item', style: { borderLeftColor: color } },
      h('div', { class: 'nm', style: { color }, text: itemName(it) }),
      h('div', { class: 'dim', style: 'font-size:12px', text: `${SLOT_NAMES[it.slot]} · ${RARITIES[it.rarity].name} · +${it.level}` }),
      ...itemStatLines(it).map((l) => h('div', { style: 'font-size:13px', text: l })),
      h('div', { class: 'row', style: 'margin-top:6px' },
        equipped
          ? h('button', { class: 'btn small', text: 'Tháo', disabled: it.slot === 'weapon' ? 'disabled' : null, onclick: () => { P.unequip(it.slot); this.render(); } })
          : h('button', { class: 'btn small', text: 'Trang bị', onclick: () => this.act(P.equip(it.uid)) }),
        it.level < MAX_ITEM_LEVEL
          ? h('button', { class: 'btn small', text: `Cường hóa (${upg.ore}KT, ${fmt(upg.linh)}LT)`, onclick: () => this.act(P.upgradeItem(it.uid)) })
          : null,
        equipped ? null : h('button', { class: 'btn small danger', text: `Bán +${fmt(P.sellValue(it))}`, onclick: () => this.act(P.sellItem(it.uid)) }),
      ),
    );
  }

  private vGear(): HTMLElement {
    const s = P.getSave();
    const root = h('div');
    const eq = h('div', { class: 'slot-grid' });
    for (const slot of SLOT_IDS) {
      const it = P.equippedItem(slot as SlotId);
      eq.append(it ? this.itemCard(it, true) : h('div', { class: 'card dim', text: `${SLOT_NAMES[slot]}: trống` }));
    }
    const inv = s.items.filter((i) => s.equipped[i.slot] !== i.uid);
    const m = P.computeMeta();
    root.append(
      h('div', { class: 'gold', text: 'Đang trang bị' }),
      eq,
      h('div', { class: 'dim', style: 'margin-bottom:10px', text: `Tổng: máu ${fmt(m.maxHp)} · sát thương ×${m.damage.toFixed(2)} · giáp ${Math.round(m.armor)} · tốc chạy ${Math.round(m.moveSpeed)} · kỹ năng vũ khí: ${weaponById(m.weaponId).name}` }),
      h('div', { class: 'gold', text: `Kho đồ (${inv.length})` }),
    );
    const g = h('div', { class: 'slot-grid' });
    for (const it of inv) g.append(this.itemCard(it, false));
    root.append(inv.length ? g : h('div', { class: 'dim', text: 'Chưa có đồ nào trong kho.' }));
    return root;
  }

  // ------------------------------------------------------------------ Kỹ Năng
  private vSkill(): HTMLElement {
    const s = P.getSave();
    const loadout = P.currentLoadout();
    const root = h('div');
    const w = weaponById(P.computeMeta().weaponId);
    root.append(
      h('div', { class: 'card', style: 'margin-bottom:10px' },
        h('div', { class: 'gold', text: 'Kỹ năng vũ khí (tự động)' }),
        h('div', { class: 'skill-row' }, h('div', { class: 'swatch', style: { background: css(w.color) } }), h('div', null, h('b', { text: w.name }), h('div', { class: 'dim', text: w.desc }))),
      ),
      h('div', { class: 'gold', style: 'margin-bottom:6px', text: `Kỹ năng chủ động mang theo: ${loadout.length}/3` }),
    );
    const grid = h('div', { class: 'grid' });
    for (const a of ACTIVES) {
      const un = a.unlockTier <= s.tier;
      const on = loadout.includes(a.id);
      grid.append(
        h('div', { class: 'card', style: un ? (on ? 'border-color:#e8c96a' : '') : 'opacity:.5' },
          h('div', { class: 'skill-row' },
            h('div', { class: 'swatch', style: { background: css(a.color) } }),
            h('div', { class: 'grow' }, h('b', { text: a.name }), h('div', { class: 'dim', style: 'font-size:13px', text: a.desc })),
          ),
          h('div', { class: 'dim', style: 'font-size:12px;margin:4px 0', text: un ? `Thức tỉnh: ${a.awaken?.name ?? ''}` : `🔒 Mở khóa ở ${tierName(a.unlockTier)}` }),
          h('button', { class: 'btn small' + (on ? ' primary' : ''), text: on ? 'Đang mang' : 'Mang theo', disabled: un ? null : 'disabled', onclick: () => this.act(P.toggleLoadout(a.id)) }),
        ),
      );
    }
    root.append(grid, h('div', { class: 'dim', style: 'margin-top:10px', text: 'Trong màn, kỹ năng chủ động và bị động xuất hiện dưới dạng thẻ khi lên cấp. Tối đa 6 kỹ năng mỗi màn (tính cả kỹ năng vũ khí).' }));
    return root;
  }
}
