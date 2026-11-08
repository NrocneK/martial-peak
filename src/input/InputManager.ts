import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';

/**
 * InputManager: gom mọi thiết bị nhập (bàn phím + joystick cảm ứng) về MỘT thứ duy nhất:
 * "hướng di chuyển" (vector độ dài 0..1).
 *
 * Nhờ vậy Player và GameScene không cần biết người chơi đang dùng thiết bị gì.
 * Sau này thêm tay cầm chỉ cần sửa file này.
 */
export class InputManager {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private readonly joystick: VirtualJoystick;

  /** Dùng lại một vector duy nhất mỗi khung hình để không tạo rác bộ nhớ (garbage). */
  private readonly move = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Bàn phím không khả dụng trong scene này');
    }
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as InputManager['wasd'];
    this.joystick = new VirtualJoystick(scene);
  }

  /** Hướng di chuyển hiện tại. Bàn phím được ưu tiên, nếu không bấm phím nào thì dùng joystick. */
  getMoveVector(): Phaser.Math.Vector2 {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);

    if (x !== 0 || y !== 0) {
      // normalize: đi chéo không được nhanh hơn đi thẳng (tránh lỗi quen thuộc 1.41 lần tốc độ)
      this.move.set(x, y).normalize();
    } else {
      this.move.copy(this.joystick.vector);
    }
    return this.move;
  }

  destroy(): void {
    this.joystick.destroy();
  }
}
