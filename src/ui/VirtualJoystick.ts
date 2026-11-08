import Phaser from 'phaser';
import { JOYSTICK } from '../config/game';

/**
 * Joystick ảo "động" cho điện thoại: đặt ngón tay ở bất kỳ đâu, vòng joystick hiện ra tại đó,
 * kéo ngón tay để chọn hướng. Nhả tay thì biến mất.
 *
 * Lớp này chỉ lo cảm ứng và phần hiển thị. Nó cung cấp `vector` (hướng + độ mạnh 0..1),
 * còn việc di chuyển nhân vật do InputManager / Player xử lý (tách trách nhiệm cho dễ bảo trì).
 */
export class VirtualJoystick {
  /** Hướng kéo hiện tại, độ dài 0..1. Là (0,0) khi không chạm. */
  readonly vector = new Phaser.Math.Vector2(0, 0);

  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;

  /** id của ngón tay đang điều khiển joystick (null = chưa có). Cần để bỏ qua ngón thứ hai. */
  private activePointerId: number | null = null;
  private readonly origin = new Phaser.Math.Vector2();
  private readonly thumb = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // scrollFactor 0 = đứng yên trên màn hình dù camera di chuyển
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(JOYSTICK.depth);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  /** Gỡ sự kiện khi scene kết thúc, tránh bị gọi lặp khi vào lại màn chơi. */
  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.gfx.destroy();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) return; // đã có ngón đang điều khiển
    if (!pointer.wasTouch && !JOYSTICK.allowMouse) return; // chuột chỉ dùng cho menu / thẻ

    this.activePointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.thumb.set(pointer.x, pointer.y);
    this.updateVector();
    this.draw();
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.thumb.set(pointer.x, pointer.y);
    this.updateVector();
    this.draw();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.vector.set(0, 0);
    this.gfx.clear();
  }

  /** Tính hướng + độ mạnh từ vị trí núm so với tâm. */
  private updateVector(): void {
    const dx = this.thumb.x - this.origin.x;
    const dy = this.thumb.y - this.origin.y;
    const dist = Math.hypot(dx, dy);

    // Độ mạnh 0..1 (kéo xa hơn bán kính vẫn tính là 1)
    const strength = Math.min(dist / JOYSTICK.radius, 1);
    if (strength < JOYSTICK.deadZone || dist === 0) {
      this.vector.set(0, 0);
      return;
    }
    this.vector.set((dx / dist) * strength, (dy / dist) * strength);
  }

  private draw(): void {
    const { radius, thumbRadius } = JOYSTICK;

    // Giữ núm nằm trong vòng ngoài khi vẽ
    const dx = this.thumb.x - this.origin.x;
    const dy = this.thumb.y - this.origin.y;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist, radius) / dist;
    const tx = this.origin.x + dx * k;
    const ty = this.origin.y + dy * k;

    this.gfx.clear();
    this.gfx.fillStyle(0xffffff, 0.08);
    this.gfx.fillCircle(this.origin.x, this.origin.y, radius);
    this.gfx.lineStyle(2, 0xffffff, 0.3);
    this.gfx.strokeCircle(this.origin.x, this.origin.y, radius);
    this.gfx.fillStyle(0xffffff, 0.35);
    this.gfx.fillCircle(tx, ty, thumbRadius);
  }
}
