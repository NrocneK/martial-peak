import { h } from './dom';
import { audio } from '../systems/Audio';

/**
 * SÁCH CÔNG PHÁP (Tu Luyện → Công Pháp): cuốn sách mở 2 trang (màn hình hẹp: 1 trang), 3 chương
 * (Chủ Động / Bị Động / Thức Tỉnh). Mỗi chương chia đều các mục ra đủ số trang cho vừa khung — KHÔNG cuộn dọc.
 * Mỗi chương bắt đầu ở trang trái; dải lụa đánh dấu bên mép sách nhảy thẳng tới chương. Lật trang có hoạt ảnh 3D.
 * Chỉ dựng giao diện; nội dung từng mục do Hub cung cấp (`BookChapter.rows`).
 */
export interface BookChapter {
  id: string;
  title: string;
  /** chữ trên dải lụa đánh dấu (ngắn) */
  tab: string;
  /** dòng nhỏ dưới tiêu đề chương (vd "Mang theo 2/3") */
  sub?: string;
  /** chiều cao 1 mục (px) — dùng để tính số mục mỗi trang */
  rowH: number;
  rows: HTMLElement[];
}

interface Page { ch: number; head: boolean; rows: HTMLElement[]; num: number }

const NARROW_MQ = '(max-width: 760px)';
const FLIP_MS = 650;

export class SkillBook {
  readonly el = h('div', { class: 'book' });
  private chapters: BookChapter[] = [];
  private pages: Page[] = [];
  /** chỉ số trang đang mở (trang trái của cặp trang; màn hẹp: trang duy nhất) */
  private at = 0;
  private flipping = false;
  private lastKey = '';

  constructor() {
    new ResizeObserver(() => this.layout()).observe(this.el);
  }

  private get spread(): number { return window.matchMedia(NARROW_MQ).matches ? 1 : 2; }

  /** Nạp nội dung mới (vẽ lại Hub) — giữ nguyên trang đang mở */
  set(chapters: BookChapter[]): void {
    this.chapters = chapters;
    this.lastKey = '';
    this.layout();
  }

  /** Chiều cao dành cho các mục trong 1 trang (trừ tiêu đề chương, số trang) */
  private room(head: boolean): number {
    const narrow = window.matchMedia(NARROW_MQ).matches;
    const ph = this.el.clientHeight - 2 * (narrow ? 10 : 18) - 4;        // lề trong bìa + viền
    return ph - (narrow ? 12 : 16) - 26 - (head ? 58 : 0);               // lề trên trang, số trang ở chân, tiêu đề chương
  }

  private layout(): void {
    if (!this.chapters.length || !this.el.clientHeight) return;
    const sp = this.spread;
    const key = `${this.el.clientWidth}x${this.el.clientHeight}:${sp}:${this.chapters.map((c) => c.rows.length).join(',')}`;
    if (key === this.lastKey) { this.draw(); return; }
    this.lastKey = key;
    // chia đều: số trang tối thiểu để vừa, rồi rải mục đều cho các trang
    const curCh = this.pages[this.at]?.ch ?? 0;
    this.pages = [];
    this.chapters.forEach((c, ci) => {
      if (sp === 2 && this.pages.length % 2) this.pages.push({ ch: ci - 1, head: false, rows: [], num: 0 });  // chương mới luôn ở trang trái
      const capHead = Math.max(1, Math.floor(this.room(true) / c.rowH));
      const cap = Math.max(1, Math.floor(this.room(false) / c.rowH));
      let n = 1;
      while (capHead + (n - 1) * cap < c.rows.length) n++;
      if (sp === 2 && n % 2) n++;                                        // cặp trang đủ đôi cho cân
      // rải đều: mỗi trang lấy phần chia đều của số mục còn lại (trang đầu chương bớt chỗ cho tiêu đề)
      let i = 0;
      for (let p = 0; p < n; p++) {
        const take = Math.min(p === 0 ? capHead : cap, Math.ceil((c.rows.length - i) / (n - p)));
        this.pages.push({ ch: ci, head: p === 0, rows: c.rows.slice(i, i + take), num: 0 });
        i += take;
      }
      while (i < c.rows.length) {                                        // phòng hờ làm tròn
        const take = Math.min(cap, c.rows.length - i);
        this.pages.push({ ch: ci, head: false, rows: c.rows.slice(i, i + take), num: 0 });
        i += take;
      }
    });
    this.pages.forEach((p, i) => { p.num = i + 1; });
    // giữ chương đang đọc khi đổi cỡ
    const first = this.pages.findIndex((p) => p.ch === curCh);
    this.at = Math.max(0, Math.min(this.at, this.pages.length - 1));
    if (this.pages[this.at]?.ch !== curCh && first >= 0) this.at = first;
    this.at -= this.at % sp;
    this.draw();
  }

  /** `copy`: dùng bản sao các mục (tờ đang lật / trang lót tạm) — mục gốc thuộc về trang thật */
  private pageEl(i: number, side: 'l' | 'r' | 'one', copy = false): HTMLElement {
    const p = this.pages[i];
    if (!p) return h('div', { class: `bk-page ${side} blank` });
    const c = this.chapters[p.ch];
    return h('div', { class: `bk-page ${side}` + (p.rows.length ? '' : ' blank') },
      p.head ? h('div', { class: 'bk-head' }, h('b', { text: c.title }), c.sub ? h('span', { text: c.sub }) : null) : null,
      h('div', { class: 'bk-rows' }, ...(copy ? p.rows.map((r) => r.cloneNode(true) as HTMLElement) : p.rows)),
      p.rows.length ? h('div', { class: 'bk-num', text: `— ${p.num} —` }) : h('div', { class: 'bk-seal', text: '道' }),
    );
  }

  private draw(): void {
    const sp = this.spread;
    const cur = this.pages[this.at]?.ch ?? 0;
    const last = this.pages.length - 1;
    const pages = sp === 2
      ? [this.pageEl(this.at, 'l'), this.pageEl(this.at + 1, 'r')]
      : [this.pageEl(this.at, 'one')];
    this.el.replaceChildren(
      h('div', { class: 'bk-cover' },
        h('div', { class: 'bk-spread' + (sp === 1 ? ' single' : '') }, ...pages, sp === 2 ? h('i', { class: 'bk-spine' }) : null),
        h('button', { class: 'bk-turn prev', 'aria-label': 'Trang trước', disabled: this.at > 0 ? null : 'disabled', onclick: () => this.turn(-1) }, '‹'),
        h('button', { class: 'bk-turn next', 'aria-label': 'Trang sau', disabled: this.at + sp <= last ? null : 'disabled', onclick: () => this.turn(1) }, '›'),
      ),
      h('div', { class: 'bk-ribbons' },
        ...this.chapters.map((c, ci) => h('button', { class: 'bk-rib' + (ci === cur ? ' on' : ''), onclick: () => this.jump(ci) }, h('span', { text: c.tab }))),
      ),
    );
  }

  private jump(ci: number): void {
    const to = this.pages.findIndex((p) => p.ch === ci);
    if (to < 0 || to === this.at || this.flipping) return;
    this.go(to - (to % this.spread));
  }

  private turn(dir: 1 | -1): void {
    if (this.flipping) return;
    const to = this.at + dir * this.spread;
    if (to < 0 || to > this.pages.length - 1) return;
    this.go(to);
  }

  /** Lật trang: vẽ cặp trang mới bên dưới, một tờ giấy (mặt trước = trang cũ, mặt sau = trang mới) xoay quanh gáy sách */
  private go(to: number): void {
    const dir = to > this.at ? 1 : -1;
    const sp = this.spread;
    const from = this.at;
    audio.play('click');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.at = to;
    if (reduce) { this.draw(); return; }
    // mặt trước / sau của tờ đang lật (bản sao trang, không cần bấm được)
    if (sp === 1) {
      // 1 trang: tờ cũ xoay đi quanh mép (lật tới: mép trái, lật lui: mép phải) để lộ trang mới bên dưới
      const old1 = this.pageEl(from, 'one', true);
      this.draw();
      const sp1 = this.el.querySelector<HTMLElement>('.bk-spread');
      if (!sp1) return;
      const leaf1 = h('div', { class: `bk-leaf single ${dir > 0 ? 'fwd' : 'back'}` }, h('div', { class: 'bk-face front' }, old1));
      sp1.append(leaf1);
      this.flipping = true;
      window.setTimeout(() => { leaf1.remove(); this.flipping = false; }, FLIP_MS);
      return;
    }
    const front = this.pageEl(dir > 0 ? from + 1 : from, dir > 0 ? 'r' : 'l', true);
    const back = this.pageEl(dir > 0 ? to : to + 1, dir > 0 ? 'l' : 'r', true);
    this.draw();
    const spread = this.el.querySelector<HTMLElement>('.bk-spread');
    if (!spread) return;
    // trang phía "đi" vẫn là trang cũ cho tới khi tờ lật đè qua gáy
    const old = this.pageEl(dir > 0 ? from : from + 1, dir > 0 ? 'l' : 'r', true);
    old.classList.add('bk-under');
    spread.append(old);
    const leaf = h('div', { class: `bk-leaf ${dir > 0 ? 'fwd' : 'back'}` },
      h('div', { class: 'bk-face front' }, front), h('div', { class: 'bk-face backf' }, back));
    spread.append(leaf);
    this.flipping = true;
    window.setTimeout(() => {
      old.remove();
      leaf.remove();
      this.flipping = false;
    }, FLIP_MS);
  }
}
