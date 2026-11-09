import { h, openModal } from '../dom';
import { exportSave, getSave, importSave, resetAll, setSound, unlockAll } from '../../systems/progression';
import { audio } from '../../systems/Audio';
import { isDebugMode } from '../../utils/env';

/**
 * Bảng Cài Đặt dùng chung cho Menu chính và Lobby: âm thanh, xuất / nhập save, chế độ TEST (chỉ khi gỡ lỗi),
 * xóa tiến trình, về menu chính (chỉ ở Lobby). `onChange` được gọi khi save thay đổi để màn hình vẽ lại.
 */
export function openSettings(onChange: () => void, toMenu?: () => void): void {
  const body = h('div', { class: 'set-list' });
  let close = (): void => undefined;
  const row = (label: string, hint: string, onclick: () => void, cls = ''): HTMLElement =>
    h('button', { class: 'mi ' + cls, onclick: () => { audio.play('click'); onclick(); } }, h('span', { class: 'mk' }), h('span', { class: 'lb', text: label }), hint && h('span', { class: 'ht', text: hint }));
  const render = (): void => {
    const s = getSave();
    body.replaceChildren(
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
          onChange();
          render();
        });
        inp.click();
      }),
      // Nút test chỉ hiện ở chế độ gỡ lỗi (npm run dev hoặc ?debug), người chơi thật không thấy
      ...(isDebugMode()
        ? [row('Chế độ TEST', 'mở khóa tất cả', () => {
            if (!window.confirm('Mở khóa tất cả để test: cảnh giới tối đa, vượt hết 60 màn, nhiều tài nguyên, trang bị mạnh và đủ bí bảo?\n(Cộng thêm vào save hiện tại. Nên bấm "Xuất save" trước nếu muốn giữ bản gốc.)')) return;
            window.alert(unlockAll().msg);
            onChange();
          }, 'test')]
        : []),
      row('Xóa toàn bộ tiến trình', '', () => {
        if (!window.confirm('Xóa toàn bộ tiến trình và bắt đầu lại từ đầu?')) return;
        resetAll();
        onChange();
        render();
      }, 'danger'),
      ...(toMenu ? [row('Về menu chính', '', () => { close(); toMenu(); })] : []),
      h('p', { class: 'set-keys', text: 'Điều khiển: WASD / phím mũi tên / chạm kéo để di chuyển · Esc tạm dừng · X đổi tốc độ · 1 2 3 chọn thẻ' }),
    );
  };
  render();
  close = openModal('Cài Đặt', body);
}
