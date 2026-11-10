import Phaser from 'phaser';
import { BATTLE_SPLIT, BATTLE_WEAPON, battleWeaponKey, fistKey } from '../config/heroBattle';
import { PLAYER_DIRS, PLAYER_FRAME, PLAYER_SHEET_COLS, PLAYER_WALK_FRAMES, SCENES, TEX, playerWalkAnim } from '../config/assets';

/**
 * BootScene: chạy đầu tiên, chuẩn bị tài nguyên rồi báo cho GameFlow hiện menu.
 *
 * Nhân vật chính dùng sprite pixel art 8 hướng (public/ui/hero_b_walk.png, dựng bằng tools/art/trace_battle.py + walk_battle.py).
 * Các hình còn lại (quái, đạn, nền...) vẫn là hình tạm TỰ VẼ bằng code; khi có sprite thật chỉ cần
 * nạp ảnh với cùng key (xem config/assets.ts) trong preload().
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload(): void {
    // 4 khung đi bộ, mỗi khung 21x38 (đã gồm viền) — lấy từ ảnh concept (tools/art/hero.px.js)
    this.load.spritesheet(TEX.PLAYER, '/ui/hero_b_walk.png?v=0.12.7', { frameWidth: PLAYER_FRAME.w, frameHeight: PLAYER_FRAME.h });
    for (const k of [TEX.VFX_QI, TEX.VFX_ARROW, TEX.VFX_FAN]) this.load.image(k, `/vfx/${k}.png?v=0.13.0`);
    this.load.spritesheet(TEX.PLAYER_ATK, '/ui/hero_b_atk.png?v=0.13.2', { frameWidth: PLAYER_FRAME.w, frameHeight: PLAYER_FRAME.h });
    this.load.spritesheet(TEX.PLAYER_FAN, '/ui/hero_bf_walk.png?v=0.12.7', { frameWidth: PLAYER_FRAME.w, frameHeight: PLAYER_FRAME.h });
    // vũ khí cầm tay trong trận (dải 8 khung theo hướng) + găng quyền sáo, đủ 6 cấp
    for (let t = 0; t < 6; t++) {
      for (const [id, size] of Object.entries(BATTLE_WEAPON)) {
        const fs = { frameWidth: size, frameHeight: size };
        if (BATTLE_SPLIT.has(id)) {
          this.load.spritesheet(battleWeaponKey(id, t) + '_f', `/gear/${id}_bf_${t}.png?v=0.12.7`, fs);
          this.load.spritesheet(battleWeaponKey(id, t) + '_k', `/gear/${id}_bk_${t}.png?v=0.12.7`, fs);
        } else this.load.spritesheet(battleWeaponKey(id, t), `/gear/${id}_b_${t}.png?v=0.12.7`, fs);
        if (id === 'wp_bow') this.load.spritesheet(battleWeaponKey(id, t) + '_aim', `/gear/wp_bow_ba_${t}.png?v=0.13.2`, fs);
      }
      for (const hand of ['near', 'far'] as const) this.load.image(fistKey(hand, t), `/gear/wp_fist_${hand}_${t}.png?v=0.12.7`);
    }
  }

  create(): void {
    // Pixel art: phóng to giữ nét (không làm mờ)
    this.textures.get(TEX.PLAYER).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(TEX.PLAYER_FAN).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(TEX.PLAYER_ATK).setFilter(Phaser.Textures.FilterMode.NEAREST);
    PLAYER_DIRS.forEach((d, r) => {
      const start = r * PLAYER_SHEET_COLS;
      for (const fan of [false, true]) {
        this.anims.create({ key: playerWalkAnim(d, fan), frames: this.anims.generateFrameNumbers(fan ? TEX.PLAYER_FAN : TEX.PLAYER, { start, end: start + PLAYER_WALK_FRAMES - 1 }), frameRate: 10, repeat: -1 });
      }
    });
    this.makeGroundTexture();
    this.makeShapeTextures();
    this.makeMiscTextures();
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


}
