import { bar, h, heroAvatar, openModal, pic, realmFigure } from '../dom';
import { skillIconStyle } from '../../config/assets';
import { RUN } from '../../config/balance';
import { fmt, fmtTime } from '../../utils/format';
import { MAT_IDS, MAT_NAMES, SLOT_IDS, SLOT_NAMES, type SlotId } from '../../config/types';
import { MAX_TIER, TIERS, nextTierNeed, realmLook, tierCap, tierLabel, tierName } from '../../config/realms';
import { WORLDS, worldById, type StageDef } from '../../config/worlds';
import { PASSIVES, REALM_SKILLS, WEAPON_IDS, WEAPON_SKILLS, passiveById, skillById, weaponSkillOf } from '../../config/skills';
import { BIBAOS, DAO_TIER, MAX_ITEM_LEVEL, PILLS, WEAPON_HOLD, WEAPON_ITEM_NAMES, affixText, itemColor, itemIcon, weaponIconHd, itemName, itemPower, itemRank, itemRankLabel, itemStatLines, type ItemInst } from '../../config/items';
import * as P from '../../systems/progression';
import { audio } from '../../systems/Audio';
import { openSettings } from './Settings';
import { SectFx } from '../sectFx';
import { SkillBook } from '../skillBook';

/** Biểu tượng pixel (xem tools/art/icons.px.js) */
const ic = (name: string, cls = ''): HTMLElement => h('img', { src: `/ui/ic_${name}.png`, alt: '', class: 'ic ' + cls });
const MAT_ICON: Record<string, string> = { herb: 'herb', core: 'core', ore: 'ore', essence: 'essence' };
/** góc xoay (độ, chiều kim đồng hồ) để hình cầm tay dựng thẳng, mũi chĩa lên — đo trục từ chỗ cầm tới mũi */
/** icon vũ khí vẽ nghiêng 45° (mũi phải-trên) → xoay -45° để dựng đứng cạnh nhân vật */
const WEAPON_DIAG: Record<string, true> = { wp_sword: true, wp_blade: true, wp_spear: true, wp_bow: true };
/** lật ngang sau khi dựng: đao (lưỡi quay ra ngoài), cung (dây quay vào người) */
const WEAPON_MIRROR: Record<string, true> = { wp_blade: true, wp_bow: true };
/** vị trí 2 bàn tay (trái, phải theo người xem) trên khung 96×112 của từng bộ hình cảnh giới — để đặt quyền sáo lơ lửng cạnh tay */
/** độ cao (tâm) chung của quyền sáo lơ lửng, khung 96×112 */
const GLOVE_Y = 62;
const REALM_HANDS: [number, number][][] = [
  [[32, 55], [59, 48]], [[27, 61], [54, 61]], [[30, 71], [54, 51]],
  [[24, 68], [63, 63]], [[23, 68], [58, 68]], [[28, 59], [64, 64]],
];
const SLOT_ICON: Record<SlotId, string> = { weapon: 'forge', clothes: 'gear', shoes: 'boots', accessory: 'pendant', bibao: 'essence' };
const slotIcon = (slot: SlotId): string => SLOT_ICON[slot];
/** Lớp viền theo phẩm: q-0..q-4 (Hạ..Thượng Cổ), q-dao (thất thải), q-bb (bí bảo) */
const qClass = (it: ItemInst): string => (it.slot === 'bibao' ? 'q-bb' : it.tier >= DAO_TIER ? 'q-dao' : 'q-' + it.quality);
/** Hình món đồ (public/gear) */
const gearImg = (it: ItemInst, cls = 'gi'): HTMLElement => pic(itemIcon(it), { class: cls });

/**
 * Ảnh nền tông môn có 2 bản (dọc / ngang, chọn bằng CSS theo tỉ lệ màn hình), lấy nguyên từ ảnh mẫu
 * (tools/art/bg_from_ai.py). Tâm + bán kính Truyền Tống Trận tính theo pixel ảnh — PHẢI khớp số script đó in ra.
 * `posY` khớp background-position-y trong styles.css (.sect).
 */
const SECT = {
  tall: { w: 632, h: 1124, x: 316, y: 872, r: 95, posY: 1 },
  wide: { w: 2000, h: 1124, x: 1005, y: 872, r: 95, posY: 0.7 },
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
  /** Chế Tạo: loại đồ / loại vũ khí / đan đang chọn + kết quả lần luyện vừa xong (thẻ kết quả) */
  private forgeSlot: SlotId = 'weapon';
  private forgeWeapon = '';
  private pillSel: string = PILLS[0].id;
  private craftResult: { kind: 'item'; uid: number } | { kind: 'pill'; name: string; msg: string } | null = null;
  private cultMode: 'realm' | 'book' = 'realm';
  /** Sách Công Pháp (giữ trang đang mở qua các lần vẽ lại) */
  private readonly book = new SkillBook();
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
  /** hoạt ảnh nền: đảo bay, thác, mây, linh khí, cánh hoa */
  private readonly fx: SectFx;
  private readonly portalBtn = h('button', { class: 'portal-hit', 'aria-label': 'Truyền Tống Trận: vào Lịch Luyện chọn màn' },
    h('span', { class: 'portal-swirl' }, h('i'), h('i')), h('i', { class: 'portal-ring' }), h('span', { class: 'portal-tag' }, h('b', { text: 'Truyền Tống Trận' }), h('small', { text: 'Lịch Luyện' })));
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
    this.fx = new SectFx(this.sect, 'lobby');
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
    requestAnimationFrame(() => this.fx.resume());
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
        // khung + icon vẽ qua SVG (pic) để "chế độ tối tự động" của trình duyệt điện thoại không đảo màu; chỉ icon, không chữ
        h('button', { class: 'nv' + (id === navTab ? ' on' : ''), 'aria-current': id === navTab ? 'page' : null, 'aria-label': name, title: name, onclick: () => this.go(id) },
          pic(id === navTab ? '/ui/k_nav_on.png?v=1' : '/ui/k_nav.png?v=1', { class: 'nv-fr' }, [0, 0, 1, 1], id === navTab ? [374, 397] : [370, 391]),
          pic(`/ui/ic_${icon}.png`, { class: 'ic' }, [0, 0, 1, 1], 128),
          id === 'quest' && questBadge ? h('i', { class: 'badge', text: String(questBadge) }) : null),
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
              h('span', { class: 'inbox-it' }, h('i', { class: 'mini-frame ' + qClass(it) }, gearImg(it)), h('span', { style: { color: itemColor(it) }, text: itemName(it) })),
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
    return h('div', { class: this.cultMode === 'book' ? 'cult-fill' : undefined },
      this.segs(this.cultMode, [['realm', 'Cảnh Giới', 'cultivate'], ['book', 'Công Pháp', 'skill']], (v) => { this.cultMode = v; }),
      this.cultMode === 'realm' ? this.vCultivate() : this.vBook(),
    );
  }

  private vCultivate(): HTMLElement {
    const s = P.getSave();
    const need = nextTierNeed(s.tier);
    const pk = P.packInfo();
    const nextIsNewRealm = s.tier < MAX_TIER && TIERS[s.tier + 1].group !== TIERS[s.tier].group;
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    const base = TIERS[s.tier].cumTuVi;
    const pct = need === null ? 100 : Math.max(0, Math.min(100, ((s.tuVi - base) / (need - base)) * 100));
    // hạt linh khí bay lên quanh nhân vật (vị trí / nhịp cố định theo chỉ số để không nhảy khi vẽ lại)
    const motes = Array.from({ length: 14 }, (_, i) => h('i', { class: 'rs-mote',
      style: `--x:${(i * 37) % 100}%;--d:${4 + (i % 5) * 0.9}s;--t:${-(i * 0.73) % 6}s;--z:${1 + (i % 3)}` }));
    // chấm linh khí từ bốn phía bay tụ vào người (đan điền), nhỏ dần rồi tan
    const inflow = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.26, r = 0.75 + (i % 3) * 0.2;
      return h('i', { class: 'rs-in', style: `--dx:${(Math.cos(a) * r).toFixed(2)};--dy:${(Math.sin(a) * r * 0.75).toFixed(2)};--d:${2.6 + (i % 4) * 0.45}s;--t:${-(i * 0.41).toFixed(2)}s` });
    });
    return h('div', { class: `realm-stage rl-${realmLook(s.tier)}` },
      h('div', { class: 'rs-sky' }), h('div', { class: 'rs-stars' }),
      h('div', { class: 'rs-motes' }, ...motes),
      h('div', { class: 'rs-head' }, h('div', { class: 'big-realm', text: tierLabel(s.tier, s.tuVi) })),
      // vòng linh khí bám theo hình ngồi thiền: quầng sáng sau lưng + 2 vòng xoay quanh đài sen
      h('div', { class: 'rs-fig' }, h('i', { class: 'rs-glow' }), h('i', { class: 'rs-ring r2' }), realmFigure(s.tier, narrow ? 1.5 : 2), h('i', { class: 'rs-ring r1' }), ...inflow),
      h('div', { class: 'rs-panel' },
        h('div', { class: 'rs-bar', title: `${pct.toFixed(0)}%` }, h('i', { style: { width: `${pct}%` } }),
          h('span', { text: need === null ? 'Viên mãn' : `${fmt(s.tuVi)} / ${fmt(need)} tu vi` })),
        h('p', { text: need === null ? 'Đạo Tổ: cảnh giới cao nhất, không còn phân bậc và không cần tu vi nữa.' : `Đột phá lên ${tierName(s.tier + 1)}.` + (nextIsNewRealm ? ' Bước lên đại cảnh giới mới gặp bình cảnh, cần nhiều tu vi hơn hẳn.' : '') }),
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

  /** Sách Công Pháp: chương Chủ Động (kỹ năng vũ khí + cảnh giới) / Bị Động / Thức Tỉnh (công thức kết hợp) */
  private vBook(): HTMLElement {
    const s = P.getSave();
    const loadout = P.currentLoadout();
    const curWeapon = weaponSkillOf(P.computeMeta().weaponId).id;
    const icon = (id: string, extra = ''): HTMLElement => h('i', { class: 'swatch skico' + extra, style: skillIconStyle(id) });
    const row = (cls: string, rh: number, onclick: () => void, ...kids: (HTMLElement | null)[]): HTMLElement =>
      h('button', { class: 'bk-row ' + cls, style: `height:${rh}px`, onclick }, ...kids);
    const active = [...WEAPON_SKILLS, ...REALM_SKILLS].map((a) => {
      const weapon = a.source === 'weapon';
      const un = weapon || a.unlockTier <= s.tier;
      const on = weapon ? a.id === curWeapon : loadout.includes(a.id);
      const state = weapon ? (on ? 'Đang dùng' : 'Vũ khí') : on ? 'Đang mang' : un ? 'Chưa mang' : `🔒 ${a.unlock}`;
      return row((on ? 'on' : '') + (un ? '' : ' lock'), 56, () => this.openSkill(a.id),
        icon(a.id), h('span', { class: 'bk-txt' }, h('b', { text: a.name }), h('small', { text: weapon ? `Kỹ năng vũ khí · ${a.type}` : a.type })),
        h('span', { class: 'bk-state', text: state }));
    });
    const passive = PASSIVES.map((p) => row('', 56, () => this.openPassive(p.id),
      icon(p.id), h('span', { class: 'bk-txt' }, h('b', { text: p.name }), h('small', { text: `${p.stat}: ${p.levels[0]} / cấp` }))));
    const all = [...WEAPON_SKILLS, ...REALM_SKILLS];
    const known = all.filter((a) => P.isAwakenKnown(a.id)).length;
    const formula = all.map((a) => {
      const k = P.isAwakenKnown(a.id);
      const pv = passiveById(a.passive);
      return row('fx' + (k ? ' known' : ' lock'), 64, () => this.openAwaken(a.id),
        h('span', { class: 'bk-mix' }, icon(a.id), h('em', { text: '+' }), icon(a.passive)),
        h('span', { class: 'bk-txt' }, h('small', { text: `${a.name} (cấp 5) + ${pv.name}` }), h('b', { text: k ? `⭐ ${a.awaken.name}` : '⭐ ???' })));
    });
    this.book.set([
      { id: 'active', title: 'Chủ Động Công Pháp', tab: 'Chủ Động', sub: `Mang theo ${loadout.length}/3 · kỹ năng vũ khí tự động`, rowH: 56, rows: active },
      { id: 'passive', title: 'Bị Động Tâm Pháp', tab: 'Bị Động', sub: `Tự xuất hiện khi lên cấp trong màn · tối đa ${RUN.maxSkills} kỹ năng mỗi màn`, rowH: 56, rows: passive },
      { id: 'awaken', title: 'Thức Tỉnh Bí Lục', tab: 'Thức Tỉnh', sub: `Đã khai mở ${known}/${all.length} · thức tỉnh trong màn để mở`, rowH: 64, rows: formula },
    ]);
    return this.book.el;
  }

  private openPassive(id: string): void {
    const p = passiveById(id);
    audio.play('click');
    this.detail(p.name, () => h('div', null,
      h('div', { class: 'sk-detail-head' }, h('i', { class: 'swatch skico big', style: skillIconStyle(p.id) }), h('p', { text: p.stat })),
      h('div', { class: 'stat-list' },
        ...p.levels.map((v, i) => h('div', null, h('span', { class: 'dim', text: `Cấp ${i + 1}` }), h('b', { text: v }))),
        h('div', null, h('span', { class: 'dim', text: 'Mở thức tỉnh cho' }), h('b', { text: p.awakens.map((k) => skillById(k).name).join(', ') })),
      ),
    ));
  }

  /** Công thức thức tỉnh: đã khai mở → tên + hiệu ứng; chưa → chỉ nguyên liệu */
  private openAwaken(id: string): void {
    const a = skillById(id);
    const pv = passiveById(a.passive);
    const k = P.isAwakenKnown(id);
    audio.play('click');
    this.detail(k ? a.awaken.name : 'Công thức chưa khai mở', () => h('div', null,
      h('div', { class: 'sk-detail-head' }, h('i', { class: 'swatch skico big', style: skillIconStyle(a.id) }), h('p', { text: `${a.name} (cấp 5) + ${pv.name}` })),
      k
        ? h('div', { class: 'stat-list' },
            h('div', null, h('span', { class: 'dim', text: 'Sát thương' }), h('b', { text: a.awaken.damage })),
            h('div', null, h('span', { class: 'dim', text: 'Hiệu ứng' }), h('b', { text: a.awaken.effect })))
        : h('p', { class: 'dim', text: `Trong màn chơi, đưa ${a.name} lên cấp 5 và có ${pv.name} để nhận thẻ thức tỉnh. Thức tỉnh lần đầu sẽ ghi công thức vào sách.` }),
    ));
  }

  /** Bảng chi tiết kỹ năng: 5 cấp + thức tỉnh + bị động liên kết */
  private openSkill(id: string): void {
    audio.play('click');
    const a = skillById(id);
    this.detail(a.name, () => {
      const un = a.unlockTier <= P.getSave().tier;
      const on = P.currentLoadout().includes(a.id);
      const pv = passiveById(a.passive);
      return h('div', null,
        h('div', { class: 'sk-detail-head' }, h('i', { class: 'swatch skico big', style: skillIconStyle(a.id) }),
          h('div', null, h('div', { class: 'gold', text: a.type }), h('p', { text: a.desc }))),
        h('div', { class: 'sk-levels' },
          ...a.levels.map((L, i) => h('div', null, h('b', { text: `Cấp ${i + 1}` }), h('span', { class: 'dim', text: ` ${L.damage} · ${L.cooldown}` }), h('div', { text: L.effect }))),
        ),
        h('div', { class: 'sk-detail-head sk-aw' }, h('i', { class: 'swatch skico big', style: skillIconStyle(a.id, true) }),
          h('div', null, h('b', { class: 'gold', text: `Thức tỉnh: ${a.awaken.name} (${a.awaken.damage})` }), h('div', { text: a.awaken.effect }),
            h('div', { class: 'dim', text: `Điều kiện: cấp 5 + bị động ${pv.name}` }))),
        a.source === 'realm'
          ? h('button', { class: 'btn wide' + (on ? '' : ' primary'), text: un ? (on ? 'Bỏ mang theo' : 'Mang theo vào trận') : `🔒 Mở ở ${a.unlock}`, disabled: un ? null : 'disabled', onclick: () => this.act(P.toggleLoadout(a.id)) })
          : h('p', { class: 'dim note', text: 'Kỹ năng vũ khí đổi theo loại vũ khí đang trang bị.' }),
      );
    });
  }

  // ------------------------------------------------------------------ Hành Trang: Trang Bị / Kho Đồ
  private slotBox(slot: SlotId): HTMLElement {
    const it = P.equippedItem(slot);
    return h('button', {
      class: 'eq-slot eq-' + slot + (it ? ' ' + qClass(it) : ' empty'),
      style: it ? `--rc:${itemColor(it)}` : undefined,
      title: it ? itemName(it) : `${SLOT_NAMES[slot]}: trống`,
      onclick: () => {
        if (it) this.openItem(it.uid);
        else { audio.play('click'); this.filterSlot = slot; this.bagMode = 'inv'; this.render(); }
      },
    }, it ? gearImg(it) : ic(slotIcon(slot)), h('span', { class: 'eq-name', text: it ? itemName(it) : SLOT_NAMES[slot] }), it ? h('span', { class: 'eq-lv', text: `+${it.level}` }) : null);
  }

  private vBag(): HTMLElement {
    const s = P.getSave();
    const invCount = s.items.filter((i) => s.equipped[i.slot] !== i.uid).length;
    return h('div', null,
      this.segs(this.bagMode, [['gear', 'Trang Bị', 'hero'], ['inv', `Kho Đồ (${invCount})`, 'bag']], (v) => { this.bagMode = v; }),
      this.bagMode === 'gear' ? this.vDoll() : this.vInventory(),
    );
  }

  /**
   * Nhân vật kèm ngoại trang: vũ khí cầm tay phải (nằm sau thân, nắm tay che chuôi; quyền sáo đeo đè lên tay),
   * bí bảo bay lơ lửng cạnh vai. Y phục / giày / trang sức không đổi ngoại hình.
   */
  private figure(scale: number): HTMLElement {
    // mọi cảnh giới: hình đứng theo cảnh giới + vũ khí ngự khí bên trái + bí bảo bên phải (figureLook)
    const wpn = P.equippedItem('weapon');
    const bb = P.equippedItem('bibao');
    const hd = wpn?.weaponId ? (WEAPON_HOLD[wpn.weaponId] ?? WEAPON_HOLD.wp_sword) : null;
    // bộ hình theo cảnh giới: bộ 1 = sprite gốc có hoạt ảnh thở + tư thế cầm quạt; bộ 2–6 = hình đứng khung 96×112
    return this.figureLook(realmLook(P.getSave().tier), scale, wpn, bb, hd);
  }

  /** Nhân vật theo cảnh giới (khung 96×112): vũ khí ngự khí bên trái, bí bảo bên phải, cả khối nhún nhẹ như vận khí */
  private figureLook(look: number, scale: number, wpn: ItemInst | null, bb: ItemInst | null, hd: (typeof WEAPON_HOLD)[string] | null): HTMLElement {
    const kids: HTMLElement[] = [h('div', { class: 'realm-body', style: `background-image:url('/ui/realm_${look}.png?v=2')` })];
    // vũ khí NGỰ KHÍ: dùng icon trang bị mới (public/gear), dựng thẳng đứng mũi chĩa lên, bên TRÁI nhân vật.
    // Icon kiếm/đao/thương/cung vẽ nghiêng 45° (mũi phải-trên) → xoay -45°; đao lật cho lưỡi quay ra ngoài,
    // cung lật cho dây quay vào người. Quyền sáo: tách đôi, lật ngược (nắm tay chúc xuống), lơ lửng cặp 2 bên bàn tay.
    if (wpn?.weaponId === 'wp_fist') {
      const [l, r] = REALM_HANDS[look - 1] ?? REALM_HANDS[0];
      const gw = 14, gh = 28, off = 13, gy = GLOVE_Y; // mỗi chiếc = nửa icon 66×66 thu về 28 đơn vị; lơ lửng cách bàn tay `off` ra ngoài, cùng một độ cao mọi bộ hình
      for (const [k, [hx], dx] of [[0, l, -off], [1, r, off]] as const) {
        kids.push(h('div', { class: 'wpn-float glove-float', title: itemName(wpn), style: `left:${(hx + dx - gw / 2) * scale}px;top:${(gy - gh / 2) * scale}px;` +
          `width:${gw * scale}px;height:${gh * scale}px` },
          pic(weaponIconHd(wpn), { class: 'glove-half', style: `width:${gw * scale}px;height:${gh * scale}px` }, [k * 0.5, 0, 0.5, 1], 264)));
      }
    } else if (wpn) {
      const id = wpn.weaponId ?? '';
      const diag = WEAPON_DIAG[id];
      const sz = diag ? Math.round(hd ? Math.hypot(hd.w, hd.h) * 0.7 : 60) : 34;
      const tf = diag ? (WEAPON_MIRROR[id] ? 'scaleX(-1) ' : '') + 'rotate(-45deg)' : '';
      const inner = pic(weaponIconHd(wpn), { class: 'wpn-icon',
        style: `width:${sz * scale}px;height:${sz * scale}px` + (tf ? `;transform:${tf}` : '') }, [0, 0, 1, 1], 264);
      kids.push(h('div', { class: 'wpn-float', title: itemName(wpn), style: `left:${(12 - sz / 2) * scale}px;top:${(60 - sz / 2) * scale}px;width:${sz * scale}px;height:${sz * scale}px` }, inner));
    }
    if (bb) kids.push(pic(itemIcon(bb), { class: 'bb-float bb-right', title: itemName(bb), style: `width:${34 * Math.max(1, scale - 1)}px;height:${34 * Math.max(1, scale - 1)}px` }));
    return h('div', { class: 'figure look', style: `--s:${scale}`, role: 'img', 'aria-label': 'Cố Trường Ca' }, ...kids);
  }

  private vDoll(): HTMLElement {
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    return h('div', { class: 'doll-wrap' },
      h('div', { class: 'doll' },
        this.slotBox('weapon'), this.slotBox('clothes'), this.slotBox('bibao'),
        // tên + cảnh giới đã có ở thanh trên → chỉ để nhân vật cho gọn
        h('div', { class: 'doll-hero' }, this.figure(narrow ? 2 : 3)),
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
          stat('Tốc chạy', String(Math.round(m.moveSpeed))), stat('Chí mạng', `${Math.round(m.crit * 100)}%`), stat('Kỹ năng vũ khí', weaponSkillOf(m.weaponId).name),
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
    else if (this.sortBy === 'rarity') inv = inv.slice().sort((a, b) => itemRank(b) - itemRank(a));
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
        ? this.paged(window.innerWidth > 760 ? this.fit('inv', 118, 56 + 46, 108) : this.fit('inv', 96, 56 + 46, 96), inv, (it) => h('button', { class: 'it-tile ' + qClass(it), style: `--rc:${itemColor(it)}`, title: `${itemName(it)} · ${itemRankLabel(it)}`, onclick: () => this.openItem(it.uid) },
            gearImg(it), h('span', { class: 'it-name', text: itemName(it) }), h('span', { class: 'it-lv', text: `+${it.level}` }), it.locked ? h('span', { class: 'it-lock', text: '🔒' }) : null))
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
    const color = itemColor(it);
    const card = h('div', { class: 'item-detail', style: { borderLeftColor: color } },
      h('div', { class: 'nm' + (it.slot !== 'bibao' && it.tier >= DAO_TIER ? ' dao-text' : ''), style: { color }, text: (it.locked ? '🔒 ' : '') + itemName(it) }),
      h('div', { class: 'it-head' }, h('i', { class: 'big-frame ' + qClass(it), style: `--rc:${color}` }, gearImg(it)),
        h('div', null, h('div', { class: 'it-rank', style: { color }, text: itemRankLabel(it) }), h('div', { class: 'dim', style: 'font-size:12.5px', text: `${SLOT_NAMES[it.slot]} · cường hóa +${it.level}${equipped ? ' · đang mặc' : ''}` }))),
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
    if ((it.tier >= 3 || it.quality >= 3) && !window.confirm(`Bạn chắc chắn muốn xử lý "${itemName(it)}" (${itemRankLabel(it)})?`)) return;
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
    return h('div', { class: 'cult-fill' },
      this.segs(this.craftMode, [['forge', 'Luyện Khí', 'forge'], ['alchemy', 'Luyện Đan', 'alchemy']], (v) => { this.craftMode = v; this.craftResult = null; }),
      this.craftMode === 'alchemy' ? this.vAlchemy() : this.vForge(),
    );
  }

  /** Icon giao diện vẽ qua SVG (không bị "chế độ tối tự động" đảo màu) */
  private icp(name: string, cls = 'ic'): HTMLElement {
    return pic(`/ui/ic_${name}.png`, { class: cls }, [0, 0, 1, 1], 128);
  }

  /** Dòng nguyên liệu: đang có / cần (đỏ khi thiếu) */
  private costChip(icon: string, have: number, need: number, title: string): HTMLElement {
    return h('span', { class: 'cf-cost' + (have < need ? ' lack' : ''), title }, this.icp(icon), h('b', { text: fmt(have) }), h('small', { text: `/ ${fmt(need)}` }));
  }

  /**
   * Sân lò (Luyện Khí / Luyện Đan): lò ở giữa có lửa + tia lửa động; bấm luyện → lò rung, bùng sáng (0,9 s)
   * rồi hiện thẻ kết quả đè lên sân lò. `run` trả kết quả thật; thất bại thì chỉ báo lỗi, không chạy hiệu ứng.
   */
  private furnaceStage(kind: 'forge' | 'alchemy', side: HTMLElement, cost: HTMLElement, btnText: string, run: () => void): HTMLElement {
    const sparks = Array.from({ length: 10 }, (_, i) => h('i', { class: 'cf-spark', style: `--x:${(i * 41) % 100}%;--d:${1.6 + (i % 4) * 0.35}s;--t:${-(i * 0.37).toFixed(2)}s` }));
    const furnace = h('div', { class: `cf-furnace ${kind}` },
      h('i', { class: 'cf-glow' }),
      pic(`/ui/craft/furnace_${kind}.png?v=1`, { class: 'cf-img' }, [0, 0, 1, 1], kind === 'forge' ? [390, 512] : [366, 512]),
      h('i', { class: 'cf-fire' }), h('div', { class: 'cf-sparks' }, ...sparks), h('i', { class: 'cf-flash' }));
    const stage = h('div', { class: `craft-stage ${kind}` }, side, h('div', { class: 'cf-center' }, furnace), h('div', { class: 'cf-act' }, cost,
      h('button', { class: 'btn primary cf-go', text: btnText, onclick: () => {
        if (stage.classList.contains('working')) return;
        run();
      } })));
    if (this.craftResult) stage.append(this.resultCard());
    return stage;
  }

  /** Chạy hiệu ứng luyện trên sân lò đang hiện, xong thì lưu kết quả + vẽ lại (thẻ kết quả bật lên) */
  private playCraft(result: NonNullable<Hub['craftResult']>): void {
    const stage = this.body.querySelector<HTMLElement>('.craft-stage');
    audio.play('cast');
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.craftResult = result; this.render(); return; }
    stage.classList.add('working');
    window.setTimeout(() => { audio.play(result.kind === 'item' ? 'levelup' : 'pickup'); this.craftResult = result; this.render(); }, 900);
  }

  private resultCard(): HTMLElement {
    const r = this.craftResult!;
    const again = (): void => { this.craftResult = null; this.render(); };
    if (r.kind === 'item') {
      const it = P.getSave().items.find((i) => i.uid === r.uid);
      if (!it) { this.craftResult = null; return h('span'); }
      const color = itemColor(it);
      const equipped = P.getSave().equipped[it.slot] === it.uid;
      return h('div', { class: 'cf-result', style: `--rc:${color}` },
        h('div', { class: 'cf-card' },
          h('i', { class: 'cf-rays' }),
          h('div', { class: 'cf-it ' + qClass(it), style: `--rc:${color}` }, gearImg(it)),
          h('b', { class: 'cf-name' + (it.tier >= DAO_TIER ? ' dao-text' : ''), style: { color }, text: itemName(it) }),
          h('div', { class: 'dim', text: itemRankLabel(it) }),
          h('div', { class: 'cf-stats' }, ...itemStatLines(it).slice(0, 4).map((l) => h('div', { text: l }))),
          h('div', { class: 'row' },
            equipped ? h('button', { class: 'btn small', text: 'Đã trang bị', disabled: 'disabled' })
              : h('button', { class: 'btn small primary', text: 'Trang bị ngay', onclick: () => this.act(P.equip(it.uid)) }),
            h('button', { class: 'btn small', text: 'Luyện tiếp', onclick: again }),
          ),
        ));
    }
    return h('div', { class: 'cf-result', style: '--rc:#7cf0d0' },
      h('div', { class: 'cf-card' },
        h('i', { class: 'cf-rays' }),
        h('div', { class: 'cf-pill' }, this.icp('pill', 'cf-pill-ic')),
        h('b', { class: 'cf-name', style: { color: '#9ff5dc' }, text: r.name }),
        h('div', { class: 'cf-stats' }, h('div', { text: r.msg })),
        h('div', { class: 'row' }, h('button', { class: 'btn small primary', text: 'Luyện tiếp', onclick: again })),
      ));
  }

  private vForge(): HTMLElement {
    const s = P.getSave();
    const fc = P.forgeCost();
    const slots = SLOT_IDS.filter((x) => x !== 'bibao');
    const pick = (slot: SlotId): void => { audio.play('click'); this.forgeSlot = slot; this.craftResult = null; this.render(); };
    const side = h('div', { class: 'cf-side' },
      h('div', { class: 'cf-tabs' }, ...slots.map((slot) => h('button', { class: 'cf-opt' + (slot === this.forgeSlot ? ' on' : ''), onclick: () => pick(slot) },
        this.icp(slotIcon(slot)), h('span', { text: SLOT_NAMES[slot] })))),
      this.forgeSlot === 'weapon'
        ? h('div', { class: 'cf-wpns' },
            h('button', { class: 'cf-w' + (this.forgeWeapon ? '' : ' on'), title: 'Ngẫu nhiên', onclick: () => { audio.play('click'); this.forgeWeapon = ''; this.render(); } }, h('b', { text: '?' })),
            ...WEAPON_IDS.map((w) => h('button', { class: 'cf-w' + (this.forgeWeapon === w ? ' on' : ''), title: WEAPON_ITEM_NAMES[w], onclick: () => { audio.play('click'); this.forgeWeapon = w; this.render(); } },
              pic(itemIcon({ slot: 'weapon', weaponId: w, tier: 0 }), { class: 'gi' }))))
        : null,
      h('p', { class: 'dim cf-note', text: 'Phẩm chất và thuộc tính phụ ngẫu nhiên; thế giới càng cao càng dễ ra đồ tốt.' }),
    );
    const cost = h('div', { class: 'cf-costs' }, this.costChip('ore', s.mats.ore, fc.ore, 'Khoáng thạch'), this.costChip('linh', s.linh, fc.linh, 'Linh thạch'));
    return this.furnaceStage('forge', side, cost, 'Luyện khí', () => {
      const r = P.forge(this.forgeSlot, this.forgeSlot === 'weapon' ? this.forgeWeapon || undefined : undefined);
      if (!r.ok || !r.item) { this.act(r); return; }
      this.playCraft({ kind: 'item', uid: r.item.uid });
    });
  }

  private vAlchemy(): HTMLElement {
    const s = P.getSave();
    const def = PILLS.find((p) => p.id === this.pillSel) ?? PILLS[0];
    const side = h('div', { class: 'cf-side' },
      h('div', { class: 'cf-recipes' }, ...PILLS.map((p) => {
        const cnt = P.pillCount(p.id);
        return h('button', { class: 'cf-rec' + (p.id === def.id ? ' on' : ''), onclick: () => { audio.play('click'); this.pillSel = p.id; this.craftResult = null; this.render(); } },
          this.icp('pill'), h('span', { class: 'bk-txt' }, h('b', { text: p.name + (p.cap ? ` (${cnt}/${p.cap})` : '') }), h('small', { text: p.desc })));
      })),
    );
    const cost = h('div', { class: 'cf-costs' },
      this.costChip('herb', s.mats.herb, def.herb, 'Thảo dược'),
      ...(def.core ? [this.costChip('core', s.mats.core, def.core, 'Yêu đan')] : []),
      this.costChip('linh', s.linh, P.pillLinhCost(def.id), 'Linh thạch'));
    return this.furnaceStage('alchemy', side, cost, 'Luyện đan', () => {
      const r = P.craftPill(def.id);
      if (!r.ok) { this.act(r); return; }
      this.playCraft({ kind: 'pill', name: def.name, msg: r.msg });
    });
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
