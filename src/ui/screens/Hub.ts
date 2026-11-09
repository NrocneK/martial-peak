import { bar, css, h } from '../dom';
import { fmt, fmtTime } from '../../utils/format';
import { MAT_IDS, MAT_NAMES, SLOT_IDS, SLOT_NAMES, type SlotId } from '../../config/types';
import { MAX_TIER, TIERS, nextTierNeed, tierCap, tierLabel, tierName } from '../../config/realms';
import { WORLDS, worldById, type StageDef } from '../../config/worlds';
import { ACTIVES } from '../../config/activeSkills';
import { WEAPONS, weaponById } from '../../config/weapons';
import { PASSIVES, passiveById, passiveValueText } from '../../config/passiveSkills';
import { MAX_ITEM_LEVEL, PILLS, RARITIES, WEAPON_ITEM_NAMES, affixText, itemName, itemPower, itemStatLines, type ItemInst } from '../../config/items';
import * as P from '../../systems/progression';
import { audio } from '../../systems/Audio';

/** Biểu tượng pixel (xem tools/art/ui.px.js) */
const ic = (name: string, cls = ''): HTMLElement => h('img', { src: `/ui/ic_${name}.png`, alt: '', class: 'ic ' + cls });
const MAT_ICON: Record<string, string> = { herb: 'herb', core: 'core', ore: 'ore', essence: 'essence' };

type Tab = 'stage' | 'cultivate' | 'alchemy' | 'forge' | 'gear' | 'skill';
const TABS: [Tab, string, string][] = [
  ['stage', 'Lịch Luyện', 'stage'],
  ['cultivate', 'Tu Luyện', 'cultivate'],
  ['alchemy', 'Luyện Đan', 'alchemy'],
  ['forge', 'Luyện Khí', 'forge'],
  ['gear', 'Trang Bị', 'gear'],
  ['skill', 'Kỹ Năng', 'skill'],
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
    /** Chiếu đoạn kết (khi vừa lên Đạo Tổ, hoặc bấm xem lại) */
    private readonly onEnding: () => void,
  ) {
    this.root.append(this.head, h('div', { class: 'hub-main' }, this.tabs, this.body));
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
    const need = tierCap(s.tier);
    const t = bar('tuvi');
    const base = TIERS[s.tier].cumTuVi;
    const perfect = P.perfected();
    const top = s.tier >= MAX_TIER; // Đạo Tổ: không còn thanh tu vi
    t.fill.style.width = `${Math.max(0, Math.min(100, ((s.tuVi - base) / Math.max(1, need - base)) * 100))}%`;
    t.label.textContent = perfect ? 'Viên mãn' : `Tu vi ${fmt(Math.min(s.tuVi, need))} / ${fmt(need)}`;
    this.head.replaceChildren(
      h('button', { class: 'back', title: 'Về menu', 'aria-label': 'Về menu', text: '◀', onclick: this.onBack }),
      h('div', { class: 'realm-box' },
        h('div', { class: 'realm', text: tierLabel(s.tier, s.tuVi) }),
        ...(top ? [] : [t.root]),
      ),
      h('div', { class: 'res' },
        h('span', { class: 'chip gold', title: 'Linh thạch' }, ic('linh'), fmt(s.linh)),
        ...MAT_IDS.map((m) => h('span', { class: 'chip', title: MAT_NAMES[m] }, ic(MAT_ICON[m]), String(s.mats[m]))),
      ),
    );
    this.tabs.replaceChildren(
      ...TABS.map(([id, name, icon]) =>
        h('button', { class: 'tab' + (id === this.tab ? ' on' : ''), onclick: () => { this.tab = id; this.render(); } }, ic(icon), h('span', { text: name })),
      ),
    );
    const view = { stage: this.vStage, cultivate: this.vCultivate, alchemy: this.vAlchemy, forge: this.vForge, gear: this.vGear, skill: this.vSkill }[this.tab];
    const scroll = this.body.scrollTop;
    this.body.replaceChildren(view.call(this));
    this.body.scrollTop = scroll;
  }

  // ------------------------------------------------------------------ Lịch Luyện
  private vStage(): HTMLElement {
    const root = h('div');
    const ws = h('div', { class: 'journey' });
    for (const w of WORLDS) {
      const ok = P.isWorldUnlocked(w.id);
      const cleared = w.stages.filter((st) => P.isCleared(st.id)).length;
      ws.append(h('button', {
        class: 'jn' + (w.id === this.world ? ' on' : '') + (ok ? '' : ' lock') + (cleared === w.stages.length ? ' full' : ''),
        title: ok ? `${cleared}/${w.stages.length} màn` : P.worldGateText(w.id),
        onclick: () => { this.world = w.id; this.render(); },
      }, h('i', { class: 'node' }), h('span', { class: 'jn-name', text: w.name }), h('span', { class: 'jn-sub', text: ok ? `${cleared}/${w.stages.length}` : 'khóa' })));
    }
    root.append(ws);
    const w = worldById(this.world);
    root.append(h('div', { class: 'world-desc' }, h('h2', { text: w.name }), h('p', { text: w.desc })));
    if (!P.isWorldUnlocked(w.id)) {
      root.append(h('div', { class: 'card gate', text: '🔒 ' + P.worldGateText(w.id) }));
      return root;
    }
    const grid = h('div', { class: 'path' });
    for (const st of w.stages) {
      const unlocked = P.isStageUnlocked(st);
      const done = P.isCleared(st.id);
      grid.append(
        h('div', { class: 'card stage' + (done ? ' done' : '') + (unlocked ? '' : ' lock') },
          h('div', { class: 'no' }, h('span', { text: done ? '✓' : String(st.index + 1) })),
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
    const nextIsNewRealm = s.tier < MAX_TIER && TIERS[s.tier + 1].group !== TIERS[s.tier].group;
    root.append(
      h('div', { class: 'card' },
        h('div', { class: 'big-realm', text: tierLabel(s.tier, s.tuVi) }),
        h('div', { class: 'dim', text: need === null ? 'Đạo Tổ: cảnh giới cao nhất, không còn phân bậc và không cần tu vi nữa.' : `Đột phá lên ${tierName(s.tier + 1)}: cần ${fmt(need)} tu vi (đang có ${fmt(s.tuVi)}).` + (nextIsNewRealm ? ' Bước lên đại cảnh giới mới gặp bình cảnh, cần nhiều tu vi hơn hẳn.' : '') }),
        ...(P.daoToLocked() ? [h('div', { class: 'gold', style: 'margin-top:6px', text: `Ngưỡng Đạo Tổ còn bị phong ấn: phải đánh bại ${P.FINAL_BOSS_NAME} (màn 10 Hỗn Độn Thần Vực).` })] : []),
        h('div', { class: 'dim', style: 'margin-top:6px', text: `Tu vi nhận từ việc vượt màn (đánh lại màn vẫn nhận một nửa), cắn linh thạch và đan dược. 17 đại cảnh giới, mỗi cảnh giới 3 kỳ (Sơ, Trung, Hậu). Hậu kỳ đầy tu vi là Viên mãn; Tiên Đế Viên mãn và đã đánh bại ${P.FINAL_BOSS_NAME} thì đột phá lên Đạo Tổ (không chia kỳ). Cảnh giới càng cao, máu và sát thương càng lớn, mở khóa kỹ năng chủ động mới (bậc ${s.tier}/${MAX_TIER}).` }),
        h('div', { style: 'margin-top:10px' },
          s.tier >= MAX_TIER
            ? h('button', { class: 'btn', text: 'Xem lại đoạn kết', onclick: () => this.onEnding() })
            : h('button', { class: 'btn primary', text: nextIsNewRealm ? 'Đột phá đại cảnh giới' : 'Đột phá', disabled: P.canBreakthrough() ? null : 'disabled', onclick: () => {
                const r = P.breakthrough();
                if (r.ending) {
                  audio.play('click');
                  this.onEnding();
                } else this.act(r);
              } }),
        ),
      ),
      ...(s.tier >= MAX_TIER ? [] : [h('div', { class: 'card', style: 'margin-top:10px' },
        h('div', { class: 'gold hd' }, ic('linh'), 'Cắn linh thạch'),
        h('div', { class: 'dim', text: `Mỗi gói: ${fmt(pk.cost)} linh thạch → ${fmt(pk.gain)} tu vi.` }),
        h('div', { class: 'row', style: 'margin-top:8px' },
          h('button', { class: 'btn', text: '×1', onclick: () => this.act(P.buyPack(1)) }),
          h('button', { class: 'btn', text: '×10', onclick: () => this.act(P.buyPack(10)) }),
          h('button', { class: 'btn', text: 'Tối đa', onclick: () => this.act(P.buyPack(1e9)) }),
        ),
      )]),
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
          h('div', { class: 'gold hd' }, ic('alchemy'), p.name + (p.cap ? ` (${cnt}/${p.cap})` : '')),
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
      const isWeapon = slot === 'weapon';
      const card = h('div', { class: 'card' },
        h('div', { class: 'gold hd' }, ic(slot === 'weapon' ? 'forge' : 'gear'), 'Chế tạo ' + SLOT_NAMES[slot]),
        h('div', { class: 'dim', text: 'Phẩm chất và thuộc tính phụ ngẫu nhiên, thế giới càng cao càng dễ ra phẩm tốt.' }),
        h('div', { style: 'margin:6px 0', text: `Cần: ${fc.ore} khoáng thạch, ${fmt(fc.linh)} linh thạch` }),
      );
      const forge = (wid?: string): void => {
        const r = P.forge(slot, wid);
        this.act(r.ok && r.item ? { ok: true, msg: `Chế tạo được: ${itemName(r.item)} (${RARITIES[r.item.rarity].name})` } : r);
      };
      if (isWeapon) {
        // Chọn loại vũ khí muốn chế tạo (hoặc ngẫu nhiên)
        card.append(h('div', { class: 'row' },
          ...WEAPONS.map((w) => h('button', { class: 'btn small', text: WEAPON_ITEM_NAMES[w.id], title: w.name, onclick: () => forge(w.id) })),
          h('button', { class: 'btn small', text: 'Ngẫu nhiên', onclick: () => forge() }),
        ));
      } else card.append(h('button', { class: 'btn small', text: 'Luyện khí', onclick: () => forge() }));
      grid.append(card);
    }
    return h('div', null, grid, h('div', { class: 'dim', style: 'margin-top:10px', text: 'Bí bảo không chế tạo được: nhận khi vượt màn 5 và màn 10 của mỗi thế giới lần đầu.' }));
  }

  // ------------------------------------------------------------------ Trang Bị
  private reforge: P.ReforgeOffer | null = null;
  private filterSlot: SlotId | 'all' = 'all';
  private sortBy: 'new' | 'power' | 'rarity' = 'new';

  private itemCard(it: ItemInst, equipped: boolean): HTMLElement {
    const upg = P.upgradeCost(it);
    const color = RARITIES[it.rarity].color;
    const card = h('div', { class: 'card item', style: { borderLeftColor: color } },
      h('div', { class: 'nm', style: { color }, text: (it.locked ? '🔒 ' : '') + itemName(it) }),
      h('div', { class: 'dim', style: 'font-size:12px', text: `${SLOT_NAMES[it.slot]} · ${RARITIES[it.rarity].name} · +${it.level}` }),
      ...itemStatLines(it).map((l) => h('div', { style: 'font-size:13px', text: l })),
      ...(it.affixes ?? []).map((a, i) =>
        h('div', { class: 'row', style: 'font-size:13px;color:#8fd0ff;gap:6px' },
          h('span', { text: '✦ ' + affixText(a) }),
          it.slot !== 'bibao' ? h('button', { class: 'btn small', text: 'Tái luyện', onclick: () => this.doReforge(it.uid, i) }) : null,
        ),
      ),
    );
    // So sánh với món đang mặc (dùng đúng công thức tính chỉ số tổng)
    if (!equipped && it.slot !== 'bibao') {
      const d = P.compareItem(it.uid);
      const names: Record<string, string> = { maxHp: 'Máu', damage: 'Sát thương', atkSpeed: 'Tốc đánh', armor: 'Giáp', moveSpeed: 'Tốc chạy', crit: 'Chí mạng', area: 'Phạm vi', pickup: 'Nhặt', xpGain: 'XP', linhGain: 'Linh' };
      const parts = Object.entries(d).map(([k, v]) => {
        const rel = k === 'armor' || k === 'pickup' || k === 'maxHp' ? Math.round(v as number) : ((v as number) * 100).toFixed(1) + '%';
        const txt = typeof rel === 'number' ? (rel > 0 ? '+' + rel : String(rel)) : (v as number) > 0 ? '+' + rel : rel;
        return h('span', { style: { color: (v as number) > 0 ? '#55c47a' : '#e0505a', marginRight: '8px' }, text: `${names[k]} ${txt}` });
      });
      if (parts.length) card.append(h('div', { style: 'font-size:12px;margin-top:4px' }, h('span', { class: 'dim', text: 'So với đang mặc: ' }), ...parts));
    }
    const dv = P.dismantleValue(it);
    card.append(h('div', { class: 'row', style: 'margin-top:6px' },
      equipped
        ? h('button', { class: 'btn small', text: 'Tháo', disabled: it.slot === 'weapon' ? 'disabled' : null, onclick: () => { P.unequip(it.slot); this.render(); } })
        : h('button', { class: 'btn small', text: 'Trang bị', onclick: () => this.act(P.equip(it.uid)) }),
      it.level < MAX_ITEM_LEVEL ? h('button', { class: 'btn small', text: `Cường hóa (${upg.ore}KT, ${fmt(upg.linh)}LT)`, onclick: () => this.act(P.upgradeItem(it.uid)) }) : null,
      it.slot !== 'bibao' ? h('button', { class: 'btn small', text: it.locked ? 'Mở khóa' : 'Khóa', onclick: () => { P.toggleLock(it.uid); this.render(); } }) : null,
      equipped || it.slot === 'bibao' ? null : h('button', { class: 'btn small danger', text: `Bán +${fmt(P.sellValue(it))}`, onclick: () => this.confirmAct(it, () => P.sellItem(it.uid)) }),
      equipped || it.slot === 'bibao' ? null : h('button', { class: 'btn small danger', text: `Phân giải +${dv.ore}KT${dv.essence ? ` +${dv.essence}TH` : ''}`, onclick: () => this.confirmAct(it, () => P.dismantleItem(it.uid)) }),
    ));
    return card;
  }

  /** Đồ phẩm chất Thánh trở lên: hỏi lại trước khi bán / phân giải */
  private confirmAct(it: ItemInst, fn: () => P.Result): void {
    if (it.rarity >= 3 && !window.confirm(`Bạn chắc chắn muốn xử lý "${itemName(it)}" (${RARITIES[it.rarity].name})?`)) return;
    this.act(fn());
  }

  private doReforge(uid: number, index: number): void {
    const r = P.rollReforge(uid, index);
    if (r.ok && r.offer) {
      this.reforge = r.offer;
      audio.play('click');
      this.render();
    } else this.act(r);
  }

  private reforgePanel(): HTMLElement | null {
    const o = this.reforge;
    if (!o) return null;
    return h('div', { class: 'card', style: 'border-color:#8fd0ff;margin-bottom:12px' },
      h('div', { class: 'gold', text: 'Kết quả tái luyện (chi phí đã trừ)' }),
      h('div', null, 'Cũ: ', h('b', { text: affixText(o.old) }), '  →  Mới: ', h('b', { style: 'color:#8fd0ff', text: affixText(o.next) })),
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn primary small', text: 'Nhận thuộc tính mới', onclick: () => { this.reforge = null; this.act(P.acceptReforge(o)); } }),
        h('button', { class: 'btn small', text: 'Giữ thuộc tính cũ', onclick: () => { this.reforge = null; this.render(); } }),
      ),
    );
  }

  private vGear(): HTMLElement {
    const s = P.getSave();
    const root = h('div');
    const rp = this.reforgePanel();
    if (rp) root.append(rp);
    if (s.inbox.length) {
      root.append(h('div', { class: 'card', style: 'border-color:var(--gold);margin-bottom:12px' },
        h('div', { class: 'gold', text: `Hòm thưởng (${s.inbox.length}) — túi đầy nên đồ nằm ở đây, hãy dọn chỗ rồi nhận` }),
        ...s.inbox.map((it) => h('div', { class: 'row', style: 'margin-top:6px' },
          h('span', { style: { color: RARITIES[it.rarity].color }, text: itemName(it) }),
          h('button', { class: 'btn small primary', text: 'Nhận', onclick: () => this.act(P.claimInbox(it.uid)) }),
        )),
      ));
    }
    const eq = h('div', { class: 'slot-grid' });
    for (const slot of SLOT_IDS) {
      const it = P.equippedItem(slot as SlotId);
      eq.append(it ? this.itemCard(it, true) : h('div', { class: 'card empty dim' }, ic(slot === 'weapon' ? 'forge' : 'gear'), `${SLOT_NAMES[slot]}: trống`));
    }
    const m = P.computeMeta();
    root.append(
      h('div', { class: 'gold hd' }, ic('gear'), 'Đang trang bị'),
      eq,
      h('div', { class: 'dim', style: 'margin-bottom:10px', text: `Tổng: máu ${fmt(m.maxHp)} · sát thương ×${m.damage.toFixed(2)} · giáp ${Math.round(m.armor)} · tốc chạy ${Math.round(m.moveSpeed)} · kỹ năng vũ khí: ${weaponById(m.weaponId).name}` }),
    );
    // Bộ lọc + sắp xếp túi đồ
    let inv = s.items.filter((i) => s.equipped[i.slot] !== i.uid && (this.filterSlot === 'all' || i.slot === this.filterSlot));
    if (this.sortBy === 'power') inv = inv.slice().sort((a, b) => itemPower(b) - itemPower(a));
    else if (this.sortBy === 'rarity') inv = inv.slice().sort((a, b) => b.rarity - a.rarity || b.grade - a.grade);
    else inv = inv.slice().sort((a, b) => b.uid - a.uid);
    const sel = (opts: [string, string][], cur: string, on: (v: string) => void): HTMLElement => {
      const el = h('select', { class: 'btn small', style: 'background:#1a2140' }, ...opts.map(([v, t]) => h('option', { value: v, text: t, selected: v === cur ? 'selected' : null })));
      el.addEventListener('change', () => on(el.value));
      return el;
    };
    root.append(
      h('div', { class: 'row', style: 'margin-bottom:8px' },
        h('span', { class: 'gold hd' }, ic('ore'), `Kho đồ (${s.items.length}/120)`),
        sel([['all', 'Mọi ô'], ...SLOT_IDS.map((x) => [x, SLOT_NAMES[x]] as [string, string])], this.filterSlot, (v) => { this.filterSlot = v as SlotId | 'all'; this.render(); }),
        sel([['new', 'Mới nhất'], ['power', 'Sức mạnh'], ['rarity', 'Phẩm chất']], this.sortBy, (v) => { this.sortBy = v as 'new' | 'power' | 'rarity'; this.render(); }),
      ),
    );
    const g = h('div', { class: 'slot-grid' });
    for (const it of inv) g.append(this.itemCard(it, false));
    root.append(inv.length ? g : h('div', { class: 'dim', text: 'Không có món nào.' }));
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
        h('div', { class: 'gold hd' }, ic('skill'), 'Kỹ năng vũ khí (tự động)'),
        h('div', { class: 'skill-row' }, h('div', { class: 'swatch', style: { background: css(w.color) } }), h('div', null, h('b', { text: w.name }), h('div', { class: 'dim', text: w.desc }), h('div', { class: 'dim', style: 'font-size:12px;margin-top:4px', text: `Bị động liên kết: ${passiveById(w.linkedPassive).name} · Thức tỉnh: ${w.awaken?.name ?? '—'}` }))),
      ),
      h('div', { class: 'gold', style: 'margin-bottom:6px', text: `Kỹ năng chủ động mang theo: ${loadout.length}/3` }),
    );
    const grid = h('div', { class: 'grid' });
    for (const a of ACTIVES) {
      const un = a.unlockTier <= s.tier;
      const on = loadout.includes(a.id);
      grid.append(
        h('div', { class: 'card', style: un ? (on ? 'border-color:var(--gold)' : '') : 'opacity:.5' },
          h('div', { class: 'skill-row' },
            h('div', { class: 'swatch', style: { background: css(a.color) } }),
            h('div', { class: 'grow' }, h('b', { text: a.name }), h('div', { class: 'dim', style: 'font-size:13px', text: a.desc })),
          ),
          h('div', { class: 'dim', style: 'font-size:12px;margin:4px 0', text: un ? `Thức tỉnh: ${a.awaken?.name ?? ''}` : `🔒 Mở khóa ở ${tierName(a.unlockTier)}` }),
          h('button', { class: 'btn small' + (on ? ' primary' : ''), text: on ? 'Đang mang' : 'Mang theo', disabled: un ? null : 'disabled', onclick: () => this.act(P.toggleLoadout(a.id)) }),
        ),
      );
    }
    // --- Danh sách kỹ năng bị động (xuất hiện dưới dạng thẻ trong màn) ---
    const pgrid = h('div', { class: 'grid' });
    for (const p of PASSIVES) {
      const linked = [...WEAPONS, ...ACTIVES].filter((k) => k.linkedPassive === p.id).map((k) => k.name);
      pgrid.append(
        h('div', { class: 'card' },
          h('div', { class: 'skill-row' },
            h('div', { class: 'swatch', style: { background: css(p.color), borderRadius: '50%' } }),
            h('div', { class: 'grow' }, h('b', { text: p.name }), h('div', { class: 'dim', style: 'font-size:13px', text: p.desc })),
          ),
          h('div', { style: 'font-size:12px;margin-top:4px', text: `Mỗi cấp ${passiveValueText(p, 1)} · tối đa cấp 5: ${passiveValueText(p, 5)}` }),
          h('div', { class: 'dim', style: 'font-size:12px', text: linked.length ? `Liên kết (thức tỉnh): ${linked.join(', ')}` : 'Không liên kết kỹ năng nào' }),
        ),
      );
    }
    root.append(
      grid,
      h('div', { class: 'gold', style: 'margin:14px 0 6px', text: `Kỹ năng bị động (${PASSIVES.length}) — tự xuất hiện dưới dạng thẻ khi lên cấp` }),
      pgrid,
      h('div', { class: 'dim', style: 'margin-top:10px', text: 'Trong màn, kỹ năng chủ động và bị động xuất hiện dưới dạng thẻ khi lên cấp. Tối đa 6 kỹ năng mỗi màn (tính cả kỹ năng vũ khí).' }));
    return root;
  }
}
