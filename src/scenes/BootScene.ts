import Phaser from 'phaser';
import { PLAYER_WALK_ANIM, SCENES, TEX } from '../config/assets';

/**
 * BootScene: chạy đầu tiên, chuẩn bị tài nguyên rồi báo cho GameFlow hiện menu.
 *
 * Nhân vật chính dùng sprite pixel art thật (public/ui/hero_walk.png, vẽ bằng tools/art/hero.px.js).
 * Các hình còn lại (quái, đạn, nền...) vẫn là hình tạm TỰ VẼ bằng code; khi có sprite thật chỉ cần
 * nạp ảnh với cùng key (xem config/assets.ts) trong preload().
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload(): void {
    // 4 khung đi bộ, mỗi khung 21x38 (đã gồm viền) — lấy từ ảnh concept (tools/art/hero.px.js)
    this.load.spritesheet(TEX.PLAYER, '/ui/hero_walk.png?v=0.9.2', { frameWidth: 21, frameHeight: 38 });
  }

  create(): void {
    // Pixel art: phóng to giữ nét (không làm mờ)
    this.textures.get(TEX.PLAYER).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.anims.create({ key: PLAYER_WALK_ANIM, frames: this.anims.generateFrameNumbers(TEX.PLAYER, { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    this.makeGroundTexture();
    this.makeShapeTextures();
    this.makeMiscTextures();
    this.makeWeaponTextures();
    // Báo cho GameFlow biết đã nạp xong → hiện menu chính (GameScene chỉ chạy khi vào màn)
    this.game.events.emit('boot-done');
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

  /** Hình vũ khí cầm tay (trắng, nhuộm màu theo phẩm chất khi dùng). Thay bằng sprite thật bằng cách nạp ảnh cùng key. */
  private makeWeaponTextures(): void {
    const mk = (id: string, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.lineStyle(3, 0xffffff, 1);
      draw(g);
      g.generateTexture(TEX.WEAPON + id, 48, 48);
      g.destroy();
    };
    // Mọi hình đều hướng sang phải (+x), tâm cầm ở giữa
    mk('wp_sword', (g) => { g.fillTriangle(46, 24, 14, 20, 14, 28); g.fillRect(10, 14, 4, 20); g.fillRect(2, 22, 9, 4); });
    mk('wp_blade', (g) => { g.fillTriangle(46, 14, 12, 18, 30, 30); g.fillTriangle(12, 18, 30, 30, 12, 28); g.fillRect(2, 22, 11, 4); });
    mk('wp_spear', (g) => { g.fillRect(2, 23, 36, 3); g.fillTriangle(47, 24, 36, 17, 36, 31); });
    mk('wp_fist', (g) => { g.fillCircle(26, 24, 12); g.fillRect(8, 20, 12, 8); });
    mk('wp_bow', (g) => { g.beginPath(); g.arc(14, 24, 22, -1.2, 1.2, false); g.strokePath(); g.lineStyle(1, 0xffffff, 1); g.lineBetween(14 + 22 * Math.cos(-1.2), 24 + 22 * Math.sin(-1.2), 14 + 22 * Math.cos(1.2), 24 + 22 * Math.sin(1.2)); });
    mk('wp_fan', (g) => { g.slice(6, 24, 40, -0.9, 0.9, false); g.fillPath(); });
  }
}
