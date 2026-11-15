import { realmLook, REALM_FACE } from '../config/realms';
import { getSave } from '../systems/progression';
/** Tiện ích dựng giao diện HTML (không dùng thư viện): h('div', {class:'a', onclick: fn}, 'text', child...) */
type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; text?: string; style?: Partial<CSSStyleDeclaration> | string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v as string;
      else if (k === 'text') el.textContent = v as string;
      else if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'object' ? c : String(c));
  }
  return el;
}

/**
 * Hình món đồ vẽ trong <svg><image> thay vì <img>: trình duyệt điện thoại bật "chế độ tối tự động"
 * (Chrome Android / trình duyệt dựa trên Chromium) tự ĐẢO MÀU các <img> / ảnh nền nhỏ trông như icon
 * (vd cung gỗ nâu sẫm thành cung trắng), nhưng không đụng tới ảnh trong SVG.
 * `vb` = vùng cắt theo tỉ lệ ảnh [x, y, w, h] (0..1), mặc định cả ảnh. `px` = cỡ ảnh gốc (vuông): toạ độ SVG theo điểm ảnh thật
 * (toạ độ quá nhỏ kiểu 1×1 khiến trình duyệt vẫn coi là icon nhỏ và đảo màu).
 */
export function pic(src: string, props: { class?: string; style?: string; title?: string } = {}, vb: [number, number, number, number] = [0, 0, 1, 1], px = 66): HTMLElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', vb.map((v) => v * px).join(' '));
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  if (props.class) svg.setAttribute('class', props.class);
  if (props.style) svg.setAttribute('style', props.style);
  if (props.title) { const t = document.createElementNS(NS, 'title'); t.textContent = props.title; svg.append(t); }
  const im = document.createElementNS(NS, 'image');
  im.setAttribute('href', src);
  im.setAttribute('width', String(px));
  im.setAttribute('height', String(px));
  im.setAttribute('preserveAspectRatio', 'none');
  svg.append(im);
  return svg as unknown as HTMLElement;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Màu số 0xRRGGBB → '#rrggbb' */
export function css(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

/** Thanh tiến độ */
export function bar(cls: string): { root: HTMLElement; fill: HTMLElement; label: HTMLElement } {
  const fill = h('div', { class: 'fill' });
  const label = h('span', { class: 'lbl' });
  const root = h('div', { class: 'bar ' + cls }, fill, label);
  return { root, fill, label };
}

/** Ô ảnh nhân vật Cố Trường Ca (sprite pixel art có hoạt ảnh thở). `scale` = số lần phóng to. */
export function heroSprite(scale = 3, cls = ''): HTMLElement {
  return h('div', { class: 'hero-sprite ' + cls, style: `--s:${scale}`, role: 'img', 'aria-label': 'Cố Trường Ca' });
}

/** Avatar tròn: phần mặt của hình nhân vật theo cảnh giới hiện tại */
export function heroAvatar(cls = ''): HTMLElement {
  const look = realmLook(getSave().tier);
  const [fx, fy] = REALM_FACE[look - 1];
  return h('div', { class: 'avatar ' + cls, style: `--fx:${fx};--fy:${fy}` }, h('i', { style: `background-image:url('/ui/realm_${look}.png?v=2')` }));
}

/** Bộ hình ngồi thiền đã có (public/ui/meditate_n.png, tools/art/meditate_sprites.py); bộ chưa có dùng hình ngồi thiền cũ */
const MEDITATE_LOOKS = new Set([1, 2, 3, 4, 5, 6]);
/** Hình nhân vật ngồi thiền theo cảnh giới (tab Tu Luyện; khung 128×112, phóng `scale` lần) */
export function realmFigure(tier: number, scale = 3): HTMLElement {
  const look = realmLook(tier);
  if (!MEDITATE_LOOKS.has(look)) return h('div', { class: 'meditate', role: 'img', 'aria-label': 'Cố Trường Ca ngồi thiền tu luyện' });
  return h('div', { class: 'realm-look', style: `--s:${scale};background-image:url('/ui/meditate_${look}.png?v=1')`, role: 'img', 'aria-label': 'Cố Trường Ca ngồi thiền tu luyện' });
}

/**
 * Hộp thoại nổi (modal) đặt vào #ui. Bấm nền tối, nút ✕ hoặc phím Esc để đóng.
 * Trả về hàm đóng để nơi gọi tự đóng khi cần.
 */
export function openModal(title: string, body: HTMLElement, onClose?: () => void): () => void {
  const ui = document.getElementById('ui') as HTMLElement;
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey);
    root.remove();
    onClose?.();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  const panel = h('div', { class: 'modal-panel', role: 'dialog', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', { text: title }), h('button', { class: 'modal-x', 'aria-label': 'Đóng', text: '✕', onclick: close })),
    h('div', { class: 'modal-body' }, body),
  );
  const root = h('div', { class: 'screen modal' }, panel);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  window.addEventListener('keydown', onKey);
  ui.append(root);
  return close;
}
