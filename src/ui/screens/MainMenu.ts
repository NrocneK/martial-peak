import { h } from '../dom';
import { getSave, progressCount, resetAll, setSound, gameCompleted, exportSave, importSave, unlockAll } from '../../systems/Progression';
import { audio } from '../../systems/Audio';

/** Menu chính: Tiếp tục / Cài đặt (âm thanh, xóa tiến trình). */
export function buildMainMenu(onPlay: () => void): HTMLElement {
  const root = h('div', { class: 'screen menu' });
  const render = (): void => {
    root.replaceChildren();
    const p = progressCount();
    const s = getSave();
    root.append(
      h('h1', { text: 'VẠN GIỚI TẦM QUANG' }),
      h('div', { class: 'sub' }, 'Survival · Cố Trường Ca và hành trình thắp lại ánh sáng', h('br'), `Đã vượt ${p.cleared}/${p.total} màn` + (gameCompleted() ? ' · Đã thông quan!' : '')),
      h('button', { class: 'btn primary', text: s.stats.runs > 0 ? 'Tiếp tục' : 'Bắt đầu', onclick: () => { audio.play('click'); onPlay(); } }),
      h('button', {
        class: 'btn',
        text: s.sound ? 'Âm thanh: Bật' : 'Âm thanh: Tắt',
        onclick: () => { setSound(!getSave().sound); audio.enabled = getSave().sound; render(); },
      }),
      h('div', { class: 'row', style: 'justify-content:center' },
        h('button', {
          class: 'btn',
          text: 'Xuất save',
          onclick: () => {
            const blob = new Blob([exportSave()], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: 'vo-luyen-save.json' });
            a.click();
            URL.revokeObjectURL(a.href);
          },
        }),
        h('button', {
          class: 'btn',
          text: 'Nhập save',
          onclick: () => {
            const inp = h('input', { type: 'file', accept: 'application/json,.json' });
            inp.addEventListener('change', async () => {
              const f = inp.files?.[0];
              if (!f) return;
              if (!window.confirm('Ghi đè tiến trình hiện tại bằng file save này?')) return;
              const r = importSave(await f.text());
              window.alert(r.msg);
              render();
            });
            inp.click();
          },
        }),
      ),
      h('button', {
        class: 'btn',
        text: 'Chế độ TEST (mở khóa tất cả)',
        onclick: () => {
          if (!window.confirm('Mở khóa tất cả để test: cảnh giới tối đa, vượt hết 60 màn, nhiều tài nguyên, trang bị mạnh và đủ bí bảo?\n(Cộng thêm vào save hiện tại. Nên bấm "Xuất save" trước nếu muốn giữ bản gốc.)')) return;
          window.alert(unlockAll().msg);
          render();
        },
      }),
      h('button', {
        class: 'btn danger',
        text: 'Xóa toàn bộ tiến trình',
        onclick: () => {
          if (window.confirm('Xóa toàn bộ tiến trình và bắt đầu lại từ đầu?')) {
            resetAll();
            render();
          }
        },
      }),
      h('div', { class: 'dim', style: 'font-size:12px;margin-top:16px;text-align:center' }, 'Di chuyển: WASD / phím mũi tên / chạm kéo · Tạm dừng: Esc'),
    );
  };
  render();
  return root;
}
