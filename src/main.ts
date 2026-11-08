import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { installDebug } from './debug';
import { GameFlow } from './flow/GameFlow';
import './ui/styles.css';

// Điểm khởi động của game: tạo đối tượng Phaser.Game với cấu hình chung.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Tự chọn WebGL, nếu máy không hỗ trợ thì dùng Canvas
  parent: 'game', // id của thẻ <div> trong index.html
  backgroundColor: '#14121c',
  scale: {
    // RESIZE: canvas luôn phủ kín vùng chứa, tự đổi kích thước khi xoay điện thoại / đổi cỡ cửa sổ.
    // Vì map là vô hạn nên không cần giữ tỉ lệ khung hình cố định.
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade', // Vật lý đơn giản, nhẹ, đủ cho game có hàng trăm quái
    arcade: {
      debug: false,
      // Vật lý chạy theo thời gian thật của từng khung hình (thay vì bước cố định 1/60 giây).
      // Kết hợp với `fps.smoothStep: false` ở trên để tốc độ không phụ thuộc FPS.
      fixedStep: false,
    },
  },
  fps: {
    target: 60,
    // Tắt làm mượt delta. Mặc định Phaser "làm mượt" và ép thời gian mỗi khung hình về nhịp 60 FPS,
    // nên khi máy chỉ đạt ~30 FPS thì game chạy chậm hơn đồng hồ thật (nhân vật, quái đi chậm lại).
    // Tắt đi => delta = thời gian thật giữa hai khung hình => tốc độ không phụ thuộc FPS.
    smoothStep: false,
    // Giới hạn delta tối đa = 1000/20 = 50ms mỗi khung hình. Sau khi bị giật hình / đổi tab,
    // game không "nhảy vọt" làm nhân vật và quái xuyên qua nhau.
    min: 20,
  },
  input: {
    // Cho phép nhiều ngón chạm cùng lúc (sau này vừa điều khiển vừa bấm nút)
    activePointers: 3,
  },
  disableContextMenu: true,
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);
// Luồng màn hình (menu, hub, hội thoại, HUD...) là giao diện HTML đè lên canvas
new GameFlow(game);

// Chỉ ở chế độ dev (npm run dev): cho phép mở console trình duyệt và gõ `__game` để xem / gỡ lỗi.
// Bản build thật (npm run build) không có dòng này.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) installDebug(game);
