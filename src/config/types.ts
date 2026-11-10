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

/** Các "kiểu" kỹ năng mà SkillSystem biết thi triển. Thêm kỹ năng mới = chọn 1 kiểu + điền số liệu. */
export type SkillKind =
  | 'projectile' // bắn đạn về phía quái
  | 'slash' // chém hình quạt phía trước
  | 'beam' // tia thẳng xuyên qua mọi quái
  | 'nova' // sóng nổ quanh người
  | 'orbit' // kiếm xoay quanh người (luôn bật)
  | 'aura' // vùng sát thương quanh người (luôn bật)
  | 'strike' // giáng xuống vị trí quái ngẫu nhiên (có báo trước)
  | 'boomerang' // bay ra rồi quay về
  | 'heal' // hồi máu
  | 'chain' // tia sét nảy từ quái này sang quái khác (count = số lần nảy, area = tầm nảy)
  | 'rain' // kiếm / vật từ trời giáng tức thì xuống nhiều quái (count = số điểm, area = bán kính nổ)
  | 'tornado'; // lốc xoáy trôi chậm về phía quái, xuyên + đánh lặp lại (area = quãng đường trôi)

export interface SkillNumbers {
  /** Sát thương gốc (kỹ năng 'heal': tỉ lệ máu hồi, ví dụ 0.1 = 10%) */
  damage: number;
  /** Thời gian hồi chiêu (giây). Với orbit/aura: khoảng cách giữa 2 lần gây sát thương */
  cooldown: number;
  /** Số lượng (đạn, tia, lưỡi kiếm, điểm giáng...) ở cấp 1 */
  count: number;
  /** Phạm vi: bán kính / chiều dài (pixel) */
  area: number;
  /** Tốc độ bay (pixel/giây) */
  speed: number;
  /** Số quái xuyên được thêm sau quái đầu tiên (0 = trúng 1 quái là mất) */
  pierce: number;
  /** Góc quạt (độ) cho 'slash' */
  arc?: number;
  /** Bề rộng cho 'beam' / bán kính viên đạn cho 'projectile' */
  width?: number;
}

export interface AwakenDef {
  name: string;
  desc: string;
  damageMul: number;
  countAdd: number;
  areaMul: number;
  cooldownMul: number;
  /** Xuyên thêm bao nhiêu quái */
  pierceAdd?: number;
  /** Nhân thời gian khống chế (làm chậm / đóng băng / choáng) */
  ctrlMul?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  group: 'weapon' | 'active';
  kind: SkillKind;
  /** Kỹ năng bị động liên kết (dùng cho tỉ lệ xuất hiện thẻ + điều kiện thức tỉnh) */
  linkedPassive: string;
  /** Chỉ số cảnh giới (tier) tối thiểu để mở khóa (kỹ năng chủ động) */
  unlockTier: number;
  color: number;
  base: SkillNumbers;
  /** Số lượng ở từng cấp 1..5. Nếu không có thì dùng base.count */
  countByLevel?: number[];
  homing?: boolean;
  /** Làm chậm quái (0..1, ví dụ 0.4 = chậm 40%; 1 = đóng băng / choáng đứng yên) */
  slow?: number;
  /** Thời gian làm chậm (giây, mặc định 2) */
  slowTime?: number;
  /** Sát thương tăng mỗi cấp (mặc định 0.28 = +28%/cấp) */
  growth?: number;
  /** Lực đẩy lùi quái khi trúng (mặc định theo kiểu kỹ năng) */
  knock?: number;
  /** Để lại vùng cháy sau khi nổ: mỗi 0.5 giây gây `pct` × sát thương, kéo dài `time` giây */
  burn?: { pct: number; time: number };
  /** Lốc xoáy / đạn xuyên: khoảng giây giữa hai lần đánh trúng cùng một quái */
  rehit?: number;
  awaken?: AwakenDef;
}

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
  };
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  /** Chỉ số bị tác động */
  stat: keyof RunMods;
  /** Giá trị cộng thêm mỗi cấp */
  per: number;
  /** Cách hiển thị giá trị: phần trăm hay số thường */
  unit: 'pct' | 'flat';
  color: number;
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
