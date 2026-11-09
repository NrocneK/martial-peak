import { h } from '../dom';
import { getSave, progressCount, resetAll, setSound, gameCompleted, exportSave, importSave, unlockAll } from '../../systems/progression';
import { tierLabel } from '../../config/realms';
import { audio } from '../../systems/Audio';
import { isDebugMode } from '../../utils/env';

/** Vị trí ngọn đèn trong ảnh nền 384x216 (pixel) — dùng để đặt nguồn sáng của tiêu đề */
const LAMP = { x: 101, y: 136 };
const BG = { w: 384, h: 216, posX: 0.22 };

/**
 * Menu chính. Điểm nhấn duy nhất: tiêu đề tối và chỉ sáng lên nơi ánh đèn của Trường Ca chiếu tới.
 * Lần mở đầu tiên, ánh sáng lan ra từ ngọn đèn; sau đó nó bám theo con trỏ / ngón tay và quay về đèn khi nghỉ.
 */
export function buildMainMenu(onPlay: () => void): HTMLElement {
  const root = h('div', { class: 'screen menu' });
  const title = h('h1', { class: 'menu-title' }, 'VẠN GIỚI', h('br'), 'TẦM QUANG');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const list = h('nav', { class: 'menu-nav' });
  const render = (): void => {
    const p = progressCount();
    const s = getSave();
    const row = (label: string, hint: string, onclick: () => void, cls = ''): HTMLElement =>
      h('button', { class: 'mi ' + cls, onclick: () => { audio.play('click'); onclick(); } }, h('span', { class: 'mk' }), h('span', { class: 'lb', text: label }), hint && h('span', { class: 'ht', text: hint }));
    list.replaceChildren(
      h('button', { class: 'go', onclick: () => { audio.play('click'); onPlay(); } },
        h('img', { src: '/ui/seal.png', alt: '', class: 'seal' }),
        h('span', { class: 'go-t' }, h('b', { text: s.stats.runs > 0 ? 'Tiếp tục' : 'Bắt đầu' }), h('small', { text: tierLabel(s.tier, s.tuVi) })),
      ),
      h('div', { class: 'lit' },
        h('div', { class: 'lit-bar' }, h('i', { style: { width: `${(p.cleared / p.total) * 100}%` } })),
        h('span', { text: gameCompleted() ? 'Đã thông quan' : `Đã vượt ${p.cleared} / ${p.total} màn` }),
      ),
      row('Âm thanh', s.sound ? 'Bật' : 'Tắt', () => { setSound(!getSave().sound); audio.enabled = getSave().sound; render(); }),
      row('Xuất save', 'tải file .json', () => {
        const blob = new Blob([exportSave()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: 'van-gioi-tam-quang-save.json' });
        a.click();
        URL.revokeObjectURL(a.href);
      }),
      row('Nhập save', 'từ file .json', () => {
        const inp = h('input', { type: 'file', accept: 'application/json,.json' });
        inp.addEventListener('change', async () => {
          const f = inp.files?.[0];
          if (!f) return;
          if (!window.confirm('Ghi đè tiến trình hiện tại bằng file save này?')) return;
          window.alert(importSave(await f.text()).msg);
          render();
        });
        inp.click();
      }),
      // Nút test chỉ hiện ở chế độ gỡ lỗi (npm run dev hoặc ?debug), người chơi thật không thấy
      ...(isDebugMode()
        ? [row('Chế độ TEST', 'mở khóa tất cả', () => {
            if (!window.confirm('Mở khóa tất cả để test: cảnh giới tối đa, vượt hết 60 màn, nhiều tài nguyên, trang bị mạnh và đủ bí bảo?\n(Cộng thêm vào save hiện tại. Nên bấm "Xuất save" trước nếu muốn giữ bản gốc.)')) return;
            window.alert(unlockAll().msg);
            render();
          }, 'test')]
        : []),
      row('Xóa toàn bộ tiến trình', '', () => {
        if (window.confirm('Xóa toàn bộ tiến trình và bắt đầu lại từ đầu?')) {
          resetAll();
          render();
        }
      }, 'danger'),
    );
  };
  render();

  root.append(
    h('div', { class: 'menu-bg' }),
    h('div', { class: 'menu-shade' }),
    h('header', { class: 'menu-head' }, title, h('p', { class: 'menu-tag', text: 'Cố Trường Ca và con đường tu tiên' })),
    list,
    h('p', { class: 'menu-keys', text: 'WASD / mũi tên / chạm kéo để di chuyển · Esc tạm dừng · X đổi tốc độ' }),
  );

  // ---- Ánh sáng: nguồn = ngọn đèn trên ảnh nền, bám theo con trỏ khi người chơi di chuyển ----
  let px = -1, py = -1, lastMove = -1e9;
  let lx = 0, ly = 0;
  const t0 = performance.now();
  const lampPos = (): { x: number; y: number } => {
    const W = root.clientWidth, H = root.clientHeight;
    const k = Math.max(W / BG.w, H / BG.h);
    return { x: (W - BG.w * k) * BG.posX + LAMP.x * k, y: (H - BG.h * k) + LAMP.y * k };
  };
  const onMove = (e: PointerEvent): void => {
    const r = root.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    lastMove = performance.now();
  };
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerdown', onMove);
  let first = true;
  const frame = (now: number): void => {
    if (!root.isConnected) return;
    const lamp = lampPos();
    if (first) { lx = lamp.x; ly = lamp.y; first = false; }
    const follow = now - lastMove < 3500 && px >= 0;
    const tx = follow ? px : lamp.x, ty = follow ? py : lamp.y;
    const e = reduce ? 1 : 0.09;
    lx += (tx - lx) * e;
    ly += (ty - ly) * e;
    const grow = reduce ? 1 : Math.min(1, (now - t0) / 1800);
    const ease = 1 - Math.pow(1 - grow, 3);
    const R = Math.max(root.clientWidth, root.clientHeight);
    const flick = reduce ? 0 : Math.sin(now / 170) * 4 + Math.sin(now / 53) * 2;
    const rad = ((root.clientWidth < 760 ? 0.95 : 0.62) * R + flick) * ease;
    root.style.setProperty('--lx', `${lx}px`);
    root.style.setProperty('--ly', `${ly}px`);
    root.style.setProperty('--lr', `${rad}px`);
    const hr = title.getBoundingClientRect(), rr = root.getBoundingClientRect();
    root.style.setProperty('--hx', `${lx + rr.left - hr.left}px`);
    root.style.setProperty('--hy', `${ly + rr.top - hr.top}px`);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return root;
}
