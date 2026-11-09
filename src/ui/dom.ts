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

/** Avatar tròn: phần đầu của sprite nhân vật */
export function heroAvatar(cls = ''): HTMLElement {
  return h('div', { class: 'avatar ' + cls }, h('i'));
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
