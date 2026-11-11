// =====================================================================
// Các kiểu dữ liệu dùng chung cho toàn bộ cấu hình game.
// File này KHÔNG import Phaser để có thể dùng ở bất cứ đâu (config, save, UI).
// =====================================================================

/** 5 ô trang bị */
export type SlotId = 'weapon' | 'clothes' | 'shoes' | 'accessory' | 'bibao';
export const SLOT_IDS: SlotId[] = ['weapon', 'clothes', 'shoes', 'accessory', 'bibao'];
export const SLOT_NAMES: Record<SlotId, string> = {
  weapon: 'Vũ khí',
  clothes: 'Y phục',
  shoes: 'Giày',
  accessory: 'Trang sức',
  bibao: 'Bí bảo',
};

/** Nguyên liệu */
export type MatId = 'herb' | 'core' | 'ore' | 'essence';
export const MAT_IDS: MatId[] = ['herb', 'core', 'ore', 'essence'];
export const MAT_NAMES: Record<MatId, string> = {
  herb: 'Thảo dược',
  core: 'Yêu đan',
  ore: 'Khoáng thạch',
  essence: 'Tinh hoa',
};

/** 10 kiểu hành vi của quái (xem GDD mục 9) */
export type Behavior =
  | 'chaser'
  | 'swift'
  | 'tank'
  | 'ranged'
  | 'phantom'
  | 'exploder'
  | 'support'
  | 'summoner'
  | 'swarm'
  | 'elite';

/** Hệ số cộng thêm do kỹ năng bị động trong một lượt chơi */
export interface RunMods {
  damage: number; // nhân
  atkSpeed: number; // nhân
  area: number; // nhân
  moveSpeed: number; // nhân
  maxHp: number; // nhân
  pickup: number; // nhân
  xpGain: number; // nhân
  linhGain: number; // nhân
  armor: number; // cộng
  regen: number; // cộng (tỉ lệ máu tối đa hồi mỗi giây)
  crit: number; // cộng (0..1)
  critDmg: number; // cộng (sát thương bạo kích thêm, 0.1 = +10%)
  cdr: number; // cộng (giảm hồi chiêu 0..1)
  ctrlTime: number; // nhân (thời gian hiệu ứng: đốt, chậm, băng, choáng)
}

export function newRunMods(): RunMods {
  return {
    damage: 1,
    atkSpeed: 1,
    area: 1,
    moveSpeed: 1,
    maxHp: 1,
    pickup: 1,
    xpGain: 1,
    linhGain: 1,
    armor: 0,
    regen: 0,
    crit: 0,
    critDmg: 0,
    cdr: 0,
    ctrlTime: 1,
  };
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

/** Chỉ số cộng thêm từ trang bị / đan dược (tất cả đều là cộng dồn tỉ lệ, trừ ghi chú) */
export interface ItemStats {
  damage?: number; // +% sát thương
  atkSpeed?: number; // +% tốc độ đánh
  maxHp?: number; // +% máu
  armor?: number; // cộng thẳng
  moveSpeed?: number; // +% tốc chạy
  pickup?: number; // cộng thẳng (pixel)
  regen?: number; // cộng (tỉ lệ máu/giây)
  crit?: number; // cộng (0..1)
  xpGain?: number; // +% XP
  linhGain?: number; // +% linh thạch
  area?: number; // +% phạm vi
}
