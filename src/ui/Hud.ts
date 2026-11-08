import Phaser from 'phaser';

/**
 * HUD tạm cho giai đoạn 1: hướng dẫn điều khiển + thông số gỡ lỗi (FPS, tọa độ).
 * Từ giai đoạn 2 sẽ thêm thanh máu, thanh XP, đồng hồ đếm thời gian màn chơi.
 */
export class Hud {
  private readonly debugText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      // Bộ font hỗ trợ đầy đủ dấu tiếng Việt (font "monospace" mặc định hay lỗi dấu ở một số máy)
      fontFamily: '"Segoe UI", Roboto, "Noto Sans", Arial, sans-serif',
      fontSize: '14px',
      color: '#cfc8e6',
    };

    this.debugText = scene.add
      .text(12, 10, '', style)
      .setScrollFactor(0)
      .setDepth(2000);

    const isTouch = scene.sys.game.device.input.touch;
    this.hintText = scene.add
      .text(12, 0, isTouch ? 'Chạm và kéo để di chuyển' : 'WASD / phím mũi tên để di chuyển', {
        ...style,
        color: '#8f88a8',
      })
      .setScrollFactor(0)
      .setDepth(2000);

    this.layout(scene.scale.height);
  }

  /** Đặt dòng hướng dẫn sát đáy màn hình (gọi lại khi đổi kích thước). */
  layout(height: number): void {
    this.hintText.setY(height - 28);
  }

  update(fps: number, x: number, y: number): void {
    this.debugText.setText(`FPS: ${Math.round(fps)}\nX: ${Math.round(x)}  Y: ${Math.round(y)}`);
  }
}
