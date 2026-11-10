import { bar, css, h, heroAvatar, heroSprite, openModal } from '../dom';
import { fmt, fmtTime } from '../../utils/format';
import { MAT_IDS, MAT_NAMES, SLOT_IDS, SLOT_NAMES, type SlotId } from '../../config/types';
import { MAX_TIER, TIERS, nextTierNeed, tierCap, tierLabel, tierName } from '../../config/realms';
import { WORLDS, worldById, type StageDef } from '../../config/worlds';
import { ACTIVES } from '../../config/activeSkills';
import { WEAPONS, weaponById } from '../../config/weapons';
import { PASSIVES, passiveById, passiveValueText } from '../../config/passiveSkills';
import { BIBAOS, MAX_ITEM_LEVEL, PILLS, RARITIES, WEAPON_ITEM_NAMES, affixText, itemName, itemPower, itemStatLines, type ItemInst } from '../../config/items';
import * as P from '../../systems/progression';
import { audio } from '../../systems/Audio';
import { openSettings } from './Settings';

/** Biểu tượng pixel (xem tools/art/icons.px.js) */
const ic = (name: string, cls = ''): HTMLElement => h('img', { src: `/ui/ic_${name}.png`, alt: '', class: 'ic ' + cls });
const MAT_ICON: Record<string, string> = { herb: 'herb', core: 'core', ore: 'ore', essence: 'essence' };
const slotIcon = (slot: SlotId): string => (slot === 'weapon' ? 'forge' : slot === 'bibao' ? 'essence' : 'gear');

/**
 * Ảnh nền tông môn có 2 bản (dọc / ngang, chọn bằng CSS theo tỉ lệ màn hình). Tâm + bán kính của
 * Truyền Tống Trận tính theo pixel ảnh — PHẢI khớp tools/art/sect_bg.px.js (TALL.portal / WIDE.portal).
 * `posY` khớp background-position-y trong styles.css (.sect).
 */
const SECT = {
  tall: { w: 288, h: 512, x: 144, y: 414, r: 33, posY: 1 },
  wide: { w: 512, h: 288, x: 256, y: 214, r: 23, posY: 0.7 },
};
const TALL_MQ = '(max-aspect-ratio: 1/1)';

/** 'stage' (Lịch Luyện / chọn màn) mở bằng Truyền Tống Trận ở Sảnh nên không có nút riêng ở thanh dưới */
type Tab = 'home' | 'stage' | 'cultivate' | 'bag' | 'craft' | 'quest';
const NAV: [Tab, string, string][] = [
  ['home', 'Sảnh', 'home'],
  ['cultivate', 'Tu Luyện', 'cultivate'],
  ['bag', 'Hành Trang', 'bag'],
  ['craft', 'Chế Tạo', 'forge'],
  ['quest', 'Nhiệm Vụ', 'quest'],
];
const TITLES: Record<Tab, string> = { home: 'Sảnh', stage: 'Lịch Luyện', cultivate: 'Tu Luyện', bag: 'Hành Trang', craft: 'Chế Tạo', quest: 'Nhiệm Vụ' };

/**
 * Lobby (Sảnh Vân Hạc Tông): nơi người chơi ở giữa các màn.
 *   - Thanh trên: avatar, cảnh giới, tu vi, tài nguyên, nút Cài Đặt.
 *   - Sảnh: ảnh nền tông môn; bấm Truyền Tống Trận (cổng xoáy giữa màn hình) để vào chọn màn. Cột trái: Hòm Thư.
 *   - Thanh dưới: Sảnh · Tu Luyện · Hành Trang · Chế Tạo · Nhiệm Vụ.
 * Nội dung các mục KHÔNG cuộn dọc: danh sách dài chia trang (◀ 1/3 ▶), số ô mỗi trang tự tính theo
 * chiều cao màn hình; chi tiết vật phẩm / kỹ năng / màn mở trong bảng nổi.
 */
export class Hub {
  readonly root = h('div', { class: 'screen hub' });
  private tab: Tab = 'home';
  private world = 1;
  private craftMode: 'forge' | 'alchemy' = 'forge';
  private cultMode: 'realm' | 'active' | 'passive' = 'realm';
  private bagMode: 'gear' | 'inv' = 'gear';
  private questMode: 'daily' | 'main' | 'achieve' = 'daily';
  private filterSlot: SlotId | 'all' = 'all';
  private sortBy: 'new' | 'power' | 'rarity' = 'new';
  /** Trang hiện tại của từng danh sách */
  private pages: Record<string, number> = {};
  /** Số hàng vừa khít đã ĐO được sau khi vẽ (theo danh sách) — ưu tiên hơn ước lượng */
  private fitRows: Record<string, number> = {};
  private measuring = false;
  /** Hộp thoại chi tiết đang mở (đóng khi thao tác xong) + hàm vẽ lại nó */
  private modal: { close: () => void; refresh?: () => void } | null = null;
  private readonly sect = h('div', { class: 'sect' });
  private readonly portalBtn = h('button', { class: 'portal-hit', 'aria-label': 'Truyền Tống Trận: vào Lịch Luyện chọn màn' },
    h('i', { class: 'portal-ring' }), h('span', { class: 'portal-tag' }, h('b', { text: 'Truyền Tống Trận' }), h('small', { text: 'Lịch Luyện' })));
  private readonly top = h('header', { class: 'lb-top' });
  private readonly body = h('main', { class: 'lb-body' });
  private readonly nav = h('nav', { class: 'lb-nav' });
  private resizeT = 0;

  constructor(
    private readonly onStage: (s: StageDef) => void,
    private readonly onBack: () => void,
    private readonly toast: (m: string) => void,
    /** Chiếu đoạn kết (khi vừa lên Đạo Tổ, hoặc bấm xem lại) */
    private readonly onEnding: () => void,
  ) {
    this.portalBtn.addEventListener('click', () => {
      this.world = Math.min(P.highestWorld(), this.world || 1);
      this.go('stage');
    });
    this.sect.append(this.portalBtn);
    this.root.append(this.sect, this.top, this.body, this.nav);
    // Giữ nút Truyền Tống Trận đúng vị trí cổng; đổi cỡ màn hình thì tính lại số ô mỗi trang
    new ResizeObserver(() => {
      this.placePortal();
      window.clearTimeout(this.resizeT);
      this.resizeT = window.setTimeout(() => { this.fitRows = {}; if (this.root.isConnected && this.tab !== 'home') this.render(); }, 150);
    }).observe(this.sect);
  }

  /** Đặt vùng bấm lên đúng cổng xoáy: ảnh nền dùng background-size: cover nên tự tính tỉ lệ + độ lệch */
  private placePortal(): void {
    const W = this.sect.clientWidth, H = this.sect.clientHeight;
    if (!W || !H) return;
    const b = window.matchMedia(TALL_MQ).matches ? SECT.tall : SECT.wide;
    const k = Math.max(W / b.w, H / b.h);
    const ox = (W - b.w * k) * 0.5, oy = (H - b.h * k) * b.posY;
    const r = b.r * k;
    Object.assign(this.portalBtn.style, { left: `${ox + b.x * k - r}px`, top: `${oy + b.y * k - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
  }

  /** Mở lobby; `world` = mở thẳng bản đồ thế giới đó (dùng khi quay về sau màn chơi) */
  open(world?: number): void {
    if (world) {
      this.world = world;
      this.tab = 'stage';
    } else {
      this.world = Math.min(P.highestWorld(), this.world || 1);
      this.tab = 'home';
    }
    this.render();
  }

  private go(tab: Tab): void {
    audio.play('click');
    this.tab = tab;
    this.render();
  }

  /** Kết quả một thao tác: thông báo, vẽ lại lobby và hộp chi tiết đang mở (nếu còn) */
  private act(r: P.Result): void {
    audio.play(r.ok ? 'click' : 'hurt');
    this.toast(r.msg);
    this.modal?.refresh?.();
    this.render();
  }

  /** Mở hộp chi tiết; `build` được gọi lại sau mỗi thao tác để nội dung luôn đúng (trả null = đóng) */
  private detail(title: string, build: () => HTMLElement | null): void {
    this.modal?.close();
    const box = h('div');
    let close = (): void => undefined;
    const refresh = (): void => {
      const el = build();
      if (el) box.replaceChildren(el);
      else close();
    };
    refresh();
    close = openModal(title, box, () => { if (this.modal?.close === close) this.modal = null; });
    this.modal = { close, refresh };
  }

  private render(): void {
    const s = P.getSave();
    // --- Thanh trên: hồ sơ + tài nguyên + cài đặt ---
    const need = tierCap(s.tier);
    const t = bar('tuvi');
    const base = TIERS[s.tier].cumTuVi;
    const top = s.tier >= MAX_TIER; // Đạo Tổ: không còn thanh tu vi
    t.fill.style.width = `${Math.max(0, Math.min(100, ((s.tuVi - base) / Math.max(1, need - base)) * 100))}%`;
    t.label.textContent = P.perfected() ? 'Viên mãn' : `Tu vi ${fmt(Math.min(s.tuVi, need))} / ${fmt(need)}`;
    this.top.replaceChildren(
      h('button', { class: 'profile', title: 'Hành Trang', onclick: () => { this.bagMode = 'gear'; this.go('bag'); } },
        heroAvatar(),
        h('span', { class: 'pf-text' },
          h('b', { class: 'pf-name', text: 'Cố Trường Ca' }),
          h('span', { class: 'pf-realm', text: tierLabel(s.tier, s.tuVi) }),
          ...(top ? [] : [t.root]),
        ),
      ),
      h('div', { class: 'res' },
        h('span', { class: 'chip gold', title: 'Linh thạch' }, ic('linh'), fmt(s.linh)),
        ...MAT_IDS.map((m) => h('span', { class: 'chip', title: MAT_NAMES[m] }, ic(MAT_ICON[m]), fmt(s.mats[m]))),
      ),
      h('button', { class: 'icon-btn', title: 'Cài đặt', 'aria-label': 'Cài đặt', onclick: () => { audio.play('click'); openSettings(() => this.render(), this.onBack); } }, ic('settings')),
    );

    // --- Thanh dưới ---
    const navTab = this.tab === 'stage' ? 'home' : this.tab;
    const questBadge = P.claimableQuests();
    this.nav.replaceChildren(
      ...NAV.map(([id, name, icon]) =>
        h('button', { class: 'nv' + (id === navTab ? ' on' : ''), 'aria-current': id === navTab ? 'page' : null, onclick: () => this.go(id) },
          ic(icon), h('span', { text: name }), id === 'quest' && questBadge ? h('i', { class: 'badge', text: String(questBadge) }) : null),
      ),
    );

    // --- Nội dung ---
    const home = this.tab === 'home';
    this.root.classList.toggle('at-home', home);
    if (home) {
      this.body.replaceChildren(this.vHome());
      requestAnimationFrame(() => this.placePortal());
      return;
    }
    const views: Record<Exclude<Tab, 'home'>, () => HTMLElement> = {
      stage: this.vStage, cultivate: this.vCultivateTab, bag: this.vBag, craft: this.vCraft, quest: this.vQuest,
    };
    const content = h('div', { class: 'panel-body' }, views[this.tab as Exclude<Tab, 'home'>].call(this));
    requestAnimationFrame(() => this.measure());
    this.body.replaceChildren(
      h('section', { class: 'panel' },
        h('div', { class: 'panel-head' },
          this.tab === 'stage' ? h('button', { class: 'back', 'aria-label': 'Về Sảnh', text: '◀', onclick: () => this.go('home') }) : null,
          h('h2', { text: TITLES[this.tab] }),
        ),
        content,
      ),
    );
  }

  // ------------------------------------------------------------------ tiện ích chung
  private sideBtn(icon: string, label: string, badge: number, onclick: () => void): HTMLElement {
    return h('button', { class: 'side-btn', onclick: () => { audio.play('click'); onclick(); } },
      ic(icon), h('span', { text: label }), badge > 0 ? h('i', { class: 'badge', text: String(badge) }) : null);
  }

  /** Thanh chuyển tab con */
  private segs<T extends string>(cur: T, items: [T, string, string][], set: (v: T) => void): HTMLElement {
    return h('div', { class: 'segs' }, ...items.map(([id, name, icon]) =>
      h('button', { class: 'seg' + (cur === id ? ' on' : ''), onclick: () => { set(id); audio.play('click'); this.render(); } }, ic(icon), name)));
  }

  /**
   * Số ô vừa một trang: lấy chiều cao vùng nội dung trừ phần đầu (`reserved`), chia cho chiều cao một hàng;
   * số cột theo bề rộng tối thiểu một ô (`colW`). Luôn ít nhất 1 hàng.
   */
  private fit(key: string, rowH: number, reserved: number, colW = 0): { per: number; cols: number; key: string } {
    const bodyH = this.body.clientHeight || window.innerHeight - 200;
    const bodyW = Math.min(this.body.clientWidth || window.innerWidth, 1120);
    const innerH = bodyH - 20 - 32 - 50 - 24; // lề panel + viền + tiêu đề + lề trong (ước lượng lần đầu)
    const innerW = bodyW - 20 - 32 - 20;
    const rows = this.fitRows[key] ?? Math.max(1, Math.floor((innerH - reserved - 46) / rowH)); // 46 = thanh chuyển trang
    const cols = colW ? Math.max(1, Math.floor((innerW + 10) / (colW + 10))) : 1;
    return { per: rows * cols, cols, key };
  }

  /**
   * Sau khi vẽ: đo chỗ trống thật bên dưới mỗi lưới chia trang, nếu vừa thêm / bớt được hàng thì vẽ lại.
   * Chỉ vẽ lại tối đa một lần cho mỗi lần đo để không lặp vô hạn.
   */
  private measure(): void {
    if (this.measuring) return;
    const body = this.body.querySelector<HTMLElement>('.panel-body');
    if (!body) return;
    // đo ở cỡ thật (bỏ co của lần trước), số hàng tính xong mới co nếu vẫn thiếu chỗ
    const inner = body.firstElementChild as HTMLElement | null;
    if (inner) inner.style.zoom = '';
    let changed = false;
    body.querySelectorAll<HTMLElement>('.paged[data-key]').forEach((pg) => {
      const grid = pg.querySelector<HTMLElement>('.pg-grid');
      const cell = grid?.firstElementChild as HTMLElement | null;
      if (!grid || !cell) return;
      const gap = parseFloat(getComputedStyle(grid).rowGap) || 10;
      const cellH = cell.offsetHeight + gap;
      const top = grid.getBoundingClientRect().top - body.getBoundingClientRect().top;
      const avail = body.clientHeight - top - 46 - 8; // chừa thanh chuyển trang + lề dưới
      const rows = Math.max(1, Math.floor((avail + gap) / cellH));
      const key = pg.dataset.key!;
      if (rows !== Number(pg.dataset.rows)) {
        this.fitRows[key] = rows;
        changed = true;
      }
    });
    if (changed) {
      this.measuring = true;
      this.render();
      this.measuring = false;
      return; // lần vẽ lại sẽ tự đo + co lần nữa
    }
    this.shrinkToFit(body);
  }

  /**
   * Lưới bảo vệ cuối cùng để KHÔNG BAO GIỜ phải cuộn: nếu nội dung vẫn cao hơn khung
   * (máy đặt cỡ chữ hệ thống lớn, màn hình rất thấp...) thì thu nhỏ cả khối nội dung vừa đủ lọt khung.
   */
  private shrinkToFit(body: HTMLElement): void {
    const inner = body.firstElementChild as HTMLElement | null;
    if (!inner) return;
    inner.style.zoom = '';
    for (let i = 0; i < 3; i++) {
      const over = body.scrollHeight - body.clientHeight;
      if (over <= 1) return;
      const cur = parseFloat(inner.style.zoom || '1');
      inner.style.zoom = String(Math.max(0.55, cur * (body.clientHeight / body.scrollHeight) - 0.01));
    }
  }

  /** Danh sách chia trang: lưới các ô + thanh ◀ trang ▶ */
  private paged<T>(f: { key: string; per: number; cols: number }, items: T[], cell: (t: T) => HTMLElement): HTMLElement {
    const { key, per, cols } = f;
    const pages = Math.max(1, Math.ceil(items.length / per));
    const cur = Math.min(this.pages[key] ?? 0, pages - 1);
    this.pages[key] = cur;
    const set = (p: number): void => { this.pages[key] = p; audio.play('click'); this.render(); };
    return h('div', { class: 'paged', 'data-key': key, 'data-rows': String(Math.ceil(per / cols)) },
      h('div', { class: 'pg-grid', style: `grid-template-columns: repeat(${cols}, minmax(0, 1fr))` }, ...items.slice(cur * per, cur * per + per).map(cell)),
      pages > 1
        ? h('div', { class: 'pager' },
            h('button', { class: 'pg-btn', 'aria-label': 'Trang trước', text: '◀', disabled: cur > 0 ? null : 'disabled', onclick: () => set(cur - 1) }),
            h('span', { text: `${cur + 1} / ${pages}` }),
            h('button', { class: 'pg-btn', 'aria-label': 'Trang sau', text: '▶', disabled: cur < pages - 1 ? null : 'disabled', onclick: () => set(cur + 1) }),
          )
        : null,
    );
  }

  // ------------------------------------------------------------------ Sảnh
  private vHome(): HTMLElement {
    return h('div', { class: 'lb-home' },
      h('div', { class: 'lb-side' },
        this.sideBtn('mail', 'Hòm Thư', P.getSave().inbox.length, () => this.openInbox()),
      ),
    );
  }

  private openInbox(): void {
    audio.play('click');
    this.detail('Hòm Thư', () => {
      const s = P.getSave();
      return h('div', { class: 'inbox' },
        h('p', { class: 'dim', text: 'Khi túi đồ đầy, phần thưởng được gửi vào Hòm Thư (tối đa 20 món, bí bảo không bao giờ mất). Hãy bán hoặc phân giải bớt đồ rồi nhận.' }),
        ...(s.inbox.length
          ? s.inbox.map((it) => h('div', { class: 'inbox-row' },
              h('span', { style: { color: RARITIES[it.rarity].color }, text: itemName(it) }),
              h('button', { class: 'btn small primary', text: 'Nhận', onclick: () => this.act(P.claimInbox(it.uid)) }),
            ))
          : [h('div', { class: 'empty-note', text: 'Hòm thư trống.' })]),
      );
    });
  }

  // ------------------------------------------------------------------ Lịch Luyện (10 ô màn, không cuộn)
  private vStage(): HTMLElement {
    const root = h('div', { class: 'stage-view' });
    const ws = h('div', { class: 'journey' });
    for (const w of WORLDS) {
      const ok = P.isWorldUnlocked(w.id);
      const cleared = w.stages.filter((st) => P.isCleared(st.id)).length;
      ws.append(h('button', {
        class: 'jn' + (w.id === this.world ? ' on' : '') + (ok ? '' : ' lock') + (cleared === w.stages.length ? ' full' : ''),
        title: ok ? `${cleared}/${w.stages.length} màn` : P.worldGateText(w.id),
        onclick: () => { this.world = w.id; audio.play('click'); this.render(); },
      }, h('i', { class: 'node' }), h('span', { class: 'jn-name', text: w.name }), h('span', { class: 'jn-sub', text: ok ? `${cleared}/${w.stages.length}` : 'khóa' })));
    }
    const w = worldById(this.world);
    root.append(ws, h('div', { class: 'world-desc' }, h('h3', { text: w.name }), h('p', { text: w.desc })));
    if (!P.isWorldUnlocked(w.id)) {
      root.append(h('div', { class: 'card gate', text: '🔒 ' + P.worldGateText(w.id) }));
      return root;
    }
    const tile = (st: StageDef): HTMLElement => {
      const unlocked = P.isStageUnlocked(st);
      const done = P.isCleared(st.id);
      return h('button', {
        class: 'st-tile' + (done ? ' done' : '') + (unlocked ? '' : ' lock') + (st.boss.main ? ' main' : ''),
        disabled: unlocked ? null : 'disabled',
        onclick: () => this.openStage(st),
      },
        h('span', { class: 'st-no', text: done ? '✓' : String(st.index + 1) }),
        h('span', { class: 'st-boss', text: st.boss.name }),
        h('span', { class: 'st-tags' }, st.boss.main ? h('i', { class: 'tag boss', text: 'Boss' }) : null, st.fixed ? h('i', { class: 'tag fixed', text: 'Bí bảo' }) : null, unlocked ? null : h('i', { class: 'tag', text: '🔒' })),
      );
    };
    // PC: 5 cột (2 hàng = 10 màn), điện thoại: 2 cột
    const grid = this.paged(this.fit('stage_' + w.id, 102, 140, window.matchMedia('(max-width: 760px)').matches ? 150 : 200), w.stages, tile);
    root.append(grid);
    return root;
  }

  private openStage(st: StageDef): void {
    audio.play('click');
    const done = P.isCleared(st.id);
    const r = st.reward;
    this.detail(`${worldById(st.world).name} · ${st.name}`, () => h('div', { class: 'stage-detail' },
      h('div', { class: 'gold hd', text: st.event }),
      h('div', { class: 'stat-list' },
        h('div', null, h('span', { class: 'dim', text: 'Boss' }), h('b', { text: st.boss.name + (st.boss.final ? ' (boss cuối)' : st.boss.main ? ' (boss chính)' : '') })),
        h('div', null, h('span', { class: 'dim', text: 'Thời gian' }), h('b', { text: fmtTime(st.duration) })),
        h('div', null, h('span', { class: 'dim', text: done ? 'Thưởng đánh lại' : 'Thưởng lần đầu' }), h('b', { text: done ? `${fmt(Math.round(r.tuVi * 0.5))} tu vi, ${fmt(Math.round(r.linh * 0.6))} linh thạch` : `${fmt(r.tuVi)} tu vi, ${fmt(r.linh)} linh thạch` })),
        ...(st.fixed && !done ? [h('div', null, h('span', { class: 'dim', text: 'Bí bảo' }), h('b', { text: 'Nhận khi vượt lần đầu' }))] : []),
      ),
      h('button', { class: 'btn primary wide', text: done ? 'Khiêu chiến lại' : 'Khiêu chiến', onclick: () => { this.modal?.close(); audio.play('click'); this.onStage(st); } }),
    ));
  }

  // ------------------------------------------------------------------ Tu Luyện: Cảnh Giới / Kỹ Năng / Bị Động
  private vCultivateTab(): HTMLElement {
    return h('div', null,
      this.segs(this.cultMode, [['realm', 'Cảnh Giới', 'cultivate'], ['active', 'Kỹ Năng', 'skill'], ['passive', 'Bị Động', 'essence']], (v) => { this.cultMode = v; }),
      this.cultMode === 'realm' ? this.vCultivate() : this.cultMode === 'active' ? this.vSkill() : this.vPassive(),
    );
  }

  private vCultivate(): HTMLElement {
    const s = P.getSave();
    const need = nextTierNeed(s.tier);
    const pk = P.packInfo();
    const nextIsNewRealm = s.tier < MAX_TIER && TIERS[s.tier + 1].group !== TIERS[s.tier].group;
    return h('div', { class: 'realm-wrap' },
      h('div', { class: 'meditate', role: 'img', 'aria-label': 'Cố Trường Ca ngồi thiền tu luyện' }),
      h('div', { class: 'realm-info' },
        h('div', { class: 'big-realm', text: tierLabel(s.tier, s.tuVi) }),
        h('div', { class: 'dim', text: `Bậc ${s.tier} / ${MAX_TIER}` }),
        h('p', { text: need === null ? 'Đạo Tổ: cảnh giới cao nhất, không còn phân bậc và không cần tu vi nữa.' : `Đột phá lên ${tierName(s.tier + 1)}: cần ${fmt(need)} tu vi (đang có ${fmt(s.tuVi)}).` + (nextIsNewRealm ? ' Bước lên đại cảnh giới mới gặp bình cảnh, cần nhiều tu vi hơn hẳn.' : '') }),
        ...(P.daoToLocked() ? [h('p', { class: 'gold', text: `Ngưỡng Đạo Tổ còn bị phong ấn: phải đánh bại ${P.FINAL_BOSS_NAME} (màn 10 Hỗn Độn Thần Vực).` })] : []),
        h('div', { class: 'row' },
          s.tier >= MAX_TIER
            ? h('button', { class: 'btn', text: 'Xem lại đoạn kết', onclick: () => this.onEnding() })
            : h('button', { class: 'btn primary', text: nextIsNewRealm ? 'Đột phá đại cảnh giới' : 'Đột phá', disabled: P.canBreakthrough() ? null : 'disabled', onclick: () => {
                const r = P.breakthrough();
                if (r.ending) {
                  audio.play('click');
                  this.onEnding();
                } else this.act(r);
              } }),
          h('button', { class: 'btn small', text: 'Cách tu luyện', onclick: () => { audio.play('click'); this.detail('Cách tu luyện', () => h('p', { text: `Tu vi nhận từ việc vượt màn (đánh lại màn vẫn nhận một nửa), cắn linh thạch và đan dược. 17 đại cảnh giới, mỗi cảnh giới 3 kỳ (Sơ, Trung, Hậu). Hậu kỳ đầy tu vi là Viên mãn; Tiên Đế Viên mãn và đã đánh bại ${P.FINAL_BOSS_NAME} thì đột phá lên Đạo Tổ (không chia kỳ). Cảnh giới càng cao, máu và sát thương càng lớn, và mở khóa kỹ năng chủ động mới.` })); } }),
        ),
        ...(s.tier >= MAX_TIER ? [] : [h('div', { class: 'pack' },
          h('div', { class: 'gold hd' }, ic('linh'), 'Cắn linh thạch'),
          h('div', { class: 'dim', text: `Mỗi gói: ${fmt(pk.cost)} linh thạch → ${fmt(pk.gain)} tu vi.` }),
          h('div', { class: 'row' },
            h('button', { class: 'btn small', text: '×1', onclick: () => this.act(P.buyPack(1)) }),
            h('button', { class: 'btn small', text: '×10', onclick: () => this.act(P.buyPack(10)) }),
            h('button', { class: 'btn small', text: 'Tối đa', onclick: () => this.act(P.buyPack(1e9)) }),
          ),
        )]),
      ),
    );
  }

  private vSkill(): HTMLElement {
    const s = P.getSave();
    const loadout = P.currentLoadout();
    const w = weaponById(P.computeMeta().weaponId);
    const head = h('div', { class: 'skill-head' },
      h('div', { class: 'swatch', style: { background: css(w.color) } }),
      h('div', { class: 'grow' }, h('b', { text: `Vũ khí: ${w.name}` }), h('div', { class: 'dim', text: 'Tự động, không chiếm chỗ mang theo.' })),
      h('div', { class: 'gold', text: `Mang theo ${loadout.length}/3` }),
    );
    return h('div', null, head, this.paged(this.fit('active', 66, 56 + 70, 230), ACTIVES, (a) => {
      const un = a.unlockTier <= s.tier;
      const on = loadout.includes(a.id);
      return h('button', { class: 'sk-tile' + (on ? ' on' : '') + (un ? '' : ' lock'), onclick: () => this.openActive(a.id) },
        h('i', { class: 'swatch', style: { background: css(a.color) } }),
        h('span', { class: 'sk-name', text: a.name }),
        h('span', { class: 'sk-sub', text: on ? 'Đang mang' : un ? 'Chưa mang' : `🔒 ${tierName(a.unlockTier)}` }),
      );
    }));
  }

  private openActive(id: string): void {
    audio.play('click');
    const a = ACTIVES.find((x) => x.id === id)!;
    this.detail(a.name, () => {
      const un = a.unlockTier <= P.getSave().tier;
      const on = P.currentLoadout().includes(a.id);
      return h('div', null,
        h('p', { text: a.desc }),
        h('div', { class: 'stat-list' },
          h('div', null, h('span', { class: 'dim', text: 'Thức tỉnh' }), h('b', { text: a.awaken?.name ?? '—' })),
          h('div', null, h('span', { class: 'dim', text: 'Bị động liên kết' }), h('b', { text: passiveById(a.linkedPassive).name })),
          h('div', null, h('span', { class: 'dim', text: 'Mở khóa' }), h('b', { text: tierName(a.unlockTier) })),
        ),
        h('button', { class: 'btn wide' + (on ? '' : ' primary'), text: on ? 'Bỏ mang theo' : 'Mang theo vào trận', disabled: un ? null : 'disabled', onclick: () => this.act(P.toggleLoadout(a.id)) }),
      );
    });
  }

  private vPassive(): HTMLElement {
    return h('div', null,
      h('p', { class: 'dim note', text: 'Bị động tự xuất hiện dưới dạng thẻ khi lên cấp trong màn. Tối đa 6 kỹ năng mỗi màn (tính cả kỹ năng vũ khí).' }),
      this.paged(this.fit('passive', 66, 56 + 34, 230), PASSIVES, (p) => h('button', { class: 'sk-tile', onclick: () => {
        audio.play('click');
        const linked = [...WEAPONS, ...ACTIVES].filter((k) => k.linkedPassive === p.id).map((k) => k.name);
        this.detail(p.name, () => h('div', null,
          h('p', { text: p.desc }),
          h('div', { class: 'stat-list' },
            h('div', null, h('span', { class: 'dim', text: 'Mỗi cấp' }), h('b', { text: passiveValueText(p, 1) })),
            h('div', null, h('span', { class: 'dim', text: 'Tối đa (cấp 5)' }), h('b', { text: passiveValueText(p, 5) })),
            h('div', null, h('span', { class: 'dim', text: 'Thức tỉnh cho' }), h('b', { text: linked.length ? linked.join(', ') : '—' })),
          ),
        ));
      } }, h('i', { class: 'swatch round', style: { background: css(p.color) } }), h('span', { class: 'sk-name', text: p.name }), h('span', { class: 'sk-sub', text: passiveValueText(p, 1) + ' / cấp' }))),
    );
  }

  // ------------------------------------------------------------------ Hành Trang: Trang Bị / Kho Đồ
  private slotBox(slot: SlotId): HTMLElement {
    const it = P.equippedItem(slot);
    return h('button', {
      class: 'eq-slot eq-' + slot + (it ? '' : ' empty'),
      style: it ? `--rc:${RARITIES[it.rarity].color}` : undefined,
      title: it ? itemName(it) : `${SLOT_NAMES[slot]}: trống`,
      onclick: () => {
        if (it) this.openItem(it.uid);
        else { audio.play('click'); this.filterSlot = slot; this.bagMode = 'inv'; this.render(); }
      },
    }, ic(slotIcon(slot)), h('span', { class: 'eq-name', text: SLOT_NAMES[slot] }), it ? h('span', { class: 'eq-lv', text: `+${it.level}` }) : null);
  }

  private vBag(): HTMLElement {
    const s = P.getSave();
    const invCount = s.items.filter((i) => s.equipped[i.slot] !== i.uid).length;
    return h('div', null,
      this.segs(this.bagMode, [['gear', 'Trang Bị', 'hero'], ['inv', `Kho Đồ (${invCount})`, 'bag']], (v) => { this.bagMode = v; }),
      this.bagMode === 'gear' ? this.vDoll() : this.vInventory(),
    );
  }

  private vDoll(): HTMLElement {
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    return h('div', { class: 'doll-wrap' },
      h('div', { class: 'doll' },
        this.slotBox('weapon'), this.slotBox('clothes'), this.slotBox('bibao'),
        // tên + cảnh giới đã có ở thanh trên → chỉ để nhân vật cho gọn
        h('div', { class: 'doll-hero' }, heroSprite(narrow ? 2 : 3)),
        this.slotBox('shoes'), this.slotBox('accessory'),
        narrow ? h('button', { class: 'eq-slot eq-stats', onclick: () => { audio.play('click'); this.detail('Chỉ số & Nguyên liệu', () => this.statsBox()); } }, ic('hero'), h('span', { class: 'eq-name', text: 'Chỉ số' })) : null,
      ),
      narrow ? null : this.statsBox(),
    );
  }

  /** Chỉ số tổng + nguyên liệu (cột phải trên PC, bảng nổi trên điện thoại) */
  private statsBox(): HTMLElement {
    const s = P.getSave();
    const m = P.computeMeta();
    const stat = (k: string, v: string): HTMLElement => h('div', null, h('span', { class: 'dim', text: k }), h('b', { text: v }));
    return h('div', { class: 'doll-side' },
        h('div', { class: 'gold hd' }, ic('hero'), 'Chỉ số'),
        h('div', { class: 'stat-list' },
          stat('Máu', fmt(m.maxHp)), stat('Sát thương', `×${m.damage.toFixed(2)}`), stat('Giáp', String(Math.round(m.armor))),
          stat('Tốc chạy', String(Math.round(m.moveSpeed))), stat('Chí mạng', `${Math.round(m.crit * 100)}%`), stat('Kỹ năng vũ khí', weaponById(m.weaponId).name),
        ),
        h('div', { class: 'gold hd' }, ic('ore'), 'Nguyên liệu'),
        h('div', { class: 'mats' },
          h('div', { class: 'mat', title: 'Linh thạch' }, ic('linh'), h('b', { text: fmt(s.linh) })),
          ...MAT_IDS.map((k) => h('div', { class: 'mat', title: MAT_NAMES[k] }, ic(MAT_ICON[k]), h('b', { text: fmt(s.mats[k]) }))),
        ),
        s.inbox.length ? h('button', { class: 'btn small primary wide', text: `Hòm Thư có ${s.inbox.length} món chờ nhận`, onclick: () => this.openInbox() }) : null,
    );
  }

  private vInventory(): HTMLElement {
    const s = P.getSave();
    let inv = s.items.filter((i) => s.equipped[i.slot] !== i.uid && (this.filterSlot === 'all' || i.slot === this.filterSlot));
    if (this.sortBy === 'power') inv = inv.slice().sort((a, b) => itemPower(b) - itemPower(a));
    else if (this.sortBy === 'rarity') inv = inv.slice().sort((a, b) => b.rarity - a.rarity || b.grade - a.grade);
    else inv = inv.slice().sort((a, b) => b.uid - a.uid);
    const sel = (opts: [string, string][], cur: string, on: (v: string) => void): HTMLElement => {
      const el = h('select', { class: 'btn small sel' }, ...opts.map(([v, t]) => h('option', { value: v, text: t, selected: v === cur ? 'selected' : null })));
      el.addEventListener('change', () => { on((el as HTMLSelectElement).value); this.pages.inv = 0; this.render(); });
      return el;
    };
    return h('div', null,
      h('div', { class: 'row inv-bar' },
        sel([['all', 'Mọi ô'], ...SLOT_IDS.map((x) => [x, SLOT_NAMES[x]] as [string, string])], this.filterSlot, (v) => { this.filterSlot = v as SlotId | 'all'; }),
        sel([['new', 'Mới nhất'], ['power', 'Sức mạnh'], ['rarity', 'Phẩm chất']], this.sortBy, (v) => { this.sortBy = v as 'new' | 'power' | 'rarity'; }),
        h('span', { class: 'dim grow', style: 'text-align:right', text: `Túi ${s.items.length}/120` }),
      ),
      inv.length
        ? this.paged(this.fit('inv', 96, 56 + 46, 96), inv, (it) => h('button', { class: 'it-tile', style: `--rc:${RARITIES[it.rarity].color}`, title: itemName(it), onclick: () => this.openItem(it.uid) },
            ic(slotIcon(it.slot)), h('span', { class: 'it-name', text: itemName(it) }), h('span', { class: 'it-lv', text: `+${it.level}` }), it.locked ? h('span', { class: 'it-lock', text: '🔒' }) : null))
        : h('div', { class: 'empty-note', text: 'Không có món nào.' }),
    );
  }

  /** Bảng chi tiết một món đồ (đang mặc hoặc trong túi) */
  private openItem(uid: number): void {
    audio.play('click');
    const find = (): ItemInst | undefined => P.getSave().items.find((i) => i.uid === uid);
    const it0 = find();
    if (!it0) return;
    this.detail(itemName(it0), () => {
      const it = find();
      if (!it) return null; // đã bán / phân giải
      return this.itemCard(it, P.getSave().equipped[it.slot] === it.uid);
    });
  }

  private itemCard(it: ItemInst, equipped: boolean): HTMLElement {
    const upg = P.upgradeCost(it);
    const color = RARITIES[it.rarity].color;
    const card = h('div', { class: 'item-detail', style: { borderLeftColor: color } },
      h('div', { class: 'nm', style: { color }, text: (it.locked ? '🔒 ' : '') + itemName(it) }),
      h('div', { class: 'dim', style: 'font-size:12.5px', text: `${SLOT_NAMES[it.slot]} · ${RARITIES[it.rarity].name} · +${it.level}${equipped ? ' · đang mặc' : ''}` }),
      ...itemStatLines(it).map((l) => h('div', { text: l })),
      ...(it.affixes ?? []).map((a, i) =>
        h('div', { class: 'row aff' },
          h('span', { class: 'grow', text: '✦ ' + affixText(a) }),
          it.slot !== 'bibao' ? h('button', { class: 'btn small', text: 'Tái luyện', onclick: () => this.doReforge(it.uid, i) }) : null,
        ),
      ),
    );
    // So sánh với món đang mặc (dùng đúng công thức tính chỉ số tổng)
    if (!equipped && it.slot !== 'bibao') {
      const d = P.compareItem(it.uid);
      const names: Record<string, string> = { maxHp: 'Máu', damage: 'Sát thương', atkSpeed: 'Tốc đánh', armor: 'Giáp', moveSpeed: 'Tốc chạy', crit: 'Chí mạng', area: 'Phạm vi', pickup: 'Nhặt', xpGain: 'XP', linhGain: 'Linh' };
      const parts = Object.entries(d).map(([k, v]) => {
        const n = v as number;
        const abs = k === 'armor' || k === 'pickup' || k === 'maxHp';
        const txt = (n > 0 ? '+' : '') + (abs ? String(Math.round(n)) : (n * 100).toFixed(1) + '%');
        return h('span', { style: { color: n > 0 ? '#55c47a' : '#e0505a', marginRight: '8px' }, text: `${names[k]} ${txt}` });
      });
      if (parts.length) card.append(h('div', { class: 'cmp' }, h('span', { class: 'dim', text: 'So với đang mặc: ' }), ...parts));
    }
    const dv = P.dismantleValue(it);
    card.append(h('div', { class: 'row acts' },
      equipped
        ? h('button', { class: 'btn small', text: 'Tháo', disabled: it.slot === 'weapon' ? 'disabled' : null, onclick: () => { P.unequip(it.slot); this.act({ ok: true, msg: 'Đã tháo trang bị.' }); } })
        : h('button', { class: 'btn small primary', text: 'Trang bị', onclick: () => this.act(P.equip(it.uid)) }),
      it.level < MAX_ITEM_LEVEL ? h('button', { class: 'btn small', text: `Cường hóa (${upg.ore} KT, ${fmt(upg.linh)} LT)`, onclick: () => this.act(P.upgradeItem(it.uid)) }) : null,
      it.slot !== 'bibao' ? h('button', { class: 'btn small', text: it.locked ? 'Mở khóa' : 'Khóa', onclick: () => { P.toggleLock(it.uid); this.act({ ok: true, msg: it.locked ? 'Đã khóa.' : 'Đã mở khóa.' }); } }) : null,
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
    if (!r.ok || !r.offer) {
      this.act(r);
      return;
    }
    const o = r.offer;
    audio.play('click');
    this.render();
    this.detail('Kết quả tái luyện', () => h('div', null,
      h('p', { class: 'dim', text: 'Chi phí đã trừ. Chọn giữ thuộc tính cũ hoặc nhận thuộc tính mới.' }),
      h('div', { class: 'stat-list' },
        h('div', null, h('span', { class: 'dim', text: 'Cũ' }), h('b', { text: affixText(o.old) })),
        h('div', null, h('span', { class: 'dim', text: 'Mới' }), h('b', { style: 'color:#8fd0ff', text: affixText(o.next) })),
      ),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn primary small', text: 'Nhận thuộc tính mới', onclick: () => { const res = P.acceptReforge(o); this.toast(res.msg); this.render(); this.openItem(uid); } }),
        h('button', { class: 'btn small', text: 'Giữ thuộc tính cũ', onclick: () => this.openItem(uid) }),
      ),
    ));
  }

  // ------------------------------------------------------------------ Chế Tạo (Luyện Khí + Luyện Đan)
  private vCraft(): HTMLElement {
    return h('div', null,
      this.segs(this.craftMode, [['forge', 'Luyện Khí', 'forge'], ['alchemy', 'Luyện Đan', 'alchemy']], (v) => { this.craftMode = v; }),
      this.craftMode === 'alchemy' ? this.vAlchemy() : this.vForge(),
    );
  }

  private vAlchemy(): HTMLElement {
    const grid = h('div', { class: 'craft-grid' });
    for (const p of PILLS) {
      const cnt = P.pillCount(p.id);
      grid.append(
        h('div', { class: 'card craft' },
          h('div', { class: 'gold hd' }, ic('alchemy'), p.name + (p.cap ? ` (${cnt}/${p.cap})` : '')),
          h('div', { class: 'dim', text: p.desc }),
          h('div', { class: 'cost', text: `Cần: ${p.herb} thảo dược${p.core ? `, ${p.core} yêu đan` : ''}, ${fmt(P.pillLinhCost(p.id))} linh thạch` }),
          h('button', { class: 'btn small primary', text: 'Luyện đan', onclick: () => this.act(P.craftPill(p.id)) }),
        ),
      );
    }
    return grid;
  }

  private vForge(): HTMLElement {
    const fc = P.forgeCost();
    const grid = h('div', { class: 'craft-grid' });
    for (const slot of SLOT_IDS.filter((x) => x !== 'bibao')) {
      const card = h('div', { class: 'card craft' },
        h('div', { class: 'gold hd' }, ic(slotIcon(slot)), 'Chế tạo ' + SLOT_NAMES[slot]),
        h('div', { class: 'cost', text: `Cần: ${fc.ore} khoáng thạch, ${fmt(fc.linh)} linh thạch` }),
      );
      const forge = (wid?: string): void => {
        const r = P.forge(slot, wid);
        this.act(r.ok && r.item ? { ok: true, msg: `Chế tạo được: ${itemName(r.item)} (${RARITIES[r.item.rarity].name})` } : r);
      };
      if (slot === 'weapon') {
        // Chọn loại vũ khí muốn chế tạo (hoặc ngẫu nhiên)
        const sel = h('select', { class: 'btn small sel' }, h('option', { value: '', text: 'Loại: ngẫu nhiên' }), ...WEAPONS.map((w) => h('option', { value: w.id, text: WEAPON_ITEM_NAMES[w.id] })));
        card.append(h('div', { class: 'row' }, sel, h('button', { class: 'btn small primary', text: 'Luyện khí', onclick: () => forge((sel as HTMLSelectElement).value || undefined) })));
      } else card.append(h('button', { class: 'btn small primary', text: 'Luyện khí', onclick: () => forge() }));
      grid.append(card);
    }
    return h('div', null, grid, h('p', { class: 'dim note', text: 'Phẩm chất và thuộc tính phụ ngẫu nhiên; thế giới càng cao càng dễ ra đồ tốt. Bí bảo không chế tạo được: nhận khi vượt màn 5 và màn 10 mỗi thế giới lần đầu.' }));
  }

  // ------------------------------------------------------------------ Nhiệm Vụ: Hằng Ngày / Chính Tuyến / Thành Tựu
  private questRow(q: P.QuestView): HTMLElement {
    const pct = Math.round((q.progress / q.goal) * 100);
    return h('div', { class: 'quest' + (q.claimed ? ' claimed' : q.done ? ' ready' : '') },
      ic(q.id.startsWith('d_') ? 'quest' : 'stage'),
      h('div', { class: 'grow q-main' },
        h('div', { class: 'q-name', text: q.name, title: q.desc }),
        h('div', { class: 'q-bar' }, h('i', { style: { width: pct + '%' } }), h('span', { text: q.goal > 1 ? `${fmt(q.progress)} / ${fmt(q.goal)}` : q.done ? 'Hoàn thành' : q.desc })),
        h('div', { class: 'q-reward', text: '🎁 ' + P.rewardText(q.reward) }),
      ),
      h('button', { class: 'btn small' + (q.done && !q.claimed ? ' primary' : ''), text: q.claimed ? 'Đã nhận' : q.done ? 'Nhận' : 'Chưa xong', disabled: q.done && !q.claimed ? null : 'disabled', onclick: () => this.act(P.claimQuest(q.id)) }),
    );
  }

  private vQuest(): HTMLElement {
    const mq = P.mainQuestCount();
    const daily = P.dailyQuests();
    const dailyReady = daily.filter((q) => q.done && !q.claimed).length;
    const mainAll = P.mainQuests(999);
    const mainReady = mainAll.filter((q) => q.done).length;
    const label = (t: string, n: number): string => (n ? `${t} (${n})` : t);
    const tabs = this.segs(this.questMode, [['daily', label('Hằng Ngày', dailyReady), 'quest'], ['main', label('Chính Tuyến', mainReady), 'stage'], ['achieve', 'Thành Tựu', 'trophy']], (v) => { this.questMode = v; });
    if (this.questMode === 'achieve') return h('div', null, tabs, this.vAchieve());
    const list = this.questMode === 'daily' ? daily : mainAll;
    return h('div', null, tabs,
      h('p', { class: 'dim note', text: this.questMode === 'daily' ? 'Làm mới mỗi ngày (theo giờ trên máy). Hoàn thành tất cả để nhận thêm thưởng.' : `Đã nhận ${mq.claimed} / ${mq.total} mốc chính tuyến.` }),
      list.length ? this.paged(this.fit('q_' + this.questMode, 76, 56 + 34, 420), list, (q) => this.questRow(q)) : h('div', { class: 'empty-note', text: 'Đã hoàn thành mọi nhiệm vụ chính tuyến.' }),
    );
  }

  private vAchieve(): HTMLElement {
    const s = P.getSave();
    const p = P.progressCount();
    const mq = P.mainQuestCount();
    const owned = new Set([...s.items, ...s.inbox].filter((i) => i.slot === 'bibao').map((i) => i.bibaoId));
    const rows: [string, string, string][] = [
      ['cultivate', 'Cảnh giới', tierLabel(s.tier, s.tuVi)],
      ['stage', 'Màn đã vượt', `${p.cleared} / ${p.total}`],
      ['home', 'Thế giới đã mở', `${P.highestWorld()} / ${WORLDS.length}`],
      ['essence', 'Bí bảo sưu tầm', `${owned.size} / ${BIBAOS.length}`],
      ['quest', 'Nhiệm vụ chính tuyến', `${mq.claimed} / ${mq.total}`],
      ['hero', 'Số lần lịch luyện', fmt(s.stats.runs)],
      ['trophy', 'Số trận thắng', fmt(s.stats.wins)],
      ['forge', 'Tổng số quái hạ gục', fmt(s.stats.kills)],
    ];
    return h('div', { class: 'achieve' }, ...rows.map(([icon, k, v]) => h('div', { class: 'ach' }, ic(icon), h('span', { class: 'dim', text: k }), h('b', { text: v }))));
  }
}
