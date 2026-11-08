import { h } from '../dom';
import type { DialogueLine } from '../../config/types';

/**
 * Hộp hội thoại. Bấm / chạm / Space / Enter để sang câu tiếp, nút "Bỏ qua" để đóng ngay.
 * Chữ hiện dần (gõ chữ); bấm lần đầu sẽ hiện hết câu, bấm lần nữa mới sang câu kế.
 */
export function showDialogue(lines: DialogueLine[], onDone: () => void): HTMLElement {
  const who = h('div', { class: 'who' });
  const txt = h('div', { class: 'txt' });
  const hint = h('div', { class: 'hint' }, h('span', { text: 'Bấm để tiếp tục' }), h('span', { class: 'skip', text: 'Bỏ qua ▸▸', style: 'cursor:pointer;pointer-events:auto' }));
  const box = h('div', { class: 'box' }, who, txt, hint);
  const root = h('div', { class: 'screen dialog' }, box);
  let i = 0;
  let full = '';
  let pos = 0;
  let timer = 0;
  let finished = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    window.clearInterval(timer);
    window.removeEventListener('keydown', onKey);
    root.remove();
    onDone();
  };
  const show = (): void => {
    const l = lines[i];
    who.textContent = l.speaker;
    full = l.text;
    pos = 0;
    txt.textContent = '';
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      pos += 2;
      txt.textContent = full.slice(0, pos);
      if (pos >= full.length) window.clearInterval(timer);
    }, 24);
  };
  const next = (): void => {
    if (pos < full.length) {
      window.clearInterval(timer);
      pos = full.length;
      txt.textContent = full;
      return;
    }
    i++;
    if (i >= lines.length) finish();
    else show();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      next();
    } else if (e.key === 'Escape') finish();
  };
  box.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('skip')) finish();
    else next();
  });
  window.addEventListener('keydown', onKey);
  if (lines.length === 0) queueMicrotask(finish);
  else show();
  return root;
}
