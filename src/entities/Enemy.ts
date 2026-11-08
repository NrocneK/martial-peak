import Phaser from 'phaser';
import type { Behavior } from '../config/types';
import type { BossDef } from '../config/bosses';

/** Số "ô" thời gian chờ gây sát thương riêng cho từng kỹ năng (kiếm xoay / vùng hào quang) */
export const MAX_TICK_SLOTS = 8;

/**
 * Một con quái (hoặc boss). KHÔNG phải GameObject: chỉ là dữ liệu + một Image dùng chung (object pool).
 * EnemyManager tái sử dụng các đối tượng này thay vì tạo / hủy liên tục → mượt trên điện thoại.
 */
export class Enemy {
  active = false;
  x = 0;
  y = 0;
  /** Vận tốc đẩy lùi / bị dạt (cộng thêm vào chuyển động bình thường) */
  kx = 0;
  ky = 0;
  hp = 1;
  maxHp = 1;
  speed = 50;
  dmg = 1;
  r = 12;
  xp = 1;
  behavior: Behavior = 'chaser';
  defId = '';
  color = 0xffffff;
  isBoss = false;
  boss: BossDef | null = null;
  /** Hệ số làm chậm hiện tại (0 = không chậm) và thời gian còn lại */
  slow = 0;
  slowT = 0;
  /** Bộ đếm thời gian dùng chung cho hành vi (bắn, triệu hồi, nổ...) */
  cd = 0;
  /** Thời gian sống (giây) */
  life = 0;
  /** Đang "đếm ngược nổ" (quái tự bạo): <0 là chưa */
  fuse = -1;
  /** Hệ số sát thương/ tốc độ theo thời điểm sinh (dùng cho quái được triệu hồi) */
  hpMul = 1;
  dmgMul = 1;
  /** Hiệu ứng chớp trắng khi trúng đòn */
  flash = 0;
  /** Pha ngẫu nhiên cho chuyển động lắc lư (bóng ma) */
  phase = 0;
  readonly tick: number[] = new Array(MAX_TICK_SLOTS).fill(0);

  constructor(readonly img: Phaser.GameObjects.Image) {
    img.setVisible(false).setActive(false);
  }
}
