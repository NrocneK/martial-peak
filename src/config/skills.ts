// =====================================================================
// HỆ THỐNG KỸ NĂNG (thiết kế theo van-gioi-skill-icons.zip / skills.json).
//   • 6 kỹ năng VŨ KHÍ (theo loại vũ khí đang cầm) — đòn đánh tự động.
//   • 14 kỹ năng CẢNH GIỚI — mỗi đại cảnh giới mở 1 kỹ năng; trước màn chọn mang theo 3.
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
  { id: 'p_truong_sinh', name: "Trường Sinh Quyết", stat: "Hồi HP mỗi giây (theo HP tối đa)", levels: ["+0,2%", "+0,4%", "+0,6%", "+0,8%", "+1,0%"], key: 'regen', per: 0.002, color: 0xff9ad0, awakens: ["lien_hoa"] },
  { id: 'p_than_hon', name: "Thần Hồn Ngưng Luyện", stat: "Sát thương bạo kích", levels: ["+10%", "+20%", "+30%", "+40%", "+50%"], key: 'critDmg', per: 0.1, color: 0x80c8ff, awakens: ["khi_long", "than_thuc"] },
  { id: 'p_phap_thien', name: "Pháp Thiên Tượng Địa", stat: "Phạm vi kỹ năng", levels: ["+8%", "+16%", "+24%", "+32%", "+40%"], key: 'area', per: 0.08, color: 0x8aff70, awakens: ["phap_tuong"] },
  { id: 'p_huyen_vu', name: "Huyền Vũ Giáp", stat: "Giáp", levels: ["+4", "+8", "+12", "+16", "+20"], key: 'armor', per: 4, color: 0x50d080, awakens: ["hoang_chung"] },
  { id: 'p_thien_dao', name: "Thiên Đạo Cảm Ngộ", stat: "Giảm hồi chiêu", levels: ["−5%", "−10%", "−15%", "−20%", "−25%"], key: 'cdr', per: 0.05, color: 0xffe080, awakens: ["than_loi", "dai_dao"] },
];

export const SKILLS: SkillDef[] = [
  {
    id: 'ngu_kiem', name: "Ngự Kiếm Thuật", source: 'weapon', weapon: 'wp_sword', unlockTier: 0, unlock: "Kiếm",
    type: "Phi kiếm khí truy đuổi", desc: "Ngưng kiếm khí cạnh tay rồi phóng vào 3 kẻ địch gần nhất; kiếm xuyên qua mục tiêu rồi vòng về tay.", passive: 'p_kiem_tam', color: 0x9fd8ff,
    levels: [
      { damage: "100%", cooldown: "1,2s", effect: "3 kiếm khí lao vào 3 mục tiêu gần nhất" },
      { damage: "120%", cooldown: "1,2s", effect: "Tăng sát thương" },
      { damage: "140%", cooldown: "1,1s", effect: "Giảm hồi chiêu" },
      { damage: "165%", cooldown: "1,1s", effect: "Tăng sát thương" },
      { damage: "190%", cooldown: "1,0s", effect: "Trúng đích gắn Kiếm Thương (nhận +10% sát thương, 3s)" },
    ],
    awaken: { name: "Tâm Kiếm Hợp Nhất", damage: "260%", effect: "6 kiếm khí xòe nan quạt sau lưng, lần lượt lao đi, mỗi kiếm đuổi tiếp mục tiêu thứ 2. Đòn vào mục tiêu có Kiếm Thương luôn bạo kích; Kiếm Thương cộng dồn 3 tầng." },
  },
  {
    id: 'ba_dao', name: "Bá Đao Trảm", source: 'weapon', weapon: 'wp_blade', unlockTier: 0, unlock: "Đao",
    type: "Xoay đao liên tục quanh thân", desc: "Vung đao khí xoay tròn liên tục quanh thân, vừa xoay vừa di chuyển; vết đao quét thành vòng tròn chém mọi quái xung quanh.", passive: 'p_sat_phat', color: 0xb070ff,
    levels: [
      { damage: "55%/vòng xoay", cooldown: "5s (xoay 2,4s)", effect: "Bán kính 80px; quái gần nhất nhận thêm 50%; trúng 6 lần bị phá giáp (nhận +20% sát thương, 4s)" },
      { damage: "65%/vòng xoay", cooldown: "5s (xoay 2,6s)", effect: "Bán kính 84px, xoay lâu hơn" },
      { damage: "75%/vòng xoay", cooldown: "4,8s (xoay 2,8s)", effect: "Bán kính 88px" },
      { damage: "85%/vòng xoay", cooldown: "4,8s (xoay 3s)", effect: "Bán kính 94px" },
      { damage: "95%/vòng xoay", cooldown: "4,5s (xoay 3s)", effect: "Bán kính 100px" },
    ],
    awaken: { name: "Tu La Bá Đao", damage: "130%/vòng xoay", effect: "Xoay 3,6s, bán kính 110px (phạm vi kỹ năng chỉ tăng thêm 30% hiệu lực, tối đa 140px); cứ 3 vòng xoay văng 1 đao khí đồng tâm bay xuyên về phía quái gần nhất (195%). Hành quyết quái thường dưới 15% máu; phá giáp +30%." },
  },
  {
    id: 'pha_thuong', name: "Phá Trận Thương", source: 'weapon', weapon: 'wp_spear', unlockTier: 0, unlock: "Thương",
    type: "Đâm thẳng tầm dài, xuyên cả hàng", desc: "Tụ lực rồi đâm mũi thương năng lượng về kẻ địch gần nhất, xuyên mọi kẻ địch trên đường thương.", passive: 'p_tieu_dao', color: 0x3cf0c8,
    levels: [
      { damage: "130%", cooldown: "1,4s", effect: "Mũi thương năng lượng dài 190px" },
      { damage: "155%", cooldown: "1,4s", effect: "Tăng sát thương" },
      { damage: "180%", cooldown: "1,3s", effect: "Giảm hồi chiêu" },
      { damage: "210%", cooldown: "1,3s", effect: "Tăng sát thương" },
      { damage: "240%", cooldown: "1,2s", effect: "Mũi thương hất tung, choáng 0,4s" },
    ],
    awaken: { name: "Du Long Phá Trận", damage: "340%", effect: "Mũi thương dài 260px, đầu mũi cuộn xoáy long khí gây thêm 50% sát thương cho quái quanh mũi thương." },
  },
  {
    id: 'bang_quyen', name: "Băng Sơn Quyền", source: 'weapon', weapon: 'wp_fist', unlockTier: 0, unlock: "Quyền sáo",
    type: "Đấm cận thân, chấn động", desc: "Tung quyền khí vào kẻ địch gần nhất rồi dậm đất tạo chấn động quanh thân.", passive: 'p_ba_the', color: 0xff7a6a,
    levels: [
      { damage: "60%", cooldown: "0,75s", effect: "Quyền khí + chấn động bán kính 110px" },
      { damage: "72%", cooldown: "0,75s", effect: "Tăng sát thương" },
      { damage: "84%", cooldown: "0,7s", effect: "Chấn động gây choáng 0,3s; mỗi quái trúng +1 Giáp trong 2s (tối đa 5)" },
      { damage: "98%", cooldown: "0,7s", effect: "Tăng sát thương" },
      { damage: "112%", cooldown: "0,65s", effect: "Hút 1% máu từ sát thương quyền" },
    ],
    awaken: { name: "Băng Sơn Liệt Địa", damage: "160%", effect: "Thêm địa chấn xé đất lan 200px (150%). Mỗi đòn gây thêm sát thương bằng 2% HP tối đa; khi máu dưới 50%, tốc đánh quyền +30%." },
  },
  {
    id: 'truy_tien', name: "Truy Tinh Tiễn", source: 'weapon', weapon: 'wp_bow', unlockTier: 0, unlock: "Cung",
    type: "Bắn xa, tên nổ", desc: "Bắn tên tầm xa vào kẻ địch; mũi tên nổ khi trúng đích, càng xa càng đau.", passive: 'p_tat_phong', color: 0x9affb0,
    levels: [
      { damage: "110%", cooldown: "1,0s", effect: "Tầm 420px; tên nổ vùng 70px" },
      { damage: "130%", cooldown: "1,0s", effect: "Tăng sát thương" },
      { damage: "150%", cooldown: "0,95s", effect: "+30% lên mục tiêu xa hơn 250px" },
      { damage: "175%", cooldown: "0,95s", effect: "Tăng sát thương" },
      { damage: "200%", cooldown: "0,9s", effect: "Giảm hồi chiêu" },
    ],
    awaken: { name: "Lạc Tinh Thần Tiễn", damage: "280%", effect: "Mưa tên tỏa ra nhiều mục tiêu, kết thúc bằng một tinh tiễn nổ lớn bán kính 120px." },
  },
  {
    id: 'thanh_phien', name: "Thanh Phong Phiến", source: 'weapon', weapon: 'wp_fan', unlockTier: 0, unlock: "Phiến",
    type: "Lốc xoáy hút quái, khống chế", desc: "Phất quạt gọi lốc xoáy: lốc tự đi tìm quái, hút quái nhỏ vào rồi kéo theo, gây sát thương mỗi nhịp và làm chậm.", passive: 'p_tat_phong', color: 0x80f0d0,
    levels: [
      { damage: "35%/nhịp", cooldown: "3s (lốc 2,6s)", effect: "1 lốc xoáy; làm chậm 15% trong 1,5s" },
      { damage: "42%/nhịp", cooldown: "3s", effect: "Tăng sát thương" },
      { damage: "49%/nhịp", cooldown: "2,8s", effect: "Giảm hồi chiêu" },
      { damage: "57%/nhịp", cooldown: "2,8s", effect: "Làm chậm 25%" },
      { damage: "65%/nhịp", cooldown: "2,6s", effect: "Quái bị chậm nhận +15% sát thương từ mọi nguồn" },
    ],
    awaken: { name: "Cửu Thiên Cuồng Phong", damage: "90%/nhịp", effect: "Gọi 3 lốc xoáy lớn cùng lúc, mỗi lốc tồn tại 3,2s." },
  },
  {
    id: 'ho_khieu', name: "Hổ Khiếu Chấn", source: 'realm', unlockTier: 0, unlock: "Luyện Thể",
    type: "Sóng chấn quanh thân, đẩy lùi", desc: "Hư ảnh đầu hổ gầm trên đầu, phát sóng xung kích quanh thân đẩy lùi quái.", passive: 'p_ba_the', color: 0xffe0a0,
    levels: [
      { damage: "120%", cooldown: "6s", effect: "Bán kính 125px, đẩy lùi" },
      { damage: "145%", cooldown: "6s", effect: "Tăng sát thương" },
      { damage: "170%", cooldown: "5,5s", effect: "Gắn Chấn Nhiếp: quái gây −20% sát thương trong 3s" },
      { damage: "200%", cooldown: "5,5s", effect: "Tăng sát thương" },
      { damage: "230%", cooldown: "5s", effect: "Giảm hồi chiêu" },
    ],
    awaken: { name: "Bạch Hổ Phá Quân", damage: "350%", effect: "Sóng chấn bán kính 190px, choáng 0,8s, gây thêm sát thương bằng 4% HP tối đa; Chấn Nhiếp lên −35%." },
  },
  {
    id: 'linh_dan', name: "Linh Khí Đạn", source: 'realm', unlockTier: 3, unlock: "Luyện Khí",
    type: "Đạn truy đuổi", desc: "Ngưng linh khí thành linh cầu quanh thân, bắn linh đạn vào kẻ địch.", passive: 'p_tu_linh', color: 0x70c8ff,
    levels: [
      { damage: "80%", cooldown: "2,4s", effect: "Linh cầu bắn đạn vào quái gần" },
      { damage: "96%", cooldown: "2,4s", effect: "Tăng sát thương" },
      { damage: "112%", cooldown: "2,2s", effect: "Giảm hồi chiêu" },
      { damage: "130%", cooldown: "2,2s", effect: "Tăng sát thương" },
      { damage: "150%", cooldown: "2s", effect: "Hạ quái bằng linh đạn có 20% rơi thêm 1 linh châu kinh nghiệm" },
    ],
    awaken: { name: "Vạn Linh Triều Nguyên", damage: "210%", effect: "Nhiều linh cầu hơn, bắn dồn dập và nổ lan." },
  },
  {
    id: 'hoa_phu', name: "Liệt Hỏa Phù", source: 'realm', unlockTier: 6, unlock: "Trúc Cơ",
    type: "Ném nổ vùng, thiêu đốt", desc: "Ném hỏa phù vào kẻ địch, nổ cầu lửa và thiêu đốt.", passive: 'p_ngu_hanh', color: 0xff6a2a,
    levels: [
      { damage: "140%", cooldown: "4,5s", effect: "Hỏa phù nổ cầu lửa; thiêu đốt 20%/giây trong 3s" },
      { damage: "165%", cooldown: "4,5s", effect: "Tăng sát thương" },
      { damage: "190%", cooldown: "4,2s", effect: "Giảm hồi chiêu" },
      { damage: "220%", cooldown: "4,2s", effect: "Tăng sát thương" },
      { damage: "250%", cooldown: "3,8s", effect: "Quái chết khi đang cháy sẽ nổ lan 80% (bán kính 50px)" },
    ],
    awaken: { name: "Phần Thiên Hỏa Phù", damage: "360%", effect: "Lửa xanh + lốc lửa cuốn quái (35% mỗi nhịp). Thiêu đốt cộng dồn 3 tầng." },
  },
  {
    id: 'khi_long', name: "Khí Long", source: 'realm', unlockTier: 12, unlock: "Nguyên Anh",
    type: "Rồng khí lượn quanh thân", desc: "Rồng khí chui ra từ cổng xoáy dưới chân, lượn ngẫu nhiên quanh thân; quái chạm vào thân rồng nhận sát thương.", passive: 'p_than_hon', color: 0x8ac8ff,
    levels: [
      { damage: "70%/lần chạm", cooldown: "12s (tồn tại 4,2s)", effect: "1 rồng khí lượn trong bán kính 175px" },
      { damage: "84%/lần chạm", cooldown: "12s", effect: "Tăng sát thương" },
      { damage: "98%/lần chạm", cooldown: "11s", effect: "Giảm hồi chiêu" },
      { damage: "115%/lần chạm", cooldown: "11s", effect: "Tăng sát thương" },
      { damage: "130%/lần chạm", cooldown: "10s", effect: "Giảm hồi chiêu" },
    ],
    awaken: { name: "Huyết Long Trấn Địa", damage: "160%/lần chạm", effect: "Huyết long tồn tại 5,2s; gần hết thì lượn tại chỗ 1 vòng rồi đâm thẳng xuống đất nổ 400%, choáng 1s." },
  },
  {
    id: 'than_thuc', name: "Thần Thức Trảm", source: 'realm', unlockTier: 15, unlock: "Hóa Thần",
    type: "Tay khí chém quái gần", desc: "Phía trên nhân vật hiện tay khí, lưỡi kiếm khí bọc bàn tay chém vào kẻ địch gần đó.", passive: 'p_than_hon', color: 0xc8a0ff,
    levels: [
      { damage: "240%", cooldown: "5s", effect: "Tay khí chém quái trong 260px" },
      { damage: "290%", cooldown: "4,7s", effect: "Choáng 0,4s (boss: chậm 30%)" },
      { damage: "340%", cooldown: "4,4s", effect: "+50% lên tinh anh và boss" },
      { damage: "400%", cooldown: "4,1s", effect: "Tăng sát thương, giảm hồi chiêu" },
      { damage: "460%", cooldown: "3,8s", effect: "Tăng sát thương, giảm hồi chiêu" },
    ],
    awaken: { name: "Lục Thủ Thần Thức", damage: "500%", effect: "6 cánh tay khí cùng chém." },
  },
  {
    id: 'hu_khong', name: "Hư Không Liệt Phùng", source: 'realm', unlockTier: 18, unlock: "Luyện Hư",
    type: "Hố đen hút gom quái", desc: "Xé không gian thành hố đen ở giữa đám quái, hút xoáy quái vào tâm và nghiền chúng; khép lại thì nổ.", passive: 'p_tu_linh', color: 0xa060ff,
    levels: [
      { damage: "60%/giây", cooldown: "9s (tồn tại 2,6s)", effect: "Hố đen bán kính 115px; khép lại nổ 150%" },
      { damage: "72%/giây", cooldown: "9s", effect: "Tăng sát thương" },
      { damage: "85%/giây", cooldown: "8,5s", effect: "Nổ 200%" },
      { damage: "100%/giây", cooldown: "8,5s", effect: "Tăng sát thương" },
      { damage: "115%/giây", cooldown: "8s", effect: "Nổ 250%; hút vật phẩm và kinh nghiệm về phía bạn" },
    ],
    awaken: { name: "Thôn Thiên Hư Động", damage: "180%/giây", effect: "Hố đen bán kính 170px, tồn tại 3,6s, lực hút gấp đôi; vụ nổ cuối 500%." },
  },
  {
    id: 'phap_tuong', name: "Pháp Tướng Thiên Địa", source: 'realm', unlockTier: 21, unlock: "Hợp Thể",
    type: "Đòn giáng vùng lớn", desc: "Pháp tướng khổng lồ hiện sau lưng, giáng chưởng xuống cụm địch.", passive: 'p_phap_thien', color: 0xffc860,
    levels: [
      { damage: "350%", cooldown: "8s", effect: "Giáng 1 chưởng" },
      { damage: "420%", cooldown: "8s", effect: "Tăng sát thương" },
      { damage: "490%", cooldown: "7,5s", effect: "Choáng 1s" },
      { damage: "570%", cooldown: "7,5s", effect: "Tăng sát thương" },
      { damage: "650%", cooldown: "7s", effect: "+30% lên quái đang choáng" },
    ],
    awaken: { name: "Thông Thiên Pháp Tướng", damage: "900%", effect: "Pháp tướng giáng nhiều chưởng rồi giẫm chân chấn toàn màn hình. Trong 3,4s mọi kỹ năng +20% phạm vi." },
  },
  {
    id: 'van_kiem', name: "Vạn Kiếm Quy Tông", source: 'realm', unlockTier: 24, unlock: "Đại Thừa",
    type: "Mưa kiếm khí vùng rộng", desc: "Trận pháp hiện dưới chân (đi theo nhân vật), vạn kiếm khí 9 màu từ trời rơi xuống trong trận.", passive: 'p_kiem_tam', color: 0xd8e8ff,
    levels: [
      { damage: "60%/kiếm", cooldown: "10s (kéo dài 2,7s)", effect: "16 kiếm khí rơi trong trận" },
      { damage: "72%/kiếm", cooldown: "10s", effect: "Tăng sát thương" },
      { damage: "84%/kiếm", cooldown: "9,5s", effect: "Kiếm khí cắt: chảy máu 15%/giây trong 2s" },
      { damage: "98%/kiếm", cooldown: "9,5s", effect: "Tăng sát thương" },
      { damage: "112%/kiếm", cooldown: "9s", effect: "Giảm hồi chiêu" },
    ],
    awaken: { name: "Tru Tiên Kiếm Trận", damage: "130%/kiếm", effect: "Trận vàng, 26 kiếm khí + 4 cự kiếm cắm đúng 4 vòng trận xoay theo trận. Có thể bạo kích trong trận." },
  },
  {
    id: 'than_loi', name: "Cửu Tiêu Thần Lôi", source: 'realm', unlockTier: 27, unlock: "Độ Kiếp",
    type: "Sét lan chuỗi", desc: "Dẫn thiên lôi đánh xuống quái, sét lan sang các quái lân cận.", passive: 'p_thien_dao', color: 0xb090ff,
    levels: [
      { damage: "150%", cooldown: "5s", effect: "3 tia sét, mỗi tia lan 3 mục tiêu" },
      { damage: "180%", cooldown: "5s", effect: "Tăng sát thương" },
      { damage: "210%", cooldown: "4,6s", effect: "Tê liệt 0,5s" },
      { damage: "245%", cooldown: "4,6s", effect: "Tăng sát thương" },
      { damage: "280%", cooldown: "4,2s", effect: "Giảm hồi chiêu" },
    ],
    awaken: { name: "Tử Tiêu Diệt Thế Lôi", damage: "320%", effect: "9 tia tử lôi, rồi giáng 1 kiếp lôi nổ tàn dư bán kính 140px. Mỗi 1% giảm hồi chiêu cho +1% sát thương sét." },
  },
  {
    id: 'lien_hoa', name: "Tiên Nguyên Liên Hoa", source: 'realm', unlockTier: 30, unlock: "Chân Tiên",
    type: "Hồi máu kiêm sát thương", desc: "Đóa tiên liên nở dưới chân, bao bọc lấy bạn (đi theo nhân vật): hồi máu, thiêu luyện quái quanh thân; tàn thì tan dần từ ngoài vào trong.", passive: 'p_truong_sinh', color: 0xff9ad0,
    levels: [
      { damage: "50%/giây", cooldown: "12s (tồn tại 3,4s)", effect: "Bán kính 120px; hồi 1,5% HP/giây" },
      { damage: "60%/giây", cooldown: "12s", effect: "Hồi 2% HP/giây" },
      { damage: "70%/giây", cooldown: "11s", effect: "Quái trong sen bị chậm 20%" },
      { damage: "82%/giây", cooldown: "11s", effect: "Hồi 2,5% HP/giây" },
      { damage: "95%/giây", cooldown: "10s", effect: "Hồi 3% HP/giây; máu hồi dư thành khiên (tối đa 20% HP)" },
    ],
    awaken: { name: "Cửu Phẩm Tịnh Thế Liên", damage: "150%/giây", effect: "Sen to hơn, hồi 3% HP/giây; hoa tan hết thì 9 cánh sen bay ra theo đường xoắn ốc gây 250%. Khiên tối đa 40% HP." },
  },
  {
    id: 'ngan_ha', name: "Ngân Hà Hàn Lưu", source: 'realm', unlockTier: 33, unlock: "Thiên Tiên",
    type: "Tia băng khóa mục tiêu, đóng băng", desc: "Bắn tia băng vào kẻ địch xa nhất trong tầm (ưu tiên boss) cho đến khi mục tiêu chết hoặc hết giờ; quái khác bị tia quét trúng cũng nhận sát thương.", passive: 'p_ngu_hanh', color: 0x9fe8ff,
    levels: [
      { damage: "50%/nhịp", cooldown: "8s (tồn tại 2,6s)", effect: "Tầm 300px; trúng thì chậm 30%, trúng 5 lần thì đóng băng 1,6s (boss chỉ chậm ngắn)" },
      { damage: "60%/nhịp", cooldown: "8s (tồn tại 2,8s)", effect: "Tầm 315px" },
      { damage: "70%/nhịp", cooldown: "7,5s (tồn tại 3s)", effect: "Tầm 330px" },
      { damage: "82%/nhịp", cooldown: "7,5s (tồn tại 3,2s)", effect: "Tầm 345px" },
      { damage: "95%/nhịp", cooldown: "7s (tồn tại 3,4s)", effect: "Tầm 360px" },
    ],
    awaken: { name: "Thiên Hà Băng Phong", damage: "140%/nhịp", effect: "Tia băng to hơn hẳn; định kỳ phóng 3 tên lửa băng truy kích quái trong quạt 90° phía trước." },
  },
  {
    id: 'hoang_chung', name: "Huyền Hoàng Chung", source: 'realm', unlockTier: 36, unlock: "Huyền Tiên",
    type: "Khiên hộ thể, phản công", desc: "Chuông năng lượng úp lên thân làm khiên, trận đồ hiện dưới chân; hết giờ chuông rung phát sóng vàng.", passive: 'p_huyen_vu', color: 0xf0c040,
    levels: [
      { damage: "250% (sóng âm)", cooldown: "14s (tồn tại 3s)", effect: "Khiên hấp thụ 15% HP tối đa" },
      { damage: "300%", cooldown: "14s", effect: "Khiên 20% HP" },
      { damage: "350%", cooldown: "13s (tồn tại 3,5s)", effect: "Phản 30% sát thương cận chiến; sóng âm đẩy lùi mạnh" },
      { damage: "410%", cooldown: "13s", effect: "Khiên 25% HP" },
      { damage: "470%", cooldown: "12s (tồn tại 4s)", effect: "Khiên 30% HP; sóng âm xóa đạn địch và choáng 1,2s" },
    ],
    awaken: { name: "Hỗn Độn Thần Chung", damage: "700%", effect: "Khiên 50% HP cộng thêm 10 lần Giáp. Chuông rung thêm 3 hồi (250%), vùng sóng to hơn; phản 60%." },
  },
  {
    id: 'linh_vuc', name: "Tiên Vương Lĩnh Vực", source: 'realm', unlockTier: 42, unlock: "Đại La Kim Tiên",
    type: "Hào quang suy yếu (vĩnh viễn)", desc: "Trận đồ lĩnh vực luôn bật quanh thân: quái bước vào bị chậm, yếu đi và bị bào mòn.", passive: 'p_sat_phat', color: 0xff4a5a,
    levels: [
      { damage: "35%/giây", cooldown: "luôn bật", effect: "Bán kính 150px; quái chậm 15%, nhận +10% sát thương" },
      { damage: "42%/giây", cooldown: "luôn bật", effect: "Bán kính 165px" },
      { damage: "50%/giây", cooldown: "luôn bật", effect: "Nhận +18% sát thương; quái trong vùng gây −15% sát thương" },
      { damage: "58%/giây", cooldown: "luôn bật", effect: "Bán kính 185px; chậm 25%" },
      { damage: "68%/giây", cooldown: "luôn bật", effect: "Nhận +25%; mỗi quái hạ trong vùng +1% sát thương (tối đa 30%, tan sau 5s không hạ quái)" },
    ],
    awaken: { name: "Sát Lục Đế Vực", damage: "120%/giây", effect: "Trận đồ đỏ + vòng gai đỏ xoay ngược chiều, bán kính 240px, quái nhận +40% sát thương. Cộng dồn tới 60% và không tan." },
  },
  {
    id: 'dai_dao', name: "Đại Đạo Quy Nhất", source: 'realm', unlockTier: 48, unlock: "Đạo Tổ",
    type: "Tuyệt kỹ toàn màn hình", desc: "Trận âm dương bát quái nở từng vòng dưới chân, quy về một điểm rồi nổ toàn màn hình.", passive: 'p_thien_dao', color: 0xe8e0ff,
    levels: [
      { damage: "1500%", cooldown: "45s", effect: "Trận nở 2,7s rồi nổ toàn màn hình" },
      { damage: "1800%", cooldown: "45s", effect: "Tăng sát thương" },
      { damage: "2100%", cooldown: "42s", effect: "Sát thương bạn gây trong lúc trận nở được tích lại, nổ thêm 50% khi kết thúc" },
      { damage: "2450%", cooldown: "42s", effect: "Tăng sát thương" },
      { damage: "2800%", cooldown: "40s", effect: "Tích 100%; sau vụ nổ mọi kỹ năng khác hồi chiêu ngay" },
    ],
    awaken: { name: "Hỗn Nguyên Đại Đạo Lô", damage: "4500%", effect: "Trận vàng kim to hơn: vụ nổ luyện hóa quái thường thành linh thạch, boss mất thêm 8% máu tối đa. Sau đó 10s mọi kỹ năng −50% hồi chiêu." },
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
