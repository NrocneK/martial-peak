import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../config/game';
import { SCENES, TEX } from '../config/assets';

/**
 * BootScene: chạy đầu tiên, chuẩn bị tài nguyên rồi chuyển sang GameScene.
 *
 * Hiện tại chưa có sprite thật nên ta TỰ VẼ hình tạm (placeholder) bằng code và
 * biến chúng thành texture. Khi có sprite thật, thay phần này bằng
 * `this.load.image(TEX.PLAYER, 'assets/player.png')` ở hàm preload().
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    this.makePlayerTexture();
    this.makeGroundTexture();
    this.makeShapeTextures();
    this.makeMiscTextures();
    // Báo cho GameFlow biết đã nạp xong → hiện menu chính (GameScene chỉ chạy khi vào màn)
    this.game.events.emit('boot-done');
  }

  /** Nhân vật: hình tròn vàng có một "mũi" chỉ hướng nhìn (bên phải = hướng 0 độ). */
  private makePlayerTexture(): void {
    const r = PLAYER_RADIUS;
    const g = this.add.graphics();

    g.fillStyle(0xe8c96a, 1);
    g.fillCircle(r, r, r - 1);
    g.lineStyle(2, 0x5a4310, 1);
    g.strokeCircle(r, r, r - 1);

    // Mũi chỉ hướng
    g.fillStyle(0x5a4310, 1);
    g.fillTriangle(r * 2 - 2, r, r + 4, r - 6, r + 4, r + 6);

    g.generateTexture(TEX.PLAYER, r * 2, r * 2);
    g.destroy();
  }

  /**
   * Nền đất: một ô vuông 128x128 có thể lặp liền mạch (tile), gồm ô lưới mờ và vài đốm rải rác
   * để nhìn thấy rõ khi nhân vật di chuyển.
   */
  private makeGroundTexture(): void {
    const size = 128;
    const g = this.add.graphics();

    g.fillStyle(0x24202e, 1);
    g.fillRect(0, 0, size, size);

    // Đường lưới mờ ở mép trái và mép trên (lặp lại sẽ thành lưới đều)
    g.fillStyle(0x2f2a3c, 1);
    g.fillRect(0, 0, size, 2);
    g.fillRect(0, 0, 2, size);

    // Đốm trang trí, dùng bộ sinh số giả ngẫu nhiên cố định để kết quả giống nhau mỗi lần chạy
    let seed = 1337;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rand() * (size - 8)) + 4;
      const y = Math.floor(rand() * (size - 8)) + 4;
      const w = 2 + Math.floor(rand() * 4);
      g.fillStyle(rand() > 0.5 ? 0x2b2638 : 0x1d1a26, 1);
      g.fillRect(x, y, w, w);
    }

    g.generateTexture(TEX.GROUND, size, size);
    g.destroy();
  }

  /** Hình quái: vẽ màu trắng + viền tối để khi nhuộm màu (tint) vẫn thấy rõ đường viền. */
  private makeShapeTextures(): void {
    const S = 64;
    const c = S / 2;
    const r = c - 3;
    const shapes: Record<string, (g: Phaser.GameObjects.Graphics) => void> = {
      circle: (g) => g.fillCircle(c, c, r),
      diamond: (g) => g.fillPoints([{ x: c, y: c - r }, { x: c + r, y: c }, { x: c, y: c + r }, { x: c - r, y: c }], true),
      square: (g) => g.fillRect(c - r * 0.85, c - r * 0.85, r * 1.7, r * 1.7),
      tri: (g) => g.fillTriangle(c + r, c, c - r * 0.8, c - r * 0.9, c - r * 0.8, c + r * 0.9),
      star: (g) => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.5;
          pts.push({ x: c + Math.cos(a) * rad, y: c + Math.sin(a) * rad });
        }
        g.fillPoints(pts, true);
      },
      hex: (g) => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) pts.push({ x: c + Math.cos((Math.PI / 3) * i) * r, y: c + Math.sin((Math.PI / 3) * i) * r });
        g.fillPoints(pts, true);
      },
    };
    for (const [name, draw] of Object.entries(shapes)) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      draw(g);
      g.generateTexture(TEX.SHAPE + name, S, S);
      g.destroy();
      // Viền: vẽ lại chồng một lớp nhỏ hơn màu sáng để tạo cảm giác có viền tối bên ngoài
    }
    // "Mắt" nhỏ để biết quái nhìn hướng nào không cần thiết → bỏ qua, giữ placeholder đơn giản
  }

  /** Đạn, hạt XP, linh thạch, bình máu, lưỡi kiếm. */
  private makeMiscTextures(): void {
    const mk = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    mk(TEX.PROJ, 28, 12, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(28, 6, 0, 0, 0, 12);
    });
    mk(TEX.BULLET, 16, 16, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, 0x000000, 0.5);
      g.strokeCircle(8, 8, 7);
    });
    mk(TEX.GEM, 14, 14, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillPoints([{ x: 7, y: 0 }, { x: 14, y: 7 }, { x: 7, y: 14 }, { x: 0, y: 7 }], true);
    });
    mk(TEX.COIN, 16, 16, (g) => {
      g.fillStyle(0xffd860, 1);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, 0x9a6a10, 1);
      g.strokeCircle(8, 8, 7);
      g.fillStyle(0xfff0b0, 1);
      g.fillCircle(6, 6, 2);
    });
    mk(TEX.HEART, 18, 18, (g) => {
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(6, 7, 5);
      g.fillCircle(12, 7, 5);
      g.fillTriangle(1, 9, 17, 9, 9, 17);
    });
    mk(TEX.BLADE, 36, 12, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(36, 6, 6, 0, 6, 12);
      g.fillStyle(0x886644, 1);
      g.fillRect(0, 4, 8, 4);
    });
  }
}
