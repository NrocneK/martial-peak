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

  // ---- trạng thái do kỹ năng người chơi gây ra (xem EnemyManager.strike / updateStatus)
  /** Thiêu đốt: thời gian còn lại, sát thương mỗi giây, số tầng (Phần Thiên Hỏa Phù cộng dồn 3) */
  burnT = 0;
  burnDps = 0;
  burnStacks = 0;
  /** Chảy máu (kiếm cắm đất) */
  bleedT = 0;
  bleedDps = 0;
  /** Bộ đếm nhịp gây sát thương theo thời gian (0.5 giây / lần) */
  dotTick = 0;
  /** Kiếm Thương: số tầng (mỗi tầng nhận +10% sát thương) */
  markKiem = 0;
  markKiemT = 0;
  /** Thần Hồn Chấn Động / dấu ấn khác: nhận thêm sát thương */
  shockAmt = 0;
  shockT = 0;
  /** Chấn Nhiếp: quái gây ít sát thương hơn */
  weakAmt = 0;
  weakT = 0;
  /** Trong Lĩnh Vực: nhận thêm sát thương / gây ít sát thương / bị chậm (làm mới mỗi khung khi còn đứng trong vực) */
  domainT = 0;
  domainVuln = 0;
  domainWeak = 0;
  /** Bị trấn áp (Đế Ấn): không được hồi máu */
  suppressT = 0;
  /** Số lần trúng luồng hàn lưu gần đây (đủ số thì đóng băng) */
  chillHits = 0;
  chillT = 0;
  /** Đang đóng băng (giây) — dùng chung slow = 1 */
  frozenT = 0;
  /** Kỹ năng gây đòn cuối gần nhất (để biết quái chết vì kỹ năng nào) */
  lastSrc = '';

  constructor(readonly img: Phaser.GameObjects.Image) {
    img.setVisible(false).setActive(false);
  }
}
