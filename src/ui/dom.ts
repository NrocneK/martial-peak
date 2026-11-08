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
