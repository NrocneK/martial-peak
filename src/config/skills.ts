// =====================================================================
// HỆ THỐNG KỸ NĂNG (thiết kế theo van-gioi-skill-icons.zip / skills.json).
//   • 6 kỹ năng VŨ KHÍ (theo loại vũ khí đang cầm) — đòn đánh tự động.
//   • 17 kỹ năng CẢNH GIỚI — mỗi đại cảnh giới mở 1 kỹ năng; trước màn chọn mang theo 3.
//   • 12 kỹ năng BỊ ĐỘNG — tăng chỉ số; mỗi bị động là điều kiện THỨC TỈNH của 1–2 kỹ năng.
// Thức tỉnh: kỹ năng cấp 5 + đang có bị động liên kết → lần chọn thẻ kế tiếp có thẻ thức tỉnh.
// Sát thương ghi theo % của LỰC ĐÁNH (ATK_BASE × hệ số sát thương nhân vật). Hành vi từng cấp: src/systems/skills/.
// File này chỉ chứa dữ liệu + chữ hiển thị; số liệu từng cấp dùng trong code nằm cạnh hành vi của kỹ năng.
// =====================================================================

import type { RunMods } from './types';

/** Lực đánh gốc: 100% sát thương = ATK_BASE × hệ số sát thương của nhân vật */
export const ATK_BASE = 20;

export interface SkillLevelText {
  /** Sát thương (chữ, ví dụ "140%") */
  damage: string;
  /** Hồi chiêu (chữ) */
  cooldown: string;
  /** Hiệu ứng mới mở ở cấp này */
  effect: string;
}

export interface SkillDef {
  id: string;
  name: string;
  /** 'weapon' = kỹ năng vũ khí, 'realm' = kỹ năng cảnh giới */
  source: 'weapon' | 'realm';
  /** Loại vũ khí (id vật phẩm) với kỹ năng vũ khí */
  weapon?: string;
  /** Cảnh giới mở (chữ) + bậc tier tối thiểu */
  unlock: string;
  unlockTier: number;
  /** Kiểu đòn (chữ) */
  type: string;
  desc: string;
  /** id bị động liên kết (điều kiện thức tỉnh) */
  passive: string;
  color: number;
  levels: SkillLevelText[];
  awaken: { name: string; damage: string; effect: string };
}

export interface PassiveDef {
  id: string;
  name: string;
  /** Chỉ số (chữ) */
  stat: string;
  /** Chữ giá trị từng cấp 1..5 */
  levels: string[];
  /** Chỉ số tác động + lượng cộng mỗi cấp (Tụ Linh Trận cộng thêm XP: xem RunState) */
  key: keyof RunMods;
  per: number;
  color: number;
  /** Kỹ năng mà bị động này mở thức tỉnh */
  awakens: string[];
}

export const PASSIVES: PassiveDef[] = [
  { id: 'p_kiem_tam', name: "Kiếm Tâm Thông Minh", stat: "Tỉ lệ bạo kích", levels: ["+4%", "+8%", "+12%", "+16%", "+20%"], key: 'crit', per: 0.04, color: 0x9fd8ff, awakens: ["ngu_kiem", "van_kiem"] },
  { id: 'p_sat_phat', name: "Sát Phạt Chi Ý", stat: "Sát thương", levels: ["+8%", "+16%", "+24%", "+32%", "+40%"], key: 'damage', per: 0.08, color: 0xff5a4a, awakens: ["ba_dao", "linh_vuc"] },
  { id: 'p_tieu_dao', name: "Tiêu Dao Du", stat: "Tốc độ di chuyển", levels: ["+6%", "+12%", "+18%", "+24%", "+30%"], key: 'moveSpeed', per: 0.06, color: 0x70e0ff, awakens: ["pha_thuong"] },
  { id: 'p_ba_the', name: "Bá Thể Quyết", stat: "HP tối đa", levels: ["+10%", "+20%", "+30%", "+40%", "+50%"], key: 'maxHp', per: 0.1, color: 0xff6a7a, awakens: ["bang_quyen", "ho_khieu"] },
  { id: 'p_tat_phong', name: "Tật Phong Quyết", stat: "Tốc độ đánh", levels: ["+6%", "+12%", "+18%", "+24%", "+30%"], key: 'atkSpeed', per: 0.06, color: 0x80f0d0, awakens: ["truy_tien", "thanh_phien"] },
  { id: 'p_tu_linh', name: "Tụ Linh Trận", stat: "Phạm vi nhặt / Kinh nghiệm nhận", levels: ["+20% / +3%", "+40% / +6%", "+60% / +9%", "+80% / +12%", "+100% / +15%"], key: 'pickup', per: 0.2, color: 0x60f0c0, awakens: ["linh_dan", "hu_khong"] },
  { id: 'p_ngu_hanh', name: "Ngũ Hành Chân Quyết", stat: "Thời gian hiệu ứng (đốt, chậm, băng, choáng)", levels: ["+10%", "+20%", "+30%", "+40%", "+50%"], key: 'ctrlTime', per: 0.1, color: 0xffa040, awakens: ["hoa_phu", "ngan_ha"] },
  { id: 'p_truong_sinh', name: "Trường Sinh Quyết", stat: "Hồi HP mỗi giây (theo HP tối đa)", levels: ["+0,2%", "+0,4%", "+0,6%", "+0,8%", "+1,0%"], key: 'regen', per: 0.002, color: 0xff9ad0, awakens: ["kim_dan", "lien_hoa"] },
  { id: 'p_than_hon', name: "Thần Hồn Ngưng Luyện", stat: "Sát thương bạo kích", levels: ["+10%", "+20%", "+30%", "+40%", "+50%"], key: 'critDmg', per: 0.1, color: 0x80c8ff, awakens: ["nguyen_anh", "than_thuc"] },
  { id: 'p_phap_thien', name: "Pháp Thiên Tượng Địa", stat: "Phạm vi kỹ năng", levels: ["+8%", "+16%", "+24%", "+32%", "+40%"], key: 'area', per: 0.08, color: 0x8aff70, awakens: ["phap_tuong", "de_an"] },
  { id: 'p_huyen_vu', name: "Huyền Vũ Giáp", stat: "Giáp", levels: ["+4", "+8", "+12", "+16", "+20"], key: 'armor', per: 4, color: 0x50d080, awakens: ["hoang_chung", "kim_than"] },
  { id: 'p_thien_dao', name: "Thiên Đạo Cảm Ngộ", stat: "Giảm hồi chiêu", levels: ["−5%", "−10%", "−15%", "−20%", "−25%"], key: 'cdr', per: 0.05, color: 0xffe080, awakens: ["than_loi", "dai_dao"] },
];

export const SKILLS: SkillDef[] = [
  {
    id: 'ngu_kiem', name: "Ngự Kiếm Thuật", source: 'weapon', weapon: 'wp_sword', unlockTier: 0, unlock: "Kiếm",
    type: "Phi kiếm truy đuổi, xuyên mục tiêu", desc: "Phóng phi kiếm vào kẻ địch gần nhất; kiếm xuyên qua mục tiêu rồi bay về tay.", passive: 'p_kiem_tam', color: 0x9fd8ff,
    levels: [
      { damage: "100%", cooldown: "1,2s", effect: "1 phi kiếm, xuyên 2 mục tiêu" },
      { damage: "120%", cooldown: "1,2s", effect: "2 phi kiếm" },
      { damage: "140%", cooldown: "1,1s", effect: "Xuyên 4 mục tiêu; lượt bay về gây 50% sát thương" },
      { damage: "165%", cooldown: "1,1s", effect: "3 phi kiếm" },
      { damage: "190%", cooldown: "1,0s", effect: "4 phi kiếm; lượt về gây 100%; trúng đích gắn Kiếm Thương (nhận +10% sát thương, 3s)" },
    ],
    awaken: { name: "Tâm Kiếm Hợp Nhất", damage: "260%", effect: "6 phi kiếm không bay về mà tự đuổi mục tiêu kế tiếp trong 4s. Đòn vào mục tiêu có Kiếm Thương luôn bạo kích; Kiếm Thương cộng dồn 3 tầng." },
  },
  {
    id: 'ba_dao', name: "Bá Đao Trảm", source: 'weapon', weapon: 'wp_blade', unlockTier: 0, unlock: "Đao",
    type: "Chém bán nguyệt cận chiến, đẩy lùi", desc: "Chém một đường bán nguyệt rộng trước mặt, sát thương lớn, đẩy lùi quái.", passive: 'p_sat_phat', color: 0xff9a50,
    levels: [
      { damage: "160%", cooldown: "1,6s", effect: "Cung chém 120°, tầm 90px, đẩy lùi nhẹ" },
      { damage: "190%", cooldown: "1,6s", effect: "Tầm 105px" },
      { damage: "220%", cooldown: "1,5s", effect: "Cung chém 160°; quái dưới 20% máu nhận gấp đôi sát thương" },
      { damage: "255%", cooldown: "1,5s", effect: "Tầm 120px" },
      { damage: "290%", cooldown: "1,4s", effect: "Chém 2 nhát (trước rồi sau); mỗi quái bị hạ +2% sát thương Bá Đao trong 5s (tối đa 10 tầng)" },
    ],
    awaken: { name: "Tu La Bá Đao", damage: "400%", effect: "Chém 360° quanh thân và phóng đao khí bay 300px xuyên mọi mục tiêu (60% sát thương). Hành quyết quái thường dưới 15% máu; cộng dồn tối đa 20 tầng." },
  },
  {
    id: 'pha_thuong', name: "Phá Trận Thương", source: 'weapon', weapon: 'wp_spear', unlockTier: 0, unlock: "Thương",
    type: "Đâm thẳng tầm dài, xuyên cả hàng", desc: "Đâm thẳng theo hướng di chuyển, xuyên mọi kẻ địch trên đường thương.", passive: 'p_tieu_dao', color: 0xffd870,
    levels: [
      { damage: "130%", cooldown: "1,4s", effect: "Dài 140px, rộng 24px" },
      { damage: "155%", cooldown: "1,4s", effect: "Dài 165px" },
      { damage: "180%", cooldown: "1,3s", effect: "Đâm 2 lần liên tiếp; 30% cuối mũi thương gây +50%" },
      { damage: "210%", cooldown: "1,3s", effect: "Dài 190px, rộng 32px" },
      { damage: "240%", cooldown: "1,2s", effect: "Đâm 3 lần; lần cuối hất tung, choáng 0,5s" },
    ],
    awaken: { name: "Du Long Phá Trận", damage: "340%", effect: "Nhân vật lướt theo mũi thương 120px, miễn sát thương khi lướt, để lại vệt long khí 2s gây 80%/giây. Mỗi 1% tốc chạy cộng thêm cho +1% sát thương thương." },
  },
  {
    id: 'bang_quyen', name: "Băng Sơn Quyền", source: 'weapon', weapon: 'wp_fist', unlockTier: 0, unlock: "Quyền sáo",
    type: "Liên hoàn cận thân, tốc độ cao", desc: "Đấm liên hoàn cực nhanh ở cự ly gần; đòn thứ 3 tạo chấn động vùng nhỏ.", passive: 'p_ba_the', color: 0xff7a6a,
    levels: [
      { damage: "60%", cooldown: "0,5s", effect: "Tầm 60px; đòn thứ 3 chấn động 150%" },
      { damage: "72%", cooldown: "0,5s", effect: "Tầm 70px" },
      { damage: "84%", cooldown: "0,45s", effect: "Chấn động gây choáng 0,4s; mỗi đòn trúng +1 Giáp trong 2s (tối đa 5)" },
      { damage: "98%", cooldown: "0,45s", effect: "Chấn động 200%" },
      { damage: "112%", cooldown: "0,4s", effect: "Chấn động ở mỗi đòn thứ 2; hút 1% máu từ sát thương chấn động" },
    ],
    awaken: { name: "Băng Sơn Liệt Địa", damage: "160%", effect: "Chấn động xé đất thành 3 vết nứt lan 200px. Mỗi đòn gây thêm sát thương bằng 2% HP tối đa; khi máu dưới 50%, tốc đánh quyền +30%." },
  },
  {
    id: 'truy_tien', name: "Truy Tinh Tiễn", source: 'weapon', weapon: 'wp_bow', unlockTier: 0, unlock: "Cung",
    type: "Bắn xa đơn mục tiêu", desc: "Bắn tên tầm xa vào kẻ địch gần nhất; càng xa càng đau.", passive: 'p_tat_phong', color: 0x9affb0,
    levels: [
      { damage: "110%", cooldown: "1,0s", effect: "1 mũi tên, tầm 420px" },
      { damage: "130%", cooldown: "1,0s", effect: "2 mũi tên bắn liên tiếp" },
      { damage: "150%", cooldown: "0,95s", effect: "Tên xuyên 1 mục tiêu; +30% lên mục tiêu xa hơn 250px" },
      { damage: "175%", cooldown: "0,95s", effect: "3 mũi tên" },
      { damage: "200%", cooldown: "0,9s", effect: "Tên nảy sang 2 mục tiêu kế; mỗi mũi thứ 5 là tinh tiễn nổ vùng 150%" },
    ],
    awaken: { name: "Lạc Tinh Thần Tiễn", damage: "280%", effect: "5 mũi tên tỏa hình quạt, mũi nào cũng là tinh tiễn nổ. Cứ 10 lần bắn gọi 1 sao băng 600% rơi vào cụm địch đông nhất." },
  },
  {
    id: 'thanh_phien', name: "Thanh Phong Phiến", source: 'weapon', weapon: 'wp_fan', unlockTier: 0, unlock: "Phiến",
    type: "Phong nhận hình nón, khống chế", desc: "Quạt ra chùm phong nhận hình nón, làm chậm kẻ địch trúng đòn.", passive: 'p_tat_phong', color: 0x80f0d0,
    levels: [
      { damage: "70%", cooldown: "1,1s", effect: "3 phong nhận, nón 60°; làm chậm 15% trong 1,5s" },
      { damage: "84%", cooldown: "1,1s", effect: "4 phong nhận" },
      { damage: "98%", cooldown: "1,0s", effect: "5 phong nhận, nón 90°; phong nhận bay vòng về, trúng lần 2" },
      { damage: "114%", cooldown: "1,0s", effect: "Làm chậm 25%" },
      { damage: "130%", cooldown: "0,95s", effect: "7 phong nhận; quái bị chậm nhận +15% sát thương từ mọi nguồn" },
    ],
    awaken: { name: "Cửu Thiên Cuồng Phong", damage: "190%", effect: "Quạt 360° ra 12 phong nhận. Mỗi 4 lần quạt sinh 1 lốc xoáy tồn tại 4s, tự đuổi địch, hút nhẹ và gây 120%/giây." },
  },
  {
    id: 'ho_khieu', name: "Hổ Khiếu Chấn", source: 'realm', unlockTier: 0, unlock: "Luyện Thể",
    type: "Sóng chấn quanh thân, đẩy lùi", desc: "Gầm một tiếng hổ khiếu, phát sóng chấn quanh thân đẩy lùi quái.", passive: 'p_ba_the', color: 0xffe0a0,
    levels: [
      { damage: "120%", cooldown: "6s", effect: "Bán kính 110px, đẩy lùi" },
      { damage: "145%", cooldown: "6s", effect: "Bán kính 125px" },
      { damage: "170%", cooldown: "5,5s", effect: "Gắn Chấn Nhiếp: quái gây −20% sát thương trong 3s" },
      { damage: "200%", cooldown: "5,5s", effect: "Bán kính 140px" },
      { damage: "230%", cooldown: "5s", effect: "Phát 2 đợt sóng; đợt 2 choáng 0,8s" },
    ],
    awaken: { name: "Bạch Hổ Phá Quân", damage: "350%", effect: "Hư ảnh Bạch Hổ vồ vào cụm địch đông nhất trước khi phát sóng. Sóng chấn gây thêm sát thương bằng 4% HP tối đa; Chấn Nhiếp lên −35%." },
  },
  {
    id: 'linh_dan', name: "Linh Khí Đạn", source: 'realm', unlockTier: 3, unlock: "Luyện Khí",
    type: "Đạn truy đuổi", desc: "Ngưng linh khí thành đạn tự tìm mục tiêu.", passive: 'p_tu_linh', color: 0x70c8ff,
    levels: [
      { damage: "80%", cooldown: "2,0s", effect: "2 đạn truy đuổi" },
      { damage: "96%", cooldown: "2,0s", effect: "3 đạn" },
      { damage: "112%", cooldown: "1,8s", effect: "Đạn nổ vùng nhỏ 60px" },
      { damage: "130%", cooldown: "1,8s", effect: "4 đạn" },
      { damage: "150%", cooldown: "1,6s", effect: "6 đạn; hạ quái bằng đạn có 20% rơi thêm 1 linh châu kinh nghiệm" },
    ],
    awaken: { name: "Vạn Linh Triều Nguyên", damage: "210%", effect: "9 đạn mỗi lượt. Mỗi viên kinh nghiệm nhặt được nạp 1 điểm linh khí (tối đa 30); lượt bắn kế tiêu hết, mỗi điểm thêm 1 đạn nhỏ 40%." },
  },
  {
    id: 'hoa_phu', name: "Liệt Hỏa Phù", source: 'realm', unlockTier: 6, unlock: "Trúc Cơ",
    type: "Ném nổ vùng, thiêu đốt", desc: "Ném hỏa phù vào cụm địch, nổ và thiêu đốt.", passive: 'p_ngu_hanh', color: 0xff6a2a,
    levels: [
      { damage: "140%", cooldown: "4,5s", effect: "1 bùa, nổ bán kính 70px; thiêu đốt 20%/giây trong 3s" },
      { damage: "165%", cooldown: "4,5s", effect: "2 bùa" },
      { damage: "190%", cooldown: "4,2s", effect: "Để lại biển lửa 3s gây 40%/giây" },
      { damage: "220%", cooldown: "4,2s", effect: "3 bùa, bán kính 85px" },
      { damage: "250%", cooldown: "3,8s", effect: "Quái chết khi đang cháy sẽ nổ lan 80% (bán kính 50px)" },
    ],
    awaken: { name: "Phần Thiên Hỏa Phù", damage: "360%", effect: "5 bùa rơi thành vòng quanh thân, biển lửa nối thành tường lửa 6s. Thiêu đốt cộng dồn 3 tầng và không tắt khi quái còn đứng trong lửa." },
  },
  {
    id: 'kim_dan', name: "Kim Đan Hộ Luân", source: 'realm', unlockTier: 9, unlock: "Kim Đan",
    type: "Vật thể xoay quanh thân", desc: "Kim đan hóa thành các viên đan xoay quanh thân, va vào quái gây sát thương.", passive: 'p_truong_sinh', color: 0xffd040,
    levels: [
      { damage: "50%/lần chạm", cooldown: "bật 5s, nghỉ 3s", effect: "2 viên đan, quỹ đạo 80px" },
      { damage: "60%/lần chạm", cooldown: "bật 5s, nghỉ 3s", effect: "3 viên đan" },
      { damage: "70%/lần chạm", cooldown: "bật 6s, nghỉ 2,5s", effect: "Đan chặn được đạn thường của địch" },
      { damage: "82%/lần chạm", cooldown: "bật 6s, nghỉ 2,5s", effect: "4 viên đan, quỹ đạo 95px" },
      { damage: "95%/lần chạm", cooldown: "luôn bật", effect: "5 viên đan; mỗi lần chạm hồi 0,2% HP tối đa (trần 2%/giây)" },
    ],
    awaken: { name: "Cửu Chuyển Kim Đan", damage: "140%/lần chạm", effect: "9 viên đan chia 2 vòng quay ngược chiều (80px và 140px). Mỗi 9 lần chạm, 1 viên phóng ra nổ 300%; lượng hồi máu từ đan gấp đôi." },
  },
  {
    id: 'nguyen_anh', name: "Nguyên Anh Xuất Khiếu", source: 'realm', unlockTier: 12, unlock: "Nguyên Anh",
    type: "Triệu hồi", desc: "Nguyên anh rời thân, tự bay quanh và bắn linh quang vào kẻ địch.", passive: 'p_than_hon', color: 0x70ffd8,
    levels: [
      { damage: "70%/phát", cooldown: "12s (tồn tại 6s)", effect: "1 nguyên anh, bắn 1 phát/giây" },
      { damage: "84%/phát", cooldown: "12s (tồn tại 7s)", effect: "Tồn tại lâu hơn" },
      { damage: "98%/phát", cooldown: "11s (tồn tại 7s)", effect: "Nguyên anh dùng lại kỹ năng vũ khí của bạn với 40% sát thương" },
      { damage: "115%/phát", cooldown: "11s (tồn tại 8s)", effect: "Bắn 1,5 phát/giây" },
      { damage: "130%/phát", cooldown: "10s (tồn tại 8s)", effect: "2 nguyên anh; kế thừa kỹ năng vũ khí 60%" },
    ],
    awaken: { name: "Thân Ngoại Hóa Thân", damage: "200%/phát", effect: "Nguyên anh tồn tại vĩnh viễn, kế thừa 100% kỹ năng vũ khí và tỉ lệ bạo kích. Khi bạn nhận đòn chí tử, nguyên anh hy sinh thay và hồi 30% máu (60s một lần)." },
  },
  {
    id: 'than_thuc', name: "Thần Thức Trảm", source: 'realm', unlockTier: 15, unlock: "Hóa Thần",
    type: "Đơn mục tiêu, bỏ qua giáp", desc: "Lưỡi thần thức vô hình chém kẻ địch nhiều máu nhất, bỏ qua giáp.", passive: 'p_than_hon', color: 0xc8a0ff,
    levels: [
      { damage: "300%", cooldown: "5s", effect: "1 mục tiêu máu cao nhất trong 400px" },
      { damage: "360%", cooldown: "5s", effect: "Choáng 0,5s (boss: chậm 30%)" },
      { damage: "420%", cooldown: "4,6s", effect: "Chém 2 mục tiêu; +50% lên tinh anh và boss" },
      { damage: "490%", cooldown: "4,6s", effect: "Tầm toàn màn hình" },
      { damage: "560%", cooldown: "4,2s", effect: "3 mục tiêu; gắn Thần Hồn Chấn Động (nhận +15% sát thương, 4s)" },
    ],
    awaken: { name: "Trảm Thần Diệt Hồn", damage: "800%", effect: "Luôn bạo kích, gây thêm 3% máu hiện tại (boss 0,5%). Mục tiêu chết phát nổ hồn 200% lan 120px; Chấn Động lên +25%." },
  },
  {
    id: 'hu_khong', name: "Hư Không Liệt Phùng", source: 'realm', unlockTier: 18, unlock: "Luyện Hư",
    type: "Hút gom quái, sát thương theo giây", desc: "Xé một khe nứt không gian hút quái vào tâm và nghiền chúng.", passive: 'p_tu_linh', color: 0xa060ff,
    levels: [
      { damage: "60%/giây", cooldown: "9s (tồn tại 3s)", effect: "Hút trong bán kính 130px" },
      { damage: "72%/giây", cooldown: "9s (tồn tại 3,5s)", effect: "Tồn tại lâu hơn" },
      { damage: "85%/giây", cooldown: "8,5s (tồn tại 3,5s)", effect: "Khi khép lại nổ 200%" },
      { damage: "100%/giây", cooldown: "8,5s (tồn tại 4s)", effect: "Bán kính 160px" },
      { damage: "115%/giây", cooldown: "8s (tồn tại 4s)", effect: "2 khe nứt; hút cả vật phẩm và kinh nghiệm trong vùng về phía bạn" },
    ],
    awaken: { name: "Thôn Thiên Hư Động", damage: "180%/giây", effect: "Một hố đen bán kính 240px thay cho khe nứt, tồn tại 6s, lực hút gấp đôi. Mỗi quái thường chết trong hố +2% sát thương vụ nổ cuối 500% (tối đa +200%)." },
  },
  {
    id: 'phap_tuong', name: "Pháp Tướng Thiên Địa", source: 'realm', unlockTier: 21, unlock: "Hợp Thể",
    type: "Đòn giáng vùng lớn, có trễ", desc: "Pháp tướng khổng lồ giáng một chưởng xuống cụm địch đông nhất.", passive: 'p_phap_thien', color: 0xffc860,
    levels: [
      { damage: "350%", cooldown: "8s", effect: "Bán kính 100px, rơi sau 0,6s" },
      { damage: "420%", cooldown: "8s", effect: "Bán kính 115px" },
      { damage: "490%", cooldown: "7,5s", effect: "Choáng 1s; để lại dấu chưởng 3s làm chậm 30%" },
      { damage: "570%", cooldown: "7,5s", effect: "Bán kính 130px" },
      { damage: "650%", cooldown: "7s", effect: "Giáng 2 chưởng (trái rồi phải); +30% lên quái đang choáng" },
    ],
    awaken: { name: "Thông Thiên Pháp Tướng", damage: "900%", effect: "Pháp tướng hiện sau lưng 8s: tự giáng chưởng mỗi 2s (bán kính 160px), giẫm chân mỗi 4s chấn toàn màn hình 150%. Trong lúc đó mọi kỹ năng +20% phạm vi." },
  },
  {
    id: 'van_kiem', name: "Vạn Kiếm Quy Tông", source: 'realm', unlockTier: 24, unlock: "Đại Thừa",
    type: "Mưa đạn vùng rộng", desc: "Vạn kiếm từ trời rơi xuống vùng quanh nhân vật.", passive: 'p_kiem_tam', color: 0xd8e8ff,
    levels: [
      { damage: "45%/kiếm", cooldown: "10s (kéo dài 3s)", effect: "12 kiếm rơi ngẫu nhiên trong bán kính 180px" },
      { damage: "54%/kiếm", cooldown: "10s", effect: "16 kiếm" },
      { damage: "63%/kiếm", cooldown: "9,5s", effect: "Kiếm cắm đất 2s; quái chạm vào chảy máu 15%/giây" },
      { damage: "74%/kiếm", cooldown: "9,5s", effect: "22 kiếm, bán kính 210px" },
      { damage: "85%/kiếm", cooldown: "9s", effect: "30 kiếm; kết bằng 1 cự kiếm 400% vào mục tiêu mạnh nhất" },
    ],
    awaken: { name: "Tru Tiên Kiếm Trận", damage: "130%/kiếm", effect: "4 cự kiếm cắm 4 hướng dựng trận 6s (bán kính 260px), trong trận rơi 10 kiếm/giây. Bạo kích trong trận nổ kiếm khí 60%; quái không thể rời trận." },
  },
  {
    id: 'than_loi', name: "Cửu Tiêu Thần Lôi", source: 'realm', unlockTier: 27, unlock: "Độ Kiếp",
    type: "Sét lan chuỗi", desc: "Dẫn kiếp lôi đánh ngẫu nhiên, sét lan sang các quái lân cận.", passive: 'p_thien_dao', color: 0xb090ff,
    levels: [
      { damage: "180%", cooldown: "5s", effect: "2 tia sét; mỗi tia lan 2 mục tiêu, mỗi lần lan −20%" },
      { damage: "215%", cooldown: "5s", effect: "3 tia sét" },
      { damage: "250%", cooldown: "4,6s", effect: "Lan 4 mục tiêu; tê liệt 0,5s" },
      { damage: "290%", cooldown: "4,6s", effect: "4 tia sét" },
      { damage: "330%", cooldown: "4,2s", effect: "6 tia sét; lan không giảm sát thương; 15% đánh thêm 1 tia" },
    ],
    awaken: { name: "Tử Tiêu Diệt Thế Lôi", damage: "480%", effect: "9 tia tử lôi. Mỗi 3 lần thi triển giáng 1 kiếp lôi 1500% vào mục tiêu máu cao nhất; mỗi 1% giảm hồi chiêu cho +1% sát thương sét." },
  },
  {
    id: 'lien_hoa', name: "Tiên Nguyên Liên Hoa", source: 'realm', unlockTier: 30, unlock: "Chân Tiên",
    type: "Vùng hồi máu kiêm sát thương", desc: "Một đóa tiên liên nở dưới chân: hồi máu cho bạn, thiêu luyện quái trong vùng.", passive: 'p_truong_sinh', color: 0xff9ad0,
    levels: [
      { damage: "50%/giây", cooldown: "14s (tồn tại 5s)", effect: "Bán kính 120px; đứng trong sen hồi 1% HP/giây" },
      { damage: "60%/giây", cooldown: "14s", effect: "Hồi 1,3% HP/giây" },
      { damage: "70%/giây", cooldown: "13s", effect: "Xóa hiệu ứng xấu; quái trong sen bị chậm 20%" },
      { damage: "82%/giây", cooldown: "13s (tồn tại 6s)", effect: "Bán kính 145px" },
      { damage: "95%/giây", cooldown: "12s (tồn tại 6s)", effect: "Hồi 2% HP/giây; máu hồi dư thành khiên (tối đa 20% HP)" },
    ],
    awaken: { name: "Cửu Phẩm Tịnh Thế Liên", damage: "150%/giây", effect: "Sen đi theo nhân vật, tồn tại 8s; khi tàn bắn 9 cánh sen 250%. Khiên tối đa 40% HP; 30% lượng máu hồi chuyển thành sát thương cộng thêm." },
  },
  {
    id: 'ngan_ha', name: "Ngân Hà Hàn Lưu", source: 'realm', unlockTier: 33, unlock: "Thiên Tiên",
    type: "Luồng quét xoay, đóng băng", desc: "Dẫn một luồng hàn lưu ngân hà quét tròn quanh thân.", passive: 'p_ngu_hanh', color: 0x9fe8ff,
    levels: [
      { damage: "90%/lần quét", cooldown: "7s (1 vòng 2s)", effect: "1 luồng dài 200px; làm chậm 30% trong 2s" },
      { damage: "108%/lần quét", cooldown: "7s", effect: "Dài 230px" },
      { damage: "126%/lần quét", cooldown: "6,5s", effect: "2 luồng đối xứng; trúng 3 lần thì đóng băng 1,5s" },
      { damage: "147%/lần quét", cooldown: "6,5s (2 vòng)", effect: "Quay 2 vòng mỗi lần thi triển" },
      { damage: "168%/lần quét", cooldown: "6s (2 vòng)", effect: "3 luồng; quái đóng băng bị vỡ gây 150% lan" },
    ],
    awaken: { name: "Thiên Hà Băng Phong", damage: "250%/lần quét", effect: "4 luồng dài 300px quay liên tục không nghỉ. Đóng băng sau 2 lần trúng, kéo dài 2,5s; quái thường dưới 25% máu đang đóng băng vỡ tan ngay." },
  },
  {
    id: 'hoang_chung', name: "Huyền Hoàng Chung", source: 'realm', unlockTier: 36, unlock: "Huyền Tiên",
    type: "Khiên hộ thể, phản công", desc: "Chuông Huyền Hoàng úp lên thân làm khiên; khi vỡ hoặc hết giờ phát sóng âm.", passive: 'p_huyen_vu', color: 0xf0c040,
    levels: [
      { damage: "250% (sóng âm)", cooldown: "16s (tồn tại 5s)", effect: "Khiên hấp thụ 15% HP tối đa" },
      { damage: "300%", cooldown: "16s", effect: "Khiên 20% HP" },
      { damage: "350%", cooldown: "15s", effect: "Phản 30% sát thương cận chiến; sóng âm đẩy lùi mạnh" },
      { damage: "410%", cooldown: "15s (tồn tại 6s)", effect: "Khiên 25% HP" },
      { damage: "470%", cooldown: "14s (tồn tại 6s)", effect: "Khiên 30% HP; sóng âm xóa đạn địch và choáng 1,2s" },
    ],
    awaken: { name: "Hỗn Độn Thần Chung", damage: "700%", effect: "Khiên 50% HP cộng thêm 10 lần Giáp. Chuông ngân 3 hồi, mỗi 2s một sóng âm 250%; phản 60%; khi vỡ hoàn lại 50% hồi chiêu." },
  },
  {
    id: 'kim_than', name: "Bất Diệt Kim Thân", source: 'realm', unlockTier: 39, unlock: "Kim Tiên",
    type: "Biến thân cường hóa", desc: "Hóa kim thân: tăng sát thương, giảm sát thương nhận, kim quang đốt quái quanh thân.", passive: 'p_huyen_vu', color: 0xffd860,
    levels: [
      { damage: "40%/giây", cooldown: "20s (tồn tại 6s)", effect: "Kim quang 90px; +15% sát thương, −20% sát thương nhận" },
      { damage: "48%/giây", cooldown: "20s", effect: "+20% sát thương, −25% sát thương nhận" },
      { damage: "56%/giây", cooldown: "19s", effect: "Miễn khống chế; miễn sát thương 1s đầu" },
      { damage: "66%/giây", cooldown: "19s (tồn tại 7s)", effect: "+25% sát thương, −30% sát thương nhận" },
      { damage: "76%/giây", cooldown: "18s (tồn tại 7s)", effect: "+30% / −35%; miễn sát thương 2s đầu; kim quang 120px" },
    ],
    awaken: { name: "Vạn Kiếp Bất Diệt Thân", damage: "150%/giây", effect: "Tồn tại 10s, +50% sát thương, −50% sát thương nhận. Kim quang gây thêm 5 lần Giáp mỗi giây; một lần mỗi trận, chết khi có kim thân sẽ hồi sinh 50% máu." },
  },
  {
    id: 'linh_vuc', name: "Tiên Vương Lĩnh Vực", source: 'realm', unlockTier: 42, unlock: "Đại La Kim Tiên",
    type: "Hào quang suy yếu", desc: "Mở lĩnh vực quanh thân: quái bước vào bị chậm, yếu đi và bị bào mòn.", passive: 'p_sat_phat', color: 0xff4a5a,
    levels: [
      { damage: "35%/giây", cooldown: "luôn bật", effect: "Bán kính 150px; quái chậm 15%, nhận +10% sát thương" },
      { damage: "42%/giây", cooldown: "luôn bật", effect: "Bán kính 165px" },
      { damage: "50%/giây", cooldown: "luôn bật", effect: "Nhận +18% sát thương; quái trong vùng gây −15% sát thương" },
      { damage: "58%/giây", cooldown: "luôn bật", effect: "Bán kính 185px; chậm 25%" },
      { damage: "68%/giây", cooldown: "luôn bật", effect: "Nhận +25%; mỗi quái hạ trong vùng +1% sát thương (tối đa 30%, tan sau 5s không hạ quái)" },
    ],
    awaken: { name: "Sát Lục Đế Vực", damage: "120%/giây", effect: "Bán kính 240px, quái nhận +40% sát thương. Cộng dồn tới 60% và không tan; mỗi 10 quái hạ trong vực phóng 1 huyết kiếm 500% vào tinh anh hoặc boss gần nhất." },
  },
  {
    id: 'de_an', name: "Đế Ấn Trấn Thiên", source: 'realm', unlockTier: 45, unlock: "Tiên Đế",
    type: "Đòn giáng cực mạnh, hành quyết", desc: "Đế ấn khổng lồ từ trời giáng xuống trấn áp một vùng.", passive: 'p_phap_thien', color: 0xffd040,
    levels: [
      { damage: "900%", cooldown: "18s", effect: "Bán kính 170px, rơi sau 1s; hành quyết quái thường dưới 20% máu" },
      { damage: "1080%", cooldown: "18s", effect: "Bán kính 185px" },
      { damage: "1260%", cooldown: "17s", effect: "Choáng 1,5s; hành quyết 25%; boss nhận +30%" },
      { damage: "1470%", cooldown: "17s", effect: "Bán kính 205px" },
      { damage: "1700%", cooldown: "16s", effect: "2 ấn (ấn sau 60%); vùng trấn áp 4s: quái chậm 50%, không hồi máu" },
    ],
    awaken: { name: "Cửu Long Đế Tỉ", damage: "2600%", effect: "Ấn che 60% màn hình; 9 kim long bay ra đuổi 9 mục tiêu, mỗi long 400%. Hành quyết quái thường dưới 35% và tinh anh dưới 10%; trấn áp 8s." },
  },
  {
    id: 'dai_dao', name: "Đại Đạo Quy Nhất", source: 'realm', unlockTier: 48, unlock: "Đạo Tổ",
    type: "Tuyệt kỹ toàn màn hình", desc: "Ngưng đọng thời gian rồi quy mọi đạo về một điểm, nổ toàn màn hình.", passive: 'p_thien_dao', color: 0xe8e0ff,
    levels: [
      { damage: "1500%", cooldown: "45s", effect: "Ngưng đọng thời gian 2s rồi nổ toàn màn hình" },
      { damage: "1800%", cooldown: "45s", effect: "Ngưng đọng 2,5s" },
      { damage: "2100%", cooldown: "42s", effect: "Sát thương bạn gây trong lúc ngưng đọng được tích lại, nổ thêm 50% khi kết thúc" },
      { damage: "2450%", cooldown: "42s", effect: "Ngưng đọng 3s" },
      { damage: "2800%", cooldown: "40s", effect: "Tích 100%; sau vụ nổ mọi kỹ năng khác hồi chiêu ngay" },
    ],
    awaken: { name: "Hỗn Nguyên Đại Đạo Lô", damage: "4500%", effect: "Mở Đại Đạo Lô luyện hóa toàn màn hình 5s: quái thường hóa thành linh thạch và kinh nghiệm, boss mất 8% máu tối đa. Sau đó 10s mọi kỹ năng −50% hồi chiêu." },
  },
];

export const WEAPON_SKILLS = SKILLS.filter((s) => s.source === 'weapon');
export const REALM_SKILLS = SKILLS.filter((s) => s.source === 'realm');

/** Id vật phẩm của 6 loại vũ khí (giữ nguyên id cũ để không hỏng trang bị đã có) */
export const WEAPON_IDS = ['wp_sword', 'wp_blade', 'wp_spear', 'wp_fist', 'wp_bow', 'wp_fan'];

/** Kỹ năng vũ khí theo loại vũ khí đang cầm */
export function weaponSkillOf(weaponId: string): SkillDef {
  return WEAPON_SKILLS.find((s) => s.weapon === weaponId) ?? WEAPON_SKILLS[0];
}

export function skillById(id: string): SkillDef {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) throw new Error('Không có kỹ năng ' + id);
  return s;
}

export function passiveById(id: string): PassiveDef {
  const p = PASSIVES.find((x) => x.id === id);
  if (!p) throw new Error('Không có bị động ' + id);
  return p;
}

/** Icon kỹ năng (128px, vẽ trong tools/art/skill_icons.px.js); awakened = icon bản thức tỉnh */
export const SKILL_ICON_V = 3;
export function skillIcon(id: string, awakened = false): string {
  return `/skills/${id}${awakened && !id.startsWith('p_') ? '_aw' : ''}.png?v=${SKILL_ICON_V}`;
}
